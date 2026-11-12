import { afterEach, describe, expect, it } from 'vitest'
import { defineComponent, h, nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import { useDocumentTheme } from '@/composables/useDocumentTheme'

function mountProbe() {
  let theme!: ReturnType<typeof useDocumentTheme>
  const Probe = defineComponent({
    setup() {
      theme = useDocumentTheme()
      return () => h('span', theme.value)
    },
  })
  const wrapper = mount(Probe)
  return { wrapper, theme }
}

describe('useDocumentTheme', () => {
  afterEach(() => {
    document.documentElement.removeAttribute('data-theme')
  })

  it('liest html[data-theme]; fehlend oder unbekannt gilt als light', () => {
    document.documentElement.dataset.theme = 'dark'
    expect(mountProbe().theme.value).toBe('dark')
    document.documentElement.dataset.theme = 'foo'
    expect(mountProbe().theme.value).toBe('light')
    document.documentElement.removeAttribute('data-theme')
    expect(mountProbe().theme.value).toBe('light')
  })

  it('folgt Umschaltungen außerhalb von Vue und hört nach unmount auf', async () => {
    document.documentElement.dataset.theme = 'light'
    const { wrapper, theme } = mountProbe()
    document.documentElement.dataset.theme = 'dark'
    await new Promise((r) => setTimeout(r, 0))
    await nextTick()
    expect(theme.value).toBe('dark')
    expect(wrapper.text()).toBe('dark')

    wrapper.unmount()
    document.documentElement.dataset.theme = 'light'
    await new Promise((r) => setTimeout(r, 0))
    expect(theme.value).toBe('dark')
  })
})
