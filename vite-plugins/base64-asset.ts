/**
 * `?base64`-Import für Binärdateien: `import data from './font.ttf?base64'`
 * liefert den Dateiinhalt als Base64-String in einem eigenen JS-Chunk.
 *
 * Gebraucht für die PDF-Schriften (jsPDF erwartet Base64). Anders als eine
 * Asset-URL funktioniert das ohne fetch, also auch in Electron unter file://
 * und in Vitest. Mit `import.meta.glob(..., { query: '?base64' })` bleibt
 * jede Datei ein Lazy-Chunk, der nur bei Bedarf geladen wird.
 */
import { readFileSync } from 'node:fs'
import type { Plugin } from 'vite'

const BASE64_QUERY = /[?&]base64$/

export function base64Asset(): Plugin {
  return {
    name: 'base64-asset',
    // vor vite:asset, das .ttf sonst als URL-Asset behandelt
    enforce: 'pre',
    load(id) {
      if (!BASE64_QUERY.test(id)) return null
      const file = id.replace(/\?.*$/, '')
      this.addWatchFile(file)
      return `export default ${JSON.stringify(readFileSync(file).toString('base64'))}`
    },
  }
}
