import { describe, it, expect } from 'vitest'
import { fitWithin, layoutImagesOnPage } from '@/lib/designer/library-image'

const A4 = { width: 794, height: 1123 }

describe('fitWithin', () => {
  it('verkleinert auf die längste Kante, vergrößert nie', () => {
    expect(fitWithin(4000, 2000, 1920)).toEqual({ width: 1920, height: 960 })
    expect(fitWithin(1000, 3000, 1920)).toEqual({ width: 640, height: 1920 })
    expect(fitWithin(800, 600, 1920)).toEqual({ width: 800, height: 600 })
  })

  it('liefert 0×0 bei leeren Maßen', () => {
    expect(fitWithin(0, 100, 1920)).toEqual({ width: 0, height: 0 })
  })
})

describe('layoutImagesOnPage', () => {
  it('ohne Bilder: leeres Ergebnis', () => {
    expect(layoutImagesOnPage([], A4)).toEqual([])
  })

  it('ein Bild: höchstens 400 px breit und mittig', () => {
    const [box] = layoutImagesOnPage([{ width: 1600, height: 1200 }], A4)
    expect(box.width).toBe(400)
    expect(box.height).toBe(300)
    expect(box.x).toBe(Math.round((A4.width - 400) / 2))
    expect(box.y).toBe(Math.round((A4.height - 300) / 2))
  })

  it('mehrere Bilder: Raster innerhalb der Seite, ohne Überlappung, Seitenverhältnis bleibt', () => {
    const imgs = [
      { width: 1600, height: 1200 },
      { width: 1200, height: 1600 },
      { width: 1000, height: 1000 },
      { width: 3000, height: 1000 },
      { width: 500, height: 2000 },
    ]
    const boxes = layoutImagesOnPage(imgs, A4)
    expect(boxes).toHaveLength(5)
    boxes.forEach((b, i) => {
      expect(b.x).toBeGreaterThanOrEqual(0)
      expect(b.y).toBeGreaterThanOrEqual(0)
      expect(b.x + b.width).toBeLessThanOrEqual(A4.width)
      expect(b.y + b.height).toBeLessThanOrEqual(A4.height)
      const ratio = imgs[i].width / imgs[i].height
      expect(Math.abs(b.width / b.height - ratio)).toBeLessThan(0.05 * ratio)
    })
    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i]
        const b = boxes[j]
        const overlap =
          a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height
        expect(overlap).toBe(false)
      }
    }
  })
})
