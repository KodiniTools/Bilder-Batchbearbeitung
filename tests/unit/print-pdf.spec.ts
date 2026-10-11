import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  cancelPrint,
  choosePrintMode,
  preparePrint,
  printPdf,
  type PrintEnvironment,
} from '@/lib/features/print-pdf'

const desktop: PrintEnvironment = {
  electron: false,
  pdfViewerEnabled: true,
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/140.0',
  maxTouchPoints: 0,
}

const pdfBlob = () => new Blob(['%PDF-1.3\n'], { type: 'application/pdf' })

describe('choosePrintMode', () => {
  it('druckt am Desktop über den Druckdialog', () => {
    expect(choosePrintMode(desktop)).toBe('dialog')
    // Browser ohne pdfViewerEnabled-Eigenschaft
    expect(choosePrintMode({ ...desktop, pdfViewerEnabled: undefined })).toBe('dialog')
  })

  it('nutzt in der Desktop-App das Druckfenster', () => {
    expect(choosePrintMode({ ...desktop, electron: true })).toBe('electron')
  })

  it('öffnet auf iPhone und iPad einen Tab', () => {
    expect(
      choosePrintMode({ ...desktop, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0)' })
    ).toBe('tab')
    // iPadOS meldet sich als Mac mit Touch
    expect(
      choosePrintMode({
        ...desktop,
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        maxTouchPoints: 5,
      })
    ).toBe('tab')
  })

  it('speichert ohne eingebaute PDF-Anzeige', () => {
    expect(choosePrintMode({ ...desktop, pdfViewerEnabled: false })).toBe('download')
    expect(
      choosePrintMode({ ...desktop, userAgent: 'Mozilla/5.0 (Linux; Android 15) Chrome/140.0' })
    ).toBe('download')
  })
})

describe('preparePrint / printPdf', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    delete (window as Window & { electronAPI?: unknown }).electronAPI
    document.body.innerHTML = ''
  })

  it('öffnet den Tab vorab und schließt ihn beim Abbruch', () => {
    const fakeWin = { close: vi.fn() } as unknown as Window
    const open = vi.spyOn(window, 'open').mockReturnValue(fakeWin)
    const target = preparePrint('tab')
    expect(open).toHaveBeenCalledWith('', '_blank')
    cancelPrint(target)
    expect(fakeWin.close).toHaveBeenCalled()
    expect(preparePrint('dialog').win).toBeNull()
  })

  it('lädt das PDF in den vorab geöffneten Tab', async () => {
    const fakeWin = { closed: false, location: { href: '' } } as unknown as Window
    const mode = await printPdf(pdfBlob(), { mode: 'tab', win: fakeWin })
    expect(mode).toBe('tab')
    expect(fakeWin.location.href).toMatch(/^blob:/)
  })

  it('speichert, wenn der Tab blockiert wurde', async () => {
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    const mode = await printPdf(pdfBlob(), { mode: 'tab', win: null })
    expect(mode).toBe('download')
    expect(click).toHaveBeenCalled()
  })

  it('übergibt das PDF in der Desktop-App an das Druckfenster', async () => {
    const printApi = vi.fn(async () => {})
    ;(window as Window & { electronAPI?: unknown }).electronAPI = { printPdf: printApi }
    const mode = await printPdf(pdfBlob(), { mode: 'electron', win: null })
    expect(mode).toBe('electron')
    const [data] = printApi.mock.calls[0] as unknown as [ArrayBuffer]
    expect(new TextDecoder().decode(data).startsWith('%PDF-')).toBe(true)
  })

  it('speichert, wenn das Druckfenster der Desktop-App fehlschlägt', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    ;(window as Window & { electronAPI?: unknown }).electronAPI = {
      printPdf: async () => {
        throw new Error('kaputt')
      },
    }
    expect(await printPdf(pdfBlob(), { mode: 'electron', win: null })).toBe('download')
    expect(click).toHaveBeenCalled()
  })
})
