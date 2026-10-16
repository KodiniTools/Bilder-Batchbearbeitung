import { describe, it, expect } from 'vitest'
import {
  computeResizeTarget,
  defaultResizeSpec,
  isResizeSpecValid,
  resolveResizeTarget,
  type ResizeSpec,
} from '@/lib/core/resize-modes'

const landscape = { width: 4000, height: 3000 }
const portrait = { width: 3000, height: 4000 }
const small = { width: 800, height: 600 }

function spec(patch: Partial<ResizeSpec>): ResizeSpec {
  return { ...defaultResizeSpec, ...patch }
}

describe('computeResizeTarget', () => {
  it('exakt: bisheriges Verhalten mit Seitenverhältnis des Originals', () => {
    const s = spec({ mode: 'exact', width: 1920, height: 1080, keepAspect: true })
    expect(computeResizeTarget(landscape, s)).toEqual({ width: 1440, height: 1080 })
    // Seitenverhältnis kommt vom Original, nicht vom aktuellen Canvas
    expect(computeResizeTarget(small, s, 16 / 9)).toEqual({ width: 1920, height: 1080 })
    expect(computeResizeTarget(small, { ...s, keepAspect: false })).toEqual({
      width: 1920,
      height: 1080,
    })
    // Exakt wird auch bei gleicher Größe angewendet
    expect(computeResizeTarget(small, spec({ mode: 'exact', width: 800, height: 600 }))).toEqual(
      small
    )
  })

  it('Prozent skaliert beide Seiten und rundet', () => {
    expect(computeResizeTarget(landscape, spec({ mode: 'percent', percent: 25 }))).toEqual({
      width: 1000,
      height: 750,
    })
    expect(
      computeResizeTarget({ width: 3, height: 3 }, spec({ mode: 'percent', percent: 10 }))
    ).toEqual({
      width: 1,
      height: 1,
    })
    expect(computeResizeTarget(small, spec({ mode: 'percent', percent: 100 }))).toBeNull()
  })

  it('lange Kante gilt für Hoch- und Querformat', () => {
    const s = spec({ mode: 'longEdge', longEdge: 2000 })
    expect(computeResizeTarget(landscape, s)).toEqual({ width: 2000, height: 1500 })
    expect(computeResizeTarget(portrait, s)).toEqual({ width: 1500, height: 2000 })
  })

  it('lange Kante: „nicht vergrößern“ lässt kleinere Bilder unverändert', () => {
    expect(computeResizeTarget(small, spec({ mode: 'longEdge', longEdge: 2000 }))).toBeNull()
    expect(
      computeResizeTarget(small, spec({ mode: 'longEdge', longEdge: 1600, noUpscale: false }))
    ).toEqual({ width: 1600, height: 1200 })
  })

  it('einpassen: passt in den Rahmen und behält das Seitenverhältnis', () => {
    const s = spec({ mode: 'fit', width: 1920, height: 1080 })
    expect(computeResizeTarget(landscape, s)).toEqual({ width: 1440, height: 1080 })
    expect(computeResizeTarget(portrait, s)).toEqual({ width: 810, height: 1080 })
    expect(computeResizeTarget({ width: 6000, height: 1000 }, s)).toEqual({
      width: 1920,
      height: 320,
    })
  })

  it('einpassen: vergrößert nur ohne „nicht vergrößern“', () => {
    const s = spec({ mode: 'fit', width: 1920, height: 1080 })
    expect(computeResizeTarget(small, s)).toBeNull()
    expect(computeResizeTarget(small, { ...s, noUpscale: false })).toEqual({
      width: 1440,
      height: 1080,
    })
  })

  it('ignoriert leere Quellen', () => {
    expect(computeResizeTarget({ width: 0, height: 10 }, spec({ mode: 'percent' }))).toBeNull()
  })
})

describe('isResizeSpecValid', () => {
  it('prüft nur die Felder des gewählten Modus', () => {
    expect(isResizeSpecValid(spec({ mode: 'percent', percent: 0, width: 0 }))).toBe(false)
    expect(isResizeSpecValid(spec({ mode: 'percent', percent: 50, width: 0 }))).toBe(true)
    expect(isResizeSpecValid(spec({ mode: 'longEdge', longEdge: 0 }))).toBe(false)
    expect(isResizeSpecValid(spec({ mode: 'fit', width: 100, height: 0 }))).toBe(false)
    expect(isResizeSpecValid(spec({ mode: 'exact' }))).toBe(true)
  })
})

describe('resolveResizeTarget', () => {
  it('liefert die Zielgröße der relativen Modi', () => {
    expect(resolveResizeTarget(landscape, spec({ mode: 'percent', percent: 25 }))).toEqual({
      width: 1000,
      height: 750,
    })
    expect(resolveResizeTarget(portrait, spec({ mode: 'longEdge', longEdge: 2000 }))).toEqual({
      width: 1500,
      height: 2000,
    })
  })

  it('unverändert oder ungültig: aktuelle Größe statt null', () => {
    expect(resolveResizeTarget(small, spec({ mode: 'fit', width: 1920, height: 1080 }))).toEqual(
      small
    )
    expect(resolveResizeTarget(small, spec({ mode: 'percent', percent: 0 }))).toEqual(small)
    // Ergebnis ist eine Kopie, nicht das Eingabeobjekt
    expect(resolveResizeTarget(small, spec({ mode: 'percent', percent: 100 }))).not.toBe(small)
  })
})
