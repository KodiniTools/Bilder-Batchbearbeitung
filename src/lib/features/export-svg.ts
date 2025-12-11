// src/lib/features/export-svg.ts
// SVG Export über Backend-API mit vtracer

import type { ImageObject } from '../core/types'
import { ImageProcessor } from '../core/image-processor'

export type SvgProgressCallback = (current: number, total: number) => void

export interface SvgConversionSettings {
  colormode: 'color' | 'binary'
  filter_speckle: number      // 1-128, default 4
  color_precision: number     // 1-8, default 6
  layer_difference: number    // 0-128, default 16
  corner_threshold: number    // 0-180, default 60
  length_threshold: number    // 1-10, default 4.0
  max_iterations: number      // 1-20, default 10
  splice_threshold: number    // 0-180, default 45
  path_precision: number      // 1-8, default 3
}

export const defaultSvgSettings: SvgConversionSettings = {
  colormode: 'color',
  filter_speckle: 4,
  color_precision: 6,
  layer_difference: 16,
  corner_threshold: 60,
  length_threshold: 4.0,
  max_iterations: 10,
  splice_threshold: 45,
  path_precision: 3
}

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
 * Konvertiert ein einzelnes Bild zu SVG
 */
export async function convertImageToSvg(
  imageObj: ImageObject,
  settings: Partial<SvgConversionSettings> = {}
): Promise<Blob> {
  const mergedSettings = { ...defaultSvgSettings, ...settings }

  // Canvas mit Filtern holen und zu Blob konvertieren
  const canvas = ImageProcessor.getCanvasWithFilters(imageObj)
  const blob = await canvasToBlob(canvas, 'png')

  // FormData erstellen
  const formData = new FormData()
  formData.append('file', blob, `${imageObj.outputName || 'image'}.png`)

  // Settings hinzufügen
  Object.entries(mergedSettings).forEach(([key, value]) => {
    formData.append(key, String(value))
  })

  // API-Request
  const response = await fetch(`${API_BASE}/convert-svg`, {
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
 * Konvertiert mehrere Bilder zu SVG und gibt ein ZIP zurück
 */
export async function convertImagesToSvgBatch(
  images: ImageObject[],
  settings: Partial<SvgConversionSettings> = {},
  onProgress?: SvgProgressCallback
): Promise<Blob> {
  const mergedSettings = { ...defaultSvgSettings, ...settings }

  if (!images || images.length === 0) {
    throw new Error('Keine Bilder zum Konvertieren vorhanden')
  }

  // FormData erstellen
  const formData = new FormData()

  // Alle Bilder hinzufügen
  for (let i = 0; i < images.length; i++) {
    const image = images[i]

    if (onProgress) {
      onProgress(i + 1, images.length)
    }

    try {
      const canvas = ImageProcessor.getCanvasWithFilters(image)
      const blob = await canvasToBlob(canvas, 'png')
      formData.append('files', blob, `${image.outputName || `image_${i}`}.png`)
    } catch (error) {
      console.warn(`Fehler bei Bild ${image.file?.name}:`, error)
    }
  }

  // Settings hinzufügen
  Object.entries(mergedSettings).forEach(([key, value]) => {
    formData.append(key, String(value))
  })

  // API-Request
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
