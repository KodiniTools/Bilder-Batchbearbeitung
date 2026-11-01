export type AppLocale = 'de' | 'en'

const LOCALES: readonly AppLocale[] = ['de', 'en']

function asLocale(value: string | null | undefined): AppLocale | null {
  return value && (LOCALES as readonly string[]).includes(value) ? (value as AppLocale) : null
}

/**
 * Startsprache: ?lang=de|en in der URL hat Vorrang (hreflang-Ziel für Google),
 * danach die gespeicherte Wahl, sonst Deutsch.
 */
export function resolveInitialLocale(search: string, stored: string | null): AppLocale {
  const fromUrl = asLocale(new URLSearchParams(search).get('lang'))
  return fromUrl ?? asLocale(stored) ?? 'de'
}

/**
 * Liest die Startsprache und speichert sie, damit Seiten und die SSI-Navigation,
 * die `locale` aus localStorage lesen, dieselbe Sprache anzeigen.
 */
export function initLocale(): AppLocale {
  let stored: string | null = null
  try {
    stored = localStorage.getItem('locale')
  } catch {
    // Speicher gesperrt (z. B. Privatmodus): nur URL/Default nutzen
  }
  const locale = resolveInitialLocale(window.location.search, stored)
  try {
    localStorage.setItem('locale', locale)
  } catch {
    // ignorieren
  }
  return locale
}
