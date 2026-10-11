// Web Worker für den PDF-Export: skaliert ein Bild und kodiert es als JPEG.
// So blockieren große Serien den UI-Thread nicht (Zeichnen + JPEG-Kodierung
// laufen hier, jsPDF fügt nur noch die fertigen Bytes ein).
import { scaledImageSize } from '@/lib/features/pdf-image-size'

export interface PdfImageRequest {
  id: number
  /** ImageBitmap (übertragen) oder Data-URL */
  source: ImageBitmap | string
  maxDimension: number
  quality: number
}

export type PdfImageResponse =
  | { id: number; buffer: ArrayBuffer; width: number; height: number }
  | { id: number; error: string }

function dataUrlToBlob(dataUrl: string): Blob {
  const comma = dataUrl.indexOf(',')
  const header = dataUrl.slice(0, comma)
  const mime = /^data:([^;,]+)/.exec(header)?.[1] ?? 'application/octet-stream'
  const payload = dataUrl.slice(comma + 1)
  if (!header.includes(';base64')) return new Blob([decodeURIComponent(payload)], { type: mime })
  const binary = atob(payload)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new Blob([bytes], { type: mime })
}

async function encode(request: PdfImageRequest): Promise<PdfImageResponse> {
  const { id, source, maxDimension, quality } = request
  const bitmap =
    typeof source === 'string' ? await createImageBitmap(dataUrlToBlob(source)) : source
  try {
    const { width, height } = scaledImageSize(bitmap.width, bitmap.height, maxDimension)
    const canvas = new OffscreenCanvas(width, height)
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Kein 2D-Kontext im Worker')
    // JPEG kennt keine Transparenz: weiß wie die PDF-Seite
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, width, height)
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(bitmap, 0, 0, width, height)
    const blob = await canvas.convertToBlob({ type: 'image/jpeg', quality })
    return { id, buffer: await blob.arrayBuffer(), width, height }
  } finally {
    bitmap.close()
  }
}

self.onmessage = async (e: MessageEvent<PdfImageRequest>) => {
  let response: PdfImageResponse
  try {
    response = await encode(e.data)
  } catch (error) {
    response = { id: e.data.id, error: error instanceof Error ? error.message : String(error) }
  }
  if ('buffer' in response) {
    ;(self as unknown as Worker).postMessage(response, [response.buffer])
  } else {
    ;(self as unknown as Worker).postMessage(response)
  }
}
