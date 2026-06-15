import { ref, computed, type Ref } from 'vue'
import type { ImageFilters, TextItem } from '@/lib/core/types'

interface HistorySnapshot {
  filters: ImageFilters
  texts: TextItem[]
}

export function useEditorHistory(
  localFilters: Ref<ImageFilters>,
  textItems: Ref<TextItem[]>,
  changesApplied: Ref<boolean>,
) {
  const history = ref<HistorySnapshot[]>([])
  const historyIndex = ref(-1)
  let historyTimer: ReturnType<typeof setTimeout> | null = null

  const canUndo = computed(() => historyIndex.value > 0)
  const canRedo = computed(() => historyIndex.value < history.value.length - 1)

  function snapshotNow() {
    if (historyTimer) { clearTimeout(historyTimer); historyTimer = null }
    const snap: HistorySnapshot = {
      filters: { ...localFilters.value },
      texts: textItems.value.map(t => ({ ...t })),
    }
    history.value = history.value.slice(0, historyIndex.value + 1)
    history.value.push(snap)
    historyIndex.value = history.value.length - 1
  }

  function schedule() {
    if (historyTimer) clearTimeout(historyTimer)
    historyTimer = setTimeout(snapshotNow, 350)
  }

  function restoreSnapshot(snap: HistorySnapshot) {
    localFilters.value = { ...snap.filters }
    textItems.value = snap.texts.map(t => ({ ...t }))
    changesApplied.value = false
  }

  function undo() {
    if (historyTimer) { clearTimeout(historyTimer); historyTimer = null }
    if (!canUndo.value) return
    historyIndex.value--
    restoreSnapshot(history.value[historyIndex.value])
  }

  function redo() {
    if (historyTimer) { clearTimeout(historyTimer); historyTimer = null }
    if (!canRedo.value) return
    historyIndex.value++
    restoreSnapshot(history.value[historyIndex.value])
  }

  function init(filters: ImageFilters) {
    if (historyTimer) { clearTimeout(historyTimer); historyTimer = null }
    history.value = [{ filters: { ...filters }, texts: [] }]
    historyIndex.value = 0
  }

  function dispose() {
    if (historyTimer) { clearTimeout(historyTimer); historyTimer = null }
  }

  return {
    canUndo,
    canRedo,
    snapshotNow,
    schedule,
    undo,
    redo,
    init,
    dispose,
  }
}
