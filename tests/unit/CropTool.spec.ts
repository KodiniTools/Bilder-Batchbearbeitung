import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { nextTick } from 'vue'
import CropTool from '@/components/CropTool.vue'

type Rect = { x: number; y: number; w: number; h: number }

// Bild 1376 × 768, angezeigt in halber Größe → Overlay 688 × 384
const IMG_W = 1376
const IMG_H = 768
const OVERLAY_W = 688
const OVERLAY_H = 384

let wrapper: VueWrapper | null = null

beforeEach(() => {
  // happy-dom berechnet kein Layout: Overlay-Größe vorgeben (Overlay liegt bei 0,0)
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(OVERLAY_W)
  vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(OVERLAY_H)
})

afterEach(() => {
  wrapper?.unmount()
  wrapper = null
})

async function mountCrop(lockedRatio: number | null) {
  wrapper = mount(CropTool, {
    props: { imagePixelWidth: IMG_W, imagePixelHeight: IMG_H, lockedRatio },
    attachTo: document.body,
  })
  // initFullCrop läuft im nächsten Animation Frame
  await new Promise((r) => requestAnimationFrame(() => r(null)))
  await nextTick()
  return wrapper
}

function lastCrop(w: VueWrapper): Rect {
  const events = (w.emitted('update:crop') ?? []) as Rect[][]
  expect(events.length).toBeGreaterThan(0)
  return events[events.length - 1][0]
}

/** Seitenverhältnis des Zuschnitts in echten Bildpixeln */
function pixelRatio(r: Rect) {
  return (r.w * IMG_W) / (r.h * IMG_H)
}

function fire(target: EventTarget, type: string, x: number, y: number) {
  target.dispatchEvent(new MouseEvent(type, { clientX: x, clientY: y, bubbles: true }))
}

describe('CropTool', () => {
  it('startet bei 1:1 mit einem in Pixeln quadratischen, zentrierten Rahmen', async () => {
    const w = await mountCrop(1)
    const crop = lastCrop(w)
    expect(pixelRatio(crop)).toBeCloseTo(1, 5)
    expect(crop.h).toBeCloseTo(1, 5) // volle Bildhöhe
    expect(crop.x + crop.w / 2).toBeCloseTo(0.5, 5)
  })

  it('zeigt die Pixelmaße im Badge an', async () => {
    const w = await mountCrop(1)
    expect(w.find('.crop-dims').text()).toBe('768 × 768')
  })

  it('bleibt quadratisch, wenn ein Griff über den Rand hinausgezogen wird', async () => {
    const w = await mountCrop(1)
    // Rahmen erst verkleinern (Griff unten rechts nach innen) …
    const handle = w.find('.handle.se').element
    const start = lastCrop(w)
    const seX = (start.x + start.w) * OVERLAY_W
    const seY = (start.y + start.h) * OVERLAY_H
    fire(handle, 'mousedown', seX, seY)
    fire(document, 'mousemove', seX - 150, seY - 150)
    fire(document, 'mouseup', seX - 150, seY - 150)
    expect(pixelRatio(lastCrop(w))).toBeCloseTo(1, 5)

    // … dann weit über die rechte untere Ecke hinaus ziehen
    await nextTick()
    const mid = lastCrop(w)
    const midX = (mid.x + mid.w) * OVERLAY_W
    const midY = (mid.y + mid.h) * OVERLAY_H
    fire(w.find('.handle.se').element, 'mousedown', midX, midY)
    fire(document, 'mousemove', midX + 2000, midY + 50)
    fire(document, 'mouseup', midX + 2000, midY + 50)

    const end = lastCrop(w)
    expect(pixelRatio(end)).toBeCloseTo(1, 5)
    expect(end.x + end.w).toBeLessThanOrEqual(1 + 1e-9)
    expect(end.y + end.h).toBeLessThanOrEqual(1 + 1e-9)
  })

  it('hält das Verhältnis beim Aufziehen eines neuen Rahmens bis zum Rand', async () => {
    const w = await mountCrop(16 / 9)
    const overlay = w.find('.crop-overlay').element
    // Breiter Zug nach rechts unten: die abgeleitete Höhe passt nicht mehr
    // unter den Startpunkt und muss die Breite mit begrenzen
    fire(overlay, 'mousedown', 100, 300)
    fire(document, 'mousemove', 2000, 400)
    fire(document, 'mouseup', 2000, 400)

    const crop = lastCrop(w)
    expect(pixelRatio(crop)).toBeCloseTo(16 / 9, 5)
    expect(crop.x * OVERLAY_W).toBeCloseTo(100, 5)
    expect(crop.y * OVERLAY_H).toBeCloseTo(300, 5)
    expect(crop.y + crop.h).toBeLessThanOrEqual(1 + 1e-9)
  })

  it('passt den Rahmen beim Wechsel des Verhältnisses korrekt an', async () => {
    const w = await mountCrop(null)
    expect(lastCrop(w)).toEqual({ x: 0, y: 0, w: 1, h: 1 })

    await w.setProps({ lockedRatio: 1 })
    const square = lastCrop(w)
    expect(pixelRatio(square)).toBeCloseTo(1, 5)
    expect(square.y + square.h).toBeLessThanOrEqual(1 + 1e-9)

    await w.setProps({ lockedRatio: 4 / 3 })
    expect(pixelRatio(lastCrop(w))).toBeCloseTo(4 / 3, 5)
  })

  it('erlaubt im freien Modus beliebige Verhältnisse', async () => {
    const w = await mountCrop(null)
    const overlay = w.find('.crop-overlay').element
    fire(overlay, 'mousedown', 10, 10)
    fire(document, 'mousemove', 310, 60)
    fire(document, 'mouseup', 310, 60)
    const crop = lastCrop(w)
    expect(crop.w * OVERLAY_W).toBeCloseTo(300, 5)
    expect(crop.h * OVERLAY_H).toBeCloseTo(50, 5)
  })
})
