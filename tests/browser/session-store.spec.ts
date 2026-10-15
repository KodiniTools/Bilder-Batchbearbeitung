import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import type { ImageObject } from '@/lib/core/types'
import { defaultFilters, defaultWatermark } from '@/lib/core/types'
import { ImageProcessor } from '@/lib/core/image-processor'
import { SessionStore, loadSession } from '@/lib/core/session-store'
import { useImageStore } from '@/stores/imageStore'

async function pngFile(name: string, width: number, height: number, color: string): Promise<File> {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('kein 2D-Kontext')
  ctx.fillStyle = color
  ctx.fillRect(0, 0, width, height)
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, width / 2, height / 4)
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob'))), 'image/png')
  )
  return new File([blob], name, { type: 'image/png' })
}

async function imageOf(name: string, width = 60, height = 40, color = '#2060c0') {
  const img = await ImageProcessor.processFile(await pngFile(name, width, height, color))
  if (!img) throw new Error('processFile')
  return img
}

function pixels(canvas: HTMLCanvasElement): number[] {
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('kein 2D-Kontext')
  return Array.from(ctx.getImageData(0, 0, canvas.width, canvas.height).data)
}

/** Destruktive Änderung wie im Store: Canvas drehen und version erhöhen */
function rotate(img: ImageObject) {
  ImageProcessor.rotateImage(img, 90)
  img.version += 1
}

beforeEach(async () => {
  await new SessionStore().clear()
})

describe('SessionStore', () => {
  it('stellt Reihenfolge, Eigenschaften und bearbeitete Pixel wieder her', async () => {
    const a = await imageOf('a.png', 60, 40)
    const b = await imageOf('b.png', 30, 30, '#c02020')
    rotate(a)
    a.outputName = 'umbenannt'
    a.comment = 'Kommentar'
    a.selected = true
    a.filters = { ...defaultFilters, brightness: 130 }
    a.watermark = { ...defaultWatermark, enabled: true, text: '© Test' }
    a.exportFormat = 'webp'
    a.quality = 0.7

    await new SessionStore().save([b, a])
    const loaded = await loadSession()
    expect(loaded).not.toBeNull()
    expect(loaded?.failed).toBe(0)
    const [rb, ra] = loaded?.images ?? []

    expect(rb.id).toBe(b.id)
    expect(rb.version).toBe(0)
    expect(pixels(rb.canvas)).toEqual(pixels(b.canvas))

    expect(ra).toMatchObject({
      id: a.id,
      version: a.version,
      outputName: 'umbenannt',
      comment: 'Kommentar',
      selected: true,
      exportFormat: 'webp',
      quality: 0.7,
    })
    expect(ra.filters?.brightness).toBe(130)
    expect(ra.watermark?.text).toBe('© Test')
    // Gedrehter Pixelstand, Original bleibt fürs Zurücksetzen erhalten
    expect([ra.canvas.width, ra.canvas.height]).toEqual([40, 60])
    expect(pixels(ra.canvas)).toEqual(pixels(a.canvas))
    expect([ra.originalCanvas.width, ra.originalCanvas.height]).toEqual([60, 40])
    expect(pixels(ra.originalCanvas)).toEqual(pixels(a.originalCanvas))
    expect(ra.file.name).toBe('a.png')
  })

  it('entfernt gelöschte Bilder und überholte Pixelstände', async () => {
    const store = new SessionStore()
    const a = await imageOf('a.png')
    const b = await imageOf('b.png')
    rotate(a)
    await store.save([a, b])

    // b gelöscht, a auf Original zurückgesetzt (version 0 = kein Canvas-PNG)
    ImageProcessor.resetToOriginal(a)
    a.version = 0
    await store.save([a])

    const loaded = await loadSession()
    expect(loaded?.images.map((i) => i.id)).toEqual([a.id])
    expect(loaded?.metas[0].hasCanvas).toBe(false)
    expect([loaded?.images[0].canvas.width, loaded?.images[0].canvas.height]).toEqual([60, 40])
  })

  it('liefert nach clear() keine Sitzung mehr', async () => {
    const store = new SessionStore()
    await store.save([await imageOf('a.png')])
    await store.clear()
    expect(await loadSession()).toBeNull()
  })
})

describe('imageStore Sitzung', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('stellt die Serie wieder her und sichert danach Änderungen', async () => {
    const saved = await imageOf('alt.png')
    await new SessionStore().save([saved])

    const store = useImageStore()
    // Während des Ladens hinzugefügte Bilder bleiben erhalten, hinter der Serie
    await store.addImages([await pngFile('neu.png', 20, 20, '#00aa00')])
    const result = await store.restoreSession()
    expect(result).toEqual({ restored: 1, failed: 0 })
    expect(store.images.map((i) => i.file.name)).toEqual(['alt.png', 'neu.png'])
    expect(store.canUndo).toBe(false)

    store.updateImageName(store.images[1].id, 'neu-umbenannt')
    await store.flushSessionSave()
    const loaded = await loadSession()
    expect(loaded?.images.map((i) => i.outputName)).toEqual(['alt', 'neu-umbenannt'])

    store.clearAllImages()
    await store.flushSessionSave()
    expect(await loadSession()).toBeNull()
  })

  it('speichert vor der Wiederherstellung nichts', async () => {
    await new SessionStore().save([await imageOf('alt.png')])
    const store = useImageStore()
    await store.addImages([await pngFile('neu.png', 20, 20, '#00aa00')])
    store.clearAllImages()
    await store.flushSessionSave()
    expect((await loadSession())?.images).toHaveLength(1)
  })
})
