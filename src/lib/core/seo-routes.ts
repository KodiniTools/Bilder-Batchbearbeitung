/**
 * SEO-Konfiguration der Web-Routen – gemeinsame Quelle für die Laufzeit
 * (useSeoMeta) und den Build (vite-plugins/localized-html.ts), damit das
 * ausgelieferte HTML und das per JavaScript gesetzte Meta identisch sind.
 * Bewusst ohne DOM-/Vue-Abhängigkeiten, damit es auch in Node läuft.
 */

export const SEO_BASE_URL = 'https://kodinitools.com/bilderseriebearbeiten'

export type SeoLocale = 'de' | 'en'

export const SEO_LOCALES: readonly SeoLocale[] = ['de', 'en']

export interface RouteSeoConfig {
  titleKey: string
  descriptionKey: string
  path: string
}

/** Schlüssel = Routen-Name in src/router/index.ts */
export const routeSeoConfig: Record<string, RouteSeoConfig> = {
  home: { titleKey: 'seo.home.title', descriptionKey: 'seo.home.description', path: '/' },
  app: { titleKey: 'seo.app.title', descriptionKey: 'seo.app.description', path: '/app' },
  faq: { titleKey: 'seo.faq.title', descriptionKey: 'seo.faq.description', path: '/faq' },
  blog: { titleKey: 'seo.blog.title', descriptionKey: 'seo.blog.description', path: '/blog' },
  articles: {
    titleKey: 'seo.articles.title',
    descriptionKey: 'seo.articles.description',
    path: '/artikel',
  },
}

/** Deutsche URL (x-default) und englische URL (?lang=en) einer Route. */
export function routeUrls(path: string): { deUrl: string; enUrl: string } {
  const deUrl = path === '/' ? `${SEO_BASE_URL}/` : `${SEO_BASE_URL}${path}`
  return { deUrl, enUrl: `${deUrl}?lang=en` }
}
