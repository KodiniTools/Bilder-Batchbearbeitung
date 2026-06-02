// Composable für den Web Worker zur Bildverarbeitung.
// Verwaltet einen Worker-Pool und stellt eine Promise-basierte API bereit.
// Fällt automatisch auf Main-Thread-Verarbeitung zurück wenn Worker nicht verfügbar.

import type {
  WorkerOperation,
  WorkerResult,
  WorkerError,
  RotateParams,
  FlipParams,
  ResizeParams,
  CropParams,
} from '@/workers/image.worker'

type PendingResolve = (result: WorkerResult) => void
type PendingReject = (error: Error) => void

interface PoolEntry {
  worker: Worker
  busy: boolean
}

const POOL_SIZE = Math.min(navigator.hardwareConcurrency ?? 2, 4)

let pool: PoolEntry[] = []
let pendingQueue: Array<{
  request: { operation: WorkerOperation; bitmap: ImageBitmap; params: unknown }
  resolve: PendingResolve
  reject: PendingReject
}> = []
const pendingById = new Map<string, { resolve: PendingResolve; reject: PendingReject }>()

function isSupported(): boolean {
  return typeof Worker !== 'undefined' && typeof OffscreenCanvas !== 'undefined'
}

function createWorker(): Worker {
  return new Worker(new URL('@/workers/image.worker.ts', import.meta.url), { type: 'module' })
}

function initPool(): void {
  if (pool.length > 0 || !isSupported()) return
  pool = Array.from({ length: POOL_SIZE }, () => {
    const worker = createWorker()
    const entry: PoolEntry = { worker, busy: false }

    worker.onmessage = (e: MessageEvent<WorkerResult | WorkerError>) => {
      const { id } = e.data
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const pending = pendingById.get(id)!
      pendingById.delete(id)
      entry.busy = false

      if (pending) {
        if ('error' in e.data) {
          pending.reject(new Error(e.data.error))
        } else {
          pending.resolve(e.data as WorkerResult)
        }
      }

      // Nächsten Job aus der Queue nehmen
      processQueue(entry)
    }

    worker.onerror = (err) => {
      console.error('[ImageWorker] Worker-Fehler:', err)
      entry.busy = false
      processQueue(entry)
    }

    return entry
  })
}

function processQueue(entry: PoolEntry): void {
  if (pendingQueue.length === 0) return
  // shift() is safe: length > 0 checked above
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const next = pendingQueue.shift()!
  dispatchToWorker(entry, next.request, next.resolve, next.reject)
}

function dispatchToWorker(
  entry: PoolEntry,
  request: { operation: WorkerOperation; bitmap: ImageBitmap; params: unknown },
  resolve: PendingResolve,
  reject: PendingReject
): void {
  const id = crypto.randomUUID()
  entry.busy = true
  pendingById.set(id, { resolve, reject })
  entry.worker.postMessage({ id, ...request }, [request.bitmap as unknown as ArrayBuffer])
}

function dispatch(
  operation: WorkerOperation,
  bitmap: ImageBitmap,
  params: unknown
): Promise<WorkerResult> {
  return new Promise((resolve, reject) => {
    const freeEntry = pool.find((e) => !e.busy)
    const request = { operation, bitmap, params }
    if (freeEntry) {
      dispatchToWorker(freeEntry, request, resolve, reject)
    } else {
      pendingQueue.push({ request, resolve, reject })
    }
  })
}

// Wendet das Worker-Ergebnis (ImageData) auf ein HTMLCanvasElement an
function applyResult(canvas: HTMLCanvasElement, result: WorkerResult): void {
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
  ): Promise<void> {
    if (!supported) return

    const bitmap = await createImageBitmap(canvas)
    const result = await dispatch(operation, bitmap, params)
    applyResult(canvas, result)
  }

  // Verarbeitet mehrere Canvases parallel (bis zu POOL_SIZE gleichzeitig)
  async function processBatch(
    canvases: HTMLCanvasElement[],
    operation: WorkerOperation,
    params: RotateParams | FlipParams | ResizeParams | CropParams
  ): Promise<void> {
    if (!supported || canvases.length === 0) return

    const jobs = canvases.map(async (canvas) => {
      const bitmap = await createImageBitmap(canvas)
      const result = await dispatch(operation, bitmap, params)
      applyResult(canvas, result)
    })

    await Promise.all(jobs)
  }

  function terminate(): void {
    pool.forEach((e) => e.worker.terminate())
    pool = []
    pendingQueue = []
    pendingById.clear()
  }

  return { supported, processCanvas, processBatch, terminate }
}
