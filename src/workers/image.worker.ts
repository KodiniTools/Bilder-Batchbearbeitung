/* eslint-disable @typescript-eslint/no-non-null-assertion -- OffscreenCanvas.getContext('2d') is
   guaranteed non-null on a freshly created OffscreenCanvas. */
// Web Worker für CPU-intensive Canvas-Operationen (Rotate, Flip, Resize, Crop).
// Läuft in einem separaten Thread — blockiert den UI-Thread nicht.
// Kommunikation über transferierbare ImageBitmap / ImageData (Zero-Copy).

export type WorkerOperation = 'rotate' | 'flip' | 'resize' | 'crop'

export interface WorkerRequest {
  id: string
  operation: WorkerOperation
  bitmap: ImageBitmap
  params: RotateParams | FlipParams | ResizeParams | CropParams
}

export interface RotateParams {
  degrees: 90 | -90 | 180
}

export interface FlipParams {
  direction: 'horizontal' | 'vertical'
}

export interface ResizeParams {
  width: number
  height: number
}

export interface CropParams {
  aspectRatio: number
}

export interface WorkerResult {
  id: string
  imageData: ImageData
  width: number
  height: number
}

export interface WorkerError {
  id: string
  error: string
}

function rotate(bitmap: ImageBitmap, params: RotateParams): { canvas: OffscreenCanvas } {
  const { degrees } = params
  const sw = bitmap.width
  const sh = bitmap.height

  const dw = Math.abs(degrees) === 90 ? sh : sw
  const dh = Math.abs(degrees) === 90 ? sw : sh

  const canvas = new OffscreenCanvas(dw, dh)
  const ctx = canvas.getContext('2d')!
  ctx.translate(dw / 2, dh / 2)
  ctx.rotate((degrees * Math.PI) / 180)
  ctx.drawImage(bitmap, -sw / 2, -sh / 2)
  return { canvas }
}

function flip(bitmap: ImageBitmap, params: FlipParams): { canvas: OffscreenCanvas } {
  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height)
  const ctx = canvas.getContext('2d')!
  if (params.direction === 'horizontal') {
    ctx.scale(-1, 1)
    ctx.drawImage(bitmap, -bitmap.width, 0)
  } else {
    ctx.scale(1, -1)
    ctx.drawImage(bitmap, 0, -bitmap.height)
  }
  return { canvas }
}

function resize(bitmap: ImageBitmap, params: ResizeParams): { canvas: OffscreenCanvas } {
  const canvas = new OffscreenCanvas(params.width, params.height)
  const ctx = canvas.getContext('2d')!
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(bitmap, 0, 0, bitmap.width, bitmap.height, 0, 0, params.width, params.height)
  return { canvas }
}

function crop(bitmap: ImageBitmap, params: CropParams): { canvas: OffscreenCanvas } {
  const { aspectRatio } = params
  const bw = bitmap.width
  const bh = bitmap.height
  const currentAspect = bw / bh

  let cropW: number
  let cropH: number
  let offsetX: number
  let offsetY: number

  if (currentAspect > aspectRatio) {
    cropH = bh
    cropW = Math.round(bh * aspectRatio)
    offsetX = Math.round((bw - cropW) / 2)
    offsetY = 0
  } else {
    cropW = bw
    cropH = Math.round(bw / aspectRatio)
    offsetX = 0
    offsetY = Math.round((bh - cropH) / 2)
  }

  const canvas = new OffscreenCanvas(cropW, cropH)
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(bitmap, offsetX, offsetY, cropW, cropH, 0, 0, cropW, cropH)
  return { canvas }
}

self.onmessage = (e: MessageEvent<WorkerRequest>) => {
  const { id, operation, bitmap, params } = e.data

  try {
    let result: { canvas: OffscreenCanvas }

    switch (operation) {
      case 'rotate':
        result = rotate(bitmap, params as RotateParams)
        break
      case 'flip':
        result = flip(bitmap, params as FlipParams)
        break
      case 'resize':
        result = resize(bitmap, params as ResizeParams)
        break
      case 'crop':
        result = crop(bitmap, params as CropParams)
        break
      default:
        throw new Error(`Unbekannte Operation: ${operation}`)
    }

    bitmap.close()

    const { canvas } = result
    const ctx = canvas.getContext('2d')!
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)

    const response: WorkerResult = { id, imageData, width: canvas.width, height: canvas.height }
    // Transfer the ArrayBuffer to avoid copying (Zero-Copy)
    self.postMessage(response, [imageData.data.buffer])
  } catch (err) {
    bitmap.close()
    const error: WorkerError = { id, error: String(err) }
    self.postMessage(error)
  }
}
