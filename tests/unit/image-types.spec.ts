import { describe, expect, it } from 'vitest'
import {
  IMAGE_ACCEPT,
  imageTypeFromName,
  normalizeImageFile,
  resolveImageType,
} from '@/lib/core/image-types'
import { zipEntryImageType } from '@/lib/features/import-zip'
import { WATERMARK_LOGO_ACCEPT } from '@/lib/core/watermark-logo'

describe('image-types', () => {
  it('erkennt AVIF über die Endung, unabhängig von Gross-/Kleinschreibung', () => {
    expect(imageTypeFromName('foto.avif')).toBe('image/avif')
    expect(imageTypeFromName('FOTO.AVIF')).toBe('image/avif')
    expect(imageTypeFromName('bild.jpeg')).toBe('image/jpeg')
    expect(imageTypeFromName('notiz.txt')).toBeNull()
    expect(imageTypeFromName('.avif')).toBeNull()
    expect(imageTypeFromName('ohne-endung')).toBeNull()
  })

  it('bevorzugt den gemeldeten Bildtyp und ergänzt fehlende Typen', () => {
    expect(resolveImageType({ name: 'x.avif', type: 'image/avif' })).toBe('image/avif')
    expect(resolveImageType({ name: 'x.avif', type: '' })).toBe('image/avif')
    expect(resolveImageType({ name: 'x.avif', type: 'application/octet-stream' })).toBe(
      'image/avif'
    )
    expect(resolveImageType({ name: 'x.txt', type: 'text/plain' })).toBeNull()
  })

  it('setzt den MIME-Typ einer AVIF-Datei ohne Typ und lässt typisierte Dateien unverändert', () => {
    const untyped = new File([new Uint8Array([1, 2, 3])], 'foto.avif', {
      type: '',
      lastModified: 1234,
    })
    const fixed = normalizeImageFile(untyped)
    expect(fixed).not.toBeNull()
    expect(fixed?.type).toBe('image/avif')
    expect(fixed?.name).toBe('foto.avif')
    expect(fixed?.size).toBe(3)
    expect(fixed?.lastModified).toBe(1234)

    const typed = new File([new Uint8Array([1])], 'a.png', { type: 'image/png' })
    expect(normalizeImageFile(typed)).toBe(typed)
    expect(normalizeImageFile(new File(['x'], 'a.txt', { type: 'text/plain' }))).toBeNull()
  })

  it('zeigt AVIF in allen Bild-Dateiauswahlen an', () => {
    expect(IMAGE_ACCEPT.split(',')).toEqual(expect.arrayContaining(['image/*', '.avif']))
    expect(WATERMARK_LOGO_ACCEPT.split(',')).toEqual(
      expect.arrayContaining(['image/avif', '.avif'])
    )
  })

  it('übernimmt AVIF aus ZIP-Archiven', () => {
    expect(zipEntryImageType('ordner/bild.AVIF')).toBe('image/avif')
  })
})
