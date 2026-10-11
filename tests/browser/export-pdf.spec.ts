import { describe, it, expect } from 'vitest'
import { buildPdf, buildPdfDocument, type PdfElement } from '@/lib/features/export-pdf'

/** Teiltransparentes PNG: links farbig, rechts transparent. */
function transparentPng(color: string): string {
  const canvas = document.createElement('canvas')
  canvas.width = 40
  canvas.height = 20
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('kein 2D-Kontext')
  ctx.fillStyle = color
  ctx.fillRect(0, 0, 20, 20)
  return canvas.toDataURL('image/png')
}

function solidCanvas(color: string): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = 300
  canvas.height = 200
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('kein 2D-Kontext')
  ctx.fillStyle = color
  ctx.fillRect(0, 0, 300, 200)
  return canvas
}

describe('buildPdfDocument (Browser)', () => {
  it('erzeugt Startseite mit Text + Bild und Bildseiten mit eingebetteter Schrift', async () => {
    const front: PdfElement[] = [
      {
        id: 't',
        type: 'text',
        zIndex: 1,
        x: 80,
        y: 100,
        width: 600,
        height: 80,
        content: 'Fotobuch',
        fontSize: 48,
        fontFamily: 'Satoshi',
        bold: true,
      },
      {
        id: 'i',
        type: 'image',
        zIndex: 0,
        x: 80,
        y: 300,
        width: 400,
        height: 200,
        opacity: 0.5,
        src: transparentPng('#0000ff'),
      },
    ]
    const progress: [number, number][] = []

    const { pdf, result } = await buildPdfDocument(
      [
        { canvas: solidCanvas('#00aa00'), originalName: 'gruen.png' },
        { dataUrl: transparentPng('#ff0000'), originalName: 'rot.png' },
      ],
      {
        title: 'Test',
        includeCustomFrontPage: true,
        frontPageElements: front,
        onProgress: (done, total) => progress.push([done, total]),
      }
    )

    expect(result).toEqual({ pageCount: 3, failedImages: [] })
    expect(progress.at(-1)).toEqual([3, 3])
    expect(pdf.getFontList()['Satoshi']).toContain('bold')

    const raw = new TextDecoder('latin1').decode(pdf.output('arraybuffer'))
    // Startseiten-Bild + 2 Bildseiten, alle als JPEG (DCTDecode)
    expect(raw.match(/\/Filter \/DCTDecode/g)?.length).toBe(3)
    expect(raw).toContain('/FontFile2')
    // Deckkraft des Startseiten-Bildes als ExtGState
    expect(raw).toContain('/ca 0.5')
  })

  it('buildPdf gibt ein vollständiges PDF-Blob zurück', async () => {
    const blob = await buildPdf([{ canvas: solidCanvas('#123456'), originalName: 'a.png' }], {
      includeTitlePage: false,
    })
    expect(blob.type).toBe('application/pdf')
    const text = new TextDecoder('latin1').decode(await blob.arrayBuffer())
    expect(text.startsWith('%PDF-')).toBe(true)
    expect(text.trimEnd().endsWith('%%EOF')).toBe(true)
  })
})
