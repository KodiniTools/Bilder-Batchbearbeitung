import { watch } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { routeSeoConfig, routeUrls } from '@/lib/core/seo-routes'

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

export function useSeoMeta() {
  const route = useRoute()
  const { t, locale } = useI18n()

  function updateSeo() {
    const routeName = route.name as string
    const config = routeSeoConfig[routeName]
    if (!config) return

    const title = t(config.titleKey)
    const description = t(config.descriptionKey)
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

    // Twitter Card
    updateMetaTag('twitter:title', title, 'name')
    updateMetaTag('twitter:description', description, 'name')

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
