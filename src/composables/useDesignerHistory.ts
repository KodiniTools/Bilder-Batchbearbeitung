import { computed, shallowRef, type Ref } from 'vue'
import type { PdfPage } from '@/composables/usePdfPages'

interface Snapshot {
  pages: PdfPage[]
  pageIndex: number
}

interface UseDesignerHistoryOptions {
  pages: Ref<PdfPage[]>
  currentPageIndex: Ref<number>
  /** Nach Undo/Redo, z. B. um die Auswahl auf die neuen Objekte zu setzen */
  onRestore?: () => void
  /** Maximale Anzahl Schritte, Standard 50 */
  limit?: number
}

/** Zeitfenster, in dem Änderungen mit gleichem Schlüssel zu einem Schritt verschmelzen */
const COALESCE_MS = 1000

/**
 * Undo/Redo für den PDF-Seitendesigner. `checkpoint()` wird VOR einer Änderung
 * aufgerufen und sichert den aktuellen Stand. Fortlaufende Änderungen (Regler,
 * Tippen, Pfeiltasten) übergeben einen Schlüssel und ergeben einen Schritt.
 * Elemente werden flach kopiert; Bild-Daten-URLs (Strings) werden geteilt.
 */
export function useDesignerHistory(options: UseDesignerHistoryOptions) {
  const { pages, currentPageIndex, onRestore, limit = 50 } = options
  const undoStack = shallowRef<Snapshot[]>([])
  const redoStack = shallowRef<Snapshot[]>([])
  let lastKey: string | null = null
  let lastTime = 0

  function snapshot(): Snapshot {
    return {
      pages: pages.value.map((p) => ({ id: p.id, elements: p.elements.map((e) => ({ ...e })) })),
      pageIndex: currentPageIndex.value,
    }
  }

  function checkpoint(key?: string) {
    const now = Date.now()
    if (key && key === lastKey && now - lastTime < COALESCE_MS) {
      lastTime = now
      return
    }
    lastKey = key ?? null
    lastTime = now
    undoStack.value = [...undoStack.value.slice(-(limit - 1)), snapshot()]
    redoStack.value = []
  }

  function restore(s: Snapshot) {
    pages.value = s.pages
    currentPageIndex.value = Math.min(s.pageIndex, s.pages.length - 1)
    lastKey = null
    onRestore?.()
  }

  function undo() {
    const stack = undoStack.value
    if (stack.length === 0) return
    redoStack.value = [...redoStack.value, snapshot()]
    undoStack.value = stack.slice(0, -1)
    restore(stack[stack.length - 1])
  }

  function redo() {
    const stack = redoStack.value
    if (stack.length === 0) return
    undoStack.value = [...undoStack.value, snapshot()]
    redoStack.value = stack.slice(0, -1)
    restore(stack[stack.length - 1])
  }

  function reset() {
    undoStack.value = []
    redoStack.value = []
    lastKey = null
  }

  return {
    canUndo: computed(() => undoStack.value.length > 0),
    canRedo: computed(() => redoStack.value.length > 0),
    checkpoint,
    undo,
    redo,
    reset,
  }
}
