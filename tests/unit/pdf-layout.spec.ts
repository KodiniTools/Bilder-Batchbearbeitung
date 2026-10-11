import { describe, it, expect } from 'vitest'
import {
  buildPdfDocument,
  fillPlaceholders,
  gridCells,
  imageContentArea,
  imageGrid,
  layoutImageCell,
  resolvePageSize,
} from '@/lib/features/export-pdf'

const PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg=='

function rawText(pdf: { output: (t: 'arraybuffer') => ArrayBuffer }): string {
  return new TextDecoder('latin1').decode(pdf.output('arraybuffer'))
}

describe('resolvePageSize', () => {
  it('liefert Formate passend zur Ausrichtung', () => {
    expect(resolvePageSize('a4', 'portrait')).toEqual({ width: 210, height: 297 })
    expect(resolvePageSize('a5', 'landscape')).toEqual({ width: 210, height: 148 })
    expect(resolvePageSize('square', 'landscape')).toEqual({ width: 210, height: 210 })
  })

  it('begrenzt benutzerdefinierte Maße', () => {
    expect(resolvePageSize('custom', 'portrait', { width: 10, height: 5000 })).toEqual({
      width: 50,
      height: 1000,
    })
    expect(resolvePageSize('custom', 'portrait', { width: NaN, height: 200 })).toEqual({
      width: 50,
      height: 200,
    })
  })
})

describe('Raster', () => {
  it('ordnet Spalten und Zeilen je Ausrichtung zu', () => {
    expect(imageGrid(2, false)).toEqual({ cols: 1, rows: 2 })
    expect(imageGrid(2, true)).toEqual({ cols: 2, rows: 1 })
    expect(imageGrid(6, false)).toEqual({ cols: 2, rows: 3 })
    expect(imageGrid(9, true)).toEqual({ cols: 3, rows: 3 })
  })

  it('Zellen füllen die Inhaltsfläche ohne Überlappung', () => {
    const area = imageContentArea(210, 297, 10, { header: true, footer: true })
    expect(area).toEqual({ x: 10, y: 18, width: 190, height: 261 })
    const cells = gridCells(area, 2, 2)
    expect(cells).toHaveLength(4)
    expect(cells[1].x).toBeGreaterThan(cells[0].x + cells[0].width)
    const last = cells[3]
    expect(last.x + last.width).toBeCloseTo(200)
    expect(last.y + last.height).toBeCloseTo(279)
  })

  it('„Füllen“ deckt die Zelle ab und beschneidet', () => {
    const cell = { x: 0, y: 0, width: 100, height: 100 }
    const l = layoutImageCell(cell, 2, 0, 5, 'cover')
    expect(l.height).toBeCloseTo(100)
    expect(l.width).toBeCloseTo(200)
    expect(l.x).toBeCloseTo(-50)
    expect(l.clip).toEqual(cell)
    const c = layoutImageCell(cell, 2, 0, 5, 'contain')
    expect(c.width).toBeCloseTo(100)
    expect(c.clip).toBeUndefined()
  })
})

describe('fillPlaceholders', () => {
  it('ersetzt alle Platzhalter', () => {
    expect(
      fillPlaceholders('{title} – {page}/{total} – {date} {page}', {
        page: 2,
        total: 5,
        title: 'Urlaub',
        date: '11.10.2026',
      })
    ).toBe('Urlaub – 2/5 – 11.10.2026 2')
  })
})

describe('PDF-Layout', () => {
  const images = Array.from({ length: 5 }, (_, i) => ({
    dataUrl: PNG,
    originalName: `IMG_${i}.png`,
    comment: i === 0 ? 'Erstes Bild' : undefined,
  }))

  it('4 Bilder pro Seite: 5 Bilder → Titelseite + 2 Bildseiten im A5-Format', async () => {
    const { pdf, result } = await buildPdfDocument(images, {
      pageFormat: 'a5',
      imagesPerPage: 4,
    })
    expect(result.pageCount).toBe(3)
    expect(pdf.internal.pageSize.getWidth()).toBeCloseTo(148)
    expect(pdf.internal.pageSize.getHeight()).toBeCloseTo(210)
  })

  it('schreibt Kopfzeile, Fußzeile und Seitenzahlen, nicht auf die Startseite', async () => {
    const { pdf } = await buildPdfDocument(images, {
      title: 'Urlaub',
      imagesPerPage: 9,
      header: 'Kopf {title}',
      footer: 'Fuss {page} von {total}',
      pageNumbers: true,
    })
    const raw = rawText(pdf)
    expect(raw).toContain('Kopf Urlaub')
    expect(raw).toContain('Fuss 2 von 2')
    expect(raw).not.toContain('Fuss 1 von 2')
    expect(raw).toContain('2 / 2')
  })

  it('legt Lesezeichen an (ohne Dateinamen)', async () => {
    const { pdf } = await buildPdfDocument(images, { imagesPerPage: 2 })
    const raw = rawText(pdf)
    expect(raw).toContain('/Outlines')
    expect(raw).toContain('Startseite')
    expect(raw).toContain('Bild 1: Erstes Bild')
    expect(raw).toContain('Bild 5')
    expect(raw).not.toContain('IMG_0')
  })

  it('ohne Lesezeichen kein Inhaltsverzeichnis', async () => {
    const { pdf } = await buildPdfDocument(images, { bookmarks: false })
    expect(rawText(pdf)).not.toContain('Bild 1: Erstes Bild')
  })
})
