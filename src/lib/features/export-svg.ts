// src/lib/features/export-svg.ts
// SVG Export über Backend-API mit vtracer.
//
// Qualitäts-Pipeline (modernisiert):
//  1. Composed-Canvas (Filter + Transforms) in voller Auflösung holen.
//  2. Adaptives Supersampling: kleine Bilder werden vor dem Tracing hochwertig
//     hochskaliert, damit vtracer genug Pixel für präzise, scharfe Kurven hat
//     (Hauptursache für „verschwommene" Ergebnisse waren zu niedrig aufgelöste
//     Eingaben). Bereits große Bilder bleiben unverändert.
//  3. Verlustfreies PNG (nicht JPEG) an das Backend – keine Kompressionsartefakte.
//  4. Optimierte vtracer-Parameter (feinere Farbtrennung, präzisere Pfade).
//  5. Nachbearbeitung des SVG für gestochen scharfes Rendering
//     (shape-rendering, sinnvolle Dimensionen, preserveAspectRatio).

import type { ImageObject } from '../core/types'
import { ImageProcessor } from '../core/image-processor'

export type SvgProgressCallback = (current: number, total: number) => void

export type SvgQuality = 'standard' | 'high' | 'ultra'

export interface SvgConversionSettings {
  colormode: 'color' | 'binary'
  filter_speckle: number // 1-128, default 4
  color_precision: number // 1-8, default 8 (mehr Farbtreue, weniger Banding)
  layer_difference: number // 0-128, default 8 (feinere Farbschichten, weniger Auslaufen)
  corner_threshold: number // 0-180, default 60
  length_threshold: number // 1-10, default 4.0
  max_iterations: number // 1-20, default 10
  splice_threshold: number // 0-180, default 45
  path_precision: number // 1-8, default 6 (präzisere Koordinaten, weniger zittrige Kanten)
  mode: 'spline' | 'polygon' | 'pixel' // Kurvenmodus, default spline
  hierarchical: 'stacked' | 'cutout' // Ebenen-Anordnung, default stacked
  /**
   * Ziel-Auflösung (längste Kante) für das Supersampling vor dem Tracing.
   * Rein clientseitig – wird nicht an vtracer übergeben.
   */
  quality: SvgQuality
}

export const defaultSvgSettings: SvgConversionSettings = {
  colormode: 'color',
  filter_speckle: 4,
  color_precision: 8,
  layer_difference: 8,
  corner_threshold: 60,
  length_threshold: 4.0,
  max_iterations: 10,
  splice_threshold: 45,
  path_precision: 6,
  mode: 'spline',
  hierarchical: 'stacked',
  quality: 'high'
}

// vtracer-relevante Parameter (werden ans Backend gesendet).
const VTRACER_KEYS: (keyof SvgConversionSettings)[] = [
  'colormode',
  'filter_speckle',
  'color_precision',
  'layer_difference',
  'corner_threshold',
  'length_threshold',
  'max_iterations',
  'splice_threshold',
  'path_precision',
  'mode',
  'hierarchical'
]

// Auflösungs-Untergrenze (längste Kante in px) je Qualitätsstufe. Es wird nur
// hochskaliert, wenn das Bild diese Grenze unterschreitet – bereits ausreichend
// große Bilder bleiben unangetastet (keine weichgezeichneten Kanten durch
// unnötiges Upsampling). Die Haupt-Qualitätssteigerung kommt aus den
// optimierten vtracer-Parametern; das Supersampling rettet nur kleine Vorlagen.
const QUALITY_TARGET: Record<SvgQuality, number> = {
  standard: 0, // native Auflösung beibehalten
  high: 1024, // kleine Bilder auf mind. 1024 px anheben
  ultra: 2048 // maximale Schärfe – auch mittlere Bilder werden hochskaliert
}

// Obergrenze für die längste Kante, damit das PNG unter dem Backend-Limit (20 MB)
// bleibt und die Verarbeitung performant ist.
const MAX_EDGE = 3000

// API Base URL - wird relativ zur aktuellen Domain aufgelöst
const API_BASE = '/bilderseriebearbeiten/api'

/**
 * Prüft ob der SVG-Konvertierungsservice verfügbar ist
 */
export async function checkSvgServiceAvailable(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/../health`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000)
    })
    return response.ok
  } catch {
    return false
  }
}

/**
 * Bereitet das Canvas für das Tracing vor: Supersampling auf die Ziel-Auflösung
 * der gewählten Qualitätsstufe (nur Hochskalieren) mit hochwertiger Glättung.
 */
function prepareCanvasForTracing(source: HTMLCanvasElement, quality: SvgQuality): HTMLCanvasElement {
  const longest = Math.max(source.width, source.height)
  const target = QUALITY_TARGET[quality]

  // Kein Upscaling nötig (native Qualität oder Bild bereits groß genug).
  if (target <= 0 || longest >= target || longest === 0) {
    return source
  }

  const scale = Math.min(target / longest, MAX_EDGE / longest)
  if (scale <= 1) return source

  const scaled = document.createElement('canvas')
  scaled.width = Math.round(source.width * scale)
  scaled.height = Math.round(source.height * scale)

  const ctx = scaled.getContext('2d')
  if (!ctx) return source

  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(source, 0, 0, scaled.width, scaled.height)

  return scaled
}

/**
 * Erzeugt das aufbereitete, verlustfreie PNG-Blob eines Bildes für das Tracing.
 */
async function buildTracingBlob(
  imageObj: ImageObject,
  quality: SvgQuality
): Promise<Blob> {
  // Composed-Canvas (Filter + Wasserzeichen + Transforms) in voller Auflösung.
  const exportCanvas = ImageProcessor.getExportCanvas(imageObj)
  const tracingCanvas = prepareCanvasForTracing(exportCanvas, quality)
  return canvasToBlob(tracingCanvas, 'png')
}

/**
 * Hängt die vtracer-Parameter an ein FormData-Objekt an.
 */
function appendVtracerParams(formData: FormData, settings: SvgConversionSettings): void {
  for (const key of VTRACER_KEYS) {
    formData.append(key, String(settings[key]))
  }
}

/**
 * Konvertiert ein einzelnes Bild zu SVG
 */
export async function convertImageToSvg(
  imageObj: ImageObject,
  settings: Partial<SvgConversionSettings> = {}
): Promise<Blob> {
  const merged = { ...defaultSvgSettings, ...settings }

  const blob = await buildTracingBlob(imageObj, merged.quality)

  const formData = new FormData()
  formData.append('file', blob, `${imageObj.outputName || 'image'}.png`)
  appendVtracerParams(formData, merged)

  const response = await fetch(`${API_BASE}/convert-svg`, {
    method: 'POST',
    body: formData
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unbekannter Fehler' }))
    throw new Error(error.detail || `HTTP ${response.status}`)
  }

  const svgText = await response.text()
  return new Blob([enhanceSvg(svgText)], { type: 'image/svg+xml' })
}

/**
 * Konvertiert mehrere Bilder zu SVG und gibt ein ZIP zurück
 */
export async function convertImagesToSvgBatch(
  images: ImageObject[],
  settings: Partial<SvgConversionSettings> = {},
  onProgress?: SvgProgressCallback
): Promise<Blob> {
  const merged = { ...defaultSvgSettings, ...settings }

  if (!images || images.length === 0) {
    throw new Error('Keine Bilder zum Konvertieren vorhanden')
  }

  const formData = new FormData()

  for (let i = 0; i < images.length; i++) {
    const image = images[i]

    if (onProgress) {
      onProgress(i + 1, images.length)
    }

    try {
      const blob = await buildTracingBlob(image, merged.quality)
      formData.append('files', blob, `${image.outputName || `image_${i}`}.png`)
    } catch (error) {
      console.warn(`Fehler bei Bild ${image.file?.name}:`, error)
    }
  }

  appendVtracerParams(formData, merged)

  const response = await fetch(`${API_BASE}/convert-svg-batch`, {
    method: 'POST',
    body: formData
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unbekannter Fehler' }))
    throw new Error(error.detail || `HTTP ${response.status}`)
  }

  return response.blob()
}

/**
 * Lädt ein einzelnes SVG als Datei herunter
 */
export async function downloadSingleSvg(
  imageObj: ImageObject,
  settings: Partial<SvgConversionSettings> = {}
): Promise<void> {
  const svgBlob = await convertImageToSvg(imageObj, settings)
  const fileName = `${imageObj.outputName || 'image'}.svg`
  downloadBlob(svgBlob, fileName)
}

/**
 * Lädt mehrere SVGs als ZIP herunter
 */
export async function downloadSvgBatch(
  images: ImageObject[],
  settings: Partial<SvgConversionSettings> = {},
  zipFileName: string = 'svg_export.zip',
  onProgress?: SvgProgressCallback
): Promise<void> {
  const zipBlob = await convertImagesToSvgBatch(images, settings, onProgress)

  let fileName = zipFileName
  if (!fileName.endsWith('.zip')) {
    fileName += '.zip'
  }

  downloadBlob(zipBlob, fileName)
}

// Hilfsfunktionen

/**
 * Ergänzt das von vtracer erzeugte SVG um Attribute für gestochen scharfes
 * Rendering und saubere Skalierung in allen Viewern:
 *  - shape-rendering="geometricPrecision" statt kantenglättungsabhängigem Auto
 *  - preserveAspectRatio für verzerrungsfreie Skalierung
 *  - explizite width/height aus der viewBox, falls sie fehlen
 */
function enhanceSvg(svg: string): string {
  const openTagMatch = svg.match(/<svg\b[^>]*>/i)
  if (!openTagMatch) return svg

  let openTag = openTagMatch[0]

  const ensureAttr = (tag: string, attr: string, value: string): string => {
    if (new RegExp(`\\b${attr}\\s*=`, 'i').test(tag)) return tag
    return tag.replace(/<svg\b/i, `<svg ${attr}="${value}"`)
  }

  // Namespace absichern
  openTag = ensureAttr(openTag, 'xmlns', 'http://www.w3.org/2000/svg')

  // Scharfes, präzises Rendering
  openTag = ensureAttr(openTag, 'shape-rendering', 'geometricPrecision')
  openTag = ensureAttr(openTag, 'text-rendering', 'geometricPrecision')
  openTag = ensureAttr(openTag, 'preserveAspectRatio', 'xMidYMid meet')

  // width/height aus viewBox ableiten, falls nicht vorhanden
  const viewBox = openTag.match(/viewBox\s*=\s*"([\d.\s-]+)"/i)
  if (viewBox) {
    const parts = viewBox[1].trim().split(/\s+/).map(Number)
    if (parts.length === 4 && parts[2] > 0 && parts[3] > 0) {
      openTag = ensureAttr(openTag, 'width', String(parts[2]))
      openTag = ensureAttr(openTag, 'height', String(parts[3]))
    }
  }

  return svg.replace(openTagMatch[0], openTag)
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  format: string = 'png'
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const mimeType = `image/${format === 'jpg' ? 'jpeg' : format}`

    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob)
        } else {
          reject(new Error('Canvas konnte nicht zu Blob konvertiert werden'))
        }
      },
      mimeType,
      1.0 // Maximale Qualität für SVG-Konvertierung
    )
  })
}

function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.style.display = 'none'

  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  setTimeout(() => URL.revokeObjectURL(url), 100)
}
