import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { page } from '@vitest/browser/context'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { nextTick } from 'vue'
import { createPinia } from 'pinia'
import { createI18n } from 'vue-i18n'
import de from '@/locales/de.json'
import ImageEditor from '@/components/ImageEditor.vue'
import type { ImageObject } from '@/lib/core/types'
import '@/assets/styles/main.css'

const IMG_W = 1376
const IMG_H = 768

let wrapper: VueWrapper | null = null

/** querySelector, der bei fehlendem Element mit klarer Meldung abbricht */
function el<T extends Element = HTMLElement>(selector: string): T {
  const found = document.querySelector<T>(selector)
  if (!found) throw new Error(`Element "${selector}" nicht gefunden`)
  return found
}

function editor(): VueWrapper {
  if (!wrapper) throw new Error('Editor nicht gemountet')
  return wrapper
}

function createImageObject(width: number, height: number): ImageObject {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Kein 2D-Kontext')
  const gradient = ctx.createLinearGradient(0, 0, width, height)
  gradient.addColorStop(0, '#112233')
  gradient.addColorStop(1, '#ffcc00')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, width, height)

  const originalCanvas = document.createElement('canvas')
  originalCanvas.width = width
  originalCanvas.height = height
  originalCanvas.getContext('2d')?.drawImage(canvas, 0, 0)

  return {
    id: 'test-image',
    file: new File([new Uint8Array(1024)], 'test.png', { type: 'image/png' }),
    image: new Image(width, height),
    canvas,
    ctx,
    originalCanvas,
    originalWidth: width,
    originalHeight: height,
    selected: false,
    outputName: 'test',
    version: 1,
  }
}

async function settle() {
  await flushPromises()
  await nextTick()
  await new Promise((r) => requestAnimationFrame(() => r(null)))
  await nextTick()
}

/** Editor wird per Teleport in <body> gerendert → im Dokument suchen */
function button(label: string | RegExp): HTMLButtonElement {
  const match = [...document.querySelectorAll<HTMLButtonElement>('.modal-container button')].find(
    (b) => {
      const text = b.textContent?.replace(/\s+/g, ' ').trim() ?? ''
      return typeof label === 'string' ? text === label : label.test(text)
    }
  )
  if (!match) throw new Error(`Button "${label}" nicht gefunden`)
  return match
}

async function click(label: string | RegExp) {
  button(label).click()
  await settle()
}

function resizeFields(): [number, number] {
  const inputs = document.querySelectorAll<HTMLInputElement>('.size-row input')
  return [Number(inputs[0].value), Number(inputs[1].value)]
}

async function openEditor(image: ImageObject) {
  const i18n = createI18n({ legacy: false, locale: 'de', messages: { de } })
  wrapper = mount(ImageEditor, {
    props: { image, isOpen: false },
    global: { plugins: [createPinia(), i18n] },
    attachTo: document.body,
  })
  await wrapper.setProps({ isOpen: true })
  await settle()
  return wrapper
}

/** "Änderungen übernehmen" → "Speichern"; liefert die gespeicherten Bildmaße */
async function applyAndSave(image: ImageObject): Promise<[number, number]> {
  await click('Änderungen übernehmen')
  await click('Speichern')
  expect(editor().emitted('save')).toHaveLength(1)
  return [image.canvas.width, image.canvas.height]
}

beforeEach(async () => {
  await page.viewport(1600, 950)
})

afterEach(() => {
  wrapper?.unmount()
  wrapper = null
  document.body.innerHTML = ''
})

describe('ImageEditor – Zuschneiden (echter Canvas)', () => {
  it('speichert einen 1:1-Zuschnitt als exaktes Quadrat', async () => {
    const image = createImageObject(IMG_W, IMG_H)
    await openEditor(image)
    expect(resizeFields()).toEqual([IMG_W, IMG_H])

    await click('Zuschneiden starten')
    await click('1:1')
    expect(document.querySelector('.crop-dims')?.textContent).toBe('768 × 768')

    await click('Zuschnitt anwenden')
    // Kern des Fixes: Größe-Felder folgen dem Zuschnitt
    expect(resizeFields()).toEqual([768, 768])

    expect(await applyAndSave(image)).toEqual([768, 768])
  })

  it.each([
    ['4:3', 1024, 768],
    ['16:9', 1365, 768],
  ])('speichert einen %s-Zuschnitt im richtigen Verhältnis', async (label, expW, expH) => {
    const image = createImageObject(IMG_W, IMG_H)
    await openEditor(image)

    await click('Zuschneiden starten')
    await click(label)
    await click('Zuschnitt anwenden')

    const [w, h] = await applyAndSave(image)
    expect(h).toBe(expH)
    expect(Math.abs(w - expW)).toBeLessThanOrEqual(1)
  })

  it('übernimmt eine 90°-Drehung ohne Verzerrung', async () => {
    const image = createImageObject(IMG_W, IMG_H)
    await openEditor(image)

    await click(/^\+90°/)
    expect(resizeFields()).toEqual([IMG_H, IMG_W])

    expect(await applyAndSave(image)).toEqual([IMG_H, IMG_W])
  })

  it('wendet eine manuelle Größenänderung nach dem Zuschnitt weiterhin an', async () => {
    const image = createImageObject(IMG_W, IMG_H)
    await openEditor(image)

    await click('Zuschneiden starten')
    await click('1:1')
    await click('Zuschnitt anwenden')

    const widthInput = el<HTMLInputElement>('.size-row input')
    widthInput.value = '400'
    widthInput.dispatchEvent(new Event('input', { bubbles: true }))
    widthInput.dispatchEvent(new Event('change', { bubbles: true }))
    widthInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    widthInput.dispatchEvent(new Event('blur'))
    await settle()
    expect(resizeFields()).toEqual([400, 400])

    expect(await applyAndSave(image)).toEqual([400, 400])
  })

  it('schließt nicht, wenn ein Zuschneide-Griff außerhalb des Modals losgelassen wird', async () => {
    const image = createImageObject(IMG_W, IMG_H)
    await openEditor(image)
    await click('Zuschneiden starten')

    const handle = el('.crop-rect .handle.se')
    const overlay = el('.modal-overlay')
    // Browser-Verhalten nachstellen: mousedown am Griff, mouseup auf dem Overlay;
    // der click geht dann an den gemeinsamen Vorfahren (= Overlay)
    handle.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    overlay.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }))
    overlay.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await settle()
    expect(editor().emitted('close')).toBeUndefined()

    // Echter Klick auf den Hintergrund schließt weiterhin
    overlay.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    overlay.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await settle()
    expect(editor().emitted('close')).toHaveLength(1)
  })
})
