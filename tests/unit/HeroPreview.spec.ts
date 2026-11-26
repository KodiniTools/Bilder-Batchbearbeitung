import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import de from '@/locales/de.json'
import en from '@/locales/en.json'
import HeroPreview from '@/components/landing/HeroPreview.vue'

function mountPreview(locale: 'de' | 'en' = 'de') {
  const i18n = createI18n({ legacy: false, locale, messages: { de, en } })
  return mount(HeroPreview, { global: { plugins: [i18n] } })
}

describe('HeroPreview', () => {
  it('zeigt bilderserie.webp im Browserfenster', () => {
    const wrapper = mountPreview()
    const img = wrapper.get('.hero-preview__image')
    expect(img.attributes('src')).toMatch(/bilderserie\.webp/)
    expect(img.attributes('width')).toBe('1600')
    expect(img.attributes('height')).toBe('901')
    wrapper.unmount()
  })

  it('beschriftet das Bild in der gewählten Sprache', () => {
    const wrapper = mountPreview('en')
    expect(wrapper.get('.hero-preview__image').attributes('alt')).toBe(en.landing.hero.previewAlt)
    wrapper.unmount()
  })
})
