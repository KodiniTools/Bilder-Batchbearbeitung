import { describe, it, expect } from 'vitest'
import jsPDF from 'jspdf'
import {
  buildPdfDocument,
  layoutImagePage,
  maxImageCommentLines,
  wrapImageComment,
} from '@/lib/features/export-pdf'

function measuringPdf(): jsPDF {
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' })
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(11)
  return pdf
}

describe('wrapImageComment', () => {
  it('liefert nichts für leere Kommentare', () => {
    const pdf = measuringPdf()
    expect(wrapImageComment(pdf, undefined, 190, 10)).toEqual([])
    expect(wrapImageComment(pdf, '  \n ', 190, 10)).toEqual([])
  })

  it('behält Zeilenumbrüche und Leerzeilen', () => {
    const pdf = measuringPdf()
    expect(wrapImageComment(pdf, 'Zeile 1\r\n\nZeile 3', 190, 10)).toEqual([
      'Zeile 1',
      '',
      'Zeile 3',
    ])
  })

  it('bricht lange Zeilen um und kürzt mit „…“', () => {
    const pdf = measuringPdf()
    const long = 'Wort '.repeat(200)
    const lines = wrapImageComment(pdf, long, 60, 3)
    expect(lines).toHaveLength(3)
    expect(lines[2].endsWith('…')).toBe(true)
    for (const line of lines) expect(pdf.getTextWidth(line)).toBeLessThanOrEqual(60.01)
  })
})

describe('layoutImagePage', () => {
  it('ohne Kommentar: Bild mittig mit 10 mm Rand', () => {
    const l = layoutImagePage(210, 297, 1, 0)
    expect(l.width).toBeCloseTo(190)
    expect(l.y).toBeCloseTo((297 - 190) / 2)
  })

  it('mit Kommentar: Bild weicht dem Text, Block bleibt in der Seite', () => {
    const tall = layoutImagePage(210, 297, 0.5, 4)
    const lineMm = 11 * 0.3528 * 1.4
    const bottom = tall.commentY + 4 * lineMm
    expect(tall.y).toBeGreaterThanOrEqual(10 - 1e-9)
    expect(bottom).toBeLessThanOrEqual(297 - 10 + 1e-9)
    expect(tall.commentY).toBeCloseTo(tall.y + tall.height + 4)
  })

  it('begrenzt den Kommentar auf etwa ein Drittel der Seite', () => {
    expect(maxImageCommentLines(297)).toBe(Math.floor((277 * 0.35) / (11 * 0.3528 * 1.4)))
  })
})

describe('Bildseiten im PDF', () => {
  it('enthalten den Kommentar, aber nicht den Dateinamen', async () => {
    // 1×1-PNG; in happy-dom wird es nicht konvertiert, jsPDF bettet es direkt ein
    const dataUrl =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg=='
    const { pdf, result } = await buildPdfDocument(
      [{ dataUrl, originalName: 'IMG_4711.png', comment: 'Strand bei Sonnenuntergang\nTag 2' }],
      { includeTitlePage: false }
    )
    expect(result.failedImages).toEqual([])
    const raw = new TextDecoder('latin1').decode(pdf.output('arraybuffer'))
    expect(raw).toContain('Strand bei Sonnenuntergang')
    expect(raw).toContain('Tag 2')
    expect(raw).not.toContain('IMG_4711')
  })
})
