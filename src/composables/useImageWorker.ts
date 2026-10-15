// Composable für den Web Worker zur Bildverarbeitung.
// Worker-Pool mit Timeout, onerror-Reject und automatischem Fallback auf Main Thread.

import type {
  WorkerOperation,
  WorkerResult,
  WorkerEncodeResult,
  WorkerError,
  RotateParams,
  FlipParams,
  ResizeParams,
  CropParams,
} from '@/workers/image.worker'
import type { ImageFilters } from '@/lib/core/types'

// Der Worker (~1,5 KB) wird eingebettet und per Blob-URL gestartet. Eine
// separate Worker-Datei würde auf kodinitools.com blockiert: Die Seite läuft mit
// Cross-Origin-Embedder-Policy, und Chrome verlangt diesen Header dann auch auf
// dem Worker-Skript. Blob-Worker erben die Policy der Seite und brauchen weder
// den Header noch einen zweiten Abruf.
import InlineImageWorker from '@/workers/image.worker.ts?worker&inline'

type AnyWorkerResult = WorkerResult | WorkerEncodeResult
type PendingResolve = (result: AnyWorkerResult) => void
type PendingReject = (error: Error) => void

interface PendingEntry {
  resolve: PendingResolve
  reject: PendingReject
  timer: ReturnType<typeof setTimeout>
}

interface PoolEntry {
  worker: Worker
  busy: boolean
}

interface QueueEntry {
  request: { operation: WorkerOperation; bitmap: ImageBitmap; params: unknown }
  resolve: PendingResolve
  reject: PendingReject
}

const POOL_SIZE = Math.min(navigator.hardwareConcurrency ?? 2, 4)
const TIMEOUT_MS = 15_000

let pool: PoolEntry[] = []
const pendingQueue: QueueEntry[] = []
const pendingById = new Map<string, PendingEntry>()
let workerPoolFailed = false

function isSupported(): boolean {
  return typeof Worker !== 'undefined' && typeof OffscreenCanvas !== 'undefined'
}

function createWorker(): Worker {
  return new InlineImageWorker()
}

function rejectAllPending(entry: PoolEntry, reason: string): void {
  // Reject all in-flight jobs that belong to this worker entry
  for (const [id, pending] of pendingById.entries()) {
    clearTimeout(pending.timer)
    pendingById.delete(id)
    pending.reject(new Error(reason))
  }
  entry.busy = false
}

let poolInitialized = false

/** Erzeugt einen Worker samt Nachrichten- und Fehlerbehandlung und nimmt ihn in den Pool auf. */
function spawnEntry(): PoolEntry {
  const worker = createWorker()
  const entry: PoolEntry = { worker, busy: false }
  pool.push(entry)

  worker.onmessage = (e: MessageEvent<AnyWorkerResult | WorkerError>) => {
    const { id } = e.data
    const pending = pendingById.get(id)
    if (!pending) return

    clearTimeout(pending.timer)
    pendingById.delete(id)
    entry.busy = false

    if ('error' in e.data) {
      pending.reject(new Error(e.data.error))
    } else {
      pending.resolve(e.data)
    }

    processQueue(entry)
  }

  worker.onerror = (err) => {
    // Worker permanent aus Pool entfernen und beenden
    const idx = pool.indexOf(entry)
    if (idx !== -1) pool.splice(idx, 1)
    entry.worker.terminate()
    // Alle laufenden Operationen dieses Workers rejekten (Aufrufer fallen auf
    // den Hauptthread zurück)
    rejectAllPending(entry, 'Worker-Fehler: ' + ((err as ErrorEvent).message || 'nicht ladbar'))

    // Queue leeren – nicht an kaputte Worker weiterleiten
    for (const queued of pendingQueue.splice(0)) {
      queued.reject(new Error('Worker nicht verfügbar – Fallback auf Hauptthread'))
    }
    // Späte dispatch()-Aufrufe (nach createImageBitmap) sofort rejecten,
    // damit sie nicht ewig in der nun leeren Queue hängen.
    if (pool.length === 0 && !workerPoolFailed) {
      workerPoolFailed = true
      console.warn('[ImageWorker] Kein Worker verfügbar – Bildverarbeitung im Hauptthread.')
    }
  }

  return entry
}

function initPool(): void {
  if (poolInitialized || !isSupported()) return
  poolInitialized = true
  for (let i = 0; i < POOL_SIZE; i++) spawnEntry()
}

function processQueue(entry: PoolEntry): void {
  if (pendingQueue.length === 0) return
  const next = pendingQueue.shift()
  if (next) dispatchToEntry(entry, next.request, next.resolve, next.reject)
}

function dispatchToEntry(
  entry: PoolEntry,
  request: { operation: WorkerOperation; bitmap: ImageBitmap; params: unknown },
  resolve: PendingResolve,
  reject: PendingReject
): void {
  const id = crypto.randomUUID()
  entry.busy = true

  const timer = setTimeout(() => {
    pendingById.delete(id)
    entry.busy = false
    reject(new Error(`Worker-Timeout nach ${TIMEOUT_MS}ms`))
    processQueue(entry)
  }, TIMEOUT_MS)

  pendingById.set(id, { resolve, reject, timer })
  entry.worker.postMessage({ id, ...request }, [request.bitmap as unknown as ArrayBuffer])
}

function dispatch(
  operation: WorkerOperation,
  bitmap: ImageBitmap,
  params: unknown
): Promise<AnyWorkerResult> {
  // Pool permanent ausgefallen – sofort rejecten statt ewig in Queue hängen
  if (workerPoolFailed) {
    bitmap.close()
    return Promise.reject(new Error('Worker-Pool nicht verfügbar'))
  }
  return new Promise((resolve, reject) => {
    const freeEntry = pool.find((e) => !e.busy)
    const request = { operation, bitmap, params }
    if (freeEntry) {
      dispatchToEntry(freeEntry, request, resolve, reject)
    } else {
      pendingQueue.push({ request, resolve, reject })
    }
  })
}

function applyResult(canvas: HTMLCanvasElement, result: AnyWorkerResult): void {
  if (!('imageData' in result)) throw new Error('Unerwartete Worker-Antwort')
  canvas.width = result.width
  canvas.height = result.height
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.putImageData(result.imageData, 0, 0)
}

export function useImageWorker() {
  initPool()

  const supported = isSupported()

  async function processCanvas(
    canvas: HTMLCanvasElement,
    operation: WorkerOperation,
    params: RotateParams | FlipParams | ResizeParams | CropParams
  ): Promise<boolean> {
    // Pool dauerhaft ausgefallen: direkt Hauptthread, ohne Warnung pro Aufruf
    if (!supported || workerPoolFailed) return false
    try {
      const bitmap = await createImageBitmap(canvas)
      const result = await dispatch(operation, bitmap, params)
      applyResult(canvas, result)
      return true
    } catch (err) {
      console.warn('[ImageWorker] Operation fehlgeschlagen, Fallback auf Hauptthread:', err)
      return false
    }
  }

  async function processBatch(
    canvases: HTMLCanvasElement[],
    operation: WorkerOperation,
    params: RotateParams | FlipParams | ResizeParams | CropParams
  ): Promise<boolean> {
    if (!supported || workerPoolFailed || canvases.length === 0) return false
    try {
      await Promise.all(
        canvases.map(async (canvas) => {
          const bitmap = await createImageBitmap(canvas)
          const result = await dispatch(operation, bitmap, params)
          applyResult(canvas, result)
        })
      )
      return true
    } catch (err) {
      console.warn('[ImageWorker] Batch fehlgeschlagen, Fallback auf Hauptthread:', err)
      return false
    }
  }

  /**
   * Filter-Pixel-Passage im Worker. Liefert ein neues Canvas oder `null`, wenn
   * kein Worker verfügbar ist oder der Job scheitert – der Aufrufer rechnet
   * dann im Hauptthread (ImageProcessor.applyFiltersToCanvas).
   */
  async function filterCanvas(
    source: HTMLCanvasElement,
    filters: ImageFilters,
    scale = 1
  ): Promise<HTMLCanvasElement | null> {
    if (!supported || workerPoolFailed || source.width === 0 || source.height === 0) return null
    try {
      const bitmap = await createImageBitmap(source)
      const result = await dispatch('filters', bitmap, { filters: { ...filters }, scale })
      const canvas = document.createElement('canvas')
      applyResult(canvas, result)
      return canvas
    } catch (err) {
      console.warn('[ImageWorker] Filter fehlgeschlagen, Fallback auf Hauptthread:', err)
      return null
    }
  }

  /**
   * Kodiert ein Canvas im Worker (OffscreenCanvas.convertToBlob). `null` = kein
   * Worker oder Fehler; der Aufrufer nutzt dann canvas.toBlob.
   */
  async function encodeCanvas(
    source: HTMLCanvasElement,
    type: string,
    quality: number
  ): Promise<Blob | null> {
    if (!supported || workerPoolFailed || source.width === 0 || source.height === 0) return null
    try {
      const bitmap = await createImageBitmap(source)
      const result = await dispatch('encode', bitmap, { type, quality })
      if (!('blob' in result)) throw new Error('Unerwartete Worker-Antwort')
      return result.blob
    } catch (err) {
      console.warn('[ImageWorker] Kodierung fehlgeschlagen, Fallback auf Hauptthread:', err)
      return null
    }
  }

  function terminate(): void {
    pool.forEach((e) => e.worker.terminate())
    pool = []
    pendingQueue.length = 0
    pendingById.clear()
  }

  return { supported, processCanvas, processBatch, filterCanvas, encodeCanvas, terminate }
}
