import { describe, it, expect, vi } from 'vitest'
import { scaledImageSize } from '@/lib/features/pdf-image-size'
import {
  PdfImageEncoder,
  canUseImageWorkers,
  defaultPoolSize,
} from '@/lib/features/pdf-image-encoder'

describe('scaledImageSize', () => {
  it('verkleinert nie, wenn das Bild klein genug ist', () => {
    expect(scaledImageSize(800, 600, 1000)).toEqual({ width: 800, height: 600 })
    expect(scaledImageSize(1000, 1000, 1000)).toEqual({ width: 1000, height: 1000 })
  })

  it('skaliert die längste Seite auf maxDimension', () => {
    expect(scaledImageSize(4000, 3000, 2000)).toEqual({ width: 2000, height: 1500 })
    expect(scaledImageSize(3000, 4000, 2000)).toEqual({ width: 1500, height: 2000 })
  })

  it('liefert bei extremem Seitenverhältnis mindestens 1 px', () => {
    expect(scaledImageSize(100000, 10, 1000)).toEqual({ width: 1000, height: 1 })
  })
})

describe('defaultPoolSize', () => {
  it('nutzt 1–3 Worker und lässt einen Kern frei', () => {
    expect(defaultPoolSize(1)).toBe(1)
    expect(defaultPoolSize(2)).toBe(1)
    expect(defaultPoolSize(3)).toBe(2)
    expect(defaultPoolSize(16)).toBe(3)
  })
})

describe('PdfImageEncoder (ohne Worker)', () => {
  it('fällt in happy-dom auf den Hauptthread zurück', async () => {
    expect(canUseImageWorkers()).toBe(false)
    const fallback = vi.fn(async () => 'data:image/jpeg;base64,AAAA')
    const encoder = new PdfImageEncoder(fallback)
    expect(encoder.concurrency).toBe(1)

    const encoded = await encoder.encode('data:image/png;base64,BBBB', 500, 0.8)
    expect(fallback).toHaveBeenCalledWith('data:image/png;base64,BBBB', 500, 0.8)
    expect(encoded).toEqual({
      data: 'data:image/jpeg;base64,AAAA',
      format: 'JPEG',
      width: 0,
      height: 0,
    })
    encoder.dispose()
  })

  it('erkennt PNG, wenn der Fallback das Original zurückgibt', async () => {
    const encoder = new PdfImageEncoder(async (src) => src as string, { workers: false })
    const encoded = await encoder.encode('data:image/png;base64,CCCC', 500, 0.8)
    expect(encoded.format).toBe('PNG')
  })

  it('reicht Fehler des Fallbacks weiter', async () => {
    const encoder = new PdfImageEncoder(async () => {
      throw new Error('kaputt')
    })
    await expect(encoder.encode('data:image/png;base64,DDDD', 500, 0.8)).rejects.toThrow('kaputt')
  })
})
