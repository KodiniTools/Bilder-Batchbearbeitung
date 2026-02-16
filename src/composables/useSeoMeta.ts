import { watch } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'

/**
 * SEO meta configuration per route.
 * Keys map to i18n translation paths under "seo.<routeName>".
 */
const routeSeoConfig: Record<string, { titleKey: string; descriptionKey: string }> = {
  home: {
    titleKey: 'seo.home.title',
    descriptionKey: 'seo.home.description'
  },
  app: {
    titleKey: 'seo.app.title',
    descriptionKey: 'seo.app.description'
  },
  faq: {
    titleKey: 'seo.faq.title',
    descriptionKey: 'seo.faq.description'
  },
  blog: {
    titleKey: 'seo.blog.title',
    descriptionKey: 'seo.blog.description'
  },
  learn: {
    titleKey: 'seo.learn.title',
    descriptionKey: 'seo.learn.description'
  }
}

function updateMetaTag(name: string, content: string, attribute: 'name' | 'property' = 'name') {
  let element = document.querySelector(`meta[${attribute}="${name}"]`)
  if (element) {
    element.setAttribute('content', content)
  }
}

function updateLangAttribute(locale: string) {
  document.documentElement.lang = locale
}

export function useSeoMeta() {
  const route = useRoute()
  const { t, locale } = useI18n()

  function updateSeo() {
    const routeName = route.name as string
    const config = routeSeoConfig[routeName]

    if (config) {
      const title = t(config.titleKey)
      const description = t(config.descriptionKey)

      document.title = title
      updateMetaTag('description', description)
      updateMetaTag('og:title', title, 'property')
      updateMetaTag('og:description', description, 'property')
      updateMetaTag('twitter:title', title, 'name')
      updateMetaTag('twitter:description', description, 'name')

      // Update og:locale based on current language
      const ogLocale = locale.value === 'de' ? 'de_DE' : 'en_US'
      updateMetaTag('og:locale', ogLocale, 'property')
    }

    updateLangAttribute(locale.value)
  }

  // Watch both route and locale changes
  watch(() => route.name, updateSeo, { immediate: true })
  watch(locale, updateSeo)
}
