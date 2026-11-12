import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createI18n } from 'vue-i18n'
import de from '@/locales/de.json'
import ExportBar from '@/components/ExportBar.vue'
import { useImageStore } from '@/stores/imageStore'
import type { ImageObject } from '@/lib/core/types'

const i18n = createI18n({ legacy: false, locale: 'de', messages: { de } })

const img = (id: string, selected: boolean): ImageObject =>
  ({ id, selected, outputName: `${id}.jpg` }) as unknown as ImageObject

function mountBar() {
  return mount(ExportBar, {
    global: { plugins: [i18n], stubs: { transition: false } },
  })
}

describe('ExportBar', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('ist ohne Auswahl ausgeblendet', () => {
    const store = useImageStore()
    store.images = [img('a', false), img('b', false)]
    const wrapper = mountBar()
    expect(wrapper.find('.export-bar').exists()).toBe(false)
  })

  it('erscheint, sobald Bilder ausgewählt sind, und verschwindet wieder', async () => {
    const store = useImageStore()
    store.images = [img('a', false), img('b', false)]
    const wrapper = mountBar()

    store.images[0].selected = true
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.export-bar').exists()).toBe(true)
    expect(wrapper.text()).toContain('1 Bild ausgewählt')

    store.images[0].selected = false
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.export-bar').exists()).toBe(false)
  })

  it('löst für jeden Button das passende Event aus', async () => {
    const store = useImageStore()
    store.images = [img('a', true), img('b', true)]
    const wrapper = mountBar()
    expect(wrapper.text()).toContain('2 Bilder ausgewählt')

    const buttons = wrapper.findAll('.export-btn')
    expect(buttons).toHaveLength(5)
    for (const b of buttons) await b.trigger('click')

    expect(wrapper.emitted('export-pdf')).toEqual([['selected'], ['all']])
    expect(wrapper.emitted('export-zip')).toHaveLength(1)
    expect(wrapper.emitted('export-svg')).toHaveLength(1)
    expect(wrapper.emitted('save-images')).toHaveLength(1)
  })
})
