import { describe, it, expect } from 'vitest'
import { buildPdfDocument, isValidPdfPassword, type PdfElement } from '@/lib/features/export-pdf'

function pdfText(pdf: { output: (type: 'arraybuffer') => ArrayBuffer }): string {
  return new TextDecoder('latin1').decode(pdf.output('arraybuffer'))
}

const cover: PdfElement[] = [
  {
    id: 't',
    type: 'text',
    x: 100,
    y: 100,
    width: 500,
    height: 80,
    zIndex: 0,
    content: 'Geheimes Fotobuch',
    fontSize: 32,
    fontFamily: 'Satoshi',
  },
]

describe('isValidPdfPassword', () => {
  it('akzeptiert druckbares ASCII bis 32 Zeichen', () => {
    expect(isValidPdfPassword('Sommer-2026!')).toBe(true)
    expect(isValidPdfPassword('x'.repeat(32))).toBe(true)
  })

  it('lehnt leer, zu lang, Umlaute und Steuerzeichen ab', () => {
    expect(isValidPdfPassword('')).toBe(false)
    expect(isValidPdfPassword('x'.repeat(33))).toBe(false)
    expect(isValidPdfPassword('Größe')).toBe(false)
    expect(isValidPdfPassword('a\tb')).toBe(false)
  })
})

describe('PDF-Passwortschutz', () => {
  it('ohne Passwort unverschlüsselt', async () => {
    const { pdf } = await buildPdfDocument([], { includeImages: false })
    expect(pdfText(pdf)).not.toContain('/Encrypt')
  })

  it('verschlüsselt mit Passwort; Inhalt nicht im Klartext', async () => {
    const { pdf } = await buildPdfDocument([], {
      includeCustomFrontPage: true,
      frontPageElements: cover,
      includeImages: false,
      password: 'geheim',
    })
    const raw = pdfText(pdf)
    expect(raw).toMatch(/\/Encrypt \d+ 0 R/)
    expect(raw).toContain('/Filter /Standard')
    expect(raw).not.toContain('Geheimes Fotobuch')
  })

  it('Drucken erlauben setzt das Druckrecht', async () => {
    const perm = async (allowPrinting: boolean) => {
      const { pdf } = await buildPdfDocument([], {
        includeImages: false,
        password: 'geheim',
        allowPrinting,
      })
      return Number(/\/P (-?\d+)/.exec(pdfText(pdf))?.[1])
    }
    const PRINT_BIT = 4
    expect((await perm(true)) & PRINT_BIT).toBe(PRINT_BIT)
    expect((await perm(false)) & PRINT_BIT).toBe(0)
  })

  it('ungültiges Passwort bricht ab statt ungeschützt zu exportieren', async () => {
    await expect(buildPdfDocument([], { includeImages: false, password: 'Größe' })).rejects.toThrow(
      RangeError
    )
  })
})
