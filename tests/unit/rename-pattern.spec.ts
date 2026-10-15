import { describe, it, expect } from 'vitest'
import {
  buildRenameNames,
  formatRenameDate,
  hasPlaceholders,
  resolveRenameDate,
  unknownPlaceholders,
  type RenameItem,
} from '@/lib/core/rename-pattern'

const opts = { startNumber: 1, separator: '-', lowercase: true }

function item(originalName: string, patch: Partial<RenameItem> = {}): RenameItem {
  return { originalName, width: 1200, height: 800, date: new Date(2024, 5, 15, 14, 30), ...patch }
}

describe('buildRenameNames', () => {
  it('ohne Platzhalter wie bisher: Basisname + Nummer', () => {
    expect(buildRenameNames('Urlaub Strand', [item('a'), item('b')], opts)).toEqual([
      'urlaub-strand-1',
      'urlaub-strand-2',
    ])
    // Pfadzeichen wurden schon immer zu „_“
    expect(
      buildRenameNames('a/b', [item('x')], { startNumber: 5, separator: '_', lowercase: false })
    ).toEqual(['a_b_5'])
  })

  it('füllt {name}_{n:000}_{date} pro Bild aus', () => {
    const names = buildRenameNames(
      '{name}_{n:000}_{date}',
      [item('IMG 4711'), item('DSC.0001', { date: new Date(2023, 0, 2) })],
      { startNumber: 9, separator: '-', lowercase: false }
    )
    expect(names).toEqual(['IMG-4711_009_2024-06-15', 'DSC0001_010_2023-01-02'])
  })

  it('kennt {n}, {w} und {h} und wendet Kleinschreibung an', () => {
    expect(buildRenameNames('Shop-{w}x{h}-{n}', [item('a')], opts)).toEqual(['shop-1200x800-1'])
  })

  it('macht doppelte Namen eindeutig', () => {
    expect(buildRenameNames('{date}', [item('a'), item('b'), item('c')], opts)).toEqual([
      '2024-06-15',
      '2024-06-15-2',
      '2024-06-15-3',
    ])
  })

  it('fällt bei leerem Ergebnis auf „bild-n“ zurück', () => {
    expect(buildRenameNames('{date}', [item('a', { date: null })], opts)).toEqual(['bild-1'])
  })
})

describe('Platzhalter-Prüfung', () => {
  it('erkennt Muster und unbekannte Platzhalter', () => {
    expect(hasPlaceholders('Urlaub')).toBe(false)
    expect(hasPlaceholders('{name}')).toBe(true)
    expect(unknownPlaceholders('{name}_{n:000}_{date}_{w}{h}{n}')).toEqual([])
    expect(unknownPlaceholders('{datum}_{n:abc}_{datum}')).toEqual(['{datum}', '{n:abc}'])
  })

  it('Datum: EXIF bevorzugt, sonst Dateidatum', () => {
    const file = new File(['x'], 'a.jpg', { lastModified: new Date(2022, 2, 3).getTime() })
    expect(formatRenameDate(resolveRenameDate(new Date(2021, 11, 24), file) as Date)).toBe(
      '2021-12-24'
    )
    expect(formatRenameDate(resolveRenameDate(null, file) as Date)).toBe('2022-03-03')
  })
})
