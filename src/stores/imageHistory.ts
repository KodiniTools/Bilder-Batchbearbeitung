// src/stores/imageHistory.ts
// Globale Undo/Redo-Historie für den Bild-Store.
//
// Ansatz: Zustands-Snapshots auf Store-Ebene. Bei jeder mutierenden Aktion wird
// ein Snapshot des gesamten `images`-Arrays festgehalten. Dadurch ist die
// Abdeckung automatisch vollständig – jede Funktion, die den Bildbestand ändert
// (Hinzufügen, Löschen, Sortieren, Drehen, Spiegeln, Zuschneiden, Größe ändern,
// Filter/Transforms/Wasserzeichen, Umbenennen, Editor-Speichern, Zurücksetzen),
// wird ohne Sonderbehandlung rückgängig-/wiederherstellbar.
//
// Speicher-Effizienz: Pixel-Snapshots (Canvas-Klone) werden nur für Bilder
// erzeugt, deren Canvas sich seit dem letzten Snapshot tatsächlich geändert hat.
// Als Marker dient `ImageObject.version`, die ausschließlich bei destruktiven
// Canvas-Operationen erhöht wird. Unveränderte Canvas-Zustände teilen sich einen
// einzigen Klon über mehrere Snapshots hinweg. So skaliert der Speicherbedarf mit
// der Anzahl unterschiedlicher Canvas-Zustände statt mit Historienlänge × Bildzahl.

import type { Ref } from 'vue'
import { ref } from 'vue'
import type { ImageObject, ImageFilters, ImageTransforms, WatermarkSettings } from '@/lib/core/types'

/** Snapshot eines einzelnen Bildes zu einem Zeitpunkt. */
interface ImageRecord {
  ref: ImageObject // stabile Referenz auf das (langlebige) Bildobjekt
  version: number // Canvas-Zustands-Marker zum Snapshot-Zeitpunkt
  canvasSnap: HTMLCanvasElement // Pixel-Klon für genau diese version
  filters?: ImageFilters
  transforms?: ImageTransforms
  watermark?: WatermarkSettings
  outputName: string
  selected: boolean
}

interface HistorySnapshot {
  records: ImageRecord[]
}

const MAX_DEPTH = 50
const COALESCE_WINDOW_MS = 700

function cloneCanvas(src: HTMLCanvasElement): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = src.width
  c.height = src.height
  const ctx = c.getContext('2d')
  if (ctx) ctx.drawImage(src, 0, 0)
  return c
}

export function createImageHistory(images: Ref<ImageObject[]>, now: () => number = Date.now) {
  const canUndo = ref(false)
  const canRedo = ref(false)

  // Verhindert, dass restore()-Mutationen selbst wieder committet werden.
  const isRestoring = ref(false)

  const past: HistorySnapshot[] = []
  let present: HistorySnapshot = { records: [] }
  const future: HistorySnapshot[] = []

  let lastCoalesceKey: string | null = null
  let lastCommitAt = 0

  function refresh() {
    canUndo.value = past.length > 0
    canRedo.value = future.length > 0
  }

  /**
   * Erzeugt einen Snapshot des aktuellen Live-Zustands. Canvas-Klone werden aus
   * `prev` wiederverwendet, wenn sich die version des Bildes nicht geändert hat.
   */
  function snapshot(prev: HistorySnapshot): HistorySnapshot {
    const prevById = new Map<string, ImageRecord>()
    for (const rec of prev.records) prevById.set(rec.ref.id, rec)

    const records: ImageRecord[] = images.value.map((img) => {
      const version = img.version ?? 0
      const prevRec = prevById.get(img.id)
      const canvasSnap =
        prevRec && prevRec.version === version ? prevRec.canvasSnap : cloneCanvas(img.canvas)

      return {
        ref: img,
        version,
        canvasSnap,
        filters: img.filters ? { ...img.filters } : undefined,
        transforms: img.transforms ? { ...img.transforms } : undefined,
        watermark: img.watermark ? { ...img.watermark } : undefined,
        outputName: img.outputName,
        selected: img.selected
      }
    })

    return { records }
  }

  /** Stellt den Live-Zustand aus einem Snapshot wieder her. */
  function restore(snap: HistorySnapshot) {
    isRestoring.value = true
    try {
      for (const rec of snap.records) {
        const img = rec.ref
        const liveVersion = img.version ?? 0

        // Canvas nur neu zeichnen, wenn sich der Pixel-Zustand unterscheidet.
        // Gleiche version ⟺ identische Pixel (version steigt nur bei Canvas-Ops).
        if (liveVersion !== rec.version) {
          const snapCanvas = rec.canvasSnap
          if (img.canvas.width !== snapCanvas.width) img.canvas.width = snapCanvas.width
          if (img.canvas.height !== snapCanvas.height) img.canvas.height = snapCanvas.height
          const ctx = img.canvas.getContext('2d')
          if (ctx) {
            ctx.clearRect(0, 0, img.canvas.width, img.canvas.height)
            ctx.drawImage(snapCanvas, 0, 0)
          }
          // version exakt zurücksetzen – hält den Pixel/Version-Invariant intakt
          // und löst über den version-Watch das Neu-Rendern der Vorschau aus.
          img.version = rec.version
        }

        // Nicht-destruktive Eigenschaften als Kopien zurückschreiben, damit
        // spätere Bearbeitungen die Historie nicht verändern.
        img.filters = rec.filters ? { ...rec.filters } : undefined
        img.transforms = rec.transforms ? { ...rec.transforms } : undefined
        img.watermark = rec.watermark ? { ...rec.watermark } : undefined
        img.outputName = rec.outputName
        img.selected = rec.selected
      }

      // Array-Zusammensetzung und Reihenfolge wiederherstellen.
      images.value = snap.records.map((r) => r.ref)
    } finally {
      isRestoring.value = false
    }
  }

  /**
   * Hält den aktuellen Zustand als neuen Historien-Schritt fest.
   * @param coalesceKey Aufeinanderfolgende Commits mit gleichem Key innerhalb des
   *   Zeitfensters werden zu einem Undo-Schritt zusammengefasst (z.B. Slider-Drag).
   */
  function commit(coalesceKey: string | null = null) {
    if (isRestoring.value) return

    const newSnap = snapshot(present)
    const t = now()
    const coalesce =
      coalesceKey !== null && coalesceKey === lastCoalesceKey && t - lastCommitAt <= COALESCE_WINDOW_MS

    if (coalesce) {
      // Gleiche fortlaufende Operation: Basis-Schritt beibehalten, nur den
      // aktuellen Zustand aktualisieren.
      present = newSnap
    } else {
      past.push(present)
      if (past.length > MAX_DEPTH) past.shift()
      present = newSnap
      future.length = 0
    }

    lastCoalesceKey = coalesceKey
    lastCommitAt = t
    refresh()
  }

  function undo() {
    if (past.length === 0) return
    future.push(present)
    present = past.pop() as HistorySnapshot
    restore(present)
    lastCoalesceKey = null
    refresh()
  }

  function redo() {
    if (future.length === 0) return
    past.push(present)
    present = future.pop() as HistorySnapshot
    restore(present)
    lastCoalesceKey = null
    refresh()
  }

  /** Historie leeren und aktuellen Zustand als Ausgangspunkt setzen. */
  function reset() {
    past.length = 0
    future.length = 0
    present = snapshot({ records: [] })
    lastCoalesceKey = null
    lastCommitAt = 0
    refresh()
  }

  return { commit, undo, redo, reset, canUndo, canRedo, isRestoring }
}
