// Bildkodierung für den PDF-Export mit Worker-Pool und Fallback auf den Hauptthread.
//
// Der Worker wird eingebettet und per Blob-URL gestartet (wie useImageWorker):
// Eine separate Worker-Datei würde unter Cross-Origin-Embedder-Policy blockiert,
// und in Electron (file://) funktionieren Blob-Worker ebenfalls.
import PdfImageWorker from '@/workers/pdf-image.worker.ts?worker&inline'
import type { PdfImageRequest, PdfImageResponse } from '@/workers/pdf-image.worker'

/** Bildquelle: Canvas oder Data-URL */
export type PdfImageSource = HTMLCanvasElement | string

export interface EncodedPdfImage {
  /** JPEG-Bytes (Worker) oder Data-URL (Hauptthread) */
  data: Uint8Array | string
  format: 'JPEG' | 'PNG'
  /** Pixelmaße; 0 = unbekannt (Aufrufer liest sie aus dem Bild) */
  width: number
  height: number
}

/** Hauptthread-Kodierung (bisheriger Weg); liefert eine Data-URL */
export type MainThreadEncoder = (
  source: PdfImageSource,
  maxDimension: number,
  quality: number
) => Promise<string>

/** Pro Bild; großzügig, damit langsame Geräte nicht unnötig zurückfallen */
const WORKER_TIMEOUT_MS = 60_000

export function canUseImageWorkers(): boolean {
  return (
    typeof Worker !== 'undefined' &&
    typeof OffscreenCanvas !== 'undefined' &&
    typeof createImageBitmap === 'function'
  )
}

/** 1–3 Worker, je nach Kernen; ein Kern bleibt für die Oberfläche */
export function defaultPoolSize(cores = globalThis.navigator?.hardwareConcurrency ?? 2): number {
  return Math.max(1, Math.min(3, cores - 1))
}

interface Job {
  resolve: (response: PdfImageResponse) => void
  reject: (error: Error) => void
  timer: ReturnType<typeof setTimeout>
  worker: Worker
}

/**
 * Worker-Pool für einen Export. Nach dem Export dispose() aufrufen; die Worker
 * werden dann beendet und belegen keinen Speicher mehr.
 */
export class PdfImageEncoder {
  readonly concurrency: number
  private readonly fallback: MainThreadEncoder
  private readonly useWorkers: boolean
  private workers: Worker[] = []
  private idle: Worker[] = []
  private waiting: { resolve: (worker: Worker) => void; reject: (error: Error) => void }[] = []
  private jobs = new Map<number, Job>()
  private nextId = 1
  private failed = false
  private disposed = false

  constructor(fallback: MainThreadEncoder, options: { workers?: boolean; poolSize?: number } = {}) {
    this.fallback = fallback
    this.useWorkers = (options.workers ?? true) && canUseImageWorkers()
    this.concurrency = this.useWorkers ? (options.poolSize ?? defaultPoolSize()) : 1
  }

  /** Skaliert und kodiert ein Bild; fällt bei Worker-Problemen auf den Hauptthread zurück. */
  async encode(
    source: PdfImageSource,
    maxDimension: number,
    quality: number
  ): Promise<EncodedPdfImage> {
    if (this.useWorkers && !this.failed && !this.disposed) {
      try {
        return await this.encodeInWorker(source, maxDimension, quality)
      } catch (error) {
        if (this.disposed) throw error
        console.warn('[PdfImageEncoder] Worker fehlgeschlagen, Hauptthread:', error)
      }
    }
    const dataUrl = await this.fallback(source, maxDimension, quality)
    return {
      data: dataUrl,
      format: dataUrl.startsWith('data:image/png') ? 'PNG' : 'JPEG',
      width: 0,
      height: 0,
    }
  }

  /** Beendet alle Worker; offene Aufträge werden abgelehnt. */
  dispose(): void {
    this.disposed = true
    for (const [id, job] of this.jobs) {
      clearTimeout(job.timer)
      job.reject(new Error('PDF-Export beendet'))
      this.jobs.delete(id)
    }
    this.workers.forEach((w) => w.terminate())
    this.workers = []
    this.idle = []
    this.waiting.splice(0).forEach((w) => w.reject(new Error('PDF-Export beendet')))
  }

  private async encodeInWorker(
    source: PdfImageSource,
    maxDimension: number,
    quality: number
  ): Promise<EncodedPdfImage> {
    // Bitmap im Hauptthread erzeugen (schnelle Kopie), danach übertragen
    const payload = typeof source === 'string' ? source : await createImageBitmap(source)
    let worker: Worker
    try {
      worker = await this.acquire()
    } catch (error) {
      if (typeof payload !== 'string') payload.close()
      throw error
    }
    try {
      const response = await this.run(worker, {
        id: this.nextId++,
        source: payload,
        maxDimension,
        quality,
      })
      if ('error' in response) throw new Error(response.error)
      return {
        data: new Uint8Array(response.buffer),
        format: 'JPEG',
        width: response.width,
        height: response.height,
      }
    } finally {
      this.release(worker)
    }
  }

  private acquire(): Promise<Worker> {
    if (this.disposed) return Promise.reject(new Error('PDF-Export beendet'))
    const free = this.idle.pop()
    if (free) return Promise.resolve(free)
    if (this.workers.length < this.concurrency) {
      try {
        return Promise.resolve(this.spawn())
      } catch (error) {
        this.failed = true
        return Promise.reject(error instanceof Error ? error : new Error(String(error)))
      }
    }
    return new Promise((resolve, reject) => this.waiting.push({ resolve, reject }))
  }

  private release(worker: Worker): void {
    if (this.disposed || !this.workers.includes(worker)) return
    const next = this.waiting.shift()
    if (next) next.resolve(worker)
    else this.idle.push(worker)
  }

  private spawn(): Worker {
    const worker: Worker = new PdfImageWorker()
    worker.onmessage = (e: MessageEvent<PdfImageResponse>) => {
      const job = this.jobs.get(e.data.id)
      if (!job) return
      clearTimeout(job.timer)
      this.jobs.delete(e.data.id)
      job.resolve(e.data)
    }
    worker.onerror = (event) => {
      // Worker unbrauchbar (z. B. nicht ladbar): alle weiteren Bilder im Hauptthread
      event.preventDefault()
      this.failed = true
      this.removeWorker(worker, 'Worker-Fehler: ' + (event.message || 'nicht ladbar'))
    }
    this.workers.push(worker)
    return worker
  }

  private removeWorker(worker: Worker, reason: string): void {
    worker.terminate()
    this.workers = this.workers.filter((w) => w !== worker)
    this.idle = this.idle.filter((w) => w !== worker)
    for (const [id, job] of this.jobs) {
      if (job.worker !== worker) continue
      clearTimeout(job.timer)
      this.jobs.delete(id)
      job.reject(new Error(reason))
    }
    // Kein Worker mehr übrig: Wartende fallen auf den Hauptthread zurück
    if (this.workers.length === 0) {
      this.waiting.splice(0).forEach((w) => w.reject(new Error(reason)))
    }
  }

  private run(worker: Worker, request: PdfImageRequest): Promise<PdfImageResponse> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.removeWorker(worker, `Worker-Timeout nach ${WORKER_TIMEOUT_MS} ms`)
      }, WORKER_TIMEOUT_MS)
      this.jobs.set(request.id, { resolve, reject, timer, worker })
      try {
        const transfer = typeof request.source === 'string' ? [] : [request.source]
        worker.postMessage(request, transfer)
      } catch (error) {
        clearTimeout(timer)
        this.jobs.delete(request.id)
        reject(error instanceof Error ? error : new Error(String(error)))
      }
    })
  }
}
