import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useImageStore } from '@/stores/imageStore'
import { useToast } from '@/composables/useToast'
import {
  computeResizeTarget,
  defaultResizeSpec,
  isResizeSpecValid,
  type ResizeMode,
  type ResizeSpec,
  type Size,
} from '@/lib/core/resize-modes'

/**
 * Zustand und Logik für "Größe ändern" in der Stapelbearbeitung:
 * Modi exakt (Breite/Höhe, optional gekoppelt), Prozent, lange Kante und
 * einpassen; Initialisierung aus dem ersten ausgewählten Bild und Anwenden
 * auf die Auswahl.
 */
export function useBatchResize() {
  const { t } = useI18n()
  const imageStore = useImageStore()
  const toast = useToast()

  const width = ref(1920)
  const height = ref(1080)
  const keepAspect = ref(true)
  const aspectRatio = ref(1920 / 1080)
  const mode = ref<ResizeMode>(defaultResizeSpec.mode)
  const percent = ref(defaultResizeSpec.percent)
  const longEdge = ref(defaultResizeSpec.longEdge)
  const noUpscale = ref(defaultResizeSpec.noUpscale)

  const spec = computed<ResizeSpec>(() => ({
    mode: mode.value,
    width: width.value,
    height: height.value,
    keepAspect: keepAspect.value,
    percent: percent.value,
    longEdge: longEdge.value,
    noUpscale: noUpscale.value,
  }))

  /** Ergebnis für das erste ausgewählte Bild (Hinweis unter den Eingaben) */
  const preview = computed<{ from: Size; to: Size | null } | null>(() => {
    const first = imageStore.selectedImages[0]
    if (!first || !isResizeSpecValid(spec.value)) return null
    const from = { width: first.canvas.width, height: first.canvas.height }
    return {
      from,
      to: computeResizeTarget(from, spec.value, first.originalWidth / first.originalHeight),
    }
  })

  /** Läuft gerade eine Größenänderung (Quelle: Store-Fortschritt)? */
  const isApplying = computed(() => imageStore.resizeProgress.active)
  const progressCurrent = computed(() => imageStore.resizeProgress.current)
  const progressTotal = computed(() => imageStore.resizeProgress.total)

  const canApply = computed(
    () => imageStore.hasSelection && isResizeSpecValid(spec.value) && !isApplying.value
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
    if (mode.value === 'exact' && keepAspect.value && width.value > 0) {
      height.value = Math.round(width.value / aspectRatio.value)
    }
  }

  /** Breite aus Höhe ableiten, wenn das Seitenverhältnis gekoppelt ist */
  function onHeightChange() {
    if (mode.value === 'exact' && keepAspect.value && height.value > 0) {
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
    const { resized, skipped } = await imageStore.resizeSelectedImages({ ...spec.value })
    if (resized === 0) {
      toast.info(t('batchEdit.resize.noneChanged'))
      return
    }
    lastResizeVersion.value = imageStore.historyVersion
    toast.success(
      skipped > 0
        ? t('batchEdit.resize.toastSkipped', { count: resized, skipped })
        : t('batchEdit.resize.toast', { count: resized })
    )
  }

  /** Letzte Größenänderung über die globale Historie zurücknehmen */
  function undoResize() {
    if (!canUndoResize.value) return
    imageStore.undo()
    lastResizeVersion.value = null
    initFromSelection()
    toast.success(t('batchEdit.resize.undoToast'))
  }

  /** Werte eines Rezepts übernehmen (nur vorbelegen, nicht anwenden) */
  function setSpec(next: ResizeSpec) {
    mode.value = next.mode
    width.value = next.width
    height.value = next.height
    keepAspect.value = next.keepAspect
    percent.value = next.percent
    longEdge.value = next.longEdge
    noUpscale.value = next.noUpscale
    onKeepAspectChange()
  }

  return {
    width,
    height,
    keepAspect,
    mode,
    percent,
    longEdge,
    noUpscale,
    spec,
    preview,
    setSpec,
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
