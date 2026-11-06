import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import de from '@/locales/de.json'
import PdfPageDesigner from '@/components/pdf-designer/PdfPageDesigner.vue'
import type { PdfElement } from '@/lib/features/export-pdf'
import type { ImageObject } from '@/lib/core/types'

// Rendering und Kodierung brauchen echtes Canvas – hier durch Fakes ersetzt
vi.mock('@/lib/designer/library-image', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/designer/library-image')>()
  return {
    ...actual,
    createThumbnail: () => 'data:image/jpeg;base64,thumb',
    libraryImageToSource: vi.fn(async (img: ImageObject) => {
      if (img.id === 'broken') throw new Error('kaputt')
      return { src: `data:image/jpeg;base64,${img.id}`, width: 1600, height: 1200 }
    }),
  }
})

const i18n = createI18n({ legacy: false, locale: 'de', messages: { de } })

const libImage = (id: string): ImageObject =>
  ({
    id,
    outputName: `${id}.jpg`,
    file: { name: `${id}.jpg` },
    canvas: document.createElement('canvas'),
  }) as unknown as ImageObject

const text = (id: string): PdfElement => ({
  id,
  type: 'text',
  x: 0,
  y: 0,
  width: 10,
  height: 10,
  zIndex: 0,
  content: id,
  page: 1,
})

async function open(libraryImages: ImageObject[], initialElements: PdfElement[] = []) {
  const wrapper = mount(PdfPageDesigner, {
    props: { modelValue: false, mode: 'comment', initialElements, libraryImages },
    global: { plugins: [i18n] },
    attachTo: document.body,
  })
  await wrapper.setProps({ modelValue: true })
  return wrapper
}

function libraryButton(): HTMLButtonElement | undefined {
  return [...document.querySelectorAll<HTMLButtonElement>('.tool-btn')].find((b) =>
    b.textContent?.includes('Aus der Bildserie')
  )
}

function save(w: VueWrapper): PdfElement[] {
  document.querySelector<HTMLButtonElement>('.modal-footer .btn-primary')?.click()
  return w.emitted('save')?.at(-1)?.[0] as PdfElement[]
}

describe('PDF-Designer: Bilder aus der Bildserie', () => {
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

  it('ohne geladene Bilder gibt es keinen Button', async () => {
    wrapper = await open([])
    expect(libraryButton()).toBeUndefined()
  })

  it('übernimmt ausgewählte Bilder als Bild-Elemente (ein Undo-Schritt)', async () => {
    wrapper = await open([libImage('a'), libImage('b'), libImage('c')])
    const btn = libraryButton()
    expect(btn?.textContent).toContain('(3)')
    btn?.click()
    await flushPromises()

    const items = document.querySelectorAll<HTMLButtonElement>('.picker-item')
    expect(items).toHaveLength(3)
    items[0].click()
    items[2].click()
    await flushPromises()
    document.querySelector<HTMLButtonElement>('.picker-footer .btn-primary')?.click()
    await flushPromises()

    expect(document.querySelector('.picker-modal')).toBeNull()
    expect(document.querySelectorAll('.canvas-element')).toHaveLength(2)
    expect(document.querySelectorAll('.canvas-element.selected')).toHaveLength(2)

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true }))
    await flushPromises()
    expect(document.querySelectorAll('.canvas-element')).toHaveLength(0)
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'y', ctrlKey: true }))
    await flushPromises()

    const saved = save(wrapper)
    expect(saved.map((el) => [el.type, el.src])).toEqual([
      ['image', 'data:image/jpeg;base64,a'],
      ['image', 'data:image/jpeg;base64,c'],
    ])
  })

  it('beachtet die Höchstzahl Elemente pro Seite', async () => {
    const full = Array.from({ length: 19 }, (_, i) => text(`t${i}`))
    wrapper = await open([libImage('a'), libImage('b')], full)
    libraryButton()?.click()
    await flushPromises()
    const selectAll = document.querySelector<HTMLButtonElement>('.picker-link')
    selectAll?.click()
    await flushPromises()
    expect(document.querySelectorAll('.picker-item.selected')).toHaveLength(1)
    expect(document.querySelectorAll<HTMLButtonElement>('.picker-item')[1].disabled).toBe(true)
  })

  it('überspringt Bilder, die nicht umgewandelt werden können', async () => {
    wrapper = await open([libImage('broken'), libImage('ok')])
    libraryButton()?.click()
    await flushPromises()
    document.querySelector<HTMLButtonElement>('.picker-link')?.click()
    await flushPromises()
    document.querySelector<HTMLButtonElement>('.picker-footer .btn-primary')?.click()
    await flushPromises()
    const saved = save(wrapper)
    expect(saved.map((el) => el.src)).toEqual(['data:image/jpeg;base64,ok'])
  })

  it('Esc schließt nur den Auswahldialog, nicht die Designer-Auswahl', async () => {
    wrapper = await open([libImage('a')], [text('x')])
    libraryButton()?.click()
    await flushPromises()
    // Designer-Kürzel sind gesperrt, solange der Dialog offen ist
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', ctrlKey: true }))
    await flushPromises()
    expect(document.querySelectorAll('.canvas-element.selected')).toHaveLength(0)
    document
      .querySelector('.picker-modal')
      ?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    await flushPromises()
    expect(document.querySelector('.picker-modal')).toBeNull()
    expect(document.querySelectorAll('.canvas-element')).toHaveLength(1)
  })
})
