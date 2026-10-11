import { describe, it, expect, vi } from 'vitest'
import { buildPdfDocument, type CanvasElement } from '@/lib/features/export-pdf'
import type { FrontPageElement } from '@/components/FrontPageDesigner.vue'

const commentText = (overrides: Partial<CanvasElement> = {}): CanvasElement => ({
  id: 'c1',
  type: 'text',
  x: 40,
  y: 40,
  width: 400,
  height: 80,
  zIndex: 0,
  content: 'Größe äöü ß – Kommentar',
  fontSize: 24,
  fontFamily: 'Chillax',
  bold: true,
  page: 1,
  ...overrides,
})

const frontText: FrontPageElement = {
  id: 'f1',
  type: 'text',
  x: 100,
  y: 200,
  width: 500,
  height: 80,
  content: 'Mein Fotobuch',
  fontSize: 40,
  fontFamily: 'Clash Display',
  fontWeight: 'bold',
  textAlign: 'center',
  color: '#336699',
}

function pdfText(pdf: { output: (type: 'arraybuffer') => ArrayBuffer }): string {
  return new TextDecoder('latin1').decode(pdf.output('arraybuffer'))
}

describe('buildPdfDocument', () => {
  it('setzt Titel, Autor, Ersteller und Sprache als Metadaten', async () => {
    const { pdf } = await buildPdfDocument([], {
      title: 'Urlaub 2026',
      author: 'Kodini',
      includeImages: false,
      labels: { locale: 'de-DE', createdWith: 'Erstellt mit Kodini Tools' },
    })
    const raw = pdfText(pdf)
    expect(raw).toContain('/Title (Urlaub 2026)')
    expect(raw).toContain('/Author (Kodini)')
    expect(raw).toContain('/Creator (Erstellt mit Kodini Tools)')
    expect(raw).toContain('/Lang (de-DE)')
  })

  it('bettet die Designer-Schriften ein und schreibt die Startseite als Text', async () => {
    const { pdf, result } = await buildPdfDocument([], {
      includeCustomFrontPage: true,
      frontPageElements: [frontText],
      includeCommentPages: true,
      commentPageElements: [
        commentText(),
        commentText({ id: 'c2', page: 2, fontFamily: 'Zodiak', italic: true }),
      ],
      includeImages: false,
    })

    const errors = vi.spyOn(console, 'error')
    const fonts = pdf.getFontList()
    expect(fonts['Clash Display']).toContain('bold')
    expect(fonts['Chillax']).toContain('bold')
    expect(fonts['Zodiak']).toContain('bolditalic')
    // Startseite + 2 Kommentarseiten, keine gerasterte Startseite mehr
    expect(result.pageCount).toBe(3)
    const raw = pdfText(pdf)
    expect(raw).not.toContain('/Subtype /Image')
    expect(raw).toContain('/FontFile2')
    expect(errors).not.toHaveBeenCalled()
    errors.mockRestore()
  })

  it('meldet Fortschritt je Seite und fehlgeschlagene Bilder', async () => {
    const onProgress = vi.fn()
    const { result } = await buildPdfDocument([{ originalName: 'kaputt.jpg' }], {
      includeTitlePage: true,
      includeCommentPages: true,
      commentPageElements: [commentText()],
      onProgress,
    })

    expect(result.failedImages).toEqual(['kaputt.jpg'])
    expect(onProgress).toHaveBeenNthCalledWith(1, 0, 3)
    expect(onProgress).toHaveBeenLastCalledWith(3, 3)
  })

  it('bricht mit AbortError ab', async () => {
    const controller = new AbortController()
    controller.abort()
    await expect(buildPdfDocument([], { signal: controller.signal })).rejects.toMatchObject({
      name: 'AbortError',
    })
  })
})
