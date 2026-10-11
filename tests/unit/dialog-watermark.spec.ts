import { describe, it, expect, afterEach, beforeEach } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { nextTick } from 'vue'
import { createI18n } from 'vue-i18n'
import de from '@/locales/de.json'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import { useConfirm } from '@/composables/useConfirm'
import { buildPdfDocument, watermarkAnchors } from '@/lib/features/export-pdf'
import { defaultWatermark } from '@/lib/core/types'

const i18n = createI18n({ legacy: false, locale: 'de', messages: { de } })

function pdfText(pdf: { output: (type: 'arraybuffer') => ArrayBuffer }): string {
  return new TextDecoder('latin1').decode(pdf.output('arraybuffer'))
}

describe('useConfirm', () => {
  afterEach(() => useConfirm().settle(false))

  it('liefert true bei Bestätigung und false bei Abbruch', async () => {
    const dialog = useConfirm()
    const yes = dialog.confirm('Löschen?')
    expect(dialog.isOpen.value).toBe(true)
    dialog.settle(true)
    await expect(yes).resolves.toBe(true)
    expect(dialog.isOpen.value).toBe(false)

    const no = dialog.confirm({ message: 'Leeren?', danger: true })
    dialog.settle(false)
    await expect(no).resolves.toBe(false)
  })

  it('bricht einen offenen Dialog ab, wenn ein neuer kommt', async () => {
    const dialog = useConfirm()
    const first = dialog.confirm('Erster')
    const second = dialog.confirm('Zweiter')
    await expect(first).resolves.toBe(false)
    expect(dialog.request.value?.message).toBe('Zweiter')
    dialog.settle(true)
    await expect(second).resolves.toBe(true)
  })
})

describe('ConfirmDialog', () => {
  let wrapper: VueWrapper | null = null

  beforeEach(() => {
    const portal = document.createElement('div')
    portal.id = 'modal-portal'
    document.body.appendChild(portal)
    wrapper = mount(ConfirmDialog, { global: { plugins: [i18n] }, attachTo: document.body })
  })

  afterEach(() => {
    useConfirm().settle(false)
    wrapper?.unmount()
    wrapper = null
    document.body.innerHTML = ''
  })

  it('zeigt Text und Buttons, Klick auf Löschen bestätigt', async () => {
    const result = useConfirm().confirm({
      message: 'Seite 2 löschen?',
      confirmLabel: 'Löschen',
      danger: true,
    })
    await nextTick()
    const dlg = document.querySelector('[role="alertdialog"]')
    expect(dlg?.textContent).toContain('Seite 2 löschen?')
    expect(dlg?.textContent).toContain('Abbrechen')
    const danger = document.querySelector<HTMLButtonElement>('.confirm-btn--danger')
    expect(danger?.textContent?.trim()).toBe('Löschen')
    danger?.click()
    await expect(result).resolves.toBe(true)
  })

  it('Esc bricht ab', async () => {
    const result = useConfirm().confirm('Sicher?')
    await nextTick()
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    await expect(result).resolves.toBe(false)
  })

  it('Hinweis hat nur einen OK-Button', async () => {
    const done = useConfirm().alert('Letzte Seite kann nicht gelöscht werden')
    await nextTick()
    const buttons = document.querySelectorAll('.confirm-btn')
    expect(buttons).toHaveLength(1)
    expect(buttons[0].textContent?.trim()).toBe('OK')
    ;(buttons[0] as HTMLButtonElement).click()
    await expect(done).resolves.toBeUndefined()
  })
})

describe('watermarkAnchors', () => {
  it('mittig und in den Ecken', () => {
    expect(watermarkAnchors('center', 210, 297)).toEqual([{ x: 105, y: 148.5 }])
    const [tl] = watermarkAnchors('top-left', 210, 297)
    const [br] = watermarkAnchors('bottom-right', 210, 297)
    expect(tl.x).toBeLessThan(105)
    expect(tl.y).toBeLessThan(148.5)
    expect(br.x).toBeGreaterThan(105)
    expect(br.y).toBeGreaterThan(148.5)
  })

  it('kachelt über die ganze Seite', () => {
    const pts = watermarkAnchors('tile', 210, 297, { x: 80, y: 40 })
    expect(pts.length).toBeGreaterThan(9)
    expect(Math.min(...pts.map((p) => p.y))).toBeLessThanOrEqual(40)
    expect(Math.max(...pts.map((p) => p.y))).toBeGreaterThanOrEqual(297 - 40)
  })
})

describe('PDF-Wasserzeichen', () => {
  it('steht mit Deckkraft auf jeder Seite', async () => {
    const { pdf } = await buildPdfDocument([], {
      includeTitlePage: true,
      includeCommentPages: true,
      commentPageElements: [
        {
          id: 'c1',
          type: 'text',
          x: 40,
          y: 40,
          width: 300,
          height: 60,
          zIndex: 0,
          content: 'Notiz',
          page: 1,
        },
      ],
      includeImages: false,
      watermark: { ...defaultWatermark, enabled: true, text: 'ENTWURF', opacity: 25 },
    })
    const raw = pdfText(pdf)
    expect(pdf.getNumberOfPages()).toBe(2)
    expect(raw.match(/\(ENTWURF\) Tj/g)).toHaveLength(2)
    expect(raw).toMatch(/\/ca 0\.25/)
  })

  it('fehlt, wenn deaktiviert', async () => {
    const { pdf } = await buildPdfDocument([], {
      watermark: { ...defaultWatermark, enabled: false, text: 'ENTWURF' },
    })
    expect(pdfText(pdf)).not.toContain('ENTWURF')
  })
})
