// @vitest-environment node
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

/**
 * Gefüllte Gold-Buttons tragen den dunkelgoldenen Verlauf (Equalizer-19-Muster).
 * Schrift bleibt weiß; jeder Stopp muss mit Weiß WCAG AA (4,5:1) erreichen.
 */
const read = (rel: string) => readFileSync(new URL(`../../${rel}`, import.meta.url), 'utf8')
const mainCss = read('src/assets/styles/main.css')

function luminance(hex: string): number {
  const channel = (i: number): number => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5)
}

describe('Button-Verlauf', () => {
  it.each(['--batch-action-grad', '--batch-action-grad-hover'])(
    '%s: jeder Stopp erreicht mit weißer Schrift 4,5:1',
    (token) => {
      const value = mainCss.match(new RegExp(`${token}:\\s*([^;]+);`))?.[1] ?? ''
      const stops = value.match(/#[0-9a-f]{6}/gi) ?? []
      expect(stops).toHaveLength(3)
      for (const stop of stops) expect(1.05 / (luminance(stop) + 0.05)).toBeGreaterThanOrEqual(4.5)
    }
  )

  it('Startbutton, Upload, Export, Primär- und Nebenbuttons sowie die Sprachauswahl nutzen den Verlauf', () => {
    const fill = 'background: var(--batch-action-fill) var(--batch-action-grad);'
    for (const file of [
      'src/assets/styles/kodini-layout-stage1.css',
      'src/assets/styles/kodini-buttons.css',
      'src/assets/styles/kodini-header-stage2.css',
      'src/components/DropZone.vue',
      'src/components/ExportBar.vue',
      'src/components/editor/editor-shared.css',
    ])
      expect(read(file)).toContain(fill)
    expect(mainCss).toContain('background-image: var(--batch-action-grad) !important;')
  })

  it('Abzeichen, Punkte und Fortschritt bleiben flach', () => {
    const flat = 'background: var(--batch-action-fill);'
    expect(read('src/components/LoadingIndicator.vue')).toContain(flat)
    expect(read('src/views/BlogPage.vue')).toMatch(
      /\.section-number \{[^}]*background: var\(--batch-action-fill\);/
    )
    expect(read('src/components/BatchEditPanel.vue')).toMatch(
      /\.panel-tab__badge \{[^}]*background: var\(--batch-action-fill\);/
    )
  })
})
