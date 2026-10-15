// src/lib/features/target-size.ts
// Kodierung auf eine maximale Dateigröße (z. B. „max. 500 KB“) und
// Größenschätzung für den Exportdialog.
//
// Vorgehen: Erst mit der gewählten Qualität kodieren. Ist die Datei zu groß,
// sucht eine Binärsuche die höchste Qualität, die noch passt. Reicht selbst
// die Mindestqualität nicht, wird – nur wenn erlaubt – das Bild schrittweise
// verkleinert. Die Kodierung läuft über encodeCanvasToBlob im Worker.

import type { ImageObject } from '../core/types'
import { encodeCanvasToBlob, renderExportCanvas } from '../core/export-render'
import { exifOverhead, readSourceExif, withExif } from '../core/exif'

export interface TargetSizeOptions {
  /** Obergrenze in Bytes */
  maxBytes: number
  /** Abmessungen verkleinern, wenn die Mindestqualität nicht reicht */
  allowDownscale: boolean
}

export interface TargetSizeResult {
  blob: Blob
  /** Verwendete Qualität 0-1 */
  quality: number
  /** Verwendeter Maßstab (1 = Originalgröße) */
  scale: number
  /** false, wenn die Obergrenze nicht eingehalten werden konnte */
  reached: boolean
}

type Encoder = (canvas: HTMLCanvasElement, mimeType: string, quality: number) => Promise<Blob>

export const MIN_QUALITY = 0.05
const SEARCH_STEPS = 7
const MAX_DOWNSCALE_ROUNDS = 5
const MIN_EDGE_PX = 16

/** Nur verlustbehaftete Formate lassen sich über die Qualität steuern */
export function supportsTargetSize(mimeType: string): boolean {
  return mimeType === 'image/jpeg' || mimeType === 'image/webp'
}

export function kbToBytes(kb: number): number {
  return Math.max(1, Math.round(kb * 1024))
}

function scaledCanvas(source: HTMLCanvasElement, scale: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(source.width * scale))
  canvas.height = Math.max(1, Math.round(source.height * scale))
  const ctx = canvas.getContext('2d')
  if (ctx) {
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(source, 0, 0, canvas.width, canvas.height)
  }
  return canvas
}

/** Höchste Qualität in [MIN_QUALITY, maxQuality], deren Datei passt */
async function searchQuality(
  canvas: HTMLCanvasElement,
  mimeType: string,
  maxQuality: number,
  maxBytes: number,
  encode: Encoder
): Promise<{ fit: { blob: Blob; quality: number } | null; smallest: Blob }> {
  const top = await encode(canvas, mimeType, maxQuality)
  if (top.size <= maxBytes) return { fit: { blob: top, quality: maxQuality }, smallest: top }

  const bottom = await encode(canvas, mimeType, MIN_QUALITY)
  if (bottom.size > maxBytes) return { fit: null, smallest: bottom }

  let lo = MIN_QUALITY
  let hi = maxQuality
  let best = { blob: bottom, quality: MIN_QUALITY }
  for (let i = 0; i < SEARCH_STEPS; i++) {
    const mid = (lo + hi) / 2
    const blob = await encode(canvas, mimeType, mid)
    if (blob.size <= maxBytes) {
      best = { blob, quality: mid }
      lo = mid
    } else {
      hi = mid
    }
  }
  return { fit: best, smallest: bottom }
}

/**
 * Kodiert `canvas` so, dass die Datei höchstens `maxBytes` groß ist.
 * Ist das nicht möglich, wird die kleinste erreichte Datei mit
 * `reached: false` zurückgegeben.
 */
export async function encodeToTargetSize(
  canvas: HTMLCanvasElement,
  mimeType: string,
  maxQuality: number,
  options: TargetSizeOptions,
  encode: Encoder = encodeCanvasToBlob
): Promise<TargetSizeResult> {
  const quality = Math.min(1, Math.max(MIN_QUALITY, maxQuality))
  let source = canvas
  let scale = 1
  let { fit, smallest } = await searchQuality(source, mimeType, quality, options.maxBytes, encode)
  if (fit) return { ...fit, scale, reached: true }

  if (options.allowDownscale) {
    for (let round = 0; round < MAX_DOWNSCALE_ROUNDS; round++) {
      // Dateigröße wächst etwa mit der Pixelzahl: Kantenlänge mit √(Ziel/Ist) skalieren
      const factor = Math.min(0.9, Math.sqrt(options.maxBytes / smallest.size) * 0.95)
      const nextScale = scale * factor
      if (Math.min(canvas.width, canvas.height) * nextScale < MIN_EDGE_PX) break
      scale = nextScale
      source = scaledCanvas(canvas, scale)
      ;({ fit, smallest } = await searchQuality(
        source,
        mimeType,
        quality,
        options.maxBytes,
        encode
      ))
      if (fit) return { ...fit, scale, reached: true }
    }
  }

  return { blob: smallest, quality: MIN_QUALITY, scale, reached: false }
}

/**
 * Kodiert ein Export-Canvas mit oder ohne Zielgröße. Ohne Zielgröße oder bei
 * verlustfreien Formaten verhält es sich wie encodeCanvasToBlob.
 * Mit `exif` (normalisierter TIFF-Block) werden die Metadaten eingefügt; die
 * Zielgröße berücksichtigt den dafür nötigen Platz.
 */
export async function encodeForExport(
  canvas: HTMLCanvasElement,
  mimeType: string,
  quality: number,
  target?: TargetSizeOptions | null,
  exif?: Uint8Array | null
): Promise<TargetSizeResult> {
  let result: TargetSizeResult
  if (target && supportsTargetSize(mimeType)) {
    const reserve = exif ? exifOverhead(exif) : 0
    result = await encodeToTargetSize(canvas, mimeType, quality, {
      ...target,
      maxBytes: Math.max(1, target.maxBytes - reserve),
    })
  } else {
    const blob = await encodeCanvasToBlob(canvas, mimeType, quality)
    result = { blob, quality, scale: 1, reached: true }
  }
  if (exif) result.blob = await withExif(result.blob, exif)
  result.reached = !target || result.blob.size <= target.maxBytes
  return result
}

export interface SizeEstimate {
  /** Durchschnittliche Dateigröße der Stichprobe in Bytes */
  perImage: number
  /** Hochgerechnete Gesamtgröße in Bytes */
  total: number
  /** Anzahl der tatsächlich kodierten Bilder */
  sampled: number
  /** Mindestens ein Stichprobenbild verfehlt die Zielgröße */
  overTarget: boolean
}

export interface EstimateRequest {
  images: ImageObject[]
  mimeType: string
  /** Qualität 0-1 */
  quality: number
  backgroundColor?: string
  target?: TargetSizeOptions | null
  /** Höchstzahl kodierter Bilder (Standard 3) */
  sampleSize?: number
  /** Liefert ein vorbereitetes Export-Canvas (z. B. aus einem Cache) */
  getCanvas?: (image: ImageObject) => Promise<HTMLCanvasElement>
  /** Abbruch, wenn sich die Einstellungen inzwischen geändert haben */
  signal?: AbortSignal
  /** EXIF der Originaldateien mitzählen */
  keepExif?: boolean
}

/** Schätzt die Exportgröße aus einer Stichprobe der ersten Bilder. */
export async function estimateExportSize(req: EstimateRequest): Promise<SizeEstimate | null> {
  const sample = req.images.slice(0, Math.max(1, req.sampleSize ?? 3))
  if (sample.length === 0) return null
  const getCanvas =
    req.getCanvas ??
    ((image: ImageObject) => renderExportCanvas(image, { backgroundColor: req.backgroundColor }))

  let bytes = 0
  let overTarget = false
  for (const image of sample) {
    if (req.signal?.aborted) return null
    const [canvas, exif] = await Promise.all([
      getCanvas(image),
      req.keepExif ? readSourceExif(image.file) : null,
    ])
    if (req.signal?.aborted) return null
    const result = await encodeForExport(canvas, req.mimeType, req.quality, req.target, exif)
    bytes += result.blob.size
    if (!result.reached) overTarget = true
  }
  if (req.signal?.aborted) return null
  const perImage = bytes / sample.length
  return {
    perImage,
    total: perImage * req.images.length,
    sampled: sample.length,
    overTarget,
  }
}
