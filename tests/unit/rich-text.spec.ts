import { describe, it, expect } from 'vitest'
import {
  escapeRichText,
  hasRichMarkup,
  layoutRichText,
  parseRichText,
  stripRichText,
  toggleRichMarker,
  type RichLine,
} from '@/lib/designer/rich-text'
import {
  buildPdfDocument,
  fillElementPlaceholders,
  type PdfElement,
} from '@/lib/features/export-pdf'

const run = (text: string, bold = false, italic = false) => ({ text, bold, italic })

describe('parseRichText', () => {
  it('erkennt fett, kursiv und beides', () => {
    expect(parseRichText('a **b** *c* ***d***')).toEqual([
      run('a '),
      run('b', true),
      run(' '),
      run('c', false, true),
      run(' '),
      run('d', true, true),
    ])
  })

  it('lässt Marker ohne Gegenstück als Text stehen', () => {
    expect(parseRichText('5 * 3')).toEqual([run('5 * 3')])
    expect(parseRichText('**offen')).toEqual([run('**offen')])
    expect(parseRichText('*a* und *b')).toEqual([run('a', false, true), run(' und *b')])
  })

  it('liest \\* als wörtliches Sternchen', () => {
    expect(parseRichText('\\*kein\\* **fett**')).toEqual([run('*kein* '), run('fett', true)])
  })

  it('behält Zeilenumbrüche und Auszeichnung über Zeilen', () => {
    expect(parseRichText('**a\nb**')).toEqual([run('a\nb', true)])
  })

  it('ist ohne Sternchen reiner Text', () => {
    expect(hasRichMarkup('Hallo')).toBe(false)
    expect(hasRichMarkup('**x**')).toBe(true)
    expect(stripRichText('Ein **fettes** *Wort*')).toBe('Ein fettes Wort')
    expect(escapeRichText('A*B')).toBe('A\\*B')
    expect(stripRichText(escapeRichText('A*B*C'))).toBe('A*B*C')
  })
})

describe('toggleRichMarker', () => {
  it('umschließt die Auswahl und wählt den Inhalt aus', () => {
    expect(toggleRichMarker('ein Wort', 4, 8, '**')).toEqual({
      value: 'ein **Wort**',
      selectionStart: 6,
      selectionEnd: 10,
    })
  })

  it('entfernt vorhandene Marker um oder in der Auswahl', () => {
    expect(toggleRichMarker('ein **Wort**', 6, 10, '**').value).toBe('ein Wort')
    expect(toggleRichMarker('ein **Wort**', 4, 12, '**').value).toBe('ein Wort')
    expect(toggleRichMarker('*Wort*', 1, 5, '*').value).toBe('Wort')
  })

  it('unterscheidet fett und kursiv', () => {
    // Kursiv auf fettem Wort: ergänzen, nicht fett entfernen
    expect(toggleRichMarker('**Wort**', 2, 6, '*').value).toBe('***Wort***')
    expect(toggleRichMarker('***Wort***', 3, 7, '*').value).toBe('**Wort**')
    expect(toggleRichMarker('***Wort***', 3, 7, '**').value).toBe('*Wort*')
    expect(toggleRichMarker('*Wort*', 1, 5, '**').value).toBe('***Wort***')
  })

  it('fügt ohne Auswahl ein Markerpaar ein', () => {
    expect(toggleRichMarker('ab', 1, 1, '*')).toEqual({
      value: 'a**b',
      selectionStart: 2,
      selectionEnd: 2,
    })
  })
})

describe('layoutRichText', () => {
  // 1 Einheit je Zeichen, fett doppelt so breit
  const measure = (text: string, bold: boolean) => text.length * (bold ? 2 : 1)
  const texts = (lines: RichLine[]) => lines.map((l) => l.segments.map((s) => s.text).join(''))

  it('bricht an Leerzeichen um und hält Wörter über Stilgrenzen zusammen', () => {
    const lines = layoutRichText(parseRichText('aa **bb**cc dd'), 7, measure)
    expect(texts(lines)).toEqual(['aa', 'bbcc', 'dd'])
    expect(lines[1].segments).toMatchObject([
      { text: 'bb', bold: true, width: 4 },
      { text: 'cc', bold: false, width: 2 },
    ])
    expect(lines[1].width).toBe(6)
  })

  it('übernimmt Zeilenumbrüche und leere Zeilen', () => {
    expect(texts(layoutRichText(parseRichText('a\n\n*b*'), 10, measure))).toEqual(['a', '', 'b'])
  })

  it('bricht überlange Wörter zeichenweise', () => {
    expect(texts(layoutRichText(parseRichText('abcdefg'), 3, measure))).toEqual(['abc', 'def', 'g'])
  })

  it('zählt Leerzeichen am Zeilenende nicht zur Breite', () => {
    const [line] = layoutRichText(parseRichText('ab   '), 10, measure)
    expect(line.width).toBe(2)
  })
})

describe('Rich-Text im PDF', () => {
  const text = (overrides: Partial<PdfElement>): PdfElement => ({
    id: 't',
    type: 'text',
    zIndex: 0,
    x: 40,
    y: 40,
    width: 600,
    height: 80,
    fontSize: 24,
    content: '',
    ...overrides,
  })

  function raw(pdf: { output: (type: 'arraybuffer') => ArrayBuffer }): string {
    return new TextDecoder('latin1').decode(pdf.output('arraybuffer'))
  }

  it('schreibt fette und kursive Abschnitte mit eigenem Schnitt', async () => {
    const { pdf } = await buildPdfDocument([], {
      includeCustomFrontPage: true,
      frontPageElements: [text({ content: 'Ein **fettes** und *schräges* Wort' })],
      includeImages: false,
    })
    const out = raw(pdf)
    expect(out).toContain('(fettes) Tj')
    expect(out).toContain('(schräges) Tj')
    expect(out).not.toContain('**')
    expect(out).toContain('/BaseFont /Helvetica-Bold')
    expect(out).toContain('/BaseFont /Helvetica-Oblique')
  })

  it('bettet für Auszeichnungen den fetten Schnitt der Schrift ein', async () => {
    const { pdf } = await buildPdfDocument([], {
      includeCustomFrontPage: true,
      frontPageElements: [text({ content: 'Satoshi **fett**', fontFamily: 'Satoshi' })],
      includeImages: false,
    })
    expect(pdf.getFontList()['Satoshi']).toEqual(expect.arrayContaining(['normal', 'bold']))
  })

  it('liest Sternchen aus Platzhaltern nicht als Auszeichnung', () => {
    const [filled] = fillElementPlaceholders([text({ content: '{title}' })], {
      title: '*Neu*',
      date: '',
      images: 0,
      author: '',
    })
    expect(stripRichText(filled.content ?? '')).toBe('*Neu*')
  })
})
