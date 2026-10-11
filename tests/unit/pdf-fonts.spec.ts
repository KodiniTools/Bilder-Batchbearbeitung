import { describe, it, expect } from 'vitest'
import { primaryFontFamily, resolvePdfFont, toPdfFontStyle } from '@/lib/features/pdf-fonts'

describe('pdf-fonts', () => {
  it('liest die erste Familie aus einem CSS-font-family-Wert', () => {
    expect(primaryFontFamily("'Clash Display', Arial, sans-serif")).toBe('Clash Display')
    expect(primaryFontFamily('Chillax')).toBe('Chillax')
    expect(primaryFontFamily(undefined)).toBe('')
  })

  it('bildet bold/italic auf den jsPDF-Stil ab', () => {
    expect(toPdfFontStyle()).toBe('normal')
    expect(toPdfFontStyle(true)).toBe('bold')
    expect(toPdfFontStyle(false, true)).toBe('italic')
    expect(toPdfFontStyle(true, true)).toBe('bolditalic')
  })

  it('findet eingebettete Schnitte inkl. Familien mit Leerzeichen', () => {
    expect(resolvePdfFont('Clash Display', 'bold')).toEqual({
      fontName: 'Clash Display',
      fontStyle: 'bold',
    })
    expect(resolvePdfFont('Zodiak', 'bolditalic')).toEqual({
      fontName: 'Zodiak',
      fontStyle: 'bolditalic',
    })
  })

  it('fällt auf den nächsten vorhandenen Schnitt zurück', () => {
    // Chillax hat keinen Kursivschnitt, Tanker keinen fetten
    expect(resolvePdfFont('Chillax', 'bolditalic').fontStyle).toBe('bold')
    expect(resolvePdfFont('Chillax', 'italic').fontStyle).toBe('normal')
    expect(resolvePdfFont('Tanker', 'bold').fontStyle).toBe('normal')
  })

  it('nutzt Helvetica für Standard- und unbekannte Schriften', () => {
    expect(resolvePdfFont('Helvetica', 'bold')).toEqual({
      fontName: 'helvetica',
      fontStyle: 'bold',
    })
    expect(resolvePdfFont('Comic Sans', 'italic')).toEqual({
      fontName: 'helvetica',
      fontStyle: 'italic',
    })
  })

  it('nutzt Helvetica, wenn die Schrift nicht registriert werden konnte', () => {
    expect(resolvePdfFont('Chillax', 'normal', new Set())).toEqual({
      fontName: 'helvetica',
      fontStyle: 'normal',
    })
  })
})
