// src/lib/core/filter-presets.ts
// Gemeinsame Filter-Presets ("One-Click-Looks") für Einzelbild-Editor und
// Stapelbearbeitung. Jedes Preset ist eine Kombination bestehender Filterwerte.

import type { ImageFilters } from './types'

export interface FilterPreset {
  key: string
  filters: Partial<ImageFilters>
}

export const FILTER_PRESETS: ReadonlyArray<FilterPreset> = [
  { key: 'original', filters: {} },
  { key: 'bw',       filters: { grayscale: 100, contrast: 110, brightness: 102 } },
  { key: 'vintage',  filters: { sepia: 40, contrast: 95, saturation: 85, temperature: 22, vignette: 38 } },
  { key: 'warm',     filters: { temperature: 45, saturation: 110, brightness: 102 } },
  { key: 'cool',     filters: { temperature: -40, saturation: 105 } },
  { key: 'vivid',    filters: { saturation: 135, contrast: 112, vibrance: 45 } },
  { key: 'matte',    filters: { contrast: 88, saturation: 82, brightness: 106, vignette: 15 } },
  { key: 'noir',     filters: { grayscale: 100, contrast: 135, brightness: 96, vignette: 45 } },
]
