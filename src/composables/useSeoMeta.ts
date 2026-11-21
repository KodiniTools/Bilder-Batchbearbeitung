import { watch } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { routeSeoConfig, routeUrls, type SeoLocale } from '@/lib/core/seo-routes'
import {
  buildStructuredData,
  seoImageMeta,
  seoText,
  serializeJsonLd,
  type SeoMessages,
} from '@/lib/core/seo-structured-data'

function updateMetaTag(name: string, content: string, attribute: 'name' | 'property' = 'name') {
  const element = document.querySelector(`meta[${attribute}="${name}"]`)
  if (element) element.setAttribute('content', content)
}

function updateLinkTag(rel: string, href: string, hreflang?: string) {
  const selector = hreflang
    ? `link[rel="${rel}"][hreflang="${hreflang}"]`
    : `link[rel="${rel}"]:not([hreflang])`
  const element = document.querySelector(selector)
  if (element) element.setAttribute('href', href)
}

/** Ersetzt die JSON-LD-Blöcke im <head> durch die der aktuellen Route und Sprache. */
function updateStructuredData(routeName: string, lang: SeoLocale, messages: SeoMessages) {
  const data = buildStructuredData(routeName, lang, messages)
  document.head
    .querySelectorAll('script[type="application/ld+json"]')
    .forEach((element) => element.remove())
  for (const entry of data) {
    const script = document.createElement('script')
    script.type = 'application/ld+json'
    script.textContent = serializeJsonLd(entry)
    document.head.appendChild(script)
  }
}

export function useSeoMeta() {
  const route = useRoute()
  const { t, locale, messages } = useI18n()

  function updateSeo() {
    const routeName = route.name as string
    const config = routeSeoConfig[routeName]
    if (!config) return

    const lang: SeoLocale = locale.value === 'en' ? 'en' : 'de'
    const localeMessages = messages.value[lang] as SeoMessages | undefined
    // Rohtext statt t(): vue-i18n liest "|" als Plural-Trenner und würde
    // "… | KodiniTools" aus dem Titel abschneiden (anders als das gebaute HTML).
    const text = (key: string) => {
      try {
        return localeMessages ? seoText(localeMessages, key) : t(key)
      } catch {
        return t(key)
      }
    }

    const title = text(config.titleKey)
    const description = text(config.descriptionKey)
    const { deUrl, enUrl } = routeUrls(config.path)
    const canonicalUrl = locale.value === 'en' ? enUrl : deUrl

    // Basic meta
    document.title = title
    document.documentElement.lang = locale.value
    updateMetaTag('description', description)

    // Open Graph
    updateMetaTag('og:title', title, 'property')
    updateMetaTag('og:description', description, 'property')
    updateMetaTag('og:url', canonicalUrl, 'property')
    updateMetaTag('og:locale', locale.value === 'de' ? 'de_DE' : 'en_US', 'property')
    updateMetaTag('og:locale:alternate', locale.value === 'de' ? 'en_US' : 'de_DE', 'property')

    // Twitter Card
    updateMetaTag('twitter:title', title, 'name')
    updateMetaTag('twitter:description', description, 'name')

    // Keywords, Vorschaubild und JSON-LD (gleiche Quelle wie das gebaute HTML)
    if (localeMessages) {
      try {
        const image = seoImageMeta(lang, localeMessages)
        updateMetaTag('keywords', image.keywords)
        updateMetaTag('og:image', image.imageUrl, 'property')
        updateMetaTag('og:image:alt', image.imageAlt, 'property')
        updateMetaTag('twitter:image', image.imageUrl)
        updateMetaTag('twitter:image:alt', image.imageAlt)
        updateStructuredData(routeName, lang, localeMessages)
      } catch (err) {
        // Meta ist nicht funktionskritisch: App läuft weiter, das HTML-Meta bleibt stehen
        console.warn('[SEO] Meta konnte nicht aktualisiert werden:', err)
      }
    }

    // Canonical
    updateLinkTag('canonical', canonicalUrl)

    // Hreflang — always point to DE and EN variants of the current route
    updateLinkTag('alternate', deUrl, 'de')
    updateLinkTag('alternate', enUrl, 'en')
    updateLinkTag('alternate', deUrl, 'x-default')
  }

  watch(() => route.name, updateSeo, { immediate: true })
  watch(locale, updateSeo)
}
