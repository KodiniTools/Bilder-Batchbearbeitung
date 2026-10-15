// src/lib/core/exif.ts
// EXIF-Metadaten aus der Originaldatei lesen und in exportierte Dateien
// übernehmen (JPEG, PNG, WebP). Canvas-Exporte enthalten nie EXIF; ohne
// diesen Schritt gehen Kamera, Aufnahmedatum, GPS usw. verloren.
//
// Gearbeitet wird mit dem rohen TIFF-Block („II*\0“/„MM\0*“). Vor dem Einfügen
// wird er normalisiert:
// - Orientation = 1, weil der Browser die Pixel beim Laden bereits gedreht hat
//   (sonst würden Betrachter ein zweites Mal drehen)
// - Verweis auf IFD1 (eingebettetes Vorschaubild) entfernen, weil das alte
//   Vorschaubild nicht mehr zum bearbeiteten Bild passt

const EXIF_HEADER = [0x45, 0x78, 0x69, 0x66, 0x00, 0x00] // "Exif\0\0"
const TAG_ORIENTATION = 0x0112
const TAG_DATETIME = 0x0132
const TAG_EXIF_IFD = 0x8769
const TAG_DATETIME_ORIGINAL = 0x9003
/** Größter TIFF-Block, der in ein JPEG-APP1-Segment passt */
const JPEG_APP1_MAX_TIFF = 0xffff - 2 - EXIF_HEADER.length

function ascii(bytes: Uint8Array, start: number, length: number): string {
  let out = ''
  for (let i = start; i < start + length && i < bytes.length; i++) {
    out += String.fromCharCode(bytes[i])
  }
  return out
}

function startsWith(bytes: Uint8Array, offset: number, pattern: number[]): boolean {
  if (offset + pattern.length > bytes.length) return false
  return pattern.every((b, i) => bytes[offset + i] === b)
}

function isTiff(bytes: Uint8Array): boolean {
  return (
    bytes.length >= 8 &&
    ((bytes[0] === 0x49 && bytes[1] === 0x49 && bytes[2] === 0x2a && bytes[3] === 0x00) ||
      (bytes[0] === 0x4d && bytes[1] === 0x4d && bytes[2] === 0x00 && bytes[3] === 0x2a))
  )
}

// ---------------------------------------------------------------------------
// Auslesen
// ---------------------------------------------------------------------------

function fromJpeg(bytes: Uint8Array): Uint8Array | null {
  let pos = 2
  while (pos + 4 <= bytes.length) {
    if (bytes[pos] !== 0xff) return null
    const marker = bytes[pos + 1]
    if (marker === 0xff) {
      pos++ // Füllbyte
      continue
    }
    // Bilddaten oder Ende: danach folgen keine Metadaten mehr
    if (marker === 0xda || marker === 0xd9) return null
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      pos += 2
      continue
    }
    const length = (bytes[pos + 2] << 8) | bytes[pos + 3]
    if (length < 2) return null
    if (marker === 0xe1 && startsWith(bytes, pos + 4, EXIF_HEADER)) {
      const tiff = bytes.slice(pos + 4 + EXIF_HEADER.length, pos + 2 + length)
      return isTiff(tiff) ? tiff : null
    }
    pos += 2 + length
  }
  return null
}

function fromPng(bytes: Uint8Array): Uint8Array | null {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  let pos = 8
  while (pos + 12 <= bytes.length) {
    const length = view.getUint32(pos)
    const type = ascii(bytes, pos + 4, 4)
    if (type === 'eXIf') {
      const tiff = bytes.slice(pos + 8, pos + 8 + length)
      return isTiff(tiff) ? tiff : null
    }
    if (type === 'IDAT' || type === 'IEND') return null
    pos += 12 + length
  }
  return null
}

function fromWebp(bytes: Uint8Array): Uint8Array | null {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  let pos = 12
  while (pos + 8 <= bytes.length) {
    const type = ascii(bytes, pos, 4)
    const size = view.getUint32(pos + 4, true)
    if (type === 'EXIF') {
      let start = pos + 8
      // Manche Programme schreiben den JPEG-Präfix mit
      if (startsWith(bytes, start, EXIF_HEADER)) start += EXIF_HEADER.length
      const tiff = bytes.slice(start, pos + 8 + size)
      return isTiff(tiff) ? tiff : null
    }
    pos += 8 + size + (size % 2)
  }
  return null
}

/** TIFF-Block der EXIF-Daten aus JPEG, PNG oder WebP, sonst null */
export function extractExif(bytes: Uint8Array): Uint8Array | null {
  try {
    if (bytes[0] === 0xff && bytes[1] === 0xd8) return fromJpeg(bytes)
    if (startsWith(bytes, 0, [0x89, 0x50, 0x4e, 0x47])) return fromPng(bytes)
    if (ascii(bytes, 0, 4) === 'RIFF' && ascii(bytes, 8, 4) === 'WEBP') return fromWebp(bytes)
  } catch (error) {
    console.warn('[EXIF] Metadaten nicht lesbar:', error)
  }
  return null
}

// ---------------------------------------------------------------------------
// TIFF-Struktur
// ---------------------------------------------------------------------------

interface IfdEntry {
  tag: number
  type: number
  count: number
  /** Position des 4-Byte-Wertfelds im TIFF-Block */
  valuePos: number
}

class Tiff {
  readonly view: DataView
  readonly le: boolean

  constructor(readonly bytes: Uint8Array) {
    this.view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
    this.le = bytes[0] === 0x49
  }

  u16(pos: number): number {
    return this.view.getUint16(pos, this.le)
  }

  u32(pos: number): number {
    return this.view.getUint32(pos, this.le)
  }

  get ifd0(): number {
    return this.u32(4)
  }

  /** Einträge eines IFD; wirft bei Offsets außerhalb des Blocks */
  entries(offset: number): { list: IfdEntry[]; nextPos: number } {
    const count = this.u16(offset)
    const list: IfdEntry[] = []
    for (let i = 0; i < count; i++) {
      const pos = offset + 2 + i * 12
      list.push({
        tag: this.u16(pos),
        type: this.u16(pos + 2),
        count: this.u32(pos + 4),
        valuePos: pos + 8,
      })
    }
    const nextPos = offset + 2 + count * 12
    if (nextPos + 4 > this.bytes.length) throw new RangeError('IFD außerhalb des Blocks')
    return { list, nextPos }
  }

  asciiValue(entry: IfdEntry): string {
    const start = entry.count <= 4 ? entry.valuePos : this.u32(entry.valuePos)
    return ascii(this.bytes, start, entry.count).replace(/\0+$/, '')
  }
}

/**
 * Kopie des TIFF-Blocks mit Orientation = 1 und ohne Verweis auf IFD1
 * (Vorschaubild). Bei defekten Daten null.
 */
export function normalizeExif(tiff: Uint8Array): Uint8Array | null {
  if (!isTiff(tiff)) return null
  const copy = tiff.slice()
  try {
    const t = new Tiff(copy)
    const { list, nextPos } = t.entries(t.ifd0)
    for (const entry of list) {
      if (entry.tag === TAG_ORIENTATION && entry.type === 3) {
        t.view.setUint16(entry.valuePos, 1, t.le)
      }
    }
    t.view.setUint32(nextPos, 0, t.le)
    return copy
  } catch (error) {
    console.warn('[EXIF] Metadaten beschädigt, werden nicht übernommen:', error)
    return null
  }
}

function parseExifDate(value: string): Date | null {
  const m = /^(\d{4}):(\d{2}):(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/.exec(value)
  if (!m) return null
  const [, y, mo, d, h, mi, s] = m.map(Number)
  const date = new Date(y, mo - 1, d, h, mi, s)
  return Number.isNaN(date.getTime()) || y < 1900 ? null : date
}

/** Aufnahmedatum (DateTimeOriginal, sonst DateTime) als lokale Zeit */
export function readExifDate(tiff: Uint8Array): Date | null {
  if (!isTiff(tiff)) return null
  try {
    const t = new Tiff(tiff)
    const ifd0 = t.entries(t.ifd0).list
    const exifPointer = ifd0.find((e) => e.tag === TAG_EXIF_IFD)
    if (exifPointer) {
      const original = t
        .entries(t.u32(exifPointer.valuePos))
        .list.find((e) => e.tag === TAG_DATETIME_ORIGINAL && e.type === 2)
      const date = original && parseExifDate(t.asciiValue(original))
      if (date) return date
    }
    const fallback = ifd0.find((e) => e.tag === TAG_DATETIME && e.type === 2)
    return fallback ? parseExifDate(t.asciiValue(fallback)) : null
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// Einfügen
// ---------------------------------------------------------------------------

function concat(parts: Uint8Array[]): Uint8Array<ArrayBuffer> {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0))
  let pos = 0
  for (const part of parts) {
    out.set(part, pos)
    pos += part.length
  }
  return out
}

let crcTable: Uint32Array | null = null
function crc32(bytes: Uint8Array): number {
  if (!crcTable) {
    crcTable = new Uint32Array(256)
    for (let n = 0; n < 256; n++) {
      let c = n
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
      crcTable[n] = c >>> 0
    }
  }
  let crc = 0xffffffff
  for (const b of bytes) crc = crcTable[(crc ^ b) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

function toJpeg(bytes: Uint8Array, tiff: Uint8Array): Uint8Array<ArrayBuffer> | null {
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8 || tiff.length > JPEG_APP1_MAX_TIFF) return null
  // Nach SOI und einem eventuellen JFIF-APP0 einfügen
  let insertAt = 2
  if (bytes[2] === 0xff && bytes[3] === 0xe0) insertAt = 4 + ((bytes[4] << 8) | bytes[5])
  const length = 2 + EXIF_HEADER.length + tiff.length
  const segment = concat([
    new Uint8Array([0xff, 0xe1, length >> 8, length & 0xff]),
    new Uint8Array(EXIF_HEADER),
    tiff,
  ])
  return concat([bytes.subarray(0, insertAt), segment, bytes.subarray(insertAt)])
}

function toPng(bytes: Uint8Array, tiff: Uint8Array): Uint8Array<ArrayBuffer> | null {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  let pos = 8
  while (pos + 12 <= bytes.length) {
    const length = view.getUint32(pos)
    const type = ascii(bytes, pos + 4, 4)
    if (type === 'IDAT') {
      const typeAndData = concat([new Uint8Array([0x65, 0x58, 0x49, 0x66]), tiff]) // "eXIf"
      const chunk = new Uint8Array(12 + tiff.length)
      const cv = new DataView(chunk.buffer)
      cv.setUint32(0, tiff.length)
      chunk.set(typeAndData, 4)
      cv.setUint32(8 + tiff.length, crc32(typeAndData))
      return concat([bytes.subarray(0, pos), chunk, bytes.subarray(pos)])
    }
    pos += 12 + length
  }
  return null
}

function riffChunk(type: string, data: Uint8Array): Uint8Array {
  const chunk = new Uint8Array(8 + data.length + (data.length % 2))
  for (let i = 0; i < 4; i++) chunk[i] = type.charCodeAt(i)
  new DataView(chunk.buffer).setUint32(4, data.length, true)
  chunk.set(data, 8)
  return chunk
}

function toWebp(bytes: Uint8Array, tiff: Uint8Array): Uint8Array<ArrayBuffer> | null {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const chunks: { type: string; data: Uint8Array }[] = []
  let pos = 12
  while (pos + 8 <= bytes.length) {
    const type = ascii(bytes, pos, 4)
    const size = view.getUint32(pos + 4, true)
    chunks.push({ type, data: bytes.subarray(pos + 8, pos + 8 + size) })
    pos += 8 + size + (size % 2)
  }
  if (chunks.length === 0) return null

  let vp8x = chunks[0].type === 'VP8X' ? chunks[0].data.slice() : null
  if (!vp8x) {
    // Einfaches Format (nur „VP8 “ oder „VP8L“): erweiterten Kopf ergänzen
    const image = chunks[0]
    let width: number
    let height: number
    let alpha = false
    if (image.type === 'VP8L' && image.data[0] === 0x2f) {
      const bits = new DataView(image.data.buffer, image.data.byteOffset + 1, 4).getUint32(0, true)
      width = (bits & 0x3fff) + 1
      height = ((bits >>> 14) & 0x3fff) + 1
      alpha = ((bits >>> 28) & 1) === 1
    } else if (
      image.type === 'VP8 ' &&
      image.data.length >= 10 &&
      startsWith(image.data, 3, [0x9d, 0x01, 0x2a])
    ) {
      const dv = new DataView(image.data.buffer, image.data.byteOffset)
      width = dv.getUint16(6, true) & 0x3fff
      height = dv.getUint16(8, true) & 0x3fff
    } else {
      return null
    }
    vp8x = new Uint8Array(10)
    vp8x[0] = alpha ? 0x10 : 0
    const w = width - 1
    const h = height - 1
    vp8x.set([w & 0xff, (w >> 8) & 0xff, (w >> 16) & 0xff], 4)
    vp8x.set([h & 0xff, (h >> 8) & 0xff, (h >> 16) & 0xff], 7)
  }
  vp8x[0] |= 0x08 // EXIF-Flag

  const body = concat([
    riffChunk('VP8X', vp8x),
    ...chunks
      .filter((c) => c.type !== 'VP8X' && c.type !== 'EXIF')
      .map((c) => riffChunk(c.type, c.data)),
    riffChunk('EXIF', tiff),
  ])
  const header = new Uint8Array(12)
  header.set([0x52, 0x49, 0x46, 0x46], 0) // RIFF
  new DataView(header.buffer).setUint32(4, body.length + 4, true)
  header.set([0x57, 0x45, 0x42, 0x50], 8) // WEBP
  return concat([header, body])
}

/**
 * Fügt den TIFF-Block in die kodierte Datei ein. Liefert null, wenn das
 * Format nicht unterstützt wird oder die Daten nicht passen.
 */
export function insertExif(
  bytes: Uint8Array,
  mimeType: string,
  tiff: Uint8Array
): Uint8Array<ArrayBuffer> | null {
  try {
    switch (mimeType) {
      case 'image/jpeg':
        return toJpeg(bytes, tiff)
      case 'image/png':
        return toPng(bytes, tiff)
      case 'image/webp':
        return toWebp(bytes, tiff)
      default:
        return null
    }
  } catch (error) {
    console.warn('[EXIF] Einfügen fehlgeschlagen:', error)
    return null
  }
}

/** Ungefährer Mehrbedarf an Bytes durch das Einfügen (für die Zielgröße) */
export function exifOverhead(tiff: Uint8Array): number {
  return tiff.length + 32
}

// ---------------------------------------------------------------------------
// Originaldateien
// ---------------------------------------------------------------------------

const sourceCache = new WeakMap<Blob, Promise<Uint8Array | null>>()

/** Normalisierte EXIF-Daten der Originaldatei (gecacht pro Datei) */
export function readSourceExif(file: Blob): Promise<Uint8Array | null> {
  let entry = sourceCache.get(file)
  if (!entry) {
    entry = file
      .arrayBuffer()
      .then((buffer) => {
        const tiff = extractExif(new Uint8Array(buffer))
        return tiff ? normalizeExif(tiff) : null
      })
      .catch((error) => {
        console.warn('[EXIF] Originaldatei nicht lesbar:', error)
        return null
      })
    sourceCache.set(file, entry)
  }
  return entry
}

/** Fügt EXIF in den Blob ein; ohne passende Daten bleibt der Blob unverändert */
export async function withExif(blob: Blob, tiff: Uint8Array | null): Promise<Blob> {
  if (!tiff) return blob
  const out = insertExif(new Uint8Array(await blob.arrayBuffer()), blob.type, tiff)
  return out ? new Blob([out], { type: blob.type }) : blob
}
