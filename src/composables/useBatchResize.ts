import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useImageStore } from '@/stores/imageStore'
import { useToast } from '@/composables/useToast'

/**
 * Zustand und Logik für "Größe ändern" in der Stapelbearbeitung:
 * Breite/Höhe mit optional gekoppeltem Seitenverhältnis, Initialisierung
 * aus dem ersten ausgewählten Bild und Anwenden auf die Auswahl.
 */
export function useBatchResize() {
  const { t } = useI18n()
  const imageStore = useImageStore()
  const toast = useToast()

  const width = ref(1920)
  const height = ref(1080)
  const keepAspect = ref(true)
  const aspectRatio = ref(1920 / 1080)

  /** Läuft gerade eine Größenänderung (Quelle: Store-Fortschritt)? */
  const isApplying = computed(() => imageStore.resizeProgress.active)
  const progressCurrent = computed(() => imageStore.resizeProgress.current)
  const progressTotal = computed(() => imageStore.resizeProgress.total)

  const canApply = computed(
    () => imageStore.hasSelection && width.value > 0 && height.value > 0 && !isApplying.value
  )

  /**
   * Historien-Version direkt nach der letzten hier ausgelösten Größenänderung.
   * "Rückgängig" ist nur möglich, solange dieser Schritt der jüngste in der
   * globalen Historie ist; jede weitere Aktion (Filter, Undo, ...) hebt das auf.
   */
  const lastResizeVersion = ref<number | null>(null)
  const canUndoResize = computed(
    () =>
      lastResizeVersion.value !== null &&
      imageStore.canUndo &&
      imageStore.historyVersion === lastResizeVersion.value &&
      !isApplying.value
  )

  /** Höhe aus Breite ableiten, wenn das Seitenverhältnis gekoppelt ist */
  function onWidthChange() {
    if (keepAspect.value && width.value > 0) {
      height.value = Math.round(width.value / aspectRatio.value)
    }
  }

  /** Breite aus Höhe ableiten, wenn das Seitenverhältnis gekoppelt ist */
  function onHeightChange() {
    if (keepAspect.value && height.value > 0) {
      width.value = Math.round(height.value * aspectRatio.value)
    }
  }

  /** Beim Einschalten der Kopplung das aktuelle Verhältnis übernehmen */
  function onKeepAspectChange() {
    if (keepAspect.value && width.value > 0 && height.value > 0) {
      aspectRatio.value = width.value / height.value
    }
  }

  /** Werte aus dem ersten ausgewählten Bild übernehmen */
  function initFromSelection() {
    const first = imageStore.selectedImages[0]
    if (!first) return
    width.value = first.canvas.width
    height.value = first.canvas.height
    aspectRatio.value = first.canvas.width / first.canvas.height
  }

  async function applyResize() {
    if (!canApply.value) return
    await imageStore.resizeSelectedImages(width.value, height.value, keepAspect.value)
    lastResizeVersion.value = imageStore.historyVersion
    toast.success(t('batchEdit.resize.toast', { count: imageStore.selectedCount }))
  }

  /** Letzte Größenänderung über die globale Historie zurücknehmen */
  function undoResize() {
    if (!canUndoResize.value) return
    imageStore.undo()
    lastResizeVersion.value = null
    initFromSelection()
    toast.success(t('batchEdit.resize.undoToast'))
  }

  return {
    width,
    height,
    keepAspect,
    canApply,
    isApplying,
    progressCurrent,
    progressTotal,
    canUndoResize,
    onWidthChange,
    onHeightChange,
    onKeepAspectChange,
    initFromSelection,
    applyResize,
    undoResize,
  }
}
