// src/lib/core/image-types.ts
// Gemeinsame Typerkennung für importierte Bilddateien (Dateiauswahl, Drag & Drop, ZIP).

/** Unterstützte Bildendungen → MIME-Typ (Formate, die der Canvas-Import lädt). */
export const IMAGE_EXTENSION_TYPES: Readonly<Record<string, string>> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  bmp: 'image/bmp',
  avif: 'image/avif',
}

/**
 * accept-Wert für Bild-Dateiauswahlen. `.avif` steht zusätzlich zu `image/*`,
 * weil Windows ohne AV1-Erweiterung AVIF-Dateien nicht zu `image/*` zählt und
 * der Dateidialog sie sonst ausblendet.
 */
export const IMAGE_ACCEPT = 'image/*,.avif'

/** MIME-Typ anhand der Dateiendung oder null. */
export function imageTypeFromName(name: string): string | null {
  const dot = name.lastIndexOf('.')
  if (dot <= 0) return null
  return IMAGE_EXTENSION_TYPES[name.slice(dot + 1).toLowerCase()] ?? null
}

/**
 * MIME-Typ einer Bilddatei: der gemeldete Typ, sonst die Endung.
 * Manche Systeme melden für AVIF einen leeren oder generischen Typ.
 */
export function resolveImageType(file: Pick<File, 'name' | 'type'>): string | null {
  if (file.type.startsWith('image/')) return file.type
  return imageTypeFromName(file.name)
}

/** Liefert die Datei mit korrektem MIME-Typ (unverändert, wenn er bereits stimmt) oder null. */
export function normalizeImageFile(file: File): File | null {
  const type = resolveImageType(file)
  if (!type) return null
  if (type === file.type) return file
  return new File([file], file.name, { type, lastModified: file.lastModified })
}
