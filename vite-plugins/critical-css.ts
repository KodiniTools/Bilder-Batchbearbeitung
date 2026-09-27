/**
 * Build-Plugins gegen render-blockierendes CSS (PageSpeed: „Anfragen blockieren
 * das erste Rendering“).
 *
 * 1. faIconSubset – FontAwesome liefert ~1400 Icon-Regeln (≈50 KB), die App
 *    nutzt davon rund 100. Nur Icons, deren Klassenname (`fa-…`) wörtlich im
 *    Quellcode vorkommt, bleiben erhalten; alle übrigen FontAwesome-Regeln
 *    (Basis, Größen, Animationen, @font-face) bleiben unverändert.
 * 2. inlineEntryCss – das danach kleine Einstiegs-CSS wird als <style> in die
 *    index.html geschrieben. Damit entfällt die blockierende Anfrage; das CSS
 *    der Unterseiten wird weiterhin bei Bedarf von Vite nachgeladen.
 *
 * Beide greifen nur im Build (`apply: 'build'`); der Dev-Server nutzt das
 * vollständige CSS.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { extname, join } from 'node:path'
import type { Plugin } from 'vite'

const FA_CSS = /@fortawesome[\\/]fontawesome-free[\\/]css[\\/]fontawesome(\.min)?\.css$/
/** Icon-Regel im minifizierten FontAwesome-CSS: `.fa-a,.fa-b{--fa:"\f002"}` */
const ICON_RULE = /((?:\.fa-[a-z0-9-]+,)*\.fa-[a-z0-9-]+)\{--fa:"[^"]*"\}/g
const ICON_NAME = /fa-[a-z0-9]+(?:-[a-z0-9]+)*/g
const SCANNED = new Set(['.vue', '.ts', '.js', '.json', '.html', '.md'])

/** Alle `fa-…`-Namen aus den Quelldateien (rekursiv) einsammeln. */
function collectIconNames(roots: string[], exclude: string[]): Set<string> {
  const names = new Set<string>()
  const visit = (path: string) => {
    if (exclude.some((ex) => path.startsWith(ex))) return
    const stats = statSync(path)
    if (stats.isDirectory()) {
      for (const entry of readdirSync(path)) visit(join(path, entry))
    } else if (SCANNED.has(extname(path))) {
      for (const name of readFileSync(path, 'utf-8').match(ICON_NAME) ?? []) names.add(name)
    }
  }
  roots.forEach(visit)
  return names
}

/** Entfernt Icon-Regeln, deren Klassen im Quellcode nicht vorkommen. */
export function subsetIconRules(css: string, used: Set<string>): string {
  return css.replace(ICON_RULE, (rule, selectorList: string) => {
    const kept = selectorList.split(',').filter((sel) => used.has(sel.slice(1)))
    return kept.length ? rule.replace(selectorList, kept.join(',')) : ''
  })
}

export function faIconSubset(options: { roots: string[]; exclude?: string[] }): Plugin {
  let used = new Set<string>()
  return {
    name: 'fa-icon-subset',
    apply: 'build',
    // vor Vites CSS-Verarbeitung, damit die Regeln noch im Originalformat vorliegen
    enforce: 'pre',
    buildStart() {
      used = collectIconNames(options.roots, options.exclude ?? [])
    },
    transform(code, id) {
      if (!FA_CSS.test(id.split('?')[0])) return null
      return { code: subsetIconRules(code, used), map: null }
    },
  }
}

export function inlineEntryCss(): Plugin {
  return {
    name: 'inline-entry-css',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(html, ctx) {
        const bundle = ctx.bundle
        if (!bundle) return html
        return html.replace(
          /<link rel="stylesheet"[^>]*href="([^"]+\.css)"[^>]*>/g,
          (tag, href: string) => {
            const fileName = Object.keys(bundle).find((name) => href.endsWith(`/${name}`))
            const asset = fileName ? bundle[fileName] : undefined
            if (!fileName || !asset || asset.type !== 'asset') return tag
            // Nur löschen, wenn kein JS-Chunk die Datei nachlädt (Unterseiten
            // haben eigene CSS-Chunks) – sonst bleibt sie zusätzlich bestehen.
            const referenced = Object.values(bundle).some(
              (item) => item.type === 'chunk' && item.code.includes(fileName)
            )
            if (!referenced) delete bundle[fileName]
            return `<style>${String(asset.source)}</style>`
          }
        )
      },
    },
  }
}
