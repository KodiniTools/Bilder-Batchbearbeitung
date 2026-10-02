import { describe, it, expect } from 'vitest'
import { cropNormToPixels } from '@/composables/useEditorCanvas'

describe('cropNormToPixels', () => {
  it('rechnet einen freien Zuschnitt in Bildpixel um', () => {
    expect(cropNormToPixels({ x: 0.25, y: 0.5, w: 0.5, h: 0.25 }, 1000, 800, null)).toEqual({
      x: 250,
      y: 400,
      w: 500,
      h: 200,
    })
  })

  it('liefert bei 1:1 exakt quadratische Maße trotz Rundungsabweichung', () => {
    // 768/1376 ≈ 0.55814 → Breite 768; Höhe leicht < 1 → getrennt gerundet wären es 767
    const res = cropNormToPixels({ x: 0.2, y: 0, w: 768 / 1376, h: 0.9993 }, 1376, 768, 1)
    expect(res.w).toBe(768)
    expect(res.h).toBe(768)
  })

  it.each([
    [4 / 3, 1600, 1200],
    [16 / 9, 1920, 1080],
  ])('hält Verhältnis %s ein', (ratio, imgW, imgH) => {
    const res = cropNormToPixels({ x: 0, y: 0, w: 0.5, h: 0.5 }, imgW, imgH, ratio)
    expect(Math.abs(res.w / res.h - ratio)).toBeLessThan(0.01)
  })

  it('verkleinert die Breite, wenn die abgeleitete Höhe nicht ins Bild passt', () => {
    const res = cropNormToPixels({ x: 0, y: 0, w: 1, h: 1 }, 1376, 768, 1)
    expect(res).toEqual({ x: 0, y: 0, w: 768, h: 768 })
  })

  it('verschiebt den Ausschnitt ins Bild, statt über den Rand zu ragen', () => {
    const res = cropNormToPixels({ x: 0.9, y: 0.9, w: 0.5, h: 0.5 }, 1000, 1000, null)
    expect(res.x + res.w).toBeLessThanOrEqual(1000)
    expect(res.y + res.h).toBeLessThanOrEqual(1000)
  })

  it('liefert mindestens 1 × 1 Pixel', () => {
    expect(cropNormToPixels({ x: 0, y: 0, w: 0, h: 0 }, 100, 100, null)).toMatchObject({
      w: 1,
      h: 1,
    })
  })
})
