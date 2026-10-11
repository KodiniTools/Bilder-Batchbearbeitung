import type { PdfElement, PdfShapeKind } from '@/lib/features/export-pdf'
import type { PageSize } from './arrange'

/** Standardwerte neuer Formen (Größe in px der Designer-Fläche) */
const SHAPE_DEFAULTS: Record<PdfShapeKind, Partial<PdfElement>> = {
  rect: {
    width: 240,
    height: 160,
    fillColor: '#e5e7eb',
    strokeColor: '#374151',
    strokeWidth: 2,
    cornerRadius: 0,
  },
  ellipse: {
    width: 180,
    height: 180,
    fillColor: '#e5e7eb',
    strokeColor: '#374151',
    strokeWidth: 2,
  },
  line: { width: 300, height: 20, fillColor: '', strokeColor: '#374151', strokeWidth: 3 },
}

/** Neue Form mittig auf der Seite. */
export function createShape(
  kind: PdfShapeKind,
  id: string,
  page: PageSize,
  zIndex: number
): PdfElement {
  const defaults = SHAPE_DEFAULTS[kind]
  const width = defaults.width ?? 200
  const height = defaults.height ?? 200
  return {
    id,
    type: 'shape',
    shape: kind,
    x: Math.round((page.width - width) / 2),
    y: Math.round((page.height - height) / 2),
    zIndex,
    opacity: 1,
    ...defaults,
  }
}

/** Seitenhintergrund als Farbe (ganzseitiges Rechteck ohne Rand). */
export function createColorBackground(id: string, color: string, page: PageSize): PdfElement {
  return {
    id,
    type: 'shape',
    shape: 'rect',
    background: true,
    x: 0,
    y: 0,
    width: page.width,
    height: page.height,
    zIndex: 0,
    fillColor: color,
    strokeColor: '',
    strokeWidth: 0,
    opacity: 1,
  }
}

/** Seitenhintergrund als Bild (füllt die Seite, Überstand wird beschnitten). */
export function createImageBackground(id: string, src: string, page: PageSize): PdfElement {
  return {
    id,
    type: 'image',
    background: true,
    src,
    x: 0,
    y: 0,
    width: page.width,
    height: page.height,
    zIndex: 0,
    opacity: 1,
  }
}

/** Zeichenreihenfolge: Hintergrund zuerst, danach nach z-Index. */
export function sortForRender(elements: readonly PdfElement[]): PdfElement[] {
  return [...elements].sort(
    (a, b) => Number(!!b.background) - Number(!!a.background) || a.zIndex - b.zIndex
  )
}
