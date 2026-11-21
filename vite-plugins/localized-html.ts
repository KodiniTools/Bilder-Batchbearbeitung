/**
 * Sprach- und routenspezifische HTML-Einstiege für Crawler ohne JavaScript.
 *
 * Die SPA liefert für jede Route dieselbe index.html (deutsche Startseite).
 * Titel, Description, Canonical, hreflang und <html lang> setzt erst
 * `useSeoMeta` per JavaScript. Dieses Plugin erzeugt im Build zusätzlich je
 * Route und Sprache eine Kopie der fertigen index.html mit bereits korrektem
 * Meta:
 *
 *   dist/seo/<route>.<lang>.html   z. B. seo/home.en.html, seo/faq.de.html
 *
 * NGINX wählt die Datei anhand von Pfad und `?lang=` aus (siehe DEPLOY.md).
 * dist/index.html bleibt die deutsche Startseite, ohne NGINX-Anpassung ändert
 * sich also nichts. Texte und URLs kommen aus denselben Quellen wie zur
 * Laufzeit (src/locales/*.json, src/lib/core/seo-routes.ts).
 *
 * Die strukturierten Daten (JSON-LD) stehen nicht in der index.html, sondern
 * werden zwischen den Markern `seo:structured-data:start/end` eingesetzt: für
 * index.html (Dev und Build) die der deutschen Startseite, für jede seo/-Datei
 * die der jeweiligen Route und Sprache (seo-structured-data.ts).
 */
import type { Plugin } from 'vite'
import { routeSeoConfig, routeUrls, SEO_LOCALES, type SeoLocale } from '../src/lib/core/seo-routes'
import {
  buildStructuredData,
  seoImageMeta,
  seoText,
  serializeJsonLd,
  type JsonLd,
  type SeoMessages,
} from '../src/lib/core/seo-structured-data'

export interface PageMeta {
  lang: SeoLocale
  title: string
  description: string
  /** Canonical und og:url */
  url: string
  deUrl: string
  enUrl: string
  keywords: string
  /** og:image und twitter:image */
  imageUrl: string
  imageAlt: string
  structuredData: JsonLd[]
}

const OG_LOCALE: Record<SeoLocale, string> = { de: 'de_DE', en: 'en_US' }

function escapeAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Ersetzt genau ein Vorkommen; fehlt das Tag oder ist es mehrdeutig, bricht
 * der Build ab, statt still deutsches Meta auszuliefern.
 */
function replaceOnce(html: string, pattern: RegExp, replacement: string, label: string): string {
  const matches = html.match(new RegExp(pattern.source, 'g'))
  if (matches?.length !== 1) {
    throw new Error(
      `[localized-html] ${label}: erwartet genau 1 Treffer in index.html, gefunden ${matches?.length ?? 0}`
    )
  }
  return html.replace(pattern, () => replacement)
}

function setMeta(html: string, attr: 'name' | 'property', key: string, content: string): string {
  const pattern = new RegExp(`(<meta\\s+${attr}="${escapeRegExp(key)}"\\s+content=")[^"]*(")`)
  const match = html.match(pattern)
  return replaceOnce(html, pattern, `${match?.[1] ?? ''}${escapeAttr(content)}"`, `meta ${key}`)
}

function setLinkHref(html: string, selector: string, href: string, label: string): string {
  const pattern = new RegExp(`(<link\\s+${selector}\\s+href=")[^"]*(")`)
  const match = html.match(pattern)
  return replaceOnce(html, pattern, `${match?.[1] ?? ''}${escapeAttr(href)}"`, label)
}

const STRUCTURED_DATA_START = '<!-- seo:structured-data:start -->'
const STRUCTURED_DATA_END = '<!-- seo:structured-data:end -->'

/** Setzt die JSON-LD-Blöcke zwischen die Marker (ersetzt vorhandene). */
export function setStructuredData(html: string, data: JsonLd[]): string {
  const pattern = new RegExp(
    `${escapeRegExp(STRUCTURED_DATA_START)}[\\s\\S]*?${escapeRegExp(STRUCTURED_DATA_END)}`
  )
  const indent = '    '
  const scripts = data.map((entry) => {
    const json = serializeJsonLd(entry)
      .split('\n')
      .map((line) => `${indent}  ${line}`)
      .join('\n')
    return `${indent}<script type="application/ld+json">\n${json}\n${indent}</script>`
  })
  return replaceOnce(
    html,
    pattern,
    [STRUCTURED_DATA_START, ...scripts, `${indent}${STRUCTURED_DATA_END}`].join('\n'),
    'structured data'
  )
}

/** Setzt sprach-/routenspezifisches Meta in die gebaute index.html. */
export function localizeHtml(html: string, meta: PageMeta): string {
  const other: SeoLocale = meta.lang === 'de' ? 'en' : 'de'
  let out = html
  out = replaceOnce(out, /<html\s+lang="[^"]*"/, `<html lang="${meta.lang}"`, 'html lang')
  out = replaceOnce(
    out,
    /<title>[^<]*<\/title>/,
    `<title>${escapeAttr(meta.title)}</title>`,
    'title'
  )
  out = setMeta(out, 'name', 'description', meta.description)
  out = setMeta(out, 'name', 'keywords', meta.keywords)
  out = setMeta(out, 'property', 'og:title', meta.title)
  out = setMeta(out, 'property', 'og:description', meta.description)
  out = setMeta(out, 'property', 'og:url', meta.url)
  out = setMeta(out, 'property', 'og:locale', OG_LOCALE[meta.lang])
  out = setMeta(out, 'property', 'og:locale:alternate', OG_LOCALE[other])
  out = setMeta(out, 'name', 'twitter:title', meta.title)
  out = setMeta(out, 'name', 'twitter:description', meta.description)
  out = setMeta(out, 'property', 'og:image', meta.imageUrl)
  out = setMeta(out, 'property', 'og:image:alt', meta.imageAlt)
  out = setMeta(out, 'name', 'twitter:image', meta.imageUrl)
  out = setMeta(out, 'name', 'twitter:image:alt', meta.imageAlt)
  out = setStructuredData(out, meta.structuredData)
  out = setLinkHref(out, 'rel="canonical"', meta.url, 'canonical')
  out = setLinkHref(out, 'rel="alternate"\\s+hreflang="de"', meta.deUrl, 'hreflang de')
  out = setLinkHref(out, 'rel="alternate"\\s+hreflang="en"', meta.enUrl, 'hreflang en')
  out = setLinkHref(
    out,
    'rel="alternate"\\s+hreflang="x-default"',
    meta.deUrl,
    'hreflang x-default'
  )
  return out
}

type Messages = SeoMessages

/** Vollständiges Meta einer Route in einer Sprache. */
export function pageMeta(
  name: string,
  lang: SeoLocale,
  messages: Record<SeoLocale, Messages>
): PageMeta {
  const config = routeSeoConfig[name]
  if (!config) throw new Error(`[localized-html] Unbekannte Route: ${name}`)
  const { deUrl, enUrl } = routeUrls(config.path)
  const { imageUrl, imageAlt, keywords } = seoImageMeta(lang, messages[lang])
  return {
    lang,
    title: seoText(messages[lang], config.titleKey),
    description: seoText(messages[lang], config.descriptionKey),
    url: lang === 'en' ? enUrl : deUrl,
    deUrl,
    enUrl,
    keywords,
    imageUrl,
    imageAlt,
    structuredData: buildStructuredData(name, lang, messages[lang]),
  }
}

/** Alle Seiten (Route × Sprache) mit Dateiname relativ zu dist/; meta null = index.html 1:1. */
export function buildPages(
  messages: Record<SeoLocale, Messages>
): { fileName: string; meta: PageMeta | null }[] {
  return Object.keys(routeSeoConfig).flatMap((name) =>
    SEO_LOCALES.map((lang) => ({
      fileName: `seo/${name}.${lang}.html`,
      // Deutsche Startseite = index.html unverändert (trägt dasselbe Meta bereits statisch)
      meta: name === 'home' && lang === 'de' ? null : pageMeta(name, lang, messages),
    }))
  )
}

export function localizedHtml(options: { messages: Record<SeoLocale, Messages> }): Plugin {
  return {
    name: 'localized-html',
    // index.html (Dev, Build, Electron): JSON-LD der deutschen Startseite
    transformIndexHtml: {
      order: 'pre',
      handler: (html) =>
        setStructuredData(html, buildStructuredData('home', 'de', options.messages.de)),
    },
    // nach vite:build-html (und inlineEntryCss), damit die fertige index.html vorliegt
    enforce: 'post',
    generateBundle(_, bundle) {
      const index = bundle['index.html']
      if (!index || index.type !== 'asset') {
        this.error('[localized-html] index.html nicht im Bundle gefunden')
      }
      const html = String(index.source)
      for (const page of buildPages(options.messages)) {
        this.emitFile({
          type: 'asset',
          fileName: page.fileName,
          source: page.meta ? localizeHtml(html, page.meta) : html,
        })
      }
    },
  }
}
