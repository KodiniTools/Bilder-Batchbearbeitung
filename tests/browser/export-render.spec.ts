import { describe, it, expect, vi } from 'vitest'
import type { ImageFilters, ImageObject } from '@/lib/core/types'
import { defaultFilters, defaultTransforms, defaultWatermark } from '@/lib/core/types'
import { ImageProcessor } from '@/lib/core/image-processor'
import {
  renderFilteredCanvas,
  renderExportCanvas,
  renderPreviewCanvas,
  encodeCanvasToBlob,
} from '@/lib/core/export-render'
import { useImageWorker } from '@/composables/useImageWorker'

/** Testbild mit Farbverlauf und Mustern, damit jeder Filter sichtbar wirkt */
function patternCanvas(width: number, height: number, alpha = 1): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('kein 2D-Kontext')
  const img = ctx.createImageData(width, height)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4
      img.data[i] = (x * 255) / width
      img.data[i + 1] = (y * 255) / height
      img.data[i + 2] = ((x ^ y) & 16) * 15
      img.data[i + 3] = Math.round(255 * alpha)
    }
  }
  ctx.putImageData(img, 0, 0)
  return canvas
}

function pixels(canvas: HTMLCanvasElement): Uint8ClampedArray {
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('kein 2D-Kontext')
  return ctx.getImageData(0, 0, canvas.width, canvas.height).data
}

function maxDiff(a: HTMLCanvasElement, b: HTMLCanvasElement): number {
  expect(a.width).toBe(b.width)
  expect(a.height).toBe(b.height)
  const pa = pixels(a)
  const pb = pixels(b)
  let max = 0
  for (let i = 0; i < pa.length; i++) max = Math.max(max, Math.abs(pa[i] - pb[i]))
  return max
}

const allFilters: ImageFilters = {
  ...defaultFilters,
  brightness: 120,
  contrast: 85,
  saturation: 140,
  hue: 30,
  blur: 3,
  grayscale: 10,
  sepia: 20,
  invert: 5,
  temperature: 25,
  vibrance: 30,
  vignette: 40,
}

function imageObjectOf(canvas: HTMLCanvasElement, patch: Partial<ImageObject> = {}): ImageObject {
  return {
    id: 'test',
    file: new File([], 'test.png'),
    image: new Image(),
    canvas,
    ctx: canvas.getContext('2d') as CanvasRenderingContext2D,
    originalCanvas: canvas,
    originalWidth: canvas.width,
    originalHeight: canvas.height,
    selected: false,
    outputName: 'test',
    version: 0,
    filters: { ...defaultFilters },
    transforms: { ...defaultTransforms },
    watermark: { ...defaultWatermark },
    ...patch,
  }
}

describe('Filter im Worker', () => {
  it('nutzt den Worker und liefert dasselbe Ergebnis wie der Hauptthread', async () => {
    const worker = useImageWorker()
    expect(worker.supported).toBe(true)
    const warn = vi.spyOn(console, 'warn')

    const source = patternCanvas(320, 200)
    const viaWorker = await worker.filterCanvas(source, allFilters, 1)
    expect(viaWorker).not.toBeNull()
    expect(warn).not.toHaveBeenCalled()

    const onMain = ImageProcessor.applyFiltersToCanvas(source, allFilters, 1)
    expect(maxDiff(viaWorker as HTMLCanvasElement, onMain)).toBe(0)
  })

  it('weicht bei halbtransparenten Bildern höchstens um Rundung ab', async () => {
    const source = patternCanvas(160, 120, 0.5)
    const filters = { ...allFilters, opacity: 70 }
    const viaWorker = await renderFilteredCanvas(source, filters, 0.5)
    const onMain = ImageProcessor.applyFiltersToCanvas(source, filters, 0.5)
    expect(maxDiff(viaWorker, onMain)).toBeLessThanOrEqual(2)
  })

  it('gibt ohne aktive Filter die Quelle unverändert zurück', async () => {
    const source = patternCanvas(10, 10)
    expect(await renderFilteredCanvas(source, { ...defaultFilters })).toBe(source)
  })
})

describe('Export- und Vorschau-Pipeline (async)', () => {
  const transforms = { ...defaultTransforms, borderWidth: 6, borderRadius: 40, shadowBlur: 5 }

  it('entspricht getExportCanvas inkl. Rand, Schatten und Hintergrund', async () => {
    const image = imageObjectOf(patternCanvas(240, 160), { filters: allFilters, transforms })
    const options = { backgroundColor: '#ffffff' }
    const asyncCanvas = await renderExportCanvas(image, options)
    const syncCanvas = ImageProcessor.getExportCanvas(image, options)
    expect(maxDiff(asyncCanvas, syncCanvas)).toBe(0)
  })

  it('entspricht getPreviewCanvas bei verkleinerter Vorschau', async () => {
    const image = imageObjectOf(patternCanvas(400, 300), { filters: allFilters, transforms })
    const asyncCanvas = await renderPreviewCanvas(image, 0.5)
    const syncCanvas = ImageProcessor.getPreviewCanvas(image, 0.5)
    expect(maxDiff(asyncCanvas, syncCanvas)).toBe(0)
  })
})

describe('encodeCanvasToBlob', () => {
  it('kodiert JPEG und PNG im Worker in Originalgröße', async () => {
    const source = patternCanvas(120, 80)
    const warn = vi.spyOn(console, 'warn')
    const [jpeg, png] = await Promise.all([
      encodeCanvasToBlob(source, 'image/jpeg', 0.8),
      encodeCanvasToBlob(source, 'image/png', 1),
    ])
    expect(warn).not.toHaveBeenCalled()
    expect(jpeg.type).toBe('image/jpeg')
    expect(png.type).toBe('image/png')
    const bitmap = await createImageBitmap(png)
    expect([bitmap.width, bitmap.height]).toEqual([120, 80])
    bitmap.close()
  })

  it('fällt ohne Worker auf canvas.toBlob zurück', async () => {
    const source = patternCanvas(20, 20)
    const toBlob = vi.spyOn(source, 'toBlob')
    // Worker-Pfad scheitert: createImageBitmap wirft
    vi.spyOn(window, 'createImageBitmap').mockRejectedValueOnce(new Error('kein Bitmap'))
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const blob = await encodeCanvasToBlob(source, 'image/png')
    expect(blob.type).toBe('image/png')
    expect(toBlob).toHaveBeenCalled()
  })
})
