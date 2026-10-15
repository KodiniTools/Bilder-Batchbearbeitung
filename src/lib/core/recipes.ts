// src/lib/core/recipes.ts
// Eigene Rezepte: benannte Sammlung aus Stapelbearbeitung (Filter,
// Rahmen/Schatten, Wasserzeichen, Zielgröße), Export- und Umbenennen-
// Einstellungen. Gespeichert in localStorage, austauschbar als JSON-Datei.
// Alle Eingaben (Speicher wie Import) laufen durch sanitizeRecipe, damit
// fremde oder veraltete Dateien keine ungültigen Werte in die App bringen.

import type { ImageFilters, ImageTransforms, WatermarkSettings } from './types'
import { defaultFilters, defaultTransforms, defaultWatermark } from './types'
import {
  RESIZE_MODES,
  RESIZE_PERCENT_MAX,
  RESIZE_PERCENT_MIN,
  RESIZE_PX_MAX,
  defaultResizeSpec,
  type ResizeSpec,
} from './resize-modes'
import { LOGO_SIZE_MAX, LOGO_SIZE_MIN, isWatermarkLogoDataUrl } from './watermark-logo'

export type RecipeExportFormat = 'png' | 'jpg' | 'webp'

export interface RecipeExportSettings {
  format: RecipeExportFormat
  /** 1-100 wie im Exportdialog */
  quality: number
  pngTransparent: boolean
  pngBackgroundColor: string
  zipName: string
  /** Maximale Dateigröße pro Bild begrenzen (nur JPG/WebP) */
  targetSizeEnabled: boolean
  targetSizeKb: number
  /** Notfalls Abmessungen verkleinern, um die Zielgröße zu erreichen */
  targetSizeDownscale: boolean
}

export interface RecipeRenameSettings {
  baseName: string
  startNumber: number
  separator: '-' | '_'
  lowercase: boolean
}

/** Zielgröße der Stapelbearbeitung; wird nur vorbelegt, nie automatisch angewendet */
export type RecipeResize = ResizeSpec

export interface Recipe {
  id: string
  name: string
  createdAt: number
  filters: ImageFilters
  transforms: ImageTransforms
  watermark: WatermarkSettings
  resize: RecipeResize | null
  export: RecipeExportSettings
  rename: RecipeRenameSettings
}

export const defaultRecipeExport: RecipeExportSettings = {
  format: 'png',
  quality: 92,
  pngTransparent: true,
  pngBackgroundColor: '#ffffff',
  zipName: 'bilder-export',
  targetSizeEnabled: false,
  targetSizeKb: 500,
  targetSizeDownscale: false,
}

export const defaultRecipeRename: RecipeRenameSettings = {
  baseName: 'Bild',
  startNumber: 1,
  separator: '-',
  lowercase: true,
}

export const RECIPE_NAME_MAX = 60
export const TARGET_KB_MIN = 10
export const TARGET_KB_MAX = 50000
const STORAGE_KEY = 'bilderserie-recipes'
const FILE_FORMAT = 'bilderserie-rezepte'

// Wertebereiche wie in den Reglern der Oberfläche
const FILTER_RANGES: Record<keyof ImageFilters, [number, number]> = {
  brightness: [0, 200],
  contrast: [0, 200],
  saturation: [0, 200],
  hue: [0, 360],
  opacity: [0, 100],
  blur: [0, 20],
  grayscale: [0, 100],
  sepia: [0, 100],
  invert: [0, 100],
  temperature: [-100, 100],
  vibrance: [-100, 100],
  vignette: [0, 100],
}

const TRANSFORM_RANGES: Record<
  Exclude<keyof ImageTransforms, 'borderColor' | 'shadowColor'>,
  [number, number]
> = {
  borderWidth: [0, 50],
  borderRadius: [0, 200],
  shadowBlur: [0, 50],
  shadowOpacity: [0, 100],
  shadowOffsetX: [-25, 25],
  shadowOffsetY: [-25, 25],
}

const WATERMARK_POSITIONS: ReadonlyArray<WatermarkSettings['position']> = [
  'center',
  'top-left',
  'top-right',
  'bottom-left',
  'bottom-right',
  'tile',
]

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function num(value: unknown, fallback: number, [min, max]: [number, number]): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.min(max, Math.max(min, value))
    : fallback
}

function bool(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback
}

function color(value: unknown, fallback: string): string {
  return typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value) ? value : fallback
}

function str(value: unknown, fallback: string, maxLength: number): string {
  return typeof value === 'string' ? value.slice(0, maxLength) : fallback
}

function sanitizeFilters(raw: unknown): ImageFilters {
  const r = isRecord(raw) ? raw : {}
  const out = { ...defaultFilters }
  for (const key of Object.keys(FILTER_RANGES) as Array<keyof ImageFilters>) {
    out[key] = num(r[key], defaultFilters[key], FILTER_RANGES[key])
  }
  return out
}

function sanitizeTransforms(raw: unknown): ImageTransforms {
  const r = isRecord(raw) ? raw : {}
  const out = { ...defaultTransforms }
  for (const key of Object.keys(TRANSFORM_RANGES) as Array<keyof typeof TRANSFORM_RANGES>) {
    out[key] = num(r[key], defaultTransforms[key], TRANSFORM_RANGES[key])
  }
  out.borderColor = color(r.borderColor, defaultTransforms.borderColor)
  out.shadowColor = color(r.shadowColor, defaultTransforms.shadowColor)
  return out
}

function sanitizeWatermark(raw: unknown): WatermarkSettings {
  const r = isRecord(raw) ? raw : {}
  const position = WATERMARK_POSITIONS.find((p) => p === r.position)
  return {
    enabled: bool(r.enabled, defaultWatermark.enabled),
    text: str(r.text, defaultWatermark.text, 200),
    fontFamily: str(r.fontFamily, defaultWatermark.fontFamily, 80) || defaultWatermark.fontFamily,
    fontSize: num(r.fontSize, defaultWatermark.fontSize, [10, 200]),
    color: color(r.color, defaultWatermark.color),
    opacity: num(r.opacity, defaultWatermark.opacity, [0, 100]),
    rotation: num(r.rotation, defaultWatermark.rotation, [-180, 180]),
    position: position ?? defaultWatermark.position,
    bold: bool(r.bold, defaultWatermark.bold),
    italic: bool(r.italic, defaultWatermark.italic),
    logoDataUrl: isWatermarkLogoDataUrl(r.logoDataUrl) ? r.logoDataUrl : '',
    logoPosition:
      WATERMARK_POSITIONS.find((p) => p === r.logoPosition) ?? defaultWatermark.logoPosition,
    logoSize: num(r.logoSize, defaultWatermark.logoSize, [LOGO_SIZE_MIN, LOGO_SIZE_MAX]),
    logoOpacity: num(r.logoOpacity, defaultWatermark.logoOpacity, [0, 100]),
  }
}

function sanitizeResize(raw: unknown): RecipeResize | null {
  if (!isRecord(raw)) return null
  const width = num(raw.width, NaN, [1, RESIZE_PX_MAX])
  const height = num(raw.height, NaN, [1, RESIZE_PX_MAX])
  if (!Number.isFinite(width) || !Number.isFinite(height)) return null
  const d = defaultResizeSpec
  return {
    // Rezepte vor den Resize-Modi kennen nur Breite/Höhe → exakt
    mode: RESIZE_MODES.find((m) => m === raw.mode) ?? 'exact',
    width: Math.round(width),
    height: Math.round(height),
    keepAspect: bool(raw.keepAspect, true),
    percent: Math.round(num(raw.percent, d.percent, [RESIZE_PERCENT_MIN, RESIZE_PERCENT_MAX])),
    longEdge: Math.round(num(raw.longEdge, d.longEdge, [1, RESIZE_PX_MAX])),
    noUpscale: bool(raw.noUpscale, d.noUpscale),
  }
}

export function sanitizeExportSettings(raw: unknown): RecipeExportSettings {
  const r = isRecord(raw) ? raw : {}
  const d = defaultRecipeExport
  const format = (['png', 'jpg', 'webp'] as const).find((f) => f === r.format)
  return {
    format: format ?? d.format,
    quality: Math.round(num(r.quality, d.quality, [1, 100])),
    pngTransparent: bool(r.pngTransparent, d.pngTransparent),
    pngBackgroundColor: color(r.pngBackgroundColor, d.pngBackgroundColor),
    zipName: str(r.zipName, d.zipName, 120).trim() || d.zipName,
    targetSizeEnabled: bool(r.targetSizeEnabled, d.targetSizeEnabled),
    targetSizeKb: Math.round(num(r.targetSizeKb, d.targetSizeKb, [TARGET_KB_MIN, TARGET_KB_MAX])),
    targetSizeDownscale: bool(r.targetSizeDownscale, d.targetSizeDownscale),
  }
}

export function sanitizeRenameSettings(raw: unknown): RecipeRenameSettings {
  const r = isRecord(raw) ? raw : {}
  const d = defaultRecipeRename
  return {
    baseName: str(r.baseName, d.baseName, 120).trim() || d.baseName,
    startNumber: Math.round(num(r.startNumber, d.startNumber, [0, 999999])),
    separator: r.separator === '_' ? '_' : r.separator === '-' ? '-' : d.separator,
    lowercase: bool(r.lowercase, d.lowercase),
  }
}

/** Liest ein Rezept aus beliebigen Daten; `null`, wenn kein Name vorhanden ist. */
export function sanitizeRecipe(raw: unknown): Recipe | null {
  if (!isRecord(raw)) return null
  const name = str(raw.name, '', RECIPE_NAME_MAX).trim()
  if (!name) return null
  const id = typeof raw.id === 'string' && raw.id.length <= 64 && raw.id ? raw.id : newRecipeId()
  return {
    id,
    name,
    createdAt: num(raw.createdAt, Date.now(), [0, Number.MAX_SAFE_INTEGER]),
    filters: sanitizeFilters(raw.filters),
    transforms: sanitizeTransforms(raw.transforms),
    watermark: sanitizeWatermark(raw.watermark),
    resize: sanitizeResize(raw.resize),
    export: sanitizeExportSettings(raw.export),
    rename: sanitizeRenameSettings(raw.rename),
  }
}

export function newRecipeId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

export function createRecipe(
  name: string,
  parts: Omit<Recipe, 'id' | 'name' | 'createdAt'>
): Recipe {
  // Über sanitizeRecipe laufen lassen: kopiert alle Objekte (keine Vue-Proxies)
  const recipe = sanitizeRecipe({ ...parts, name, id: newRecipeId(), createdAt: Date.now() })
  if (!recipe) throw new Error('Rezept braucht einen Namen')
  return recipe
}

/**
 * Fügt importierte Rezepte ein. Gleichnamige Rezepte (ohne Groß-/Kleinschreibung)
 * werden ersetzt, alle anderen angehängt.
 */
export function mergeRecipes(existing: Recipe[], incoming: Recipe[]): Recipe[] {
  const result = [...existing]
  for (const recipe of incoming) {
    const idx = result.findIndex((r) => r.name.toLowerCase() === recipe.name.toLowerCase())
    // Bestehende ID behalten; eine fremde, bereits vergebene ID neu erzeugen
    const id =
      idx >= 0 ? result[idx].id : result.some((r) => r.id === recipe.id) ? newRecipeId() : recipe.id
    const next = { ...recipe, id }
    if (idx >= 0) result[idx] = next
    else result.push(next)
  }
  return result
}

// ── Speichern / Laden ─────────────────────────────────────────────

export function loadRecipes(storage: Storage | undefined = globalThis.localStorage): Recipe[] {
  try {
    const raw = storage?.getItem(STORAGE_KEY)
    if (!raw) return []
    const list: unknown = JSON.parse(raw)
    if (!Array.isArray(list)) return []
    return list.map(sanitizeRecipe).filter((r): r is Recipe => r !== null)
  } catch {
    return []
  }
}

/** Wirft bei vollem Speicher (QuotaExceededError), damit die UI es melden kann. */
export function saveRecipes(
  recipes: Recipe[],
  storage: Storage | undefined = globalThis.localStorage
): void {
  if (!storage) throw new Error('localStorage nicht verfügbar')
  storage.setItem(STORAGE_KEY, JSON.stringify(recipes))
}

/** JSON-Datei für Export/Weitergabe */
export function serializeRecipes(recipes: Recipe[]): string {
  return JSON.stringify({ format: FILE_FORMAT, version: 1, recipes }, null, 2)
}

/** Importierte Datei lesen; wirft bei ungültigem Inhalt. */
export function parseRecipeFile(json: string): Recipe[] {
  const data: unknown = JSON.parse(json)
  const list = isRecord(data) && data.format === FILE_FORMAT ? data.recipes : undefined
  if (!Array.isArray(list)) throw new Error('Keine Rezept-Datei')
  const recipes = list.map(sanitizeRecipe).filter((r): r is Recipe => r !== null)
  if (recipes.length === 0) throw new Error('Keine gültigen Rezepte')
  return recipes
}
