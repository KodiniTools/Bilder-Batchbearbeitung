// src/lib/core/export-render.ts
// Asynchrone Variante der Export-/Vorschau-Pipeline. Die teuren Schritte
// (Filter-Pixel-Passage, Bildkodierung) laufen im Worker-Pool von
// useImageWorker; Wasserzeichen, Transformationen und Hintergrund bleiben im
// Hauptthread (reine Zeichenbefehle, brauchen die geladenen Webfonts).
// Ohne Worker – oder wenn ein Job scheitert – rechnet alles wie bisher
// synchron im Hauptthread, mit identischem Ergebnis.

import type { ImageFilters, ImageObject } from './types'
import { defaultFilters } from './types'
import { ImageProcessor } from './image-processor'
import { hasActiveFilters } from './filter-kernels'
import { ensureWatermarkLogo } from './watermark-logo'
import { useImageWorker } from '@/composables/useImageWorker'

/**
 * Filtert ein Canvas, bevorzugt im Worker. Ohne aktive Filter wird die
 * Quelle unverändert zurückgegeben (wie ImageProcessor.applyFiltersToCanvas).
 */
export async function renderFilteredCanvas(
  source: HTMLCanvasElement,
  filters: ImageFilters,
  scale = 1
): Promise<HTMLCanvasElement> {
  if (!hasActiveFilters(filters)) return source
  const fromWorker = await useImageWorker().filterCanvas(source, filters, scale)
  return fromWorker ?? ImageProcessor.applyFiltersToCanvas(source, filters, scale)
}

/** Wie ImageProcessor.getExportCanvas, Filter-Passage im Worker */
export async function renderExportCanvas(
  imageObj: ImageObject,
  options?: { backgroundColor?: string }
): Promise<HTMLCanvasElement> {
  const [filtered] = await Promise.all([
    renderFilteredCanvas(imageObj.canvas, imageObj.filters || defaultFilters),
    ensureWatermarkLogo(imageObj.watermark),
  ])
  return ImageProcessor.composeExportCanvas(filtered, imageObj, options)
}

/** Wie ImageProcessor.getPreviewCanvas, Filter-Passage im Worker */
export async function renderPreviewCanvas(
  imageObj: ImageObject,
  scale: number
): Promise<HTMLCanvasElement> {
  const base = ImageProcessor.getPreviewBase(imageObj, scale)
  const [filtered] = await Promise.all([
    renderFilteredCanvas(base, imageObj.filters || defaultFilters, scale),
    ensureWatermarkLogo(imageObj.watermark),
  ])
  return ImageProcessor.composePreviewCanvas(filtered, imageObj, scale)
}

/**
 * Kodiert ein Canvas als Datei-Blob, bevorzugt im Worker
 * (OffscreenCanvas.convertToBlob), sonst über canvas.toBlob.
 * @param mimeType z. B. image/jpeg
 * @param quality 0-1, nur für verlustbehaftete Formate
 */
export async function encodeCanvasToBlob(
  canvas: HTMLCanvasElement,
  mimeType: string,
  quality?: number
): Promise<Blob> {
  const fromWorker = await useImageWorker().encodeCanvas(canvas, mimeType, quality ?? 0.92)
  if (fromWorker) return fromWorker
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob)
        else reject(new Error('Canvas konnte nicht zu Blob konvertiert werden'))
      },
      mimeType,
      quality
    )
  })
}
