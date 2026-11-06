import { describe, it, expect } from 'vitest'
import type { ImageObject } from '@/lib/core/types'
import { defaultFilters, defaultTransforms, defaultWatermark } from '@/lib/core/types'
import { createThumbnail, libraryImageToSource } from '@/lib/designer/library-image'

function canvasOf(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D
  ctx.fillStyle = '#336699'
  ctx.fillRect(0, 0, width, height)
  return canvas
}

function imageObjectOf(canvas: HTMLCanvasElement): ImageObject {
  return {
    id: 'lib',
    file: new File([], 'lib.png'),
    image: new Image(),
    canvas,
    ctx: canvas.getContext('2d') as CanvasRenderingContext2D,
    originalCanvas: canvas,
    originalWidth: canvas.width,
    originalHeight: canvas.height,
    selected: false,
    outputName: 'lib',
    version: 0,
    filters: { ...defaultFilters },
    transforms: { ...defaultTransforms },
    watermark: { ...defaultWatermark },
  }
}

async function decode(src: string): Promise<HTMLImageElement> {
  const img = new Image()
  img.src = src
  await img.decode()
  return img
}

describe('libraryImageToSource', () => {
  it('kodiert als JPEG und verkleinert auf die längste Kante', async () => {
    const result = await libraryImageToSource(imageObjectOf(canvasOf(3000, 1500)), 1200)
    expect(result.src.startsWith('data:image/jpeg')).toBe(true)
    expect([result.width, result.height]).toEqual([1200, 600])
    const img = await decode(result.src)
    expect([img.naturalWidth, img.naturalHeight]).toEqual([1200, 600])
  })

  it('kleine Bilder bleiben in Originalgröße', async () => {
    const result = await libraryImageToSource(imageObjectOf(canvasOf(320, 200)))
    expect([result.width, result.height]).toEqual([320, 200])
  })
})

describe('createThumbnail', () => {
  it('liefert ein kleines JPEG', async () => {
    const thumb = createThumbnail(canvasOf(1000, 500), 160)
    const img = await decode(thumb)
    expect([img.naturalWidth, img.naturalHeight]).toEqual([160, 80])
  })
})
