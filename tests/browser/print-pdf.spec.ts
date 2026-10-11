import { describe, it, expect } from 'vitest'
import { buildPdf } from '@/lib/features/export-pdf'
import { printPdf } from '@/lib/features/print-pdf'

describe('printPdf (Browser)', () => {
  it('lädt das PDF in ein unsichtbares iframe und ruft dort print() auf', async () => {
    const blob = await buildPdf([], { includeTitlePage: true, title: 'Druck' })
    const printed: string[] = []

    // print() des iframes abfangen, bevor es nach dem Laden aufgerufen wird
    const observer = new MutationObserver(() => {
      const iframe = document.querySelector('iframe')
      if (!iframe || iframe.dataset.watched) return
      iframe.dataset.watched = '1'
      iframe.addEventListener('load', () => {
        const win = iframe.contentWindow
        if (win) win.print = () => printed.push(iframe.src)
      })
    })
    observer.observe(document.body, { childList: true })

    try {
      const mode = await printPdf(blob, { mode: 'dialog', win: null })
      expect(mode).toBe('dialog')
      expect(printed).toHaveLength(1)
      expect(printed[0]).toMatch(/^blob:/)
      const iframe = document.querySelector('iframe')
      expect(iframe?.getAttribute('aria-hidden')).toBe('true')
      expect(getComputedStyle(iframe as HTMLIFrameElement).display).not.toBe('none')

      // Ein weiterer Druck ersetzt das alte iframe
      await printPdf(blob, { mode: 'dialog', win: null })
      expect(document.querySelectorAll('iframe')).toHaveLength(1)
      expect(printed).toHaveLength(2)
    } finally {
      observer.disconnect()
    }
  })
})
