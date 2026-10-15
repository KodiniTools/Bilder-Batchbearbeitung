// src/lib/core/rename-pattern.ts
// Dateinamen für „Bilder umbenennen“ bilden. Ein Name ohne Platzhalter
// verhält sich wie bisher (Name-1, Name-2, …); mit Platzhaltern wie
// {name}_{n:000}_{date} wird das Muster pro Bild ausgefüllt.

import { ImageProcessor } from './image-processor'
import type { ImageObject } from './types'

export const RENAME_PLACEHOLDERS = ['{name}', '{n}', '{n:000}', '{date}', '{w}', '{h}'] as const

export interface RenameItem {
  /** Originaler Dateiname ohne Endung */
  originalName: string
  width: number
  height: number
  /** Aufnahme- bzw. Dateidatum; null = unbekannt */
  date: Date | null
}

export interface RenameOptions {
  startNumber: number
  separator: string
  lowercase: boolean
}

const TOKEN_RE = /\{([^{}]*)\}/g

/** Enthält der Text mindestens einen {…}-Platzhalter? */
export function hasPlaceholders(pattern: string): boolean {
  return /\{[^{}]*\}/.test(pattern)
}

function isKnownToken(token: string): boolean {
  return ['name', 'date', 'w', 'h', 'n'].includes(token) || /^n:0+$/.test(token)
}

/** Unbekannte oder falsch geschriebene Platzhalter, z. B. „{datum}“ */
export function unknownPlaceholders(pattern: string): string[] {
  const unknown: string[] = []
  for (const match of pattern.matchAll(TOKEN_RE)) {
    if (!isKnownToken(match[1]) && !unknown.includes(match[0])) unknown.push(match[0])
  }
  return unknown
}

/** Gleiche Bereinigung wie bisher: Leerraum → Trennzeichen, nur sichere Zeichen */
function clean(name: string, separator: string, lowercase: boolean): string {
  const out = name.replace(/\s+/g, separator).replace(/[^a-zA-Z0-9äöüÄÖÜß\-_]/g, '')
  return lowercase ? out.toLowerCase() : out
}

function pad(value: number, width: number): string {
  return String(value).padStart(width, '0')
}

/** Datum als JJJJ-MM-TT in lokaler Zeit */
export function formatRenameDate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1, 2)}-${pad(date.getDate(), 2)}`
}

/** Aufnahmedatum aus EXIF, sonst Änderungsdatum der Datei */
export function resolveRenameDate(exifDate: Date | null | undefined, file: File): Date | null {
  if (exifDate) return exifDate
  return file.lastModified > 0 ? new Date(file.lastModified) : null
}

/** Umbenennen-Angaben eines Bildes */
export function toRenameItem(image: ImageObject, exifDate?: Date | null): RenameItem {
  return {
    originalName: ImageProcessor.getFileNameWithoutExtension(image.file.name),
    width: image.canvas.width,
    height: image.canvas.height,
    date: resolveRenameDate(exifDate, image.file),
  }
}

function fill(pattern: string, item: RenameItem, number: number): string {
  return pattern.replace(TOKEN_RE, (whole, token: string) => {
    if (token === 'name') return item.originalName
    if (token === 'n') return String(number)
    if (token.startsWith('n:')) return pad(number, token.length - 2)
    if (token === 'date') return item.date ? formatRenameDate(item.date) : ''
    if (token === 'w') return String(item.width)
    if (token === 'h') return String(item.height)
    return whole
  })
}

/**
 * Neue Namen (ohne Endung) in der Reihenfolge von `items`.
 * Gleiche Namen bekommen „-2“, „-3“ … angehängt, damit beim Export keine
 * Datei eine andere überschreibt.
 */
export function buildRenameNames(
  pattern: string,
  items: RenameItem[],
  options: RenameOptions
): string[] {
  const { startNumber, separator, lowercase } = options
  const templated = hasPlaceholders(pattern)
  // Ohne Platzhalter exakt wie bisher: Basisname + Trennzeichen + Nummer
  const base = clean(ImageProcessor.safeBaseName(pattern), separator, lowercase)
  const seen = new Set<string>()

  return items.map((item, index) => {
    const number = startNumber + index
    let name = `${base}${separator}${number}`
    if (templated) {
      // Pfadzeichen wie beim Basisnamen zu „_“ (ohne dessen „Unbenannt“-Ersatz)
      const filled = fill(pattern.trim(), item, number).replace(/[\\/:*?"<>|]+/g, '_')
      name = clean(filled, separator, lowercase)
      // Muster, das nur leere Platzhalter enthält (z. B. {date} ohne Datum)
      if (!name.replace(/[-_]/g, '')) name = `bild${separator}${number}`
    }

    let unique = name
    for (let k = 2; seen.has(unique.toLowerCase()); k++) unique = `${name}${separator}${k}`
    seen.add(unique.toLowerCase())
    return unique
  })
}
