import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createI18n } from 'vue-i18n'
import de from '@/locales/de.json'
import ExportSettingsModal from '@/components/ExportSettingsModal.vue'
import {
  defaultPdfDocumentSettings,
  pdfBuildOptions,
  usePdfDocumentStore,
} from '@/stores/pdfDocument'
import type { PdfElement } from '@/lib/features/export-pdf'

function q<T extends Element>(selector: string): T {
  const el = document.querySelector<T>(selector)
  if (!el) throw new Error(`${selector} fehlt`)
  return el
}

const i18n = createI18n({ legacy: false, locale: 'de', messages: { de } })

const textElement: PdfElement = {
  id: 't1',
  type: 'text',
  zIndex: 1,
  x: 10,
  y: 10,
  width: 200,
  height: 40,
  content: 'Hallo',
}

describe('pdfBuildOptions', () => {
  it('liefert die bisherigen Standardwerte', () => {
    const options = pdfBuildOptions(defaultPdfDocumentSettings())
    expect(options).toMatchObject({
      author: '',
      includeCustomFrontPage: false,
      frontPageElements: [],
      includeTitlePage: true,
      includeCommentPages: false,
      includeImages: true,
      orientation: 'portrait',
      pageFormat: 'a4',
      customPageSize: { width: 210, height: 297 },
      margin: 10,
      imagesPerPage: 1,
      imageFit: 'contain',
      pageNumbers: false,
      bookmarks: true,
      password: '',
      allowPrinting: true,
    })
    expect(options.watermark.logoDataUrl).toBeUndefined()
  })

  it('nutzt die gestaltete Startseite nur mit Elementen', () => {
    const settings = defaultPdfDocumentSettings()
    settings.includeCustomFrontPage = true
    expect(pdfBuildOptions(settings)).toMatchObject({
      includeCustomFrontPage: false,
      includeTitlePage: true,
    })
    settings.frontPageElements = [textElement]
    expect(pdfBuildOptions(settings)).toMatchObject({
      includeCustomFrontPage: true,
      includeTitlePage: false,
      frontPageElements: [textElement],
    })
  })

  it('gibt das Passwort nur bei aktivem Schutz weiter', () => {
    const settings = defaultPdfDocumentSettings()
    settings.password = 'geheim'
    expect(pdfBuildOptions(settings).password).toBe('')
    settings.protectPdf = true
    expect(pdfBuildOptions(settings).password).toBe('geheim')
  })

  it('hängt das Logo an das Wasserzeichen', () => {
    const settings = defaultPdfDocumentSettings()
    settings.watermarkLogo = 'data:image/png;base64,AAAA'
    expect(pdfBuildOptions(settings).watermark).toMatchObject({
      color: '#808080',
      opacity: 25,
      logoDataUrl: 'data:image/png;base64,AAAA',
    })
  })
})

describe('usePdfDocumentStore', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('setzt Seiten-Elemente und leert sie wieder', () => {
    const store = usePdfDocumentStore()
    store.setFrontPageElements([textElement])
    store.setCommentPageElements([textElement])
    store.settings.includeCustomFrontPage = true
    expect(store.hasCustomFrontPage).toBe(true)
    store.clearFrontPage()
    store.clearCommentPages()
    expect(store.hasCustomFrontPage).toBe(false)
    expect(store.settings.commentPageElements).toEqual([])
  })

  it('meldet ein ungültiges Passwort nur bei aktivem Schutz', () => {
    const store = usePdfDocumentStore()
    expect(store.passwordInvalid).toBe(false)
    store.settings.protectPdf = true
    expect(store.passwordInvalid).toBe(true)
    store.settings.password = 'Größe'
    expect(store.passwordInvalid).toBe(true)
    store.settings.password = 'geheim'
    expect(store.passwordInvalid).toBe(false)
  })

  it('reset stellt die Standardwerte ohne geteilte Objekte her', () => {
    const store = usePdfDocumentStore()
    store.settings.margin = 25
    store.settings.watermark.text = 'Entwurf'
    store.setFrontPageElements([textElement])
    store.reset()
    expect(store.settings).toEqual(defaultPdfDocumentSettings())
    store.settings.watermark.text = 'Neu'
    expect(defaultPdfDocumentSettings().watermark.text).not.toBe('Neu')
  })
})

describe('ExportSettingsModal mit Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    const portal = document.createElement('div')
    portal.id = 'modal-portal'
    document.body.appendChild(portal)
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  function mountModal() {
    return mount(ExportSettingsModal, {
      props: { isOpen: true, mode: 'pdf-all', imageCount: 3 },
      global: { plugins: [i18n] },
      attachTo: document.body,
    })
  }

  it('schreibt Eingaben in den Store und behält sie nach dem Schließen', async () => {
    const wrapper = mountModal()
    const select = q<HTMLSelectElement>('#pdfImagesPerPage')
    select.value = '4'
    select.dispatchEvent(new Event('change'))
    const header = q<HTMLInputElement>('#pdfHeader')
    header.value = '{title}'
    header.dispatchEvent(new Event('input'))
    await wrapper.vm.$nextTick()

    const store = usePdfDocumentStore()
    expect(store.settings.imagesPerPage).toBe(4)
    expect(store.settings.header).toBe('{title}')

    wrapper.unmount()
    document.body.innerHTML = '<div id="modal-portal"></div>'
    mountModal()
    expect(q<HTMLSelectElement>('#pdfImagesPerPage').value).toBe('4')
    expect(q<HTMLInputElement>('#pdfHeader').value).toBe('{title}')
  })

  it('sendet beim Bestätigen PDF- und ZIP-Felder wie bisher', async () => {
    const store = usePdfDocumentStore()
    store.settings.author = 'Kodini'
    store.settings.password = 'geheim'
    const wrapper = mountModal()
    q<HTMLButtonElement>('.modal-footer .btn-primary').click()
    await wrapper.vm.$nextTick()
    const [payload] = (wrapper.emitted('confirm') ?? [])[0] as [Record<string, unknown>]
    expect(payload).toMatchObject({ author: 'Kodini', zipName: 'bilder-export', password: '' })
  })
})
