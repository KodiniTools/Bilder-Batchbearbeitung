import type jsPDF from 'jspdf'

/**
 * Eigene Schriften für den PDF-Export.
 *
 * Die TTF-Dateien in src/assets/pdf-fonts/ erzeugt scripts/build-pdf-fonts.py
 * aus public/fonts (gleiche Schnittauswahl wie der Browser). Jede Datei ist ein
 * eigener Lazy-Chunk; geladen wird nur, was ein Export wirklich braucht.
 */

export type PdfFontStyle = 'normal' | 'bold' | 'italic' | 'bolditalic'

/** Fallback-Reihenfolge, wenn ein Schnitt in der Familie fehlt. */
const STYLE_FALLBACKS: Record<PdfFontStyle, PdfFontStyle[]> = {
  normal: ['normal'],
  bold: ['bold', 'normal'],
  italic: ['italic', 'normal'],
  bolditalic: ['bolditalic', 'bold', 'italic', 'normal'],
}

/** Liefert den TTF-Inhalt als Base64 (Vite-Plugin vite-plugins/base64-asset.ts). */
type FontLoader = () => Promise<string>

/** Schlüssel `<Familie ohne Leerzeichen>-<schnitt>` → Loader für die Schriftdaten. */
const FONT_LOADERS: Record<string, FontLoader> = Object.fromEntries(
  Object.entries(
    import.meta.glob<string>('../../assets/pdf-fonts/*.ttf', {
      query: '?base64',
      import: 'default',
    })
  ).map(([path, loader]) => [
    path
      .split('/')
      .pop()
      ?.replace(/\.ttf$/, '') ?? path,
    loader,
  ])
)

/** Cache über Exporte hinweg: Base64-Inhalt je Schrift-Schlüssel. */
const fontDataCache = new Map<string, Promise<string>>()

export interface ResolvedPdfFont {
  /** Name für `pdf.setFont()` */
  fontName: string
  /** Stil für `pdf.setFont()` */
  fontStyle: PdfFontStyle
}

export function toPdfFontStyle(bold?: boolean, italic?: boolean): PdfFontStyle {
  if (bold && italic) return 'bolditalic'
  if (bold) return 'bold'
  if (italic) return 'italic'
  return 'normal'
}

/** Erste Familie aus einem CSS-`font-family`-Wert, ohne Anführungszeichen. */
export function primaryFontFamily(fontFamily?: string): string {
  const first = (fontFamily ?? '').split(',')[0]?.trim() ?? ''
  return first.replace(/^['"]|['"]$/g, '')
}

function fontKey(family: string, style: PdfFontStyle): string {
  return `${family.replace(/\s+/g, '')}-${style}`
}

/**
 * Ermittelt die eingebettete Schrift für Familie + Stil.
 * Fehlt der Schnitt, wird auf den nächsten vorhandenen Schnitt der Familie
 * ausgewichen; unbekannte Familien (z. B. Helvetica) bleiben bei Helvetica.
 */
export function resolvePdfFont(
  fontFamily: string | undefined,
  style: PdfFontStyle,
  available: ReadonlySet<string> = new Set(Object.keys(FONT_LOADERS))
): ResolvedPdfFont {
  const family = primaryFontFamily(fontFamily)
  if (family) {
    for (const candidate of STYLE_FALLBACKS[style]) {
      if (available.has(fontKey(family, candidate))) {
        return { fontName: family, fontStyle: candidate }
      }
    }
  }
  return { fontName: 'helvetica', fontStyle: style }
}

async function loadFontBase64(key: string): Promise<string> {
  let pending = fontDataCache.get(key)
  if (!pending) {
    const loader = FONT_LOADERS[key]
    if (!loader) throw new Error(`Unbekannte PDF-Schrift: ${key}`)
    pending = loader()
    // Fehlgeschlagene Ladeversuche nicht cachen, damit ein erneuter Export es nochmal probiert
    pending.catch(() => fontDataCache.delete(key))
    fontDataCache.set(key, pending)
  }
  return pending
}

/**
 * Lädt und registriert alle benötigten Schriften im Dokument.
 * Liefert die Schlüssel der erfolgreich registrierten Schriften; nicht ladbare
 * Schriften werden geloggt und fallen beim Rendern auf Helvetica zurück.
 */
export async function registerPdfFonts(
  pdf: jsPDF,
  usages: Iterable<{ fontFamily?: string; style: PdfFontStyle }>
): Promise<Set<string>> {
  // Schlüssel → { Familienname wie im Designer (mit Leerzeichen), Stil }
  const needed = new Map<string, ResolvedPdfFont>()
  for (const usage of usages) {
    const resolved = resolvePdfFont(usage.fontFamily, usage.style)
    if (resolved.fontName !== 'helvetica') {
      needed.set(fontKey(resolved.fontName, resolved.fontStyle), resolved)
    }
  }

  const registered = new Set<string>()
  await Promise.all(
    [...needed].map(async ([key, font]) => {
      try {
        const base64 = await loadFontBase64(key)
        pdf.addFileToVFS(`${key}.ttf`, base64)
        pdf.addFont(`${key}.ttf`, font.fontName, font.fontStyle, 'Identity-H')
        // jsPDF meldet kaputte TTF-Daten erst beim Messen; hier früh prüfen
        const previous = pdf.getFont()
        pdf.setFont(font.fontName, font.fontStyle)
        pdf.getTextWidth('Ag')
        pdf.setFont(previous.fontName, previous.fontStyle)
        registered.add(key)
      } catch (error) {
        console.warn(`⚠️ PDF-Schrift ${key} konnte nicht geladen werden, nutze Helvetica`, error)
      }
    })
  )
  return registered
}

/** Setzt die Schrift im Dokument; nicht registrierte Schriften → Helvetica. */
export function applyPdfFont(
  pdf: jsPDF,
  fontFamily: string | undefined,
  style: PdfFontStyle,
  registered: ReadonlySet<string>
): void {
  const resolved = resolvePdfFont(fontFamily, style, registered)
  pdf.setFont(resolved.fontName, resolved.fontStyle)
}
