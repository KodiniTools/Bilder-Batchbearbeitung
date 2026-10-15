import { describe, it, expect, vi } from 'vitest'
import JSZip from 'jszip'
import type { ImageObject } from '@/lib/core/types'
import {
  MIN_QUALITY,
  encodeForExport,
  encodeToTargetSize,
  estimateExportSize,
  kbToBytes,
} from '@/lib/features/target-size'
import { exportImagesAsZip } from '@/lib/features/export-zip'
import type { SaveFileHandle } from '@/lib/features/save-file'

/** Verrauschtes Testbild: JPEG/WebP können es kaum komprimieren */
function noisyCanvas(width: number, height: number, seed = 1): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('kein 2D-Kontext')
  const img = ctx.createImageData(width, height)
  let s = seed
  for (let i = 0; i < img.data.length; i += 4) {
    s = (s * 1103515245 + 12345) & 0x7fffffff
    img.data[i] = s & 255
    img.data[i + 1] = (s >> 8) & 255
    img.data[i + 2] = (s >> 16) & 255
    img.data[i + 3] = 255
  }
  ctx.putImageData(img, 0, 0)
  return canvas
}

function imageObject(id: string, canvas: HTMLCanvasElement): ImageObject {
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('kein 2D-Kontext')
  return {
    id,
    file: new File([new Uint8Array(16)], `${id}.png`, { type: 'image/png' }),
    image: new Image(canvas.width, canvas.height),
    canvas,
    ctx,
    originalCanvas: canvas,
    originalWidth: canvas.width,
    originalHeight: canvas.height,
    selected: false,
    outputName: id,
    version: 1,
  }
}

/** Kodierer, dessen Dateigröße linear mit Qualität und Pixelzahl wächst */
function fakeEncoder(bytesPerPixelAtFull: number) {
  return vi.fn(async (canvas: HTMLCanvasElement, mimeType: string, quality: number) => {
    const size = Math.round(canvas.width * canvas.height * bytesPerPixelAtFull * quality)
    return new Blob([new Uint8Array(size)], { type: mimeType })
  })
}

describe('encodeToTargetSize', () => {
  it('behält die gewählte Qualität, wenn die Datei schon passt', async () => {
    const encode = fakeEncoder(1)
    const result = await encodeToTargetSize(
      noisyCanvas(100, 100),
      'image/jpeg',
      0.8,
      { maxBytes: 100_000, allowDownscale: false },
      encode
    )
    expect(result).toMatchObject({ quality: 0.8, scale: 1, reached: true })
    expect(encode).toHaveBeenCalledTimes(1)
  })

  it('sucht die höchste passende Qualität und überschreitet nie den Regler', async () => {
    const encode = fakeEncoder(1)
    // 10 000 px → passt bis Qualität 0.5
    const result = await encodeToTargetSize(
      noisyCanvas(100, 100),
      'image/jpeg',
      0.9,
      { maxBytes: 5_000, allowDownscale: false },
      encode
    )
    expect(result.reached).toBe(true)
    expect(result.blob.size).toBeLessThanOrEqual(5_000)
    expect(result.quality).toBeGreaterThan(0.45)
    expect(result.quality).toBeLessThanOrEqual(0.5)
    for (const call of encode.mock.calls) expect(call[2]).toBeLessThanOrEqual(0.9)
  })

  it('meldet „nicht erreicht“ ohne Verkleinerung und liefert die kleinste Datei', async () => {
    const result = await encodeToTargetSize(
      noisyCanvas(100, 100),
      'image/jpeg',
      0.9,
      { maxBytes: 100, allowDownscale: false },
      fakeEncoder(1)
    )
    expect(result).toMatchObject({ reached: false, scale: 1, quality: MIN_QUALITY })
    expect(result.blob.size).toBe(500)
  })

  it('verkleinert das Bild, wenn erlaubt', async () => {
    const encode = fakeEncoder(1)
    const result = await encodeToTargetSize(
      noisyCanvas(400, 300),
      'image/jpeg',
      0.9,
      { maxBytes: 2_000, allowDownscale: true },
      encode
    )
    expect(result.reached).toBe(true)
    expect(result.scale).toBeLessThan(1)
    expect(result.blob.size).toBeLessThanOrEqual(2_000)
  })

  it('bricht bei der Mindestkantenlänge ab', async () => {
    const result = await encodeToTargetSize(
      noisyCanvas(40, 40),
      'image/jpeg',
      0.9,
      { maxBytes: 1, allowDownscale: true },
      fakeEncoder(1)
    )
    expect(result.reached).toBe(false)
    expect(Math.min(40, 40) * result.scale).toBeGreaterThanOrEqual(16)
  })

  it('erreicht mit echtem JPEG- und WebP-Encoder die Zielgröße', async () => {
    const canvas = noisyCanvas(400, 300)
    for (const mime of ['image/jpeg', 'image/webp']) {
      const full = await encodeForExport(canvas, mime, 0.92)
      const maxBytes = Math.round(full.blob.size * 0.4)
      const result = await encodeForExport(canvas, mime, 0.92, {
        maxBytes,
        allowDownscale: false,
      })
      expect(result.reached, mime).toBe(true)
      expect(result.blob.size, mime).toBeLessThanOrEqual(maxBytes)
      expect(result.blob.type, mime).toBe(mime)
      expect(result.quality, mime).toBeLessThan(0.92)
    }
  })
})

describe('encodeForExport', () => {
  it('ignoriert die Zielgröße bei PNG und meldet das Ergebnis ehrlich', async () => {
    const canvas = noisyCanvas(120, 80)
    const result = await encodeForExport(canvas, 'image/png', 1, {
      maxBytes: 10,
      allowDownscale: true,
    })
    expect(result.blob.type).toBe('image/png')
    expect(result.scale).toBe(1)
    expect(result.reached).toBe(false)
  })

  it('verhält sich ohne Ziel wie die normale Kodierung', async () => {
    const result = await encodeForExport(noisyCanvas(60, 40), 'image/jpeg', 0.7)
    expect(result).toMatchObject({ quality: 0.7, scale: 1, reached: true })
  })
})

describe('estimateExportSize', () => {
  it('rechnet die Stichprobe auf alle Bilder hoch', async () => {
    const images = [1, 2, 3, 4, 5].map((n) => imageObject(`b${n}`, noisyCanvas(80, 60, n)))
    const getCanvas = vi.fn(async (image: ImageObject) => image.canvas)
    const estimate = await estimateExportSize({
      images,
      mimeType: 'image/jpeg',
      quality: 0.9,
      getCanvas,
    })
    expect(getCanvas).toHaveBeenCalledTimes(3)
    expect(estimate?.sampled).toBe(3)
    expect(estimate?.total).toBeCloseTo((estimate?.perImage ?? 0) * 5)
    expect(estimate?.overTarget).toBe(false)
  })

  it('meldet unerreichbare Ziele und liefert bei Abbruch nichts', async () => {
    const images = [imageObject('a', noisyCanvas(200, 150))]
    const getCanvas = async (image: ImageObject) => image.canvas
    const estimate = await estimateExportSize({
      images,
      mimeType: 'image/jpeg',
      quality: 0.9,
      target: { maxBytes: kbToBytes(0.1), allowDownscale: false },
      getCanvas,
    })
    expect(estimate?.overTarget).toBe(true)

    const ctrl = new AbortController()
    ctrl.abort()
    expect(
      await estimateExportSize({
        images,
        mimeType: 'image/jpeg',
        quality: 0.9,
        getCanvas,
        signal: ctrl.signal,
      })
    ).toBeNull()
    expect(await estimateExportSize({ images: [], mimeType: 'image/jpeg', quality: 1 })).toBeNull()
  })
})

describe('exportImagesAsZip mit Zielgröße', () => {
  async function exportZip(maxBytes: number) {
    const images = [
      imageObject('eins', noisyCanvas(300, 200, 1)),
      imageObject('zwei', noisyCanvas(300, 200, 2)),
    ]
    let written: Blob | null = null
    const handle: SaveFileHandle = {
      name: 'test.zip',
      createWritable: async () =>
        ({
          write: async (data: Blob) => {
            written = data
          },
          close: async () => undefined,
        }) as unknown as Awaited<ReturnType<SaveFileHandle['createWritable']>>,
    }
    const { overTarget } = await exportImagesAsZip(
      images,
      'test.zip',
      'jpg',
      92,
      undefined,
      true,
      '#ffffff',
      { kind: 'handle', handle, name: 'test.zip' },
      { maxBytes, allowDownscale: false }
    )
    if (!written) throw new Error('ZIP nicht geschrieben')
    const zip = await JSZip.loadAsync(written)
    const sizes = await Promise.all(
      Object.values(zip.files)
        .filter((f) => !f.dir)
        .map(async (f) => (await f.async('uint8array')).length)
    )
    return { overTarget, sizes }
  }

  it('hält das Limit pro Datei ein', async () => {
    const { overTarget, sizes } = await exportZip(20_000)
    expect(overTarget).toBe(0)
    expect(sizes).toHaveLength(2)
    for (const size of sizes) expect(size).toBeLessThanOrEqual(20_000)
  })

  it('zählt Dateien, die das Limit verfehlen', async () => {
    const { overTarget, sizes } = await exportZip(50)
    expect(overTarget).toBe(2)
    expect(sizes).toHaveLength(2)
  })
})
