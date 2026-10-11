// Direktdruck eines erzeugten PDFs auf dem Gerät des Nutzers (kein Server).
//
// Je nach Umgebung:
// - dialog:   Desktop-Browser mit PDF-Anzeige → unsichtbares iframe, Druckdialog öffnet sich
// - tab:      iPhone/iPad → PDF in neuem Tab (dort über „Teilen → Drucken“)
// - download: Geräte ohne eingebaute PDF-Anzeige (z. B. Android) → PDF speichern
// - electron: Desktop-App → Fenster mit PDF-Ansicht und Druckknopf

import { downloadPdf } from './export-pdf'

export type PrintMode = 'electron' | 'dialog' | 'tab' | 'download'

interface ElectronPrintApi {
  printPdf?: (data: ArrayBuffer) => Promise<void>
}

export interface PrintEnvironment {
  electron: boolean
  /** navigator.pdfViewerEnabled; undefined = Browser kennt die Eigenschaft nicht */
  pdfViewerEnabled: boolean | undefined
  userAgent: string
  maxTouchPoints: number
}

function electronApi(): ElectronPrintApi | undefined {
  return (window as Window & { electronAPI?: ElectronPrintApi }).electronAPI
}

export function detectPrintEnvironment(): PrintEnvironment {
  return {
    electron: typeof electronApi()?.printPdf === 'function',
    pdfViewerEnabled: navigator.pdfViewerEnabled,
    userAgent: navigator.userAgent,
    maxTouchPoints: navigator.maxTouchPoints ?? 0,
  }
}

function isIOS(env: PrintEnvironment): boolean {
  // iPadOS meldet sich als Mac mit Touch
  return (
    /iPad|iPhone|iPod/.test(env.userAgent) ||
    (/Macintosh/.test(env.userAgent) && env.maxTouchPoints > 1)
  )
}

/** Wählt den Druckweg für die Umgebung. */
export function choosePrintMode(env: PrintEnvironment = detectPrintEnvironment()): PrintMode {
  if (env.electron) return 'electron'
  if (isIOS(env)) return 'tab'
  // Ältere Browser kennen pdfViewerEnabled nicht; Desktop-Browser zeigen PDFs an
  if (env.pdfViewerEnabled === false || /Android/.test(env.userAgent)) return 'download'
  return 'dialog'
}

export interface PrintTarget {
  mode: PrintMode
  /** Vorab geöffneter Tab (nur „tab“); null, wenn der Browser ihn blockiert hat */
  win: Window | null
}

/**
 * Muss synchron im Klick-Handler laufen (vor dem ersten await): Ein Tab lässt
 * sich nur direkt nach einer Nutzeraktion öffnen, das PDF entsteht erst danach.
 */
export function preparePrint(mode: PrintMode = choosePrintMode()): PrintTarget {
  return { mode, win: mode === 'tab' ? window.open('', '_blank') : null }
}

/** Vorab geöffneten Tab schließen (Abbruch oder Fehler beim Erzeugen). */
export function cancelPrint(target: PrintTarget): void {
  target.win?.close()
}

/** iframe des letzten Drucks; bleibt bis zum nächsten Druck, sonst bricht der Dialog ab */
let printFrame: { iframe: HTMLIFrameElement; url: string } | null = null

function clearPrintFrame(): void {
  if (!printFrame) return
  printFrame.iframe.remove()
  URL.revokeObjectURL(printFrame.url)
  printFrame = null
}

const FRAME_LOAD_TIMEOUT_MS = 15_000
/** Die PDF-Anzeige ist nach „load“ noch nicht sofort druckbereit */
const PRINT_DELAY_MS = 300

function printViaFrame(blob: Blob): Promise<void> {
  clearPrintFrame()
  const url = URL.createObjectURL(blob)
  const iframe = document.createElement('iframe')
  iframe.setAttribute('aria-hidden', 'true')
  iframe.tabIndex = -1
  // Nicht display:none – sonst druckt Chrome eine leere Seite
  Object.assign(iframe.style, {
    position: 'fixed',
    right: '0',
    bottom: '0',
    width: '1px',
    height: '1px',
    border: '0',
    opacity: '0',
    pointerEvents: 'none',
  })
  printFrame = { iframe, url }

  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error('PDF konnte nicht zum Drucken geladen werden')),
      FRAME_LOAD_TIMEOUT_MS
    )
    iframe.onload = () => {
      clearTimeout(timer)
      setTimeout(() => {
        try {
          const win = iframe.contentWindow
          if (!win) throw new Error('Druckansicht nicht verfügbar')
          win.focus()
          win.print()
          resolve()
        } catch (error) {
          reject(error instanceof Error ? error : new Error(String(error)))
        }
      }, PRINT_DELAY_MS)
    }
    iframe.src = url
    document.body.appendChild(iframe)
  })
}

/**
 * Druckt das PDF auf dem Gerät. Gibt den tatsächlich genutzten Weg zurück
 * (für die Rückmeldung an den Nutzer). Fehlschläge fallen auf den Download zurück.
 */
export async function printPdf(
  blob: Blob,
  target: PrintTarget,
  filename = 'bilder-export.pdf'
): Promise<PrintMode> {
  switch (target.mode) {
    case 'electron': {
      const api = electronApi()
      try {
        if (api?.printPdf) {
          await api.printPdf(await blob.arrayBuffer())
          return 'electron'
        }
      } catch (error) {
        console.warn('[printPdf] Druckfenster nicht möglich, PDF wird gespeichert:', error)
      }
      break
    }
    case 'dialog':
      try {
        await printViaFrame(blob)
        return 'dialog'
      } catch (error) {
        console.warn('[printPdf] Druckdialog nicht möglich, PDF wird gespeichert:', error)
        clearPrintFrame()
      }
      break
    case 'tab':
      if (target.win && !target.win.closed) {
        const url = URL.createObjectURL(blob)
        target.win.location.href = url
        // Der Tab hat das PDF dann geladen; großzügig freigeben
        setTimeout(() => URL.revokeObjectURL(url), 60_000)
        return 'tab'
      }
      break
    case 'download':
      break
    default: {
      const never: never = target.mode
      throw new Error(`Unbekannter Druckweg: ${String(never)}`)
    }
  }
  downloadPdf(blob, filename)
  return 'download'
}
