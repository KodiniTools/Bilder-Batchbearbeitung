/** Normalisiert Text für die Suche: Kleinschreibung, ohne Akzente/Umlaut-Punkte. */
export function normalizeSearchText(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
}

/** Zerlegt eine Suchanfrage in normalisierte Begriffe (Leerzeichen-getrennt). */
export function parseSearchQuery(query: string): string[] {
  return normalizeSearchText(query).split(/\s+/).filter(Boolean)
}

/**
 * true, wenn ALLE Begriffe im Text vorkommen (UND-Verknüpfung).
 * Leere Begriffsliste passt immer.
 */
export function matchesSearchTerms(text: string, terms: string[]): boolean {
  if (terms.length === 0) return true
  const haystack = normalizeSearchText(text)
  return terms.every((term) => haystack.includes(term))
}
