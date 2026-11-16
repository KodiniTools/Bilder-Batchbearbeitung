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
 * dist/index.html bleibt unverändert, ohne NGINX-Anpassung ändert sich also
 * nichts. Texte und URLs kommen aus denselben Quellen wie zur Laufzeit
 * (src/locales/*.json, src/lib/core/seo-routes.ts).
 */
import type { Plugin } from 'vite'
import { routeSeoConfig, routeUrls, SEO_LOCALES, type SeoLocale } from '../src/lib/core/seo-routes'

export interface PageMeta {
  lang: SeoLocale
  title: string
  description: string
  /** Canonical und og:url */
  url: string
  deUrl: string
  enUrl: string
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
  out = setMeta(out, 'property', 'og:title', meta.title)
  out = setMeta(out, 'property', 'og:description', meta.description)
  out = setMeta(out, 'property', 'og:url', meta.url)
  out = setMeta(out, 'property', 'og:locale', OG_LOCALE[meta.lang])
  out = setMeta(out, 'property', 'og:locale:alternate', OG_LOCALE[other])
  out = setMeta(out, 'name', 'twitter:title', meta.title)
  out = setMeta(out, 'name', 'twitter:description', meta.description)
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

type Messages = Record<string, unknown>

function lookup(messages: Messages, key: string): string {
  const value = key
    .split('.')
    .reduce<unknown>(
      (node, part) =>
        node && typeof node === 'object' ? (node as Record<string, unknown>)[part] : undefined,
      messages
    )
  if (typeof value !== 'string' || !value) {
    throw new Error(`[localized-html] Übersetzung fehlt: ${key}`)
  }
  return value
}

/** Alle Seiten (Route × Sprache) mit Dateiname relativ zu dist/; meta null = index.html 1:1. */
export function buildPages(
  messages: Record<SeoLocale, Messages>
): { fileName: string; meta: PageMeta | null }[] {
  return Object.entries(routeSeoConfig).flatMap(([name, config]) => {
    const { deUrl, enUrl } = routeUrls(config.path)
    return SEO_LOCALES.map((lang) => ({
      fileName: `seo/${name}.${lang}.html`,
      // Deutsche Startseite = index.html unverändert (eigene og:/twitter:-Texte bleiben erhalten)
      meta:
        name === 'home' && lang === 'de'
          ? null
          : {
              lang,
              title: lookup(messages[lang], config.titleKey),
              description: lookup(messages[lang], config.descriptionKey),
              url: lang === 'en' ? enUrl : deUrl,
              deUrl,
              enUrl,
            },
    }))
  })
}

export function localizedHtml(options: { messages: Record<SeoLocale, Messages> }): Plugin {
  return {
    name: 'localized-html',
    apply: 'build',
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
