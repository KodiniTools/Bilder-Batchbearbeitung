import { watch } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'

const BASE_URL = 'https://kodinitools.com/bilderseriebearbeiten'

const routeSeoConfig: Record<string, { titleKey: string; descriptionKey: string; path: string }> = {
  home:      { titleKey: 'seo.home.title',      descriptionKey: 'seo.home.description',      path: '/' },
  app:       { titleKey: 'seo.app.title',       descriptionKey: 'seo.app.description',       path: '/app' },
  faq:       { titleKey: 'seo.faq.title',       descriptionKey: 'seo.faq.description',       path: '/faq' },
  blog:      { titleKey: 'seo.blog.title',      descriptionKey: 'seo.blog.description',      path: '/blog' },
  learn:     { titleKey: 'seo.learn.title',     descriptionKey: 'seo.learn.description',     path: '/learn' },
  downloads: { titleKey: 'seo.downloads.title', descriptionKey: 'seo.downloads.description', path: '/downloads' },
}

function routeUrl(path: string): string {
  return path === '/' ? `${BASE_URL}/` : `${BASE_URL}${path}`
}

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
    const deUrl = routeUrl(config.path)
    const enUrl = `${deUrl}${config.path === '/' ? '' : ''}?lang=en`
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
