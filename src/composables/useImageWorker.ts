// Composable für den Web Worker zur Bildverarbeitung.
// Worker-Pool mit Timeout, onerror-Reject und automatischem Fallback auf Main Thread.

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

function isSupported(): boolean {
  return typeof Worker !== 'undefined' && typeof OffscreenCanvas !== 'undefined'
}

function createWorker(): Worker {
  return new Worker(new URL('@/workers/image.worker.ts', import.meta.url), { type: 'module' })
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

function initPool(): void {
  if (pool.length > 0 || !isSupported()) return

  pool = Array.from({ length: POOL_SIZE }, () => {
    const worker = createWorker()
    const entry: PoolEntry = { worker, busy: false }

    worker.onmessage = (e: MessageEvent<WorkerResult | WorkerError>) => {
      const { id } = e.data
      const pending = pendingById.get(id)
      if (!pending) return

      clearTimeout(pending.timer)
      pendingById.delete(id)
      entry.busy = false

      if ('error' in e.data) {
        pending.reject(new Error(e.data.error))
      } else {
        pending.resolve(e.data as WorkerResult)
      }

      processQueue(entry)
    }

    worker.onerror = (err) => {
      console.error('[ImageWorker] Worker-Fehler — falle auf Hauptthread zurück:', err)
      rejectAllPending(entry, 'Worker-Fehler: ' + err.message)
      processQueue(entry)
    }

    return entry
  })
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
): Promise<WorkerResult> {
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
  ): Promise<boolean> {
    if (!supported) return false
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
    if (!supported || canvases.length === 0) return false
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

  function terminate(): void {
    pool.forEach((e) => e.worker.terminate())
    pool = []
    pendingQueue.length = 0
    pendingById.clear()
  }

  return { supported, processCanvas, processBatch, terminate }
}
