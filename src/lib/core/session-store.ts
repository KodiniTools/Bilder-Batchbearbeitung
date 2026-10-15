// src/lib/core/session-store.ts
// Sichert die aktuelle Bilderserie in IndexedDB, damit ein Reload oder
// Absturz keine Arbeit verwirft.
//
// Aufbau:
// - Store `meta`: ein Datensatz mit Reihenfolge und allen kleinen
//   Bildeigenschaften (Name, Filter, Wasserzeichen …). Wird bei jedem
//   Speichern komplett neu geschrieben.
// - Store `blobs`: pro Bild die Originaldatei (`<id>:original`) und – nur nach
//   destruktiven Änderungen wie Drehen, Zuschneiden, Größe ändern – der
//   aktuelle Canvas-Inhalt als PNG (`<id>:canvas`). Blobs werden nur
//   geschrieben, wenn sie sich geändert haben (Marker: `ImageObject.version`).

import type { ImageFilters, ImageObject, ImageTransforms, WatermarkSettings } from './types'
import { ImageProcessor } from './image-processor'
import { encodeCanvasToBlob } from './export-render'

const DB_NAME = 'bilderserie-session'
const DB_VERSION = 1
const META_STORE = 'meta'
const BLOB_STORE = 'blobs'
const META_KEY = 'session'
const SCHEMA = 1

/** Kleine, serialisierbare Eigenschaften eines Bildes */
export interface StoredImageMeta {
  id: string
  /** Version des Canvas-Zustands; 0 = unverändertes Original */
  version: number
  /** true, wenn unter `<id>:canvas` ein bearbeiteter Pixelstand liegt */
  hasCanvas: boolean
  selected: boolean
  outputName: string
  comment?: string
  filters?: ImageFilters
  transforms?: ImageTransforms
  watermark?: WatermarkSettings
  exportFormat?: string
  quality?: number
}

export interface StoredSession {
  schema: number
  savedAt: number
  images: StoredImageMeta[]
}

const originalKey = (id: string) => `${id}:original`
const canvasKey = (id: string) => `${id}:canvas`

export function isSessionStorageSupported(): boolean {
  return typeof indexedDB !== 'undefined'
}

let dbPromise: Promise<IDBDatabase> | null = null

function openDb(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION)
      req.onupgradeneeded = () => {
        const db = req.result
        if (!db.objectStoreNames.contains(META_STORE)) db.createObjectStore(META_STORE)
        if (!db.objectStoreNames.contains(BLOB_STORE)) db.createObjectStore(BLOB_STORE)
      }
      req.onsuccess = () => {
        const db = req.result
        // Andere Tabs dürfen die Datenbank aktualisieren bzw. löschen
        db.onversionchange = () => {
          db.close()
          dbPromise = null
        }
        resolve(db)
      }
      req.onerror = () => reject(req.error ?? new Error('IndexedDB nicht verfügbar'))
      req.onblocked = () => reject(new Error('IndexedDB blockiert'))
    })
    dbPromise.catch(() => {
      dbPromise = null
    })
  }
  return dbPromise
}

function requestToPromise<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

function transactionDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error ?? new Error('Transaktion abgebrochen'))
  })
}

function toMeta(img: ImageObject, hasCanvas: boolean): StoredImageMeta {
  // Spread erzeugt Klone ohne Vue-Proxies (structured clone verträgt keine Proxies)
  return {
    id: img.id,
    version: img.version ?? 0,
    hasCanvas,
    selected: img.selected,
    outputName: img.outputName,
    comment: img.comment,
    filters: img.filters ? { ...img.filters } : undefined,
    transforms: img.transforms ? { ...img.transforms } : undefined,
    watermark: img.watermark ? { ...img.watermark } : undefined,
    exportFormat: img.exportFormat,
    quality: img.quality,
  }
}

/**
 * Speichert Bilderserien inkrementell: merkt sich pro Bild, welche Blobs
 * bereits in der Datenbank liegen, und schreibt nur Änderungen.
 */
export class SessionStore {
  /** id → gespeicherte Canvas-Version (`null` = nur Original gespeichert) */
  private saved = new Map<string, number | null>()

  /** Markiert wiederhergestellte Bilder als gespeichert (kein erneutes Kodieren) */
  markSaved(metas: StoredImageMeta[]): void {
    for (const m of metas) this.saved.set(m.id, m.hasCanvas ? m.version : null)
  }

  private queue: Promise<void> = Promise.resolve()

  /**
   * Sichert den übergebenen Stand. Aufrufe laufen nacheinander, damit sich
   * zwei Speichervorgänge nie überholen.
   */
  save(images: ImageObject[]): Promise<void> {
    const snapshot = [...images]
    const run = this.queue.then(() => this.write(snapshot))
    this.queue = run.catch(() => {})
    return run
  }

  private async write(images: ImageObject[]): Promise<void> {
    // 1) Neue/geänderte Blobs vorbereiten – vor der Transaktion, da diese
    //    sich bei einem await auf Nicht-IDB-Promises automatisch schließt.
    const puts: { key: string; blob: Blob }[] = []
    const deletes: string[] = []
    const metas: StoredImageMeta[] = []
    const nextSaved = new Map<string, number | null>()

    for (const img of images) {
      const version = img.version ?? 0
      const known = this.saved.has(img.id)
      const savedVersion = this.saved.get(img.id)
      if (!known) puts.push({ key: originalKey(img.id), blob: img.file })

      // Version 0 = Canvas entspricht dem Original, kein PNG nötig
      const wantCanvas = version !== 0
      if (wantCanvas && savedVersion !== version) {
        const blob = await encodeCanvasToBlob(img.canvas, 'image/png')
        puts.push({ key: canvasKey(img.id), blob })
      } else if (!wantCanvas && known && savedVersion !== null) {
        deletes.push(canvasKey(img.id))
      }
      nextSaved.set(img.id, wantCanvas ? version : null)
      metas.push(toMeta(img, wantCanvas))
    }

    for (const id of this.saved.keys()) {
      if (!nextSaved.has(id)) deletes.push(originalKey(id), canvasKey(id))
    }

    // 2) Alles in einer Transaktion schreiben: Metadaten und Blobs bleiben konsistent
    const db = await openDb()
    const tx = db.transaction([META_STORE, BLOB_STORE], 'readwrite')
    const blobs = tx.objectStore(BLOB_STORE)
    for (const { key, blob } of puts) blobs.put(blob, key)
    for (const key of deletes) blobs.delete(key)
    const session: StoredSession = { schema: SCHEMA, savedAt: Date.now(), images: metas }
    tx.objectStore(META_STORE).put(session, META_KEY)
    await transactionDone(tx)

    this.saved = nextSaved
  }

  clear(): Promise<void> {
    const run = this.queue.then(() => this.wipe())
    this.queue = run.catch(() => {})
    return run
  }

  private async wipe(): Promise<void> {
    const db = await openDb()
    const tx = db.transaction([META_STORE, BLOB_STORE], 'readwrite')
    tx.objectStore(META_STORE).clear()
    tx.objectStore(BLOB_STORE).clear()
    await transactionDone(tx)
    this.saved.clear()
  }
}

export interface LoadedSession {
  images: ImageObject[]
  metas: StoredImageMeta[]
  /** Bilder, deren Daten fehlten oder nicht dekodiert werden konnten */
  failed: number
}

/** Lädt die gesicherte Serie; `null`, wenn keine (nicht leere) Sitzung existiert. */
export async function loadSession(): Promise<LoadedSession | null> {
  const db = await openDb()
  const tx = db.transaction([META_STORE, BLOB_STORE], 'readonly')
  const session = (await requestToPromise(tx.objectStore(META_STORE).get(META_KEY))) as
    | StoredSession
    | undefined
  if (!session || session.schema !== SCHEMA || session.images.length === 0) return null

  // Alle Lese-Requests synchron absetzen, solange die Transaktion aktiv ist
  const blobStore = tx.objectStore(BLOB_STORE)
  const entries = await Promise.all(
    session.images.map((meta) => {
      const original = requestToPromise(blobStore.get(originalKey(meta.id)))
      const canvas = meta.hasCanvas
        ? requestToPromise(blobStore.get(canvasKey(meta.id)))
        : Promise.resolve(undefined)
      return Promise.all([original, canvas]).then(([o, c]) => ({
        meta,
        original: o as Blob | undefined,
        canvas: c as Blob | undefined,
      }))
    })
  )

  const images: ImageObject[] = []
  const metas: StoredImageMeta[] = []
  let failed = 0
  for (const { meta, original, canvas } of entries) {
    try {
      if (!original || (meta.hasCanvas && !canvas)) throw new Error('Bilddaten fehlen')
      images.push(await restoreImage(meta, original, canvas))
      metas.push(meta)
    } catch (err) {
      console.warn(`[Session] Bild ${meta.outputName} nicht wiederherstellbar:`, err)
      failed++
    }
  }
  return { images, metas, failed }
}

async function restoreImage(
  meta: StoredImageMeta,
  original: Blob,
  canvasBlob: Blob | undefined
): Promise<ImageObject> {
  const file =
    original instanceof File
      ? original
      : new File([original], meta.outputName, { type: original.type })
  const img = await ImageProcessor.processFile(file)
  if (!img) throw new Error('Originaldatei nicht lesbar')

  if (canvasBlob) {
    const bitmap = await createImageBitmap(canvasBlob)
    try {
      img.canvas.width = bitmap.width
      img.canvas.height = bitmap.height
      img.ctx.clearRect(0, 0, bitmap.width, bitmap.height)
      img.ctx.drawImage(bitmap, 0, 0)
    } finally {
      bitmap.close()
    }
  }

  img.id = meta.id
  img.version = meta.version
  img.selected = meta.selected
  img.outputName = meta.outputName
  img.comment = meta.comment
  img.filters = meta.filters
  img.transforms = meta.transforms
  img.watermark = meta.watermark
  img.exportFormat = meta.exportFormat
  img.quality = meta.quality
  return img
}
