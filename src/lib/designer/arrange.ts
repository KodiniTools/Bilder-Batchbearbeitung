import type { PdfElement } from '@/lib/features/export-pdf'

/** Rechteck in Designer-Koordinaten (px auf der Seitenfläche). */
export interface Box {
  x: number
  y: number
  width: number
  height: number
}

export interface PageSize {
  width: number
  height: number
}

/** Box eines Elements; fehlende Maße wie im Designer (Text 300×60, Bild quadratisch). */
export function elementBox(el: PdfElement): Box {
  const width = el.width ?? 300
  const height = el.height ?? (el.type === 'image' ? width : 60)
  return { x: el.x, y: el.y, width, height }
}

/** Umgebendes Rechteck mehrerer Boxen. */
export function boundsOf(boxes: Box[]): Box {
  const minX = Math.min(...boxes.map((b) => b.x))
  const minY = Math.min(...boxes.map((b) => b.y))
  const maxX = Math.max(...boxes.map((b) => b.x + b.width))
  const maxY = Math.max(...boxes.map((b) => b.y + b.height))
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY }
}

// ── Snapping ───────────────────────────────────────────────────────

export interface SnapResult {
  /** Korrigierte linke obere Ecke */
  x: number
  y: number
  /** Senkrechte Hilfslinien (x-Positionen) */
  guidesX: number[]
  /** Waagerechte Hilfslinien (y-Positionen) */
  guidesY: number[]
}

/** Kanten und Mitte einer Box entlang einer Achse, relativ zu ihrer Position. */
const EDGE_FACTORS = [0, 0.5, 1]

function snapAxis(
  start: number,
  size: number,
  candidates: number[],
  threshold: number
): { value: number; guides: number[] } {
  let best: { delta: number } | null = null
  for (const f of EDGE_FACTORS) {
    const edge = start + size * f
    for (const c of candidates) {
      const delta = c - edge
      if (Math.abs(delta) <= threshold && (!best || Math.abs(delta) < Math.abs(best.delta))) {
        best = { delta }
      }
    }
  }
  if (!best) return { value: start, guides: [] }

  const value = start + best.delta
  const guides = new Set<number>()
  for (const f of EDGE_FACTORS) {
    const edge = value + size * f
    for (const c of candidates) {
      if (Math.abs(c - edge) < 0.5) guides.add(c)
    }
  }
  return { value, guides: [...guides] }
}

/**
 * Rastet eine Box an Seitenrändern, Seitenmitte und an Kanten/Mitten anderer
 * Elemente ein, sofern der Abstand höchstens `threshold` beträgt.
 */
export function snapBox(box: Box, targets: Box[], page: PageSize, threshold: number): SnapResult {
  const xs = [0, page.width / 2, page.width]
  const ys = [0, page.height / 2, page.height]
  for (const t of targets) {
    xs.push(t.x, t.x + t.width / 2, t.x + t.width)
    ys.push(t.y, t.y + t.height / 2, t.y + t.height)
  }
  const sx = snapAxis(box.x, box.width, xs, threshold)
  const sy = snapAxis(box.y, box.height, ys, threshold)
  return { x: sx.value, y: sy.value, guidesX: sx.guides, guidesY: sy.guides }
}

// ── Ausrichten / Verteilen ─────────────────────────────────────────

export type AlignMode = 'left' | 'centerH' | 'right' | 'top' | 'middle' | 'bottom'

/**
 * Neue Positionen beim Ausrichten. Ein einzelnes Element wird an der Seite
 * ausgerichtet, mehrere am gemeinsamen umgebenden Rechteck.
 */
export function alignBoxes(
  boxes: Box[],
  mode: AlignMode,
  page: PageSize
): { x: number; y: number }[] {
  if (boxes.length === 0) return []
  const ref: Box =
    boxes.length === 1 ? { x: 0, y: 0, width: page.width, height: page.height } : boundsOf(boxes)

  return boxes.map((b) => {
    switch (mode) {
      case 'left':
        return { x: ref.x, y: b.y }
      case 'centerH':
        return { x: ref.x + (ref.width - b.width) / 2, y: b.y }
      case 'right':
        return { x: ref.x + ref.width - b.width, y: b.y }
      case 'top':
        return { x: b.x, y: ref.y }
      case 'middle':
        return { x: b.x, y: ref.y + (ref.height - b.height) / 2 }
      case 'bottom':
        return { x: b.x, y: ref.y + ref.height - b.height }
      default: {
        const exhaustive: never = mode
        return exhaustive
      }
    }
  })
}

/**
 * Verteilt Boxen mit gleichen Abständen zwischen der ersten und der letzten
 * (nach Position sortiert). Unter drei Boxen bleibt alles unverändert.
 * Ergebnis in der Reihenfolge der Eingabe.
 */
export function distributeBoxes(
  boxes: Box[],
  axis: 'horizontal' | 'vertical'
): { x: number; y: number }[] {
  const result = boxes.map((b) => ({ x: b.x, y: b.y }))
  if (boxes.length < 3) return result

  const pos = axis === 'horizontal' ? 'x' : 'y'
  const size = axis === 'horizontal' ? 'width' : 'height'
  const order = boxes.map((_, i) => i).sort((a, b) => boxes[a][pos] - boxes[b][pos])
  const first = boxes[order[0]]
  const last = boxes[order[order.length - 1]]
  const span = last[pos] + last[size] - first[pos]
  const totalSize = boxes.reduce((sum, b) => sum + b[size], 0)
  const gap = (span - totalSize) / (boxes.length - 1)

  let cursor = first[pos]
  for (const i of order) {
    result[i][pos] = cursor
    cursor += boxes[i][size] + gap
  }
  return result
}
