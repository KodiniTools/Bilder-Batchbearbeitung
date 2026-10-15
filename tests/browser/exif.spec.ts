import { describe, it, expect } from 'vitest'
import JSZip from 'jszip'
import type { ImageObject } from '@/lib/core/types'
import {
  extractExif,
  insertExif,
  normalizeExif,
  readExifDate,
  readSourceExif,
  withExif,
} from '@/lib/core/exif'
import { exportImagesAsZip } from '@/lib/features/export-zip'
import { encodeForExport } from '@/lib/features/target-size'
import type { SaveFileHandle } from '@/lib/features/save-file'

/** Kleiner TIFF-Block (Little Endian): Make, Orientation 6, Datum, Exif-IFD, IFD1 */
function buildTiff(padding = 0): Uint8Array {
  const out = new Uint8Array(200 + padding)
  const v = new DataView(out.buffer)
  out.set([0x49, 0x49, 0x2a, 0x00])
  v.setUint32(4, 8, true)
  const ifd0 = 8
  const entries = 4
  const ifd0End = ifd0 + 2 + entries * 12 + 4 // 62
  const makePos = ifd0End
  const datePos = makePos + 8
  const exifIfd = datePos + 20
  const exifEnd = exifIfd + 2 + 12 + 4
  const origPos = exifEnd
  const ifd1 = origPos + 20
  const entry = (pos: number, tag: number, type: number, count: number, value: number) => {
    v.setUint16(pos, tag, true)
    v.setUint16(pos + 2, type, true)
    v.setUint32(pos + 4, count, true)
    if (type === 3 && count === 1) v.setUint16(pos + 8, value, true)
    else v.setUint32(pos + 8, value, true)
  }
  const text = (pos: number, s: string) => {
    for (let i = 0; i < s.length; i++) out[pos + i] = s.charCodeAt(i)
  }
  v.setUint16(ifd0, entries, true)
  entry(ifd0 + 2, 0x010f, 2, 8, makePos)
  entry(ifd0 + 14, 0x0112, 3, 1, 6)
  entry(ifd0 + 26, 0x0132, 2, 20, datePos)
  entry(ifd0 + 38, 0x8769, 4, 1, exifIfd)
  v.setUint32(ifd0 + 50, ifd1, true)
  text(makePos, 'TestCam\0')
  text(datePos, '2020:01:01 00:00:00\0')
  v.setUint16(exifIfd, 1, true)
  entry(exifIfd + 2, 0x9003, 2, 20, origPos)
  v.setUint32(exifIfd + 14, 0, true)
  text(origPos, '2024:06:15 14:30:00\0')
  v.setUint16(ifd1, 1, true)
  entry(ifd1 + 2, 0x0103, 3, 1, 6)
  v.setUint32(ifd1 + 14, 0, true)
  return out
}

function orientation(tiff: Uint8Array): number {
  const v = new DataView(tiff.buffer, tiff.byteOffset)
  return v.getUint16(8 + 2 + 12 + 8, true)
}

function nextIfd(tiff: Uint8Array): number {
  return new DataView(tiff.buffer, tiff.byteOffset).getUint32(8 + 2 + 4 * 12, true)
}

function canvas(width: number, height: number, alpha = false): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = width
  c.height = height
  const ctx = c.getContext('2d')
  if (!ctx) throw new Error('kein 2D-Kontext')
  ctx.fillStyle = alpha ? 'rgba(200, 50, 50, 0.5)' : '#c83232'
  ctx.fillRect(0, 0, width, height)
  return c
}

function encode(c: HTMLCanvasElement, mime: string, quality = 0.9): Promise<Blob> {
  return new Promise((resolve, reject) =>
    c.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob'))), mime, quality)
  )
}

function noisyCanvas(width: number, height: number): HTMLCanvasElement {
  const c = canvas(width, height)
  const ctx = c.getContext('2d') as CanvasRenderingContext2D
  const img = ctx.getImageData(0, 0, width, height)
  let seed = 7
  for (let i = 0; i < img.data.length; i += 4) {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff
    img.data[i + 1] = seed & 255
  }
  ctx.putImageData(img, 0, 0)
  return c
}

async function bytes(blob: Blob): Promise<Uint8Array> {
  return new Uint8Array(await blob.arrayBuffer())
}

async function jpegWithExif(width = 120, height = 80): Promise<File> {
  const raw = await bytes(await encode(canvas(width, height), 'image/jpeg'))
  const out = insertExif(raw, 'image/jpeg', buildTiff())
  if (!out) throw new Error('EXIF nicht eingefügt')
  return new File([out], 'foto.jpg', { type: 'image/jpeg' })
}

describe('EXIF lesen und normalisieren', () => {
  it('liest den TIFF-Block aus JPEG und setzt Ausrichtung und IFD1 zurück', async () => {
    const tiff = extractExif(await bytes(await jpegWithExif()))
    expect(tiff).toEqual(buildTiff())
    const normalized = normalizeExif(tiff as Uint8Array) as Uint8Array
    expect(orientation(normalized)).toBe(1)
    expect(nextIfd(normalized)).toBe(0)
    expect(orientation(tiff as Uint8Array)).toBe(6) // Original unverändert
    expect(readExifDate(normalized)).toEqual(new Date(2024, 5, 15, 14, 30, 0))
  })

  it('liefert null für Dateien ohne EXIF und kaputte Daten', async () => {
    expect(extractExif(await bytes(await encode(canvas(10, 10), 'image/png')))).toBeNull()
    expect(extractExif(new Uint8Array([0xff, 0xd8, 0xff, 0xe1, 0x00]))).toBeNull()
    expect(normalizeExif(new Uint8Array([0x49, 0x49, 0x2a, 0x00, 0xff, 0xff, 0, 0]))).toBeNull()
    expect(
      await readSourceExif(new File([await encode(canvas(4, 4), 'image/jpeg')], 'x.jpg'))
    ).toBeNull()
  })
})

describe('EXIF einfügen', () => {
  const cases: Array<[string, string, boolean]> = [
    ['JPEG', 'image/jpeg', false],
    ['PNG', 'image/png', true],
    ['WebP verlustbehaftet', 'image/webp', false],
    ['WebP mit Alpha', 'image/webp', true],
  ]
  for (const [label, mime, alpha] of cases) {
    it(`${label}: Daten sind wieder lesbar und das Bild bleibt dekodierbar`, async () => {
      const tiff = normalizeExif(buildTiff()) as Uint8Array
      const blob = await withExif(await encode(canvas(97, 61, alpha), mime), tiff)
      expect(blob.type).toBe(mime)
      expect(extractExif(await bytes(blob))).toEqual(tiff)
      const bitmap = await createImageBitmap(blob)
      expect([bitmap.width, bitmap.height]).toEqual([97, 61])
    })
  }

  it('WebP verlustfrei (VP8L) bekommt einen VP8X-Kopf', async () => {
    const tiff = normalizeExif(buildTiff()) as Uint8Array
    const blob = await withExif(await encode(canvas(33, 21), 'image/webp', 1), tiff)
    const data = await bytes(blob)
    expect(String.fromCharCode(...data.subarray(12, 16))).toBe('VP8X')
    expect(extractExif(data)).toEqual(tiff)
    const bitmap = await createImageBitmap(blob)
    expect([bitmap.width, bitmap.height]).toEqual([33, 21])
  })

  it('überspringt JPEG, wenn der Block nicht in ein APP1-Segment passt', async () => {
    const raw = await bytes(await encode(canvas(10, 10), 'image/jpeg'))
    expect(insertExif(raw, 'image/jpeg', buildTiff(70000))).toBeNull()
    expect(insertExif(raw, 'image/gif', buildTiff())).toBeNull()
  })

  it('Zielgröße berücksichtigt die EXIF-Bytes', async () => {
    const tiff = normalizeExif(buildTiff(3000)) as Uint8Array
    const c = noisyCanvas(400, 300)
    const plain = await encodeForExport(c, 'image/jpeg', 0.92)
    // Ohne Reserve würde die Datei mit EXIF das Limit sprengen
    const maxBytes = plain.blob.size + 1000
    const result = await encodeForExport(
      c,
      'image/jpeg',
      0.92,
      { maxBytes, allowDownscale: false },
      tiff
    )
    expect(result.reached).toBe(true)
    expect(result.blob.size).toBeLessThanOrEqual(maxBytes)
    expect(extractExif(await bytes(result.blob))).toEqual(tiff)
  })
})

describe('ZIP-Export mit EXIF', () => {
  async function exportZip(keepExif: boolean, format: string) {
    const file = await jpegWithExif()
    const source = canvas(120, 80)
    const ctx = source.getContext('2d') as CanvasRenderingContext2D
    const image: ImageObject = {
      id: 'e',
      file,
      image: new Image(120, 80),
      canvas: source,
      ctx,
      originalCanvas: source,
      originalWidth: 120,
      originalHeight: 80,
      selected: true,
      outputName: 'foto',
      version: 1,
    }
    let written: Blob | null = null
    const handle: SaveFileHandle = {
      name: 'x.zip',
      createWritable: async () =>
        ({
          write: async (data: Blob) => {
            written = data
          },
          close: async () => undefined,
        }) as unknown as Awaited<ReturnType<SaveFileHandle['createWritable']>>,
    }
    await exportImagesAsZip(
      [image],
      'x.zip',
      format,
      90,
      undefined,
      true,
      '#ffffff',
      { kind: 'handle', handle, name: 'x.zip' },
      null,
      keepExif
    )
    if (!written) throw new Error('ZIP nicht geschrieben')
    const zip = await JSZip.loadAsync(written)
    const entry = Object.values(zip.files).find((f) => !f.dir)
    return extractExif(await (entry as JSZip.JSZipObject).async('uint8array'))
  }

  it('übernimmt EXIF nur auf Wunsch, mit Ausrichtung 1', async () => {
    expect(await exportZip(false, 'jpg')).toBeNull()
    for (const format of ['jpg', 'png', 'webp']) {
      const tiff = await exportZip(true, format)
      expect(tiff, format).not.toBeNull()
      expect(orientation(tiff as Uint8Array), format).toBe(1)
      expect(readExifDate(tiff as Uint8Array), format).toEqual(new Date(2024, 5, 15, 14, 30, 0))
    }
  })
})
