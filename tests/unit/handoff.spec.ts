import { describe, it, expect, beforeEach, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createI18n } from 'vue-i18n'
import de from '@/locales/de.json'
import en from '@/locales/en.json'
import HandoffReceiver from '@/components/HandoffReceiver.vue'
import {
  checkHandoff,
  consumeHandoff,
  handoffImageToFile,
  type HandoffImage,
  type HandoffPayload,
} from '@/lib/core/handoff'
import { useHandoffImport } from '@/composables/useHandoffImport'
import { useImageStore } from '@/stores/imageStore'
import { useToast } from '@/composables/useToast'

const KEY = 'kodinitools-handoff'
// 1×1-JPEG-Kopf genügt: handoffImageToFile dekodiert nur Base64
const JPEG = 'data:image/jpeg;base64,/9j/4AAQ'

function payload(count = 2, overrides: Record<string, unknown> = {}) {
  return {
    source: 'bildergalerie',
    timestamp: Date.now(),
    images: Array.from({ length: count }, (_, i) => ({
      name: `Bild ${i + 1}`,
      dataUrl: JPEG,
      width: 100,
      height: 50,
    })),
    ...overrides,
  }
}

function store(value: unknown) {
  localStorage.setItem(KEY, JSON.stringify(value))
}

function i18n(locale: 'de' | 'en' = 'de') {
  return createI18n({ legacy: false, locale, messages: { de, en } })
}

function mountReceiver(locale: 'de' | 'en' = 'de') {
  return mount(HandoffReceiver, { global: { plugins: [i18n(locale)] } })
}

beforeEach(() => {
  localStorage.clear()
  setActivePinia(createPinia())
  useToast().clearAll()
  // Der Empfänger reagiert nur mit ?handoff=kodinitools in der URL
  window.history.replaceState({}, '', '/bilderseriebearbeiten/app?handoff=kodinitools')
})

describe('Handoff-Protokoll (Empfänger)', () => {
  it('nimmt eine frische Übergabe an, verbraucht sie einmal und räumt die URL auf', () => {
    store(payload())
    expect(checkHandoff()?.images).toHaveLength(2)
    expect(consumeHandoff()).toHaveLength(2)
    expect(localStorage.getItem(KEY)).toBeNull()
    expect(window.location.search).toBe('')
    expect(consumeHandoff()).toBeNull()
  })

  it('ignoriert Daten ohne URL-Parameter', () => {
    window.history.replaceState({}, '', '/bilderseriebearbeiten/app')
    store(payload())
    expect(checkHandoff()).toBeNull()
  })

  it('verwirft abgelaufene Übergaben (5 Minuten) und solche ohne Zeitstempel', () => {
    store(payload(1, { timestamp: Date.now() - 6 * 60 * 1000 }))
    expect(checkHandoff()).toBeNull()
    expect(localStorage.getItem(KEY)).toBeNull()

    store(payload(1, { timestamp: undefined }))
    expect(checkHandoff()).toBeNull()
  })

  it('übernimmt nur Einträge mit Bild-Data-URL', () => {
    store(
      payload(1, {
        images: [
          { name: 'ok', dataUrl: JPEG, width: 1, height: 1 },
          { name: 'script', dataUrl: 'javascript:alert(1)', width: 1, height: 1 },
          { name: 'svg', dataUrl: 'data:image/svg+xml;base64,AAAA', width: 1, height: 1 },
          { dataUrl: JPEG },
          null,
        ],
      })
    )
    expect(checkHandoff()?.images.map((img) => img.name)).toEqual(['ok'])
    expect(consumeHandoff()?.map((img) => img.name)).toEqual(['ok'])

    window.history.replaceState({}, '', '/bilderseriebearbeiten/app?handoff=kodinitools')
    store(payload(1, { images: [{ name: 'x', dataUrl: 'nope' }] }))
    expect(checkHandoff()).toBeNull()
  })

  it('handoffImageToFile erzeugt eine Bilddatei mit Endung', () => {
    const file = handoffImageToFile({ name: 'Waldweg', dataUrl: JPEG, width: 1, height: 1 })
    expect(file.name).toBe('Waldweg.jpg')
    expect(file.type).toBe('image/jpeg')
    expect(file.size).toBe(6)

    const png = handoffImageToFile({
      name: 'logo.png',
      dataUrl: 'data:image/png;base64,iVBORw==',
      width: 1,
      height: 1,
    })
    expect(png.name).toBe('logo.png')
    expect(png.type).toBe('image/png')
  })
})

describe('HandoffReceiver', () => {
  it('zeigt ohne Übergabe nichts an', () => {
    expect(mountReceiver().find('.handoff-banner').exists()).toBe(false)
  })

  it('nennt die Bildergalerie als Quelle und setzt den Plural (DE/EN)', async () => {
    store(payload(1))
    let w = mountReceiver('de')
    await w.vm.$nextTick()
    expect(w.text()).toContain('1 Bild bereit zur Übernahme')
    expect(w.text()).toContain('Aus Bildergalerie übertragen')
    expect(w.find('.btn-accept').text()).toBe('Bilder übernehmen')

    store(payload(3))
    w = mountReceiver('en')
    await w.vm.$nextTick()
    expect(w.text()).toContain('3 images ready to import')
    expect(w.text()).toContain('Transferred from Bildergalerie')
  })

  it('Übernehmen gibt die Bilder weiter und räumt auf', async () => {
    store(payload(2))
    const w = mountReceiver()
    await w.vm.$nextTick()
    await w.find('.btn-accept').trigger('click')

    const [[images]] = w.emitted('accept') as [[HandoffImage[]]]
    expect(images.map((img) => img.name)).toEqual(['Bild 1', 'Bild 2'])
    expect(localStorage.getItem(KEY)).toBeNull()
    expect(w.find('.handoff-banner').exists()).toBe(false)
  })

  it('Verwerfen lehnt die Bilder ab, ohne sie weiterzugeben', async () => {
    store(payload(2))
    const w = mountReceiver()
    await w.vm.$nextTick()
    await w.find('.btn-dismiss').trigger('click')

    expect(w.emitted('accept')).toBeUndefined()
    expect(localStorage.getItem(KEY)).toBeNull()
    expect(w.find('.handoff-banner').exists()).toBe(false)
  })
})

describe('useHandoffImport', () => {
  /** Composable braucht i18n aus einer Komponente. */
  function setup() {
    let api!: ReturnType<typeof useHandoffImport>
    mount(
      defineComponent({
        setup() {
          api = useHandoffImport()
          return () => h('div')
        },
      }),
      { global: { plugins: [i18n()] } }
    )
    return api
  }

  const images: HandoffPayload['images'] = payload(2).images

  it('fügt die Bilder als Dateien hinzu und meldet die Anzahl', async () => {
    const { importHandoffImages } = setup()
    const imageStore = useImageStore()
    const addImages = vi.spyOn(imageStore, 'addImages').mockImplementation(async (files) => {
      for (const file of files) imageStore.images.push({ id: file.name } as never)
    })

    await expect(importHandoffImages(images)).resolves.toBe(2)

    const files = addImages.mock.calls[0][0]
    expect(files.map((f) => f.name)).toEqual(['Bild 1.jpg', 'Bild 2.jpg'])
    expect(useToast().toasts.value.at(-1)).toMatchObject({
      type: 'success',
      message: '2 Bilder übernommen',
    })
  })

  it('meldet einen Fehler, wenn kein Bild hinzugefügt werden konnte', async () => {
    const { importHandoffImages } = setup()
    vi.spyOn(useImageStore(), 'addImages').mockResolvedValue()

    await expect(importHandoffImages(images)).resolves.toBe(0)
    expect(useToast().toasts.value.at(-1)).toMatchObject({
      type: 'error',
      message: 'Die übergebenen Bilder konnten nicht geladen werden.',
    })
  })
})
