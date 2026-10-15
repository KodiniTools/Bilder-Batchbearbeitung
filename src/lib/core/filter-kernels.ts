// src/lib/core/filter-kernels.ts
// Reine Pixel-Kernels der Filter-Pipeline. Ohne DOM-Zugriff, damit derselbe
// Code im Hauptthread (ImageProcessor) und im Web Worker (image.worker.ts)
// läuft und Vorschau wie Export pixelgleich bleiben.

import type { ImageFilters } from './types'
import { defaultFilters } from './types'

type Ctx2D = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D

/** Weicht mindestens ein Farbfilter vom Standard ab? */
export function hasColorFilters(f: ImageFilters): boolean {
  return (
    f.brightness !== 100 ||
    f.contrast !== 100 ||
    f.saturation !== 100 ||
    f.hue !== 0 ||
    f.grayscale !== 0 ||
    f.sepia !== 0 ||
    f.invert !== 0 ||
    f.temperature !== 0 ||
    f.vibrance !== 0
  )
}

/** Weicht mindestens ein Filter vom Standard ab? */
export function hasActiveFilters(filters: ImageFilters | undefined): boolean {
  const f = { ...defaultFilters, ...(filters || {}) }
  return hasColorFilters(f) || f.blur > 0 || f.opacity !== 100 || f.vignette !== 0
}

/**
 * Wendet alle Filter auf einen 2D-Kontext an (Pixel-Passage + Vignette).
 * Der Kontext muss das Quellbild bereits enthalten.
 * @param scale Verhältnis Quelle zu Originalbild (Vorschau < 1); skaliert den Blur-Radius
 */
export function applyFiltersToContext(
  ctx: Ctx2D,
  width: number,
  height: number,
  filters: ImageFilters,
  scale = 1
): void {
  const f = { ...defaultFilters, ...filters }
  const hasColor = hasColorFilters(f)
  const hasBlur = f.blur > 0
  const hasOpacity = f.opacity !== 100

  const imageData = ctx.getImageData(0, 0, width, height)
  const data = imageData.data

  // 1) Weichzeichnen (räumliche Passage) – echter Gauß über Box-Blur
  if (hasBlur) applyGaussianBlur(data, width, height, f.blur * scale)

  // 2) Farb-Pipeline (eine Pixel-Passage für alle Farboperationen)
  if (hasColor) applyColorPipeline(data, f)

  // 3) Deckkraft auf den Alpha-Kanal
  if (hasOpacity) {
    const alpha = f.opacity / 100
    for (let i = 3; i < data.length; i += 4) {
      data[i] = data[i] * alpha
    }
  }

  ctx.putImageData(imageData, 0, 0)

  // 4) Vignette als radiale Abdunklung (echte Pixel, kein CSS-Filter)
  if (f.vignette !== 0) applyVignette(ctx, width, height, f.vignette)
}

/**
 * Echte pixelbasierte Farb-Pipeline. Alle Operationen werden nacheinander
 * pro Pixel auf den RGB-Kanälen (0-255) berechnet – ohne CSS-Filter.
 *
 * Reihenfolge: Helligkeit → Kontrast → Sättigung → Farbton → Temperatur →
 * Vibrance → Graustufen → Sepia → Invert.
 */
export function applyColorPipeline(data: Uint8ClampedArray, f: ImageFilters): void {
  // Rec. 709 Luminanz-Koeffizienten (auch von CSS für grayscale genutzt)
  const LR = 0.2126
  const LG = 0.7152
  const LB = 0.0722

  const brightness = f.brightness / 100 // 1 = neutral
  const contrast = f.contrast / 100 // 1 = neutral
  const saturation = f.saturation / 100 // 1 = neutral
  const grayscale = f.grayscale / 100 // 0 = aus
  const sepia = f.sepia / 100 // 0 = aus
  const invert = f.invert / 100 // 0 = aus
  const tempShift = (f.temperature / 100) * 45 // max ±45 auf 0-255-Skala
  const vib = f.vibrance / 100 // -1 .. 1

  const doBright = brightness !== 1
  const doContrast = contrast !== 1
  const doSat = saturation !== 1
  const doGray = grayscale !== 0
  const doSepia = sepia !== 0
  const doInvert = invert !== 0
  const doTemp = tempShift !== 0
  const doVib = vib !== 0

  // Farbton-Rotation als 3×3-Matrix (W3C Filter-Effects hue-rotate)
  const doHue = f.hue !== 0
  let m00 = 1,
    m01 = 0,
    m02 = 0
  let m10 = 0,
    m11 = 1,
    m12 = 0
  let m20 = 0,
    m21 = 0,
    m22 = 1
  if (doHue) {
    const a = (f.hue * Math.PI) / 180
    const cos = Math.cos(a)
    const sin = Math.sin(a)
    m00 = 0.213 + cos * 0.787 - sin * 0.213
    m01 = 0.715 - cos * 0.715 - sin * 0.715
    m02 = 0.072 - cos * 0.072 + sin * 0.928
    m10 = 0.213 - cos * 0.213 + sin * 0.143
    m11 = 0.715 + cos * 0.285 + sin * 0.14
    m12 = 0.072 - cos * 0.072 - sin * 0.283
    m20 = 0.213 - cos * 0.213 - sin * 0.787
    m21 = 0.715 - cos * 0.715 + sin * 0.715
    m22 = 0.072 + cos * 0.928 + sin * 0.072
  }

  for (let i = 0; i < data.length; i += 4) {
    let r = data[i]
    let g = data[i + 1]
    let b = data[i + 2]

    // Helligkeit: lineare Multiplikation (wie CSS brightness)
    if (doBright) {
      r *= brightness
      g *= brightness
      b *= brightness
    }

    // Kontrast: Spreizung um mittleres Grau (127.5)
    if (doContrast) {
      r = (r - 127.5) * contrast + 127.5
      g = (g - 127.5) * contrast + 127.5
      b = (b - 127.5) * contrast + 127.5
    }

    // Sättigung: Interpolation zwischen Luminanz und Farbe
    if (doSat) {
      const l = LR * r + LG * g + LB * b
      r = l + (r - l) * saturation
      g = l + (g - l) * saturation
      b = l + (b - l) * saturation
    }

    // Farbton-Rotation (Matrix)
    if (doHue) {
      const nr = m00 * r + m01 * g + m02 * b
      const ng = m10 * r + m11 * g + m12 * b
      const nb = m20 * r + m21 * g + m22 * b
      r = nr
      g = ng
      b = nb
    }

    // Temperatur: warm = mehr Rot / weniger Blau, kühl umgekehrt
    if (doTemp) {
      r += tempShift
      b -= tempShift
    }

    // Vibrance: wenig gesättigte Pixel stärker anheben, gesättigte schonen
    if (doVib) {
      const max = Math.max(r, g, b)
      const min = Math.min(r, g, b)
      const sat = max <= 0 ? 0 : (max - min) / max
      const amt = vib * (1 - sat)
      r += (max - r) * amt
      g += (max - g) * amt
      b += (max - b) * amt
    }

    // Graustufen: Interpolation Richtung Luminanz
    if (doGray) {
      const l = LR * r + LG * g + LB * b
      r += (l - r) * grayscale
      g += (l - g) * grayscale
      b += (l - b) * grayscale
    }

    // Sepia: Interpolation Richtung Sepia-Matrix
    if (doSepia) {
      const sr = 0.393 * r + 0.769 * g + 0.189 * b
      const sg = 0.349 * r + 0.686 * g + 0.168 * b
      const sb = 0.272 * r + 0.534 * g + 0.131 * b
      r += (sr - r) * sepia
      g += (sg - g) * sepia
      b += (sb - b) * sepia
    }

    // Invert: Interpolation Richtung Negativ
    if (doInvert) {
      r += (255 - 2 * r) * invert
      g += (255 - 2 * g) * invert
      b += (255 - 2 * b) * invert
    }

    // Uint8ClampedArray rundet und begrenzt automatisch auf 0-255
    data[i] = r
    data[i + 1] = g
    data[i + 2] = b
  }
}

/**
 * Echter Gauß-Weichzeichner über drei separierbare Box-Blur-Passagen
 * (Approximation nach Kutskir). Rechnet mit vormultipliziertem Alpha, damit
 * transparente Bereiche keine dunklen Ränder erzeugen.
 * @param blur Radius in Pixeln (entspricht der Standardabweichung)
 */
export function applyGaussianBlur(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  blur: number
): void {
  // Gebrochene Sigma-Werte (skalierte Vorschau) werden nicht gerundet;
  // boxesForGauss wählt daraus die passenden Box-Breiten.
  const sigma = blur
  if (sigma <= 0) return

  const n = width * height
  const r = new Float32Array(n)
  const g = new Float32Array(n)
  const b = new Float32Array(n)
  const a = new Float32Array(n)

  // Kanäle mit vormultipliziertem Alpha extrahieren
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    const al = data[i + 3] / 255
    r[p] = data[i] * al
    g[p] = data[i + 1] * al
    b[p] = data[i + 2] * al
    a[p] = data[i + 3]
  }

  // Drei Box-Passagen ≈ Gauß
  const boxes = boxesForGauss(sigma, 3)
  for (let k = 0; k < 3; k++) {
    const radius = (boxes[k] - 1) / 2
    boxBlur(r, width, height, radius)
    boxBlur(g, width, height, radius)
    boxBlur(b, width, height, radius)
    boxBlur(a, width, height, radius)
  }

  // Alpha wieder herausrechnen und zurückschreiben
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    const al = a[p]
    if (al > 0) {
      const inv = 255 / al
      data[i] = r[p] * inv
      data[i + 1] = g[p] * inv
      data[i + 2] = b[p] * inv
    } else {
      data[i] = 0
      data[i + 1] = 0
      data[i + 2] = 0
    }
    data[i + 3] = al
  }
}

/** Ideale Box-Größen für die Gauß-Approximation über `passes` Box-Blurs. */
function boxesForGauss(sigma: number, passes: number): number[] {
  const wIdeal = Math.sqrt((12 * sigma * sigma) / passes + 1)
  let wl = Math.floor(wIdeal)
  if (wl % 2 === 0) wl--
  const wu = wl + 2
  const mIdeal =
    (12 * sigma * sigma - passes * wl * wl - 4 * passes * wl - 3 * passes) / (-4 * wl - 4)
  const m = Math.round(mIdeal)
  const sizes: number[] = []
  for (let i = 0; i < passes; i++) sizes.push(i < m ? wl : wu)
  return sizes
}

/** Separierbarer Box-Blur (horizontal + vertikal) für einen Kanal. */
function boxBlur(channel: Float32Array, width: number, height: number, radius: number): void {
  if (radius < 1) return
  const temp = new Float32Array(channel.length)
  boxBlurH(channel, temp, width, height, radius)
  boxBlurV(temp, channel, width, height, radius)
}

/** Horizontale Box-Blur-Passage mit gleitendem Fenster (Ränder geklemmt). */
function boxBlurH(
  src: Float32Array,
  dst: Float32Array,
  width: number,
  height: number,
  radius: number
): void {
  const norm = 1 / (radius + radius + 1)
  for (let y = 0; y < height; y++) {
    const row = y * width
    let acc = 0
    for (let x = -radius; x <= radius; x++) {
      const cx = x < 0 ? 0 : x >= width ? width - 1 : x
      acc += src[row + cx]
    }
    for (let x = 0; x < width; x++) {
      dst[row + x] = acc * norm
      const addX = x + radius + 1
      const remX = x - radius
      const ai = addX >= width ? width - 1 : addX
      const ri = remX < 0 ? 0 : remX
      acc += src[row + ai] - src[row + ri]
    }
  }
}

/** Vertikale Box-Blur-Passage mit gleitendem Fenster (Ränder geklemmt). */
function boxBlurV(
  src: Float32Array,
  dst: Float32Array,
  width: number,
  height: number,
  radius: number
): void {
  const norm = 1 / (radius + radius + 1)
  for (let x = 0; x < width; x++) {
    let acc = 0
    for (let y = -radius; y <= radius; y++) {
      const cy = y < 0 ? 0 : y >= height ? height - 1 : y
      acc += src[cy * width + x]
    }
    for (let y = 0; y < height; y++) {
      dst[y * width + x] = acc * norm
      const addY = y + radius + 1
      const remY = y - radius
      const ai = (addY >= height ? height - 1 : addY) * width + x
      const ri = (remY < 0 ? 0 : remY) * width + x
      acc += src[ai] - src[ri]
    }
  }
}

/**
 * Zeichnet eine Vignette (abgedunkelte Ränder) über das Bild.
 * @param vignette 0-100 Stärke
 */
export function applyVignette(ctx: Ctx2D, width: number, height: number, vignette: number): void {
  const strength = Math.max(0, Math.min(1, vignette / 100)) * 0.9
  if (strength <= 0) return

  const cx = width / 2
  const cy = height / 2
  const outer = Math.sqrt(cx * cx + cy * cy)
  const inner = outer * 0.45

  const gradient = ctx.createRadialGradient(cx, cy, inner, cx, cy, outer)
  gradient.addColorStop(0, 'rgba(0, 0, 0, 0)')
  gradient.addColorStop(1, `rgba(0, 0, 0, ${strength})`)

  ctx.save()
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, width, height)
  ctx.restore()
}
