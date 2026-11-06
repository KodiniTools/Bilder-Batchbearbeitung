// Bilder der geladenen Serie als Bild-Elemente in den PDF-Designer übernehmen.
// Quelle ist das Export-Rendering (Filter, Transformationen, Wasserzeichen),
// damit im Designer dasselbe Bild erscheint wie im Bildexport.

import type { ImageObject } from '@/lib/core/types'
import { renderExportCanvas } from '@/lib/core/export-render'

/** Bilddaten für ein neues Designer-Bild-Element */
export interface DesignerImageSource {
  /** JPEG-Data-URL */
  src: string
  /** Pixelmaße des kodierten Bilds (für das Seitenverhältnis) */
  width: number
  height: number
}

/** Wandelt ein Bild der Serie in Designer-Bilddaten um */
export type LibraryImageConverter = (image: ImageObject) => Promise<DesignerImageSource>

export interface Box {
  x: number
  y: number
  width: number
  height: number
}

/**
 * Längste Kante der übernommenen Bilder in px. Entspricht dem Standard von
 * buildPdf (maxImageDimension), feiner wird das Bild im PDF ohnehin nicht.
 */
export const LIBRARY_IMAGE_MAX_DIMENSION = 1920
const LIBRARY_IMAGE_QUALITY = 0.92

/** Seitenränder und Abstand zwischen den Bildern bei der Mehrfachübernahme in px */
const GRID_MARGIN = 40
const GRID_GAP = 20
/** Ein einzelnes Bild nimmt höchstens diese Breite ein (wie beim Datei-Upload) */
const SINGLE_MAX_WIDTH = 400

/** Skaliert so, dass die längste Kante höchstens maxDimension ist (nie hoch). */
export function fitWithin(
  width: number,
  height: number,
  maxDimension: number
): { width: number; height: number } {
  if (width <= 0 || height <= 0) return { width: 0, height: 0 }
  const scale = Math.min(1, maxDimension / Math.max(width, height))
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  }
}

/** Kleines Vorschaubild (Data-URL) für den Auswahldialog */
export function createThumbnail(canvas: HTMLCanvasElement, maxDimension = 160): string {
  const size = fitWithin(canvas.width, canvas.height, maxDimension)
  if (size.width === 0) return ''
  const thumb = document.createElement('canvas')
  thumb.width = size.width
  thumb.height = size.height
  const ctx = thumb.getContext('2d')
  if (!ctx) return ''
  ctx.drawImage(canvas, 0, 0, size.width, size.height)
  return thumb.toDataURL('image/jpeg', 0.8)
}

/**
 * Rendert ein Bild der Serie wie beim Export und kodiert es verkleinert als JPEG.
 * Transparenz wird auf Weiß gelegt (JPEG, wie im PDF-Export).
 */
export async function libraryImageToSource(
  image: ImageObject,
  maxDimension = LIBRARY_IMAGE_MAX_DIMENSION
): Promise<DesignerImageSource> {
  const rendered = await renderExportCanvas(image, { backgroundColor: '#ffffff' })
  const size = fitWithin(rendered.width, rendered.height, maxDimension)
  if (size.width === 0) throw new Error(`Bild ohne Inhalt: ${image.outputName}`)

  let target = rendered
  if (size.width !== rendered.width || size.height !== rendered.height) {
    target = document.createElement('canvas')
    target.width = size.width
    target.height = size.height
    const ctx = target.getContext('2d')
    if (!ctx) throw new Error('Canvas-Kontext nicht verfügbar')
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(rendered, 0, 0, size.width, size.height)
  }
  return {
    src: target.toDataURL('image/jpeg', LIBRARY_IMAGE_QUALITY),
    width: size.width,
    height: size.height,
  }
}

/**
 * Verteilt n Bilder in einem Raster auf der Seite. Jedes Bild wird in seine
 * Zelle eingepasst (Seitenverhältnis bleibt) und darin zentriert.
 * Ein einzelnes Bild wird höchstens SINGLE_MAX_WIDTH breit und mittig gesetzt.
 */
export function layoutImagesOnPage(
  images: ReadonlyArray<{ width: number; height: number }>,
  page: { width: number; height: number }
): Box[] {
  const n = images.length
  if (n === 0) return []

  const cols = Math.ceil(Math.sqrt(n))
  const rows = Math.ceil(n / cols)
  const usableW = Math.max(1, page.width - 2 * GRID_MARGIN)
  const usableH = Math.max(1, page.height - 2 * GRID_MARGIN)
  let cellW = (usableW - (cols - 1) * GRID_GAP) / cols
  const cellH = (usableH - (rows - 1) * GRID_GAP) / rows
  if (n === 1) cellW = Math.min(cellW, SINGLE_MAX_WIDTH)

  return images.map((img, i) => {
    const col = i % cols
    const row = Math.floor(i / cols)
    const ratio = img.width > 0 && img.height > 0 ? img.width / img.height : 1
    let width = cellW
    let height = width / ratio
    if (height > cellH) {
      height = cellH
      width = height * ratio
    }
    const cellX = n === 1 ? (page.width - cellW) / 2 : GRID_MARGIN + col * (cellW + GRID_GAP)
    const cellY = n === 1 ? (page.height - cellH) / 2 : GRID_MARGIN + row * (cellH + GRID_GAP)
    return {
      x: Math.round(cellX + (cellW - width) / 2),
      y: Math.round(cellY + (cellH - height) / 2),
      width: Math.max(1, Math.round(width)),
      height: Math.max(1, Math.round(height)),
    }
  })
}
