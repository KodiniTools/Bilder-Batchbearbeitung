import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import de from '@/locales/de.json'
import PdfPageDesigner from '@/components/pdf-designer/PdfPageDesigner.vue'
import type { PdfElement } from '@/lib/features/export-pdf'

const i18n = createI18n({ legacy: false, locale: 'de', messages: { de } })

const text = (id: string, page: number): PdfElement => ({
  id,
  type: 'text',
  x: 10,
  y: 10,
  width: 200,
  height: 50,
  zIndex: 0,
  content: id,
  page,
})

async function open(mode: 'cover' | 'comment', initialElements: PdfElement[]) {
  const wrapper = mount(PdfPageDesigner, {
    props: { modelValue: false, mode, initialElements },
    global: { plugins: [i18n] },
    attachTo: document.body,
  })
  // Elemente werden beim Öffnen geladen
  await wrapper.setProps({ modelValue: true })
  return wrapper
}

describe('PdfPageDesigner', () => {
  let wrapper: VueWrapper | null = null

  beforeEach(() => {
    const portal = document.createElement('div')
    portal.id = 'modal-portal'
    document.body.appendChild(portal)
  })

  afterEach(() => {
    wrapper?.unmount()
    wrapper = null
    document.body.innerHTML = ''
  })

  it('Startseite: eine Seite, ohne Seitenverwaltung und Fußzeile', async () => {
    wrapper = await open('cover', [text('a', 1), text('b', 2)])
    const modal = document.querySelector('.designer-modal')
    expect(modal?.textContent).toContain('Startseite gestalten')
    expect(document.querySelector('.page-badge')).toBeNull()
    expect(document.querySelector('.canvas-footer-preview')).toBeNull()
    // Elemente von „Seite 2“ landen auf der einzigen Startseite
    expect(document.querySelectorAll('.canvas-element')).toHaveLength(2)

    // Speichern liefert alle Elemente auf Seite 1
    const save = document.querySelector<HTMLButtonElement>('.modal-footer .btn-primary')
    save?.click()
    const saved = wrapper.emitted('save')?.[0]?.[0] as PdfElement[]
    expect(saved.map((el) => el.page)).toEqual([1, 1])
  })

  it('Kommentarseiten: Seiten bleiben getrennt, Fußzeile sichtbar', async () => {
    wrapper = await open('comment', [text('a', 1), text('b', 2)])
    expect(document.querySelector('.page-badge')).not.toBeNull()
    expect(document.querySelector('.canvas-footer-preview')).not.toBeNull()
    expect(document.querySelectorAll('.canvas-element')).toHaveLength(1)
  })

  it('Startseite ignoriert Strg+N (keine neue Seite)', async () => {
    wrapper = await open('cover', [text('a', 1)])
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'n', ctrlKey: true }))
    await wrapper.vm.$nextTick()
    const save = document.querySelector<HTMLButtonElement>('.modal-footer .btn-primary')
    save?.click()
    const saved = wrapper.emitted('save')?.[0]?.[0] as PdfElement[]
    expect(saved).toHaveLength(1)
    expect(saved[0].page).toBe(1)
  })
})
