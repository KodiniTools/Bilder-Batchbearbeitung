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

  function key(k: string, opts: ConstructorParameters<typeof KeyboardEvent>[1] = {}) {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: k, ...opts }))
  }

  function save(w: VueWrapper): PdfElement[] {
    document.querySelector<HTMLButtonElement>('.modal-footer .btn-primary')?.click()
    return w.emitted('save')?.at(-1)?.[0] as PdfElement[]
  }

  it('Strg+A, Strg+D dupliziert die Auswahl; Strg+Z macht es rückgängig', async () => {
    wrapper = await open('cover', [text('a', 1), text('b', 1)])
    key('a', { ctrlKey: true })
    key('d', { ctrlKey: true })
    await wrapper.vm.$nextTick()
    expect(document.querySelectorAll('.canvas-element')).toHaveLength(4)
    expect(document.querySelectorAll('.canvas-element.selected')).toHaveLength(2)
    key('z', { ctrlKey: true })
    await wrapper.vm.$nextTick()
    expect(document.querySelectorAll('.canvas-element')).toHaveLength(2)
    key('y', { ctrlKey: true })
    await wrapper.vm.$nextTick()
    expect(save(wrapper)).toHaveLength(4)
  })

  it('Pfeiltasten verschieben, Entf löscht die Mehrfachauswahl', async () => {
    wrapper = await open('cover', [text('a', 1), text('b', 1)])
    key('a', { ctrlKey: true })
    key('ArrowRight', { shiftKey: true })
    key('ArrowDown')
    await wrapper.vm.$nextTick()
    const moved = save(wrapper)
    expect(moved.map((el) => [el.x, el.y])).toEqual([
      [20, 11],
      [20, 11],
    ])
    key('Delete')
    await wrapper.vm.$nextTick()
    expect(document.querySelectorAll('.canvas-element')).toHaveLength(0)
  })

  it('Kürzel greifen nicht bei geschlossenem Designer', async () => {
    wrapper = await open('cover', [text('a', 1)])
    key('a', { ctrlKey: true })
    await wrapper.setProps({ modelValue: false })
    key('Delete')
    await wrapper.setProps({ modelValue: true })
    expect(document.querySelectorAll('.canvas-element')).toHaveLength(1)
  })

  it('Seite duplizieren und per Drag-and-Drop verschieben', async () => {
    wrapper = await open('comment', [text('a', 1), text('b', 2)])
    const dup = [...document.querySelectorAll<HTMLButtonElement>('.ptb-action')].find((b) =>
      b.textContent?.includes('Seite duplizieren')
    )
    dup?.click()
    await wrapper.vm.$nextTick()
    expect(document.querySelectorAll('.ptb-thumb')).toHaveLength(3)

    // Kopie von a steht hinter a; Seite 3 (b) vor Seite 1 ziehen
    const thumbs = document.querySelectorAll<HTMLElement>('.ptb-thumb')
    thumbs[2].dispatchEvent(new Event('dragstart'))
    thumbs[0].dispatchEvent(new Event('dragover', { cancelable: true }))
    thumbs[0].dispatchEvent(new Event('drop', { cancelable: true }))
    await wrapper.vm.$nextTick()
    const saved = save(wrapper)
    expect(saved.map((el) => [el.content, el.page])).toEqual([
      ['b', 1],
      ['a', 2],
      ['a', 3],
    ])
    expect(new Set(saved.map((el) => el.id)).size).toBe(3)
  })
})
