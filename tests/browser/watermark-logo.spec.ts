import { describe, it, expect } from 'vitest'
import type { ImageObject, WatermarkSettings } from '@/lib/core/types'
import { defaultWatermark } from '@/lib/core/types'
import { ImageProcessor } from '@/lib/core/image-processor'
import { renderExportCanvas, renderPreviewCanvas } from '@/lib/core/export-render'
import {
  LOGO_MAX_EDGE,
  WatermarkLogoError,
  isWatermarkLogoDataUrl,
  loadWatermarkLogo,
  prepareWatermarkLogo,
} from '@/lib/core/watermark-logo'

const RED = '#ff0000'

function solidCanvas(width: number, height: number, color: string): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('kein 2D-Kontext')
  ctx.fillStyle = color
  ctx.fillRect(0, 0, width, height)
  return canvas
}

/** Rotes, quadratisches PNG-Logo als Daten-URL */
function redLogo(size = 64): string {
  return solidCanvas(size, size, RED).toDataURL('image/png')
}

function pixel(canvas: HTMLCanvasElement, x: number, y: number): number[] {
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('kein 2D-Kontext')
  return Array.from(ctx.getImageData(x, y, 1, 1).data)
}

function imageObject(watermark: WatermarkSettings): ImageObject {
  const canvas = solidCanvas(400, 200, '#ffffff')
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('kein 2D-Kontext')
  return {
    id: 'wm',
    file: new File([new Uint8Array(16)], 'wm.png', { type: 'image/png' }),
    image: new Image(400, 200),
    canvas,
    ctx,
    originalCanvas: canvas,
    originalWidth: 400,
    originalHeight: 200,
    selected: false,
    outputName: 'wm',
    version: 1,
    watermark,
  }
}

function logoWatermark(patch: Partial<WatermarkSettings> = {}): WatermarkSettings {
  return {
    ...defaultWatermark,
    enabled: true,
    logoDataUrl: redLogo(),
    logoOpacity: 100,
    logoSize: 20,
    ...patch,
  }
}

describe('Logo-Wasserzeichen im Export', () => {
  it('zeichnet das Logo unten rechts mit Rand, ohne Text', async () => {
    // 400 × 200: Logo 40 px (20 % von 200), Rand 6 px → x 354–394, y 154–194
    const canvas = await renderExportCanvas(imageObject(logoWatermark()))
    expect(pixel(canvas, 374, 174)).toEqual([255, 0, 0, 255])
    expect(pixel(canvas, 397, 197)).toEqual([255, 255, 255, 255])
    expect(pixel(canvas, 200, 100)).toEqual([255, 255, 255, 255])
  })

  it('berücksichtigt Position und Deckkraft', async () => {
    const canvas = await renderExportCanvas(
      imageObject(logoWatermark({ logoPosition: 'center', logoOpacity: 50 }))
    )
    const [r, g, b] = pixel(canvas, 200, 100)
    expect(r).toBe(255)
    expect(g).toBeGreaterThan(110)
    expect(g).toBeLessThan(145)
    expect(b).toBe(g)
    expect(pixel(canvas, 374, 174)).toEqual([255, 255, 255, 255])
  })

  it('kachelt das Logo über das ganze Bild', async () => {
    const canvas = await renderExportCanvas(
      imageObject(logoWatermark({ logoPosition: 'tile', logoSize: 10 }))
    )
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('kein 2D-Kontext')
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data
    let red = 0
    for (let i = 0; i < data.length; i += 4) if (data[i + 1] === 0) red++
    // 20-px-Logos im 30-px-Raster decken etwa 44 % der Fläche
    expect(red / (data.length / 4)).toBeGreaterThan(0.3)
  })

  it('zeichnet Text und Logo gemeinsam', async () => {
    const withText = logoWatermark({
      text: 'TEST',
      color: '#0000ff',
      opacity: 100,
      rotation: 0,
      fontSize: 60,
    })
    const canvas = await renderExportCanvas(imageObject(withText))
    expect(pixel(canvas, 374, 174)).toEqual([255, 0, 0, 255])
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('kein 2D-Kontext')
    const mid = ctx.getImageData(120, 70, 160, 60).data
    let blue = 0
    for (let i = 0; i < mid.length; i += 4) if (mid[i + 2] > 200 && mid[i] < 60) blue++
    expect(blue).toBeGreaterThan(100)
  })

  it('skaliert in der Vorschau mit dem Bild', async () => {
    const preview = await renderPreviewCanvas(imageObject(logoWatermark()), 0.5)
    expect(preview.width).toBe(200)
    // halbe Größe: Logo 20 px, Rand 3 px → x 177–197, y 77–97
    expect(pixel(preview, 187, 87)).toEqual([255, 0, 0, 255])
  })

  it('ändert nichts, solange das Wasserzeichen aus ist', async () => {
    const img = imageObject(logoWatermark({ enabled: false }))
    expect(ImageProcessor.hasAnyEffect(img)).toBe(false)
    const canvas = await renderExportCanvas(img)
    expect(pixel(canvas, 374, 174)).toEqual([255, 255, 255, 255])
    expect(ImageProcessor.hasAnyEffect(imageObject(logoWatermark()))).toBe(true)
  })

  it('kommt mit älteren Wasserzeichen ohne Logo-Felder zurecht', async () => {
    const legacy = { ...defaultWatermark, enabled: true, text: 'Alt' } as Partial<WatermarkSettings>
    delete legacy.logoDataUrl
    delete legacy.logoSize
    const canvas = await renderExportCanvas(imageObject(legacy as WatermarkSettings))
    expect(canvas.width).toBe(400)
  })
})

describe('prepareWatermarkLogo', () => {
  it('verkleinert große Logos und liefert PNG', async () => {
    const big = solidCanvas(3000, 1500, RED)
    const blob = await new Promise<Blob>((resolve, reject) =>
      big.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob'))), 'image/jpeg', 0.8)
    )
    const dataUrl = await prepareWatermarkLogo(new File([blob], 'logo.jpg', { type: 'image/jpeg' }))
    expect(dataUrl.startsWith('data:image/png;base64,')).toBe(true)
    const img = await loadWatermarkLogo(dataUrl)
    expect(img?.naturalWidth).toBe(LOGO_MAX_EDGE)
    expect(img?.naturalHeight).toBe(LOGO_MAX_EDGE / 2)
  })

  it('rastert SVG-Logos', async () => {
    const svg =
      '<svg xmlns="http://www.w3.org/2000/svg" width="120" height="60"><rect width="120" height="60" fill="red"/></svg>'
    const dataUrl = await prepareWatermarkLogo(
      new File([svg], 'logo.svg', { type: 'image/svg+xml' })
    )
    expect(isWatermarkLogoDataUrl(dataUrl)).toBe(true)
    const img = await loadWatermarkLogo(dataUrl)
    expect(img?.naturalWidth).toBe(120)
  })

  it('lehnt fremde Dateitypen und defekte Bilder ab', async () => {
    await expect(
      prepareWatermarkLogo(new File(['x'], 'logo.gif', { type: 'image/gif' }))
    ).rejects.toMatchObject({ reason: 'type' })
    const broken = prepareWatermarkLogo(new File(['kein bild'], 'logo.png', { type: 'image/png' }))
    await expect(broken).rejects.toBeInstanceOf(WatermarkLogoError)
    await expect(broken).rejects.toMatchObject({ reason: 'decode' })
  })
})

describe('isWatermarkLogoDataUrl', () => {
  it('akzeptiert nur Raster-Daten-URLs', () => {
    expect(isWatermarkLogoDataUrl(redLogo())).toBe(true)
    expect(isWatermarkLogoDataUrl('data:image/svg+xml;base64,PHN2Zz4=')).toBe(false)
    expect(isWatermarkLogoDataUrl('https://example.com/logo.png')).toBe(false)
    expect(isWatermarkLogoDataUrl('javascript:alert(1)')).toBe(false)
    expect(isWatermarkLogoDataUrl(42)).toBe(false)
  })
})
