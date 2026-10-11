import { describe, it, expect } from 'vitest'
import { PdfImageEncoder, canUseImageWorkers } from '@/lib/features/pdf-image-encoder'
import { buildPdfDocument } from '@/lib/features/export-pdf'

function canvasOf(width: number, height: number, color: string): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('kein 2D-Kontext')
  ctx.fillStyle = color
  ctx.fillRect(0, 0, width, height)
  return canvas
}

function isJpeg(data: Uint8Array | string): boolean {
  return data instanceof Uint8Array && data[0] === 0xff && data[1] === 0xd8
}

const failingFallback = async (): Promise<string> => {
  throw new Error('Hauptthread darf nicht benutzt werden')
}

describe('PdfImageEncoder (Worker)', () => {
  it('kodiert Canvas und Data-URL im Worker als skaliertes JPEG', async () => {
    expect(canUseImageWorkers()).toBe(true)
    const encoder = new PdfImageEncoder(failingFallback, { poolSize: 2 })
    try {
      const [fromCanvas, fromDataUrl] = await Promise.all([
        encoder.encode(canvasOf(1200, 600, '#00aa00'), 400, 0.8),
        encoder.encode(canvasOf(300, 900, '#aa0000').toDataURL('image/png'), 600, 0.8),
      ])
      expect(isJpeg(fromCanvas.data)).toBe(true)
      expect(fromCanvas).toMatchObject({ format: 'JPEG', width: 400, height: 200 })
      expect(isJpeg(fromDataUrl.data)).toBe(true)
      expect(fromDataUrl).toMatchObject({ format: 'JPEG', width: 200, height: 600 })
    } finally {
      encoder.dispose()
    }
  })

  it('verarbeitet mehr Bilder als Worker in der richtigen Zuordnung', async () => {
    const encoder = new PdfImageEncoder(failingFallback, { poolSize: 2 })
    try {
      const sizes = [100, 120, 140, 160, 180]
      const results = await Promise.all(
        sizes.map((w) => encoder.encode(canvasOf(w, 50, '#123456'), 1000, 0.8))
      )
      expect(results.map((r) => r.width)).toEqual(sizes)
    } finally {
      encoder.dispose()
    }
  })

  it('fällt bei einem unlesbaren Bild auf den Hauptthread zurück', async () => {
    const encoder = new PdfImageEncoder(async (src) => src as string, { poolSize: 1 })
    try {
      const broken = 'data:image/png;base64,AAAA'
      const encoded = await encoder.encode(broken, 500, 0.8)
      expect(encoded.data).toBe(broken)
      // Der Worker bleibt nutzbar
      const ok = await encoder.encode(canvasOf(10, 10, '#000'), 500, 0.8)
      expect(isJpeg(ok.data)).toBe(true)
    } finally {
      encoder.dispose()
    }
  })

  it('lehnt nach dispose() wartende Aufträge ab', async () => {
    const encoder = new PdfImageEncoder(failingFallback, { poolSize: 1 })
    const jobs = [1, 2, 3].map(() => encoder.encode(canvasOf(2000, 2000, '#fff'), 2000, 0.9))
    encoder.dispose()
    const settled = await Promise.allSettled(jobs)
    expect(settled.every((s) => s.status === 'rejected')).toBe(true)
  })
})

describe('buildPdfDocument mit getCanvas', () => {
  it('erzeugt Canvas erst beim Export und bettet die Worker-JPEGs ein (auch verschlüsselt)', async () => {
    let created = 0
    const images = ['#ff0000', '#00ff00', '#0000ff', '#ffff00'].map((color, i) => ({
      getCanvas: () => {
        created++
        return canvasOf(800, 600, color)
      },
      originalName: `bild${i}.png`,
    }))
    expect(created).toBe(0)

    const { pdf, result } = await buildPdfDocument(images, {
      includeTitlePage: false,
      maxImageDimension: 400,
      password: 'geheim123',
    })
    expect(created).toBe(4)
    expect(result.failedImages).toEqual([])
    expect(result.pageCount).toBe(4)
    const bytes = new Uint8Array(pdf.output('arraybuffer'))
    expect(new TextDecoder('latin1').decode(bytes.slice(0, 1200))).toContain('%PDF')
    expect(new TextDecoder('latin1').decode(bytes)).toContain('/Encrypt')
  })

  it('meldet eine fehlschlagende getCanvas als fehlerhaftes Bild', async () => {
    const { result } = await buildPdfDocument(
      [
        {
          getCanvas: () => {
            throw new Error('kaputt')
          },
          originalName: 'kaputt.png',
        },
        { getCanvas: () => canvasOf(100, 100, '#000'), originalName: 'ok.png' },
      ],
      { includeTitlePage: false }
    )
    expect(result.failedImages).toEqual(['kaputt.png'])
    expect(result.pageCount).toBe(1)
  })
})
