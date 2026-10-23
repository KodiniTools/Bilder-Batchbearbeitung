// src/lib/features/import-zip.ts
// ZIP-Archive im Browser entpacken und die enthaltenen Bilder als File-Objekte liefern.

/** Unterstützte Bildendungen → MIME-Typ (entspricht den Formaten, die der Canvas-Import lädt). */
export const ZIP_IMAGE_TYPES: Readonly<Record<string, string>> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  bmp: 'image/bmp',
  avif: 'image/avif',
}

/** Schutz gegen ZIP-Bomben: Obergrenzen für Anzahl und entpackte Gesamtgröße. */
export const ZIP_MAX_IMAGES = 2000
export const ZIP_MAX_TOTAL_BYTES = 1024 * 1024 * 1024

export const ZIP_ACCEPT = '.zip,application/zip,application/x-zip-compressed'

const ZIP_MIME_TYPES = new Set(['application/zip', 'application/x-zip-compressed'])

export type ZipImportErrorCode = 'invalid' | 'tooLarge'

export class ZipImportError extends Error {
  constructor(
    readonly code: ZipImportErrorCode,
    message: string
  ) {
    super(message)
    this.name = 'ZipImportError'
  }
}

export interface ZipImportResult {
  images: File[]
  /** Dateien im Archiv, die keine unterstützten Bilder sind */
  skipped: number
}

export interface ZipImportOptions {
  maxImages?: number
  maxTotalBytes?: number
}

/** Erkennt ZIP-Dateien über MIME-Typ oder Endung (Windows liefert teils keinen Typ). */
export function isZipFile(file: File): boolean {
  return ZIP_MIME_TYPES.has(file.type) || file.name.toLowerCase().endsWith('.zip')
}

/** MIME-Typ eines Archiv-Eintrags oder null, wenn er nicht übernommen wird. */
export function zipEntryImageType(path: string): string | null {
  const segments = path.split('/')
  // macOS-Metadaten (__MACOSX/, ._datei) und versteckte Dateien überspringen
  if (segments.some((s) => s === '__MACOSX' || s.startsWith('.'))) return null
  const name = segments[segments.length - 1]
  const dot = name.lastIndexOf('.')
  if (dot <= 0) return null
  return ZIP_IMAGE_TYPES[name.slice(dot + 1).toLowerCase()] ?? null
}

const pathCollator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' })

/**
 * Entpackt alle unterstützten Bilder eines ZIP-Archivs. Unterordner werden flach
 * übernommen, die Reihenfolge folgt dem Pfad (natürliche Sortierung).
 * @throws ZipImportError bei defektem Archiv oder überschrittenen Grenzen
 */
export async function extractImagesFromZip(
  file: File,
  options: ZipImportOptions = {}
): Promise<ZipImportResult> {
  const maxImages = options.maxImages ?? ZIP_MAX_IMAGES
  const maxTotalBytes = options.maxTotalBytes ?? ZIP_MAX_TOTAL_BYTES
  const { default: JSZip } = await import('jszip')

  let zip: InstanceType<typeof JSZip>
  try {
    zip = await JSZip.loadAsync(await file.arrayBuffer())
  } catch (err) {
    throw new ZipImportError('invalid', `ZIP „${file.name}“ konnte nicht gelesen werden: ${err}`)
  }

  const entries = Object.values(zip.files).filter((entry) => !entry.dir)
  const imageEntries = entries
    .map((entry) => ({ entry, type: zipEntryImageType(entry.name) }))
    .filter((e): e is { entry: (typeof entries)[number]; type: string } => e.type !== null)
    .sort((a, b) => pathCollator.compare(a.entry.name, b.entry.name))

  if (imageEntries.length > maxImages) {
    throw new ZipImportError(
      'tooLarge',
      `ZIP „${file.name}“ enthält ${imageEntries.length} Bilder (max. ${maxImages})`
    )
  }

  const images: File[] = []
  let totalBytes = 0
  // Nacheinander entpacken, damit die Größengrenze vor dem nächsten Eintrag greift
  for (const { entry, type } of imageEntries) {
    const data = await entry.async('arraybuffer')
    totalBytes += data.byteLength
    if (totalBytes > maxTotalBytes) {
      throw new ZipImportError(
        'tooLarge',
        `ZIP „${file.name}“ überschreitet entpackt ${Math.round(maxTotalBytes / 1024 / 1024)} MB`
      )
    }
    const name = entry.name.split('/').pop() as string
    images.push(new File([data], name, { type, lastModified: entry.date?.getTime() }))
  }

  return { images, skipped: entries.length - imageEntries.length }
}
