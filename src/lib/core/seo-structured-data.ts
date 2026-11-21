/**
 * Strukturierte Daten (JSON-LD) und sprachabhängiges Bild-/Keyword-Meta.
 * Gemeinsame Quelle für den Build (vite-plugins/localized-html.ts) und die
 * Laufzeit (useSeoMeta), Texte kommen aus src/locales/*.json (`seo.*`, `faq.*`).
 * Bewusst ohne DOM-/Vue-Abhängigkeiten, damit es auch in Node läuft.
 */
import { routeSeoConfig, routeUrls, SEO_BASE_URL, type SeoLocale } from './seo-routes'

export type SeoMessages = Record<string, unknown>

/** Anzahl der Fragen auf der FAQ-Seite (src/views/FaqPage.vue) */
export const FAQ_QUESTION_COUNT = 8

const SITE_URL = 'https://kodinitools.com'
const SITE_HOME: Record<SeoLocale, string> = { de: `${SITE_URL}/`, en: `${SITE_URL}/en/` }
const IN_LANGUAGE: Record<SeoLocale, string> = { de: 'de-DE', en: 'en-US' }

/** Vorschaubilder liegen in public/ (1200×630 bzw. 1600×1000), je Sprache eine Datei. */
const IMAGE_SUFFIX: Record<SeoLocale, string> = { de: '', en: '-en' }

function resolve(messages: SeoMessages, key: string): unknown {
  return key
    .split('.')
    .reduce<unknown>(
      (node, part) =>
        node && typeof node === 'object' ? (node as Record<string, unknown>)[part] : undefined,
      messages
    )
}

/** Übersetzung als Text; fehlt sie, wird abgebrochen statt leeres Meta auszuliefern. */
export function seoText(messages: SeoMessages, key: string): string {
  const value = resolve(messages, key)
  if (typeof value !== 'string' || !value) {
    throw new Error(`[seo] Übersetzung fehlt: ${key}`)
  }
  return value
}

function seoList(messages: SeoMessages, key: string): string[] {
  const value = resolve(messages, key)
  if (!Array.isArray(value) || value.length === 0 || value.some((v) => typeof v !== 'string')) {
    throw new Error(`[seo] Liste fehlt: ${key}`)
  }
  return value as string[]
}

/** FAQ-Antworten enthalten Icon-Markup; für JSON-LD bleibt nur der Text. */
function plainText(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/\s*\(\s*\)/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export interface SeoImageMeta {
  /** og:image und twitter:image */
  imageUrl: string
  imageAlt: string
  /** Screenshot der App für das WebApplication-Schema */
  screenshotUrl: string
  keywords: string
}

export function seoImageMeta(lang: SeoLocale, messages: SeoMessages): SeoImageMeta {
  return {
    imageUrl: `${SEO_BASE_URL}/og-image${IMAGE_SUFFIX[lang]}.jpg`,
    imageAlt: seoText(messages, 'seo.imageAlt'),
    screenshotUrl: `${SEO_BASE_URL}/screenshot${IMAGE_SUFFIX[lang]}.jpg`,
    keywords: seoText(messages, 'seo.keywords'),
  }
}

export type JsonLd = Record<string, unknown>

/**
 * JSON-LD einer Route: WebApplication und Breadcrumb auf jeder Seite, FAQPage
 * nur auf der FAQ-Seite (dort stehen die Fragen sichtbar im Inhalt).
 */
export function buildStructuredData(
  routeName: string,
  lang: SeoLocale,
  messages: SeoMessages
): JsonLd[] {
  const config = routeSeoConfig[routeName]
  if (!config) return []

  const localized = (path: string) => {
    const { deUrl, enUrl } = routeUrls(path)
    return lang === 'en' ? enUrl : deUrl
  }
  const homeUrl = localized('/')
  const name = seoText(messages, 'seo.structured.name')

  const webApplication: JsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name,
    alternateName: seoList(messages, 'seo.structured.alternateName'),
    description: seoText(messages, 'seo.structured.description'),
    url: homeUrl,
    applicationCategory: 'MultimediaApplication',
    operatingSystem: 'Any',
    browserRequirements: 'Requires JavaScript. Requires HTML5.',
    isAccessibleForFree: true,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' },
    featureList: seoList(messages, 'seo.structured.featureList'),
    screenshot: seoImageMeta(lang, messages).screenshotUrl,
    image: seoImageMeta(lang, messages).imageUrl,
    inLanguage: IN_LANGUAGE[lang],
    availableLanguage: ['de', 'en'],
    publisher: { '@type': 'Organization', name: 'KodiniTools', url: SITE_URL },
  }

  const crumbs = [
    { name: seoText(messages, 'seo.structured.breadcrumb.root'), item: SITE_HOME[lang] },
    { name, item: homeUrl },
  ]
  if (routeName !== 'home') {
    crumbs.push({
      name: seoText(messages, `seo.structured.breadcrumb.${routeName}`),
      item: localized(config.path),
    })
  }
  const breadcrumb: JsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.name,
      item: crumb.item,
    })),
  }

  const data = [webApplication, breadcrumb]

  if (routeName === 'faq') {
    data.push({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      inLanguage: IN_LANGUAGE[lang],
      mainEntity: Array.from({ length: FAQ_QUESTION_COUNT }, (_, i) => ({
        '@type': 'Question',
        name: plainText(seoText(messages, `faq.q${i + 1}.question`)),
        acceptedAnswer: {
          '@type': 'Answer',
          text: plainText(seoText(messages, `faq.q${i + 1}.answer`)),
        },
      })),
    })
  }

  return data
}

/** JSON für ein <script type="application/ld+json">; `<` maskiert, damit kein Tag entsteht. */
export function serializeJsonLd(data: JsonLd): string {
  return JSON.stringify(data, null, 2).replace(/</g, '\\u003c')
}
