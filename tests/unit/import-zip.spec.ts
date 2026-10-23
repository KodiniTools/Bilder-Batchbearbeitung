import { describe, it, expect } from 'vitest'
import JSZip from 'jszip'
import {
  extractImagesFromZip,
  isZipFile,
  zipEntryImageType,
  ZipImportError,
} from '@/lib/features/import-zip'

async function makeZip(entries: Record<string, string>, name = 'bilder.zip'): Promise<File> {
  const zip = new JSZip()
  for (const [path, content] of Object.entries(entries)) zip.file(path, content)
  const data = await zip.generateAsync({ type: 'arraybuffer' })
  return new File([data], name, { type: 'application/zip' })
}

describe('isZipFile', () => {
  it('erkennt ZIP über MIME-Typ oder Endung', () => {
    expect(isZipFile(new File([], 'a.zip', { type: 'application/zip' }))).toBe(true)
    expect(isZipFile(new File([], 'a', { type: 'application/x-zip-compressed' }))).toBe(true)
    expect(isZipFile(new File([], 'Archiv.ZIP'))).toBe(true)
    expect(isZipFile(new File([], 'bild.png', { type: 'image/png' }))).toBe(false)
  })
})

describe('zipEntryImageType', () => {
  it('liefert den MIME-Typ unterstützter Bilder', () => {
    expect(zipEntryImageType('foto.JPG')).toBe('image/jpeg')
    expect(zipEntryImageType('a/b/grafik.png')).toBe('image/png')
    expect(zipEntryImageType('x.webp')).toBe('image/webp')
  })

  it('überspringt Metadaten, versteckte und fremde Dateien', () => {
    expect(zipEntryImageType('__MACOSX/a/._foto.jpg')).toBeNull()
    expect(zipEntryImageType('a/._foto.jpg')).toBeNull()
    expect(zipEntryImageType('.hidden/foto.jpg')).toBeNull()
    expect(zipEntryImageType('readme.txt')).toBeNull()
    expect(zipEntryImageType('.png')).toBeNull()
    expect(zipEntryImageType('ohne-endung')).toBeNull()
  })
})

describe('extractImagesFromZip', () => {
  it('liest Bilder aus Unterordnern flach und natürlich sortiert ein', async () => {
    const zip = await makeZip({
      'serie/bild10.png': 'c',
      'serie/bild2.png': 'b',
      'bild1.jpg': 'a',
      'serie/notiz.txt': 'x',
      '__MACOSX/serie/._bild2.png': 'm',
    })
    const { images, skipped } = await extractImagesFromZip(zip)
    expect(images.map((f) => f.name)).toEqual(['bild1.jpg', 'bild2.png', 'bild10.png'])
    expect(images.map((f) => f.type)).toEqual(['image/jpeg', 'image/png', 'image/png'])
    expect(await images[0].text()).toBe('a')
    expect(skipped).toBe(2)
  })

  it('liefert eine leere Liste ohne unterstützte Bilder', async () => {
    const { images, skipped } = await extractImagesFromZip(await makeZip({ 'a.txt': 'x' }))
    expect(images).toEqual([])
    expect(skipped).toBe(1)
  })

  it('meldet defekte Archive als invalid', async () => {
    const broken = new File(['kein zip'], 'kaputt.zip', { type: 'application/zip' })
    await expect(extractImagesFromZip(broken)).rejects.toMatchObject({ code: 'invalid' })
  })

  it('bricht bei zu vielen Bildern oder zu großer Datenmenge ab', async () => {
    const zip = await makeZip({ 'a.png': '1234', 'b.png': '5678' })
    await expect(extractImagesFromZip(zip, { maxImages: 1 })).rejects.toBeInstanceOf(ZipImportError)
    await expect(extractImagesFromZip(zip, { maxTotalBytes: 6 })).rejects.toMatchObject({
      code: 'tooLarge',
    })
  })
})
