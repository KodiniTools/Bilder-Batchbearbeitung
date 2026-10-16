// src/lib/core/resize-modes.ts
// Zielgröße der Stapel-Größenänderung je Modus berechnen. Reine Funktionen,
// damit Store, Vorschau-Hinweis und Tests dieselbe Rechnung nutzen.

export type ResizeMode = 'exact' | 'percent' | 'longEdge' | 'fit'

export const RESIZE_MODES: ReadonlyArray<ResizeMode> = ['exact', 'percent', 'longEdge', 'fit']

export const RESIZE_PX_MAX = 10000
export const RESIZE_PERCENT_MIN = 1
export const RESIZE_PERCENT_MAX = 1000

export interface ResizeSpec {
  mode: ResizeMode
  /** exact: Zielbreite; fit: maximale Breite */
  width: number
  /** exact: Zielhöhe; fit: maximale Höhe */
  height: number
  /** nur exact */
  keepAspect: boolean
  /** percent: Skalierung in % */
  percent: number
  /** longEdge: Länge der längeren Seite in px */
  longEdge: number
  /** longEdge/fit: kleinere Bilder unverändert lassen */
  noUpscale: boolean
}

export const defaultResizeSpec: ResizeSpec = {
  mode: 'exact',
  width: 1920,
  height: 1080,
  keepAspect: true,
  percent: 50,
  longEdge: 1920,
  noUpscale: true,
}

export interface Size {
  width: number
  height: number
}

function clampPx(value: number): number {
  return Math.min(RESIZE_PX_MAX, Math.max(1, Math.round(value)))
}

function scaled(src: Size, factor: number): Size {
  return { width: clampPx(src.width * factor), height: clampPx(src.height * factor) }
}

/**
 * Zielgröße für ein Bild der Größe `src`.
 * `exactAspect` ist das Seitenverhältnis, an dem sich „exact“ mit gekoppeltem
 * Seitenverhältnis orientiert (bisheriges Verhalten: Originalbild).
 * Liefert null, wenn das Bild unverändert bleibt (z. B. „nicht vergrößern“).
 */
export function computeResizeTarget(
  src: Size,
  spec: ResizeSpec,
  exactAspect = src.width / src.height
): Size | null {
  if (src.width <= 0 || src.height <= 0) return null

  let target: Size
  switch (spec.mode) {
    case 'percent':
      target = scaled(src, Math.max(RESIZE_PERCENT_MIN, spec.percent) / 100)
      break
    case 'longEdge': {
      const factor = spec.longEdge / Math.max(src.width, src.height)
      if (spec.noUpscale && factor >= 1) return null
      target = scaled(src, factor)
      break
    }
    case 'fit': {
      const factor = Math.min(spec.width / src.width, spec.height / src.height)
      if (spec.noUpscale && factor >= 1) return null
      target = scaled(src, factor)
      break
    }
    case 'exact':
    default: {
      // Unverändertes Verhalten: wird immer angewendet
      let width = spec.width
      let height = spec.height
      if (spec.keepAspect) {
        if (width / height > exactAspect) width = Math.round(height * exactAspect)
        else height = Math.round(width / exactAspect)
      }
      return { width: clampPx(width), height: clampPx(height) }
    }
  }
  return target.width === src.width && target.height === src.height ? null : target
}

/** Sind die Eingaben des Modus gültig? */
export function isResizeSpecValid(spec: ResizeSpec): boolean {
  switch (spec.mode) {
    case 'percent':
      return spec.percent >= RESIZE_PERCENT_MIN && spec.percent <= RESIZE_PERCENT_MAX
    case 'longEdge':
      return spec.longEdge >= 1 && spec.longEdge <= RESIZE_PX_MAX
    case 'fit':
    case 'exact':
    default:
      return spec.width >= 1 && spec.height >= 1
  }
}

/**
 * Zielgröße für den Einzel-Editor in den relativen Modi (percent, longEdge,
 * fit): wie computeResizeTarget, aber bei „unverändert“ oder ungültigen
 * Eingaben die aktuelle Größe statt null.
 */
export function resolveResizeTarget(src: Size, spec: ResizeSpec): Size {
  if (!isResizeSpecValid(spec)) return { width: src.width, height: src.height }
  return computeResizeTarget(src, spec) ?? { width: src.width, height: src.height }
}
