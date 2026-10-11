/**
 * Kleine Formatierhilfen für übersetzte Texte, die außerhalb von Templates
 * gebraucht werden (Designer-Vorschau und PDF-Export teilen denselben Fußtext).
 */

/** Übersetzungsfunktion, wie sie `useI18n().t` liefert (Teilmenge). */
type Translate = (key: string, named: Record<string, unknown>) => string

/** App-Sprache → BCP-47-Locale für Datumsangaben. */
export function dateLocale(locale: string): string {
  return locale === 'en' ? 'en-GB' : 'de-DE'
}

/** Fußzeile einer Kommentarseite: „Erstellt am … • Kommentarseite 2 von 3“. */
export function commentFooterText(
  t: Translate,
  locale: string,
  page: number,
  total: number
): string {
  const date = new Date().toLocaleDateString(dateLocale(locale))
  return total > 1
    ? t('designer.commentFooterOf', { date, page, total })
    : t('designer.commentFooter', { date, page })
}
