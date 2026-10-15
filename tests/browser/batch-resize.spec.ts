import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useImageStore } from '@/stores/imageStore'
import { defaultResizeSpec, type ResizeSpec } from '@/lib/core/resize-modes'

async function pngFile(name: string, width: number, height: number): Promise<File> {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('kein 2D-Kontext')
  ctx.fillStyle = '#3366cc'
  ctx.fillRect(0, 0, width, height)
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob'))), 'image/png')
  )
  return new File([blob], name, { type: 'image/png' })
}

function spec(patch: Partial<ResizeSpec>): ResizeSpec {
  return { ...defaultResizeSpec, ...patch }
}

async function storeWith(sizes: Array<[number, number]>) {
  const store = useImageStore()
  await store.addImages(await Promise.all(sizes.map(([w, h], i) => pngFile(`bild-${i}.png`, w, h))))
  store.selectAllImages()
  return store
}

function sizes(store: ReturnType<typeof useImageStore>): string[] {
  return store.images.map((img) => `${img.canvas.width}x${img.canvas.height}`)
}

beforeEach(() => {
  setActivePinia(createPinia())
})

describe('resizeSelectedImages mit Modi', () => {
  it('lange Kante: Hoch- und Querformat, kleinere Bilder bleiben', async () => {
    const store = await storeWith([
      [1200, 800],
      [600, 900],
      [300, 200],
    ])
    const result = await store.resizeSelectedImages(spec({ mode: 'longEdge', longEdge: 450 }))
    expect(result).toEqual({ resized: 2, skipped: 1 })
    expect(sizes(store)).toEqual(['450x300', '300x450', '300x200'])
  })

  it('Prozent wirkt auf die aktuelle Größe und ist rückgängig machbar', async () => {
    const store = await storeWith([[400, 300]])
    const before = store.historyVersion
    await store.resizeSelectedImages(spec({ mode: 'percent', percent: 50 }))
    expect(sizes(store)).toEqual(['200x150'])
    await store.resizeSelectedImages(spec({ mode: 'percent', percent: 50 }))
    expect(sizes(store)).toEqual(['100x75'])
    store.undo()
    expect(sizes(store)).toEqual(['200x150'])
    store.undo()
    expect(sizes(store)).toEqual(['400x300'])
    expect(store.historyVersion).not.toBe(before)
  })

  it('einpassen ohne Änderung erzeugt keinen Historienschritt', async () => {
    const store = await storeWith([[300, 200]])
    const version = store.historyVersion
    const result = await store.resizeSelectedImages(spec({ mode: 'fit', width: 800, height: 800 }))
    expect(result).toEqual({ resized: 0, skipped: 1 })
    expect(store.historyVersion).toBe(version)
    expect(store.resizeProgress.active).toBe(false)
  })

  it('exakt bleibt beim bisherigen Verhalten', async () => {
    const store = await storeWith([[400, 300]])
    await store.resizeSelectedImages(
      spec({ mode: 'exact', width: 200, height: 200, keepAspect: true })
    )
    expect(sizes(store)).toEqual(['200x150'])
    await store.resizeSelectedImages(
      spec({ mode: 'exact', width: 50, height: 60, keepAspect: false })
    )
    expect(sizes(store)).toEqual(['50x60'])
  })
})
