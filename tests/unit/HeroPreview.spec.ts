import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import de from '@/locales/de.json'
import en from '@/locales/en.json'
import HeroPreview from '@/components/landing/HeroPreview.vue'

function setReducedMotion(matches: boolean) {
  window.matchMedia = vi.fn().mockReturnValue({
    matches,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }) as unknown as typeof window.matchMedia
}

function mountPreview(locale: 'de' | 'en' = 'de') {
  const i18n = createI18n({ legacy: false, locale, messages: { de, en } })
  return mount(HeroPreview, { global: { plugins: [i18n] } })
}

const activeScene = (wrapper: ReturnType<typeof mountPreview>) =>
  wrapper.findAll('.hero-preview__scene').findIndex((img) => img.classes('is-active'))

const visibleHints = (wrapper: ReturnType<typeof mountPreview>) =>
  wrapper.findAll('.hero-preview__hint.is-visible').length

describe('HeroPreview', () => {
  const originalMatchMedia = window.matchMedia

  beforeEach(() => {
    vi.useFakeTimers()
    document.documentElement.dataset.theme = 'light'
  })

  afterEach(() => {
    vi.useRealTimers()
    window.matchMedia = originalMatchMedia
    document.documentElement.removeAttribute('data-theme')
  })

  it('zeigt die Szenen nacheinander und blendet die Hinweise passend ein', async () => {
    setReducedMotion(false)
    const wrapper = mountPreview()

    expect(wrapper.findAll('.hero-preview__scene')).toHaveLength(3)
    expect(activeScene(wrapper)).toBe(0)
    expect(visibleHints(wrapper)).toBe(3)

    await vi.advanceTimersByTimeAsync(4000)
    expect(activeScene(wrapper)).toBe(1)
    expect(visibleHints(wrapper)).toBe(4)

    await vi.advanceTimersByTimeAsync(4500)
    expect(activeScene(wrapper)).toBe(2)
    expect(visibleHints(wrapper)).toBe(7)

    // Endlosschleife: zurück zu Szene 1
    await vi.advanceTimersByTimeAsync(5500)
    expect(activeScene(wrapper)).toBe(0)
    expect(visibleHints(wrapper)).toBe(3)
    wrapper.unmount()
  })

  it('bleibt bei reduzierter Bewegung auf der letzten Szene mit allen Hinweisen', async () => {
    setReducedMotion(true)
    const wrapper = mountPreview()
    await wrapper.vm.$nextTick()
    expect(activeScene(wrapper)).toBe(2)
    expect(visibleHints(wrapper)).toBe(7)

    await vi.advanceTimersByTimeAsync(20000)
    expect(activeScene(wrapper)).toBe(2)
    wrapper.unmount()
  })

  it('wählt Screenshots nach Sprache und Theme', async () => {
    setReducedMotion(true)
    document.documentElement.dataset.theme = 'dark'
    const wrapper = mountPreview('en')
    const srcs = wrapper.findAll('.hero-preview__scene').map((img) => img.attributes('src'))
    expect(srcs.every((src) => /scene-\d-en-dark/.test(src ?? ''))).toBe(true)
    expect(wrapper.text()).toContain('Watermark:')
    wrapper.unmount()
  })
})
