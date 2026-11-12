// Globale Erweiterungen von `window`, die nicht aus Vite/DOM-Typen kommen.

/**
 * Von electron/preload.cjs über contextBridge bereitgestellte API.
 * Alle Felder optional: Im Browser fehlt die API ganz, Aufrufer prüfen vorher.
 */
export interface ElectronAPI {
  isElectron?: boolean
  /** URL im Standardbrowser des Systems öffnen */
  openExternal?: (url: string) => Promise<void>
  getVersion?: () => Promise<string>
  getPlatform?: () => Promise<string>
  /** PDF in einem Fenster mit Druckansicht öffnen (Direktdruck beim Export) */
  printPdf?: (data: ArrayBuffer) => Promise<void>
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI
    /** JSZip als UMD-Global, falls per Script-Tag eingebunden */
    JSZip?: typeof import('jszip')
  }
}
