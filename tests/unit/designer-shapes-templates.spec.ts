import { describe, it, expect, afterEach, beforeEach } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import jsPDF from 'jspdf'
import de from '@/locales/de.json'
import PdfPageDesigner from '@/components/pdf-designer/PdfPageDesigner.vue'
import { useConfirm } from '@/composables/useConfirm'
import {
  buildPdfDocument,
  fillElementPlaceholders,
  renderShape,
  type PdfElement,
} from '@/lib/features/export-pdf'
import { createShape, sortForRender } from '@/lib/designer/shapes'
import {
  builtInTemplates,
  createTemplate,
  instantiateTemplate,
  loadUserTemplates,
  parseTemplateFile,
  sanitizeElement,
  sanitizeTemplate,
  saveUserTemplates,
  serializeTemplates,
  type TemplateTexts,
} from '@/lib/designer/templates'

const texts: TemplateTexts = {
  names: { photobook: 'F', report: 'B', portfolio: 'P', note: 'N', columns: 'Z' },
  heading: 'Überschrift',
  body: 'Text',
  images: '{images} Bilder',
}

function pdfText(pdf: jsPDF): string {
  return new TextDecoder('latin1').decode(pdf.output('arraybuffer'))
}

function memoryStorage(): Storage {
  const data = new Map<string, string>()
  return {
    get length() {
      return data.size
    },
    clear: () => data.clear(),
    getItem: (k) => data.get(k) ?? null,
    key: (i) => [...data.keys()][i] ?? null,
    removeItem: (k) => void data.delete(k),
    setItem: (k, v) => void data.set(k, String(v)),
  }
}

describe('Formen', () => {
  it('neue Form liegt mittig mit Standardwerten', () => {
    const rect = createShape('rect', 'r1', { width: 794, height: 1123 }, 3)
    expect(rect).toMatchObject({ type: 'shape', shape: 'rect', zIndex: 3, width: 240, height: 160 })
    expect(rect.x).toBe(Math.round((794 - 240) / 2))
    const line = createShape('line', 'l1', { width: 794, height: 1123 }, 0)
    expect(line.fillColor).toBe('')
  })

  it('Hintergrund wird vor allen anderen gezeichnet', () => {
    const els = [
      { id: 'a', zIndex: -5, type: 'text', x: 0, y: 0 },
      { id: 'bg', zIndex: 10, type: 'shape', x: 0, y: 0, background: true },
      { id: 'b', zIndex: 1, type: 'text', x: 0, y: 0 },
    ] as PdfElement[]
    expect(sortForRender(els).map((el) => el.id)).toEqual(['bg', 'a', 'b'])
  })

  it('renderShape zeichnet Füllung und Rand, ohne beides nichts', () => {
    const pdf = new jsPDF({ unit: 'mm', format: 'a4' })
    const before = pdfText(pdf).length
    renderShape(
      pdf,
      {
        ...createShape('rect', 'x', { width: 794, height: 1123 }, 0),
        fillColor: '',
        strokeWidth: 0,
      },
      0.26,
      { x: 0, y: 0 }
    )
    expect(pdfText(pdf).length).toBe(before)

    renderShape(
      pdf,
      { ...createShape('ellipse', 'e', { width: 794, height: 1123 }, 0), opacity: 0.5 },
      0.26,
      { x: 0, y: 0 }
    )
    const raw = pdfText(pdf)
    expect(raw).toMatch(/\/ca 0\.5/)
    expect(raw).toMatch(/\nB\n/) // Füllen + Rand (FD → B)
  })
})

describe('PDF mit Formen, Hintergrund und Platzhaltern', () => {
  it('ersetzt Platzhalter in Designer-Texten', () => {
    const [el] = fillElementPlaceholders(
      [
        {
          id: 't',
          type: 'text',
          x: 0,
          y: 0,
          zIndex: 0,
          content: '{title} – {date} – {images} – {author}',
        },
      ],
      { title: 'Urlaub', date: '1.1.2026', images: 12, author: 'Kodini' }
    )
    expect(el.content).toBe('Urlaub – 1.1.2026 – 12 – Kodini')
  })

  it('Startseite aus der Vorlage „Fotobuch“: Hintergrund ganzseitig, Titel eingesetzt', async () => {
    const tpl = builtInTemplates(texts).find((t) => t.id === 'builtin-photobook')
    if (!tpl) throw new Error('Vorlage fehlt')
    const elements = instantiateTemplate(tpl, { width: 794, height: 1123 }, () =>
      Math.random().toString(36)
    )
    const { pdf } = await buildPdfDocument([], {
      title: 'Sommer',
      includeCustomFrontPage: true,
      frontPageElements: elements,
      includeImages: false,
      pageFormat: 'a5',
    })
    const raw = pdfText(pdf)
    expect(raw).not.toContain('{title}')
    // Hintergrund über die ganze A5-Seite (148 × 210 mm = 419.53 × 595.28 pt)
    expect(raw).toMatch(/0\.\d+ 0\.\d+ 0\.\d+ rg\n0\.? 595\.\d+ 419\.\d+ -595\.\d+ re\nf/)
  })
})

describe('Vorlagen', () => {
  it('eingebaute Vorlagen sind gültig und je Modus vorhanden', () => {
    const all = builtInTemplates(texts)
    expect(all.filter((t) => t.mode === 'cover').length).toBeGreaterThanOrEqual(3)
    expect(all.filter((t) => t.mode === 'comment').length).toBeGreaterThanOrEqual(2)
    for (const tpl of all) expect(sanitizeTemplate(tpl)).not.toBeNull()
  })

  it('skaliert auf Querformat, neue ids, Hintergrund ganzseitig', () => {
    const tpl = builtInTemplates(texts).find((t) => t.id === 'builtin-portfolio')
    if (!tpl) throw new Error('Vorlage fehlt')
    let n = 0
    const els = instantiateTemplate(tpl, { width: 1123, height: 794 }, () => `n${n++}`)
    expect(els.map((el) => el.id)).toEqual(els.map((_, i) => `n${i}`))
    const bg = els.find((el) => el.background)
    expect(bg).toMatchObject({ x: 0, y: 0, width: 1123, height: 794 })
    const frame = els[1]
    expect(frame.width).toBeCloseTo((674 * 1123) / 794, 1)
    expect(frame.height).toBeCloseTo((1003 * 794) / 1123, 1)
  })

  it('verwirft unsichere oder kaputte Elemente', () => {
    const base = { id: 'a', x: 0, y: 0, zIndex: 0 }
    expect(
      sanitizeElement({ ...base, type: 'image', src: 'https://evil.example/x.png' })
    ).toBeNull()
    expect(sanitizeElement({ ...base, type: 'script' })).toBeNull()
    expect(sanitizeElement({ ...base, type: 'shape', shape: 'star' })).toBeNull()
    expect(sanitizeElement({ ...base, type: 'text', color: 'red; x' })).toBeNull()
    expect(sanitizeElement({ ...base, type: 'text', content: 'ok', onclick: 'x' })).toEqual({
      ...base,
      type: 'text',
      content: 'ok',
    })
  })

  it('speichert, lädt und exportiert/importiert eigene Vorlagen', () => {
    const storage = memoryStorage()
    const tpl = createTemplate(
      '  Meine  ',
      'comment',
      { width: 794, height: 1123 },
      [{ id: 'x', type: 'text', x: 1, y: 2, zIndex: 0, content: 'Hallo', page: 3 }],
      'id1'
    )
    expect(tpl.name).toBe('Meine')
    expect(tpl.elements[0].page).toBeUndefined()
    saveUserTemplates([tpl], storage)
    expect(loadUserTemplates(storage)).toEqual([tpl])

    expect(parseTemplateFile(serializeTemplates([tpl]))).toEqual([tpl])
    expect(() => parseTemplateFile('{"foo":1}')).toThrow()
    expect(() => parseTemplateFile('kein json')).toThrow()

    storage.setItem('kodini.pdfDesigner.templates', '{kaputt')
    expect(loadUserTemplates(storage)).toEqual([])
  })
})

describe('PdfPageDesigner: Formen, Hintergrund, Vorlagen', () => {
  const i18n = createI18n({ legacy: false, locale: 'de', messages: { de } })
  let wrapper: VueWrapper | null = null

  beforeEach(() => {
    const portal = document.createElement('div')
    portal.id = 'modal-portal'
    document.body.appendChild(portal)
  })

  afterEach(() => {
    useConfirm().settle(false)
    wrapper?.unmount()
    wrapper = null
    document.body.innerHTML = ''
  })

  async function open(mode: 'cover' | 'comment', initialElements: PdfElement[] = []) {
    const w = mount(PdfPageDesigner, {
      props: { modelValue: false, mode, initialElements },
      global: { plugins: [i18n] },
      attachTo: document.body,
    })
    await w.setProps({ modelValue: true })
    return w
  }

  function save(w: VueWrapper): PdfElement[] {
    document.querySelector<HTMLButtonElement>('.modal-footer .btn-primary')?.click()
    return w.emitted('save')?.at(-1)?.[0] as PdfElement[]
  }

  it('fügt Formen hinzu und setzt einen Hintergrund, der nicht auswählbar ist', async () => {
    wrapper = await open('cover')
    const buttons = document.querySelectorAll<HTMLButtonElement>('.shape-btn')
    expect(buttons).toHaveLength(3)
    buttons[0].click()
    buttons[2].click()
    await wrapper.vm.$nextTick()
    expect(document.querySelectorAll('.canvas-element svg.pdf-shape')).toHaveLength(2)

    const color = document.querySelector<HTMLInputElement>('.bg-color input')
    if (!color) throw new Error('Farbwähler fehlt')
    color.value = '#336699'
    color.dispatchEvent(new Event('input'))
    await wrapper.vm.$nextTick()
    expect(document.querySelector('.canvas-element--background')).not.toBeNull()

    // Strg+A wählt den Hintergrund nicht mit
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', ctrlKey: true }))
    await wrapper.vm.$nextTick()
    expect(document.querySelectorAll('.canvas-element.selected')).toHaveLength(2)

    const saved = save(wrapper)
    expect(saved.map((el) => el.shape)).toEqual(['rect', 'rect', 'line'])
    expect(saved[0]).toMatchObject({ background: true, fillColor: '#336699', width: 794 })
  })

  it('wendet eine Vorlage an und fragt vorher, wenn die Seite nicht leer ist', async () => {
    wrapper = await open('comment', [
      { id: 'a', type: 'text', x: 0, y: 0, zIndex: 0, content: 'alt', page: 1 },
    ])
    const select = document.querySelector<HTMLSelectElement>('.tpl-select')
    if (!select) throw new Error('Vorlagenauswahl fehlt')
    select.value = 'builtin-note'
    select.dispatchEvent(new Event('change'))
    await wrapper.vm.$nextTick()
    document.querySelector<HTMLButtonElement>('.tpl-btn--primary')?.click()
    await wrapper.vm.$nextTick()

    const dialog = useConfirm()
    expect(dialog.isOpen.value).toBe(true)
    dialog.settle(true)
    await flushPromises()

    const saved = save(wrapper)
    expect(saved.some((el) => el.content === 'alt')).toBe(false)
    expect(saved.map((el) => el.type)).toEqual(['text', 'shape', 'text'])
  })
})
