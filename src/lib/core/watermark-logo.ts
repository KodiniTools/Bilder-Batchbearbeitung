// src/lib/core/watermark-logo.ts
// Logo-Wasserzeichen: Datei aufbereiten, dekodiertes Bild cachen und auf ein
// Canvas zeichnen. Das Logo wird zusätzlich zum Text-Wasserzeichen gezeichnet.
//
// Die Zeichen-Pipeline (ImageProcessor.getCanvasWithWatermark) ist synchron;
// sie nutzt nur bereits dekodierte Logos. Die asynchronen Pfade in
// export-render.ts laden das Logo deshalb vorher mit ensureWatermarkLogo.

import type { WatermarkSettings } from './types'
import { defaultWatermark } from './types'

export const LOGO_SIZE_MIN = 5
export const LOGO_SIZE_MAX = 100
/** Längste Kante des gespeicherten Logos in px */
export const LOGO_MAX_EDGE = 1024
/** Obergrenze der Daten-URL (Rezepte liegen im localStorage) */
export const LOGO_MAX_DATA_URL_LENGTH = 3_000_000
/** Abstand der Eck-Positionen zum Bildrand, Anteil der kürzeren Bildseite */
const LOGO_MARGIN = 0.03
const CACHE_LIMIT = 8

const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']
export const WATERMARK_LOGO_ACCEPT = ACCEPTED_TYPES.join(',')

/** Nur Raster-Daten-URLs, wie sie prepareWatermarkLogo erzeugt (kein SVG) */
export function isWatermarkLogoDataUrl(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length <= LOGO_MAX_DATA_URL_LENGTH &&
    /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/.test(value)
  )
}

export class WatermarkLogoError extends Error {
  constructor(
    public readonly reason: 'type' | 'decode' | 'size',
    message: string
  ) {
    super(message)
    this.name = 'WatermarkLogoError'
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new WatermarkLogoError('decode', 'Logo konnte nicht geladen werden'))
    img.src = src
  })
}

/**
 * Liest eine Bilddatei (PNG, JPEG, WebP, SVG) und liefert sie als PNG-Daten-URL,
 * verkleinert auf höchstens LOGO_MAX_EDGE px. PNG erhält die Transparenz;
 * SVG wird dabei gerastert, damit nur Rasterdaten gespeichert werden.
 */
export async function prepareWatermarkLogo(file: File): Promise<string> {
  if (!ACCEPTED_TYPES.includes(file.type)) {
    throw new WatermarkLogoError('type', `Nicht unterstützter Dateityp: ${file.type || '?'}`)
  }
  const url = URL.createObjectURL(file)
  try {
    const img = await loadImage(url)
    // SVG ohne feste Abmessungen meldet 0 × 0
    const w = img.naturalWidth || 512
    const h = img.naturalHeight || 512
    const scale = Math.min(1, LOGO_MAX_EDGE / Math.max(w, h))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(w * scale))
    canvas.height = Math.max(1, Math.round(h * scale))
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new WatermarkLogoError('decode', 'Kein 2D-Kontext')
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    const dataUrl = canvas.toDataURL('image/png')
    if (!isWatermarkLogoDataUrl(dataUrl)) {
      throw new WatermarkLogoError('size', 'Logo ist zu groß')
    }
    return dataUrl
  } finally {
    URL.revokeObjectURL(url)
  }
}

// Dekodierte Logos, Schlüssel ist die Daten-URL (Map-Reihenfolge = LRU)
const pending = new Map<string, Promise<HTMLImageElement | null>>()
const loaded = new Map<string, HTMLImageElement>()

function remember(src: string, img: HTMLImageElement): void {
  loaded.delete(src)
  loaded.set(src, img)
  while (loaded.size > CACHE_LIMIT) {
    const oldest = loaded.keys().next().value
    if (oldest === undefined) break
    loaded.delete(oldest)
  }
}

/** Bereits dekodiertes Logo oder null (dann wird es nicht gezeichnet) */
export function getLoadedWatermarkLogo(src: string): HTMLImageElement | null {
  const img = loaded.get(src)
  if (img) remember(src, img)
  return img ?? null
}

/** Dekodiert das Logo einmalig; null bei ungültiger oder defekter Daten-URL */
export function loadWatermarkLogo(src: string): Promise<HTMLImageElement | null> {
  const ready = getLoadedWatermarkLogo(src)
  if (ready) return Promise.resolve(ready)
  if (!isWatermarkLogoDataUrl(src)) return Promise.resolve(null)
  let entry = pending.get(src)
  if (!entry) {
    entry = loadImage(src)
      .then((img) => {
        remember(src, img)
        return img
      })
      .catch((error) => {
        console.warn('[Wasserzeichen] Logo konnte nicht dekodiert werden:', error)
        return null
      })
      .finally(() => pending.delete(src))
    pending.set(src, entry)
  }
  return entry
}

/** Lädt das Logo eines aktiven Wasserzeichens vor dem synchronen Zeichnen */
export async function ensureWatermarkLogo(watermark: WatermarkSettings | undefined): Promise<void> {
  if (watermark?.enabled && watermark.logoDataUrl) await loadWatermarkLogo(watermark.logoDataUrl)
}

/** Zeichnet das Logo gemäß Position, Größe und Deckkraft auf `ctx`. */
export function drawWatermarkLogo(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  logo: HTMLImageElement,
  watermark: Partial<WatermarkSettings>
): void {
  const size = watermark.logoSize ?? defaultWatermark.logoSize
  const opacity = watermark.logoOpacity ?? defaultWatermark.logoOpacity
  const position = watermark.logoPosition ?? defaultWatermark.logoPosition
  if (!logo.naturalWidth || !logo.naturalHeight || opacity <= 0) return

  const minEdge = Math.min(width, height)
  const longest = Math.max(
    1,
    (minEdge * Math.min(LOGO_SIZE_MAX, Math.max(LOGO_SIZE_MIN, size))) / 100
  )
  const aspect = logo.naturalWidth / logo.naturalHeight
  const lw = Math.max(1, aspect >= 1 ? longest : longest * aspect)
  const lh = Math.max(1, aspect >= 1 ? longest / aspect : longest)
  const margin = minEdge * LOGO_MARGIN

  ctx.save()
  ctx.globalAlpha = Math.min(1, opacity / 100)
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'

  if (position === 'tile') {
    // Versetzte Reihen, Abstand ein halbes Logo
    const stepX = lw * 1.5
    const stepY = lh * 1.5
    let row = 0
    for (let y = margin; y < height; y += stepY, row++) {
      const offset = row % 2 === 0 ? 0 : stepX / 2
      for (let x = margin - offset; x < width; x += stepX) {
        ctx.drawImage(logo, x, y, lw, lh)
      }
    }
  } else {
    let x: number
    let y: number
    switch (position) {
      case 'top-left':
        x = margin
        y = margin
        break
      case 'top-right':
        x = width - margin - lw
        y = margin
        break
      case 'bottom-left':
        x = margin
        y = height - margin - lh
        break
      case 'bottom-right':
        x = width - margin - lw
        y = height - margin - lh
        break
      case 'center':
      default:
        x = (width - lw) / 2
        y = (height - lh) / 2
        break
    }
    ctx.drawImage(logo, x, y, lw, lh)
  }
  ctx.restore()
}
