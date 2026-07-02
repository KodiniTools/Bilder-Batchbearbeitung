<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="isOpen" class="modal-overlay" @click.self="closeEditor">
        <div class="modal-container">

          <!-- Header -->
          <div class="modal-header">
            <div class="header-left">
              <i class="fa-solid fa-image header-icon"></i>
              <span class="modal-title">{{ t('imageEditor.title') }}</span>
              <span class="header-filename">{{ fileName || '–' }}</span>
            </div>
            <button class="icon-btn" :aria-label="t('imageEditor.close')" @click="closeEditor">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>

          <!-- Body: Preview (left) + Controls (right) -->
          <div class="editor-body">

            <!-- Preview Panel -->
            <div ref="previewAreaRef" class="preview-panel">

              <!-- Compare toolbar -->
              <div v-if="!isCropMode" class="compare-toolbar">
                <button
                  class="cmp-btn"
                  :class="{ active: compareMode === 'before' }"
                  :title="t('imageEditor.compare.before')"
                  @click="compareMode = 'before'"
                >
                  <i class="fa-solid fa-clock-rotate-left"></i>
                  {{ t('imageEditor.compare.before') }}
                </button>
                <span class="cmp-sep">|</span>
                <button
                  class="cmp-btn"
                  :class="{ active: compareMode === 'split' }"
                  :title="t('imageEditor.compare.split')"
                  @click="compareMode = 'split'"
                >
                  <i class="fa-solid fa-columns"></i>
                  {{ t('imageEditor.compare.split') }}
                </button>
                <span class="cmp-sep">|</span>
                <button
                  class="cmp-btn"
                  :class="{ active: compareMode === 'after' }"
                  :title="t('imageEditor.compare.after')"
                  @click="compareMode = 'after'"
                >
                  <i class="fa-solid fa-wand-magic-sparkles"></i>
                  {{ t('imageEditor.compare.after') }}
                </button>
              </div>

              <div class="preview-area">
                <div ref="canvasWrapperRef" class="canvas-crop-wrapper">

                  <!-- Edited canvas (base, determines wrapper size) -->
                  <canvas
                    ref="previewCanvas"
                    class="preview-canvas edited-canvas"
                    :style="[transformStyle, editedCanvasStyle]"
                  ></canvas>

                  <!-- Original canvas (on top, for before/split comparison) -->
                  <canvas
                    ref="originalPreviewCanvas"
                    class="preview-canvas original-canvas"
                    :style="originalCanvasStyle"
                  ></canvas>

                  <!-- Split divider -->
                  <template v-if="compareMode === 'split'">
                    <div class="split-line" :style="{ left: splitDividerPos + '%' }"></div>
                    <div
                      class="split-handle"
                      :style="{ left: splitDividerPos + '%' }"
                      @mousedown.prevent="startSplitDrag"
                      @touchstart.prevent="startSplitDrag"
                    >
                      <i class="fa-solid fa-left-right"></i>
                    </div>
                    <span class="split-label split-label-l">{{ t('imageEditor.compare.before') }}</span>
                    <span class="split-label split-label-r">{{ t('imageEditor.compare.after') }}</span>
                  </template>

                  <!-- Text overlay (only in 'after' mode, not during crop) -->
                  <TextOverlay
                    v-if="!isCropMode && compareMode === 'after'"
                    :items="textItems"
                    :selected-id="selectedTextId"
                    @update:selected-id="selectedTextId = $event"
                    @update:items="textItems = $event"
                    @delete-item="deleteTextItem"
                  />

                  <CropTool
                    v-if="isCropMode"
                    :image-pixel-width="currentWidth"
                    :image-pixel-height="currentHeight"
                    :locked-ratio="cropLockedRatio"
                    @update:crop="onCropUpdate"
                  />
                </div>
              </div>

              <div class="image-meta">
                <span><i class="fa-solid fa-expand"></i> {{ dimensions }}</span>
                <span><i class="fa-solid fa-weight-hanging"></i> {{ fileSize }}</span>
              </div>
            </div>

            <!-- Controls Panel -->
            <div class="controls-panel">

              <!-- Undo / Redo bar -->
              <div class="undo-redo-bar">
                <button
                  type="button"
                  class="undo-redo-btn"
                  :disabled="!canUndo"
                  :title="t('imageEditor.undoRedo.undoTitle')"
                  @click="undo"
                >
                  <i class="fa-solid fa-rotate-left"></i>
                  {{ t('imageEditor.undoRedo.undo') }}
                </button>
                <button
                  type="button"
                  class="undo-redo-btn"
                  :disabled="!canRedo"
                  :title="t('imageEditor.undoRedo.redoTitle')"
                  @click="redo"
                >
                  <i class="fa-solid fa-rotate-right"></i>
                  {{ t('imageEditor.undoRedo.redo') }}
                </button>
                <span class="undo-redo-hint">{{ t('imageEditor.undoRedo.hint') }}</span>
              </div>

              <!-- Dateiname -->
              <div class="ctrl-section">
                <div class="ctrl-header">
                  <i class="fa-solid fa-pen-to-square"></i>
                  {{ t('imageEditor.sections.fileName') }}
                </div>
                <input
                  id="editorFileName"
                  v-model="fileName"
                  type="text"
                  class="ctrl-input"
                  :placeholder="t('imageEditor.fileName.placeholder')"
                >
              </div>

              <EditorTextSection
                :text-items="textItems"
                :selected-text-id="selectedTextId"
                :selected-text="selectedText"
                :font-families="FONT_FAMILIES"
                @add="addTextItem"
                @delete="deleteTextItem"
                @update-text="updateSelectedText"
                @update:selected-text-id="selectedTextId = $event"
              />

              <EditorFiltersSection
                :local-filters="localFilters"
                :filter-defs="FILTER_DEFS"
                :presets="FILTER_PRESETS"
                @filter-input="onFilterInputFromChild"
                @preset="applyPreset"
                @reset="resetFilters"
              />

              <!-- Batch: aktuellen Look auf mehrere Bilder übertragen -->
              <div v-if="imageStore.imageCount > 1" class="ctrl-section">
                <div class="ctrl-header">
                  <i class="fa-solid fa-layer-group"></i>
                  {{ t('imageEditor.batch.title') }}
                </div>
                <p class="text-hint">
                  <i class="fa-solid fa-circle-info"></i>
                  {{ t('imageEditor.batch.hint') }}
                </p>
                <div class="btn-row">
                  <button
                    type="button"
                    class="btn btn-sm"
                    :disabled="isApplyingBatch"
                    @click="applyEditToBatch('all')"
                  >
                    <i class="fa-solid fa-images"></i>
                    {{ t('imageEditor.batch.applyAll', { count: imageStore.imageCount }) }}
                  </button>
                  <button
                    v-if="imageStore.selectedCount > 0"
                    type="button"
                    class="btn btn-sm"
                    :disabled="isApplyingBatch"
                    @click="applyEditToBatch('selected')"
                  >
                    <i class="fa-solid fa-check-double"></i>
                    {{ t('imageEditor.batch.applySelected', { count: imageStore.selectedCount }) }}
                  </button>
                </div>
              </div>

              <EditorCropSection
                :is-crop-mode="isCropMode"
                :crop-locked-ratio="cropLockedRatio"
                :crop-presets="CROP_RATIO_PRESETS"
                @start="startCropMode"
                @apply="applyCrop"
                @cancel="cancelCropMode"
                @set-ratio="setCropRatio"
              />

              <EditorTransformSection
                :straighten-angle="straightenAngle"
                :is-straighten-mode="isStraightenMode"
                @rotate="rotate"
                @flip="onFlip"
                @straighten="onStraightenInput"
                @straighten-apply="onStraightenApply"
                @straighten-reset="onStraightenReset"
              />

              <EditorResizeSection
                :resize-width="resizeWidth"
                :resize-height="resizeHeight"
                :keep-aspect-ratio="keepAspectRatio"
                @update:resize-width="resizeWidth = $event"
                @update:resize-height="resizeHeight = $event"
                @update:keep-aspect-ratio="keepAspectRatio = $event"
                @width-change="onResizeWidthChange"
                @height-change="onResizeHeightChange"
                @reset-size="resetSize"
              />

              <EditorExportSection
                :available-formats="availableFormats"
                :selected-format="selectedFormat"
                :is-downloading="isDownloading"
                @update:selected-format="selectedFormat = $event"
                @download="downloadImage"
              />

            </div>
          </div>

          <!-- Footer -->
          <div class="modal-footer">
            <button type="button" class="btn" @click="closeEditor">
              {{ t('imageEditor.footer.cancel') }}
            </button>
            <button type="button" class="btn" @click="resetToOriginal">
              <i class="fa-solid fa-arrow-rotate-left"></i>
              {{ t('imageEditor.footer.reset') }}
            </button>
            <Transition name="btn-swap" mode="out-in">
              <button
                v-if="!changesApplied"
                key="apply"
                type="button"
                class="btn btn-primary"
                @click="applyChanges"
              >
                <i class="fa-solid fa-eye"></i>
                {{ t('imageEditor.footer.apply') }}
              </button>
              <button
                v-else
                key="save"
                type="button"
                class="btn btn-save"
                @click="saveChanges"
              >
                <i class="fa-solid fa-floppy-disk"></i>
                {{ t('imageEditor.footer.save') }}
              </button>
            </Transition>
          </div>

        </div>
      </div>
    </Transition>

    <!-- Batch-Fortschritt: liegt (später im DOM) über dem Editor-Modal -->
    <LoadingIndicator ref="batchLoader" />
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import type { ImageObject, ImageFilters, TextItem } from '@/lib/core/types'
import { defaultFilters, defaultTransforms } from '@/lib/core/types'
import { FILTER_PRESETS } from '@/lib/core/filter-presets'
import { ImageProcessor } from '@/lib/core/image-processor'
import { useToast } from '@/composables/useToast'
import { useImageStore } from '@/stores/imageStore'
import { useEditorHistory } from '@/composables/useEditorHistory'
import { useEditorCanvas } from '@/composables/useEditorCanvas'
import LoadingIndicator from './LoadingIndicator.vue'
import CropTool from './CropTool.vue'
import TextOverlay from './TextOverlay.vue'
import EditorFiltersSection from './editor/EditorFiltersSection.vue'
import EditorTextSection from './editor/EditorTextSection.vue'
import EditorCropSection from './editor/EditorCropSection.vue'
import EditorTransformSection from './editor/EditorTransformSection.vue'
import EditorResizeSection from './editor/EditorResizeSection.vue'
import EditorExportSection from './editor/EditorExportSection.vue'

const { t } = useI18n()
const toast = useToast()
const imageStore = useImageStore()

const FONT_FAMILIES: { label: string; value: string }[] = [
  { label: 'Arial',           value: 'Arial, sans-serif' },
  { label: 'Georgia',         value: 'Georgia, serif' },
  { label: 'Verdana',         value: 'Verdana, sans-serif' },
  { label: 'Times New Roman', value: '"Times New Roman", serif' },
  { label: 'Courier New',     value: '"Courier New", monospace' },
  { label: 'Impact',          value: 'Impact, sans-serif' },
]

const CROP_RATIO_PRESETS = [
  { label: t('imageEditor.crop.ratioFree'), ratio: null },
  { label: '1:1', ratio: 1 },
  { label: '4:3', ratio: 4 / 3 },
  { label: '16:9', ratio: 16 / 9 },
] as const

type FilterKey = keyof Omit<ImageFilters, 'invert'>

const FILTER_DEFS: Array<{ key: FilterKey; min: number; max: number; step: number; unit: string }> = [
  { key: 'brightness',  min: 0, max: 200, step: 1, unit: '%' },
  { key: 'contrast',    min: 0, max: 200, step: 1, unit: '%' },
  { key: 'saturation',  min: 0, max: 200, step: 1, unit: '%' },
  { key: 'vibrance',    min: -100, max: 100, step: 1, unit: '' },
  { key: 'temperature', min: -100, max: 100, step: 1, unit: '' },
  { key: 'hue',         min: -180, max: 180, step: 1, unit: '°' },
  { key: 'grayscale',   min: 0, max: 100, step: 1, unit: '%' },
  { key: 'sepia',       min: 0, max: 100, step: 1, unit: '%' },
  { key: 'vignette',    min: 0, max: 100, step: 1, unit: '%' },
  { key: 'blur',        min: 0, max: 20,  step: 0.5, unit: 'px' },
  { key: 'opacity',     min: 0, max: 100, step: 1, unit: '%' },
]


interface Props {
  image: ImageObject | null
  isOpen: boolean
}

const props = defineProps<Props>()
const emit = defineEmits<{
  close: []
  save: [image: ImageObject]
}>()

// Canvas refs
const previewCanvas = ref<HTMLCanvasElement | null>(null)
const originalPreviewCanvas = ref<HTMLCanvasElement | null>(null)
const previewAreaRef = ref<HTMLElement | null>(null)
const canvasWrapperRef = ref<HTMLElement | null>(null)

// Form state
const fileName = ref('')
const resizeWidth = ref(0)
const resizeHeight = ref(0)
const keepAspectRatio = ref(true)
const selectedFormat = ref('image/png')
const isDownloading = ref(false)

// Filter state (local copy, baked on save)
const localFilters = ref<ImageFilters>({ ...defaultFilters })

// Two-step save state
const changesApplied = ref(false)

// Compare mode state
const compareMode = ref<'before' | 'split' | 'after'>('after')

// Text overlay state
const textItems = ref<TextItem[]>([])
const selectedTextId = ref<string | null>(null)

const selectedText = computed(() =>
  textItems.value.find(i => i.id === selectedTextId.value) ?? null
)

// ── Canvas composable ─────────────────────────────────────────────
const {
  currentWidth,
  currentHeight,
  isCropMode,
  cropLockedRatio,
  splitDividerPos,
  isStraightenMode,
  straightenAngle,
  init: initCanvas,
  updatePreview,
  rotate,
  flip,
  startCropMode: startCropModeCanvas,
  cancelCropMode,
  setCropRatio,
  onCropUpdate,
  applyCrop,
  startStraighten,
  setStraightenAngle,
  applyStraighten,
  cancelStraighten,
  startSplitDrag,
  dispose: disposeCanvas,
  getWorkingCanvas,
  getOriginalCanvas,
  getOriginalImageObj,
  getAspectRatio,
  setAspectRatio,
} = useEditorCanvas(
  previewCanvas,
  originalPreviewCanvas,
  previewAreaRef,
  canvasWrapperRef,
  changesApplied,
  renderEditedPreview,
)

// Bakes the full filter pipeline (incl. temperature/vibrance/vignette) into the
// edited preview canvas so the preview matches the exported result exactly.
function renderEditedPreview() {
  const pc = previewCanvas.value
  const wc = getWorkingCanvas()
  if (!pc || !wc || pc.width === 0 || pc.height === 0) return

  const scaled = document.createElement('canvas')
  scaled.width = pc.width
  scaled.height = pc.height
  scaled.getContext('2d')?.drawImage(wc, 0, 0, pc.width, pc.height)

  const filtered = ImageProcessor.applyFiltersToCanvas(scaled, localFilters.value)
  const ctx = pc.getContext('2d')
  if (ctx) {
    ctx.clearRect(0, 0, pc.width, pc.height)
    ctx.drawImage(filtered, 0, 0)
  }
}

// ── History composable ────────────────────────────────────────────
const {
  canUndo,
  canRedo,
  snapshotNow,
  schedule: schedulePushHistory,
  undo,
  redo,
  init: initHistory,
  dispose: disposeHistory,
} = useEditorHistory(localFilters, textItems, changesApplied)

function updateSelectedText(patch: Partial<TextItem>) {
  if (!selectedTextId.value) return
  textItems.value = textItems.value.map(i =>
    i.id === selectedTextId.value ? { ...i, ...patch } : i
  )
  schedulePushHistory()
}

function startCropMode() {
  // Finalize any in-progress straighten so its base snapshot isn't left stale
  if (isStraightenMode.value) applyStraighten()
  startCropModeCanvas()
  compareMode.value = 'after'
}

function onFlip(direction: string) {
  flip(direction as 'horizontal' | 'vertical')
}

// ── Keyboard undo / redo ──────────────────────────────────────────

function handleUndoRedo(e: KeyboardEvent) {
  if (!props.isOpen) return
  if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
    e.preventDefault(); undo()
  } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
    e.preventDefault(); redo()
  }
}

watch(() => props.isOpen, (open) => {
  if (open) document.addEventListener('keydown', handleUndoRedo)
  else document.removeEventListener('keydown', handleUndoRedo)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleUndoRedo)
  disposeHistory()
  disposeCanvas()
})

// ── Computed ──────────────────────────────────────────────────────

const dimensions = computed(() => {
  if (currentWidth.value === 0 || currentHeight.value === 0) return '0 × 0 px'
  return `${currentWidth.value} × ${currentHeight.value} px`
})

const fileSize = computed(() => {
  const originalImageObj = getOriginalImageObj()
  if (!originalImageObj) return '0 KB'
  const originalSize = originalImageObj.file.size
  const originalPixels = originalImageObj.canvas.width * originalImageObj.canvas.height
  const newWidth = resizeWidth.value || originalImageObj.canvas.width
  const newHeight = resizeHeight.value || originalImageObj.canvas.height
  const newPixels = newWidth * newHeight
  const estimatedSize = Math.round(originalSize * (newPixels / originalPixels))
  return ImageProcessor.formatFileSize(estimatedSize)
})

const availableFormats = computed(() => {
  const imageFormats = ImageProcessor.availableFormats.filter(format =>
    ImageProcessor.supportsFormat(format.mimeType)
  )
  return [...imageFormats, { name: 'PDF', mimeType: 'application/pdf', ext: 'pdf' }]
})

const transformStyle = computed(() => {
  if (!props.image) return {}
  const tr = props.image.transforms || defaultTransforms
  const style: Record<string, string> = {}
  if (tr.borderWidth > 0) style.border = `${tr.borderWidth}px solid ${tr.borderColor}`
  if (tr.borderRadius > 0) style.borderRadius = `${(tr.borderRadius / 200) * 50}%`
  if (tr.shadowBlur > 0) {
    const rgba = ImageProcessor.hexToRgba(tr.shadowColor, tr.shadowOpacity / 100)
    style.boxShadow = `${tr.shadowOffsetX}px ${tr.shadowOffsetY}px ${tr.shadowBlur}px ${rgba}`
  }
  return style
})

// Original canvas: on top, visible in 'before' and 'split' modes
const originalCanvasStyle = computed(() => {
  if (compareMode.value === 'after') return { display: 'none' }
  if (compareMode.value === 'before') return {}
  // split: clip original to left portion, revealing edited canvas on the right
  return { clipPath: `inset(0 ${100 - splitDividerPos.value}% 0 0)` }
})

// Edited canvas: hidden in 'before' mode (original covers it anyway, but hide for clarity)
const editedCanvasStyle = computed(() => {
  if (compareMode.value === 'before') return { opacity: '0' }
  return {}
})

// ── Watchers ──────────────────────────────────────────────────────

watch(() => props.image, (newImage) => {
  if (newImage && props.isOpen) initializeEditor(newImage)
}, { immediate: true })

watch(() => props.isOpen, (isOpen) => {
  if (isOpen && props.image) nextTick(() => initializeEditor(props.image!))
  if (!isOpen) {
    changesApplied.value = false
    compareMode.value = 'after'
  }
})

watch([resizeWidth, resizeHeight], () => {
  if (resizeWidth.value !== currentWidth.value || resizeHeight.value !== currentHeight.value) {
    changesApplied.value = false
  }
})

// ── Init ──────────────────────────────────────────────────────────

function initializeEditor(image: ImageObject) {
  if (!image) return

  // Reset any in-progress straighten from a previous image
  isStraightenMode.value = false
  straightenAngle.value = 0

  initCanvas(image)
  const workingCanvas = getWorkingCanvas()!

  fileName.value = image.outputName || ImageProcessor.getFileNameWithoutExtension(image.file.name)
  resizeWidth.value = workingCanvas.width
  resizeHeight.value = workingCanvas.height

  // Copy existing filters from the image object
  localFilters.value = { ...(image.filters || defaultFilters) }

  // Reset text overlay
  textItems.value = []
  selectedTextId.value = null

  // Reset undo/redo history
  initHistory(localFilters.value)

  const ext = ImageProcessor.getFileExtension(image.file.name).toLowerCase()
  const format = availableFormats.value.find(f => f.ext === ext)
  if (format) selectedFormat.value = format.mimeType

  nextTick(() => updatePreview())
}

// ── Resize ────────────────────────────────────────────────────────

function onResizeWidthChange() {
  if (keepAspectRatio.value && resizeWidth.value > 0) {
    resizeHeight.value = Math.round(resizeWidth.value / getAspectRatio())
  }
}

function onResizeHeightChange() {
  if (keepAspectRatio.value && resizeHeight.value > 0) {
    resizeWidth.value = Math.round(resizeHeight.value * getAspectRatio())
  }
}

function resetSize() {
  const originalCanvas = getOriginalCanvas()
  if (originalCanvas) {
    resizeWidth.value = originalCanvas.width
    resizeHeight.value = originalCanvas.height
  }
}

// ── Filters ───────────────────────────────────────────────────────

function onFilterInput(key: FilterKey, event: Event) {
  const value = Number((event.target as HTMLInputElement).value)
  localFilters.value = { ...localFilters.value, [key]: value }
  changesApplied.value = false
  schedulePushHistory()
}

function onFilterInputFromChild(key: string, event: Event) {
  onFilterInput(key as FilterKey, event)
}

function applyPreset(presetKey: string) {
  const preset = FILTER_PRESETS.find(p => p.key === presetKey)
  if (!preset) return
  localFilters.value = { ...defaultFilters, ...preset.filters }
  changesApplied.value = false
  snapshotNow()
}

function resetFilters() {
  localFilters.value = { ...defaultFilters }
  changesApplied.value = false
  snapshotNow()
}

// ── Batch: aktuellen Look/Filter auf mehrere Bilder übertragen ────

const batchLoader = ref<InstanceType<typeof LoadingIndicator> | null>(null)
const isApplyingBatch = ref(false)

/**
 * Überträgt die aktuellen (nicht-destruktiven) Filter-Einstellungen auf alle
 * bzw. die ausgewählten Bilder. Geometrie (Zuschnitt/Größe/Text) bleibt
 * bildspezifisch und wird bewusst NICHT mitkopiert.
 */
async function applyEditToBatch(mode: 'all' | 'selected') {
  if (isApplyingBatch.value) return

  const targets = (mode === 'all' ? imageStore.images : imageStore.selectedImages).slice()
  if (targets.length === 0) return

  const snapshot: ImageFilters = { ...defaultFilters, ...localFilters.value }
  const total = targets.length
  const showLoader = total > 1

  isApplyingBatch.value = true
  if (showLoader) {
    batchLoader.value?.showWithProgress(
      t('imageEditor.batch.progress', { current: 0, total }),
      total,
    )
  }

  try {
    let done = 0
    for (const img of targets) {
      img.filters = { ...snapshot }
      imageStore.updateImage(img)
      done++
      if (showLoader) {
        batchLoader.value?.updateProgress(done, t('imageEditor.batch.progress', { current: done, total }))
        // Yield so the grid can re-bake thumbnails and the bar can repaint
        await new Promise(resolve => setTimeout(resolve, 0))
      }
    }
    toast.success(t('imageEditor.batch.done', { count: total }))
  } finally {
    if (showLoader) batchLoader.value?.hide()
    isApplyingBatch.value = false
  }
}

// Re-bake the preview whenever any filter changes (live slider feedback)
watch(localFilters, () => renderEditedPreview(), { deep: true })

// ── Straighten (free rotation) ────────────────────────────────────

function onStraightenInput(deg: number) {
  if (!isStraightenMode.value) startStraighten()
  setStraightenAngle(deg)
}

function onStraightenApply() {
  applyStraighten()
  changesApplied.value = false
}

function onStraightenReset() {
  cancelStraighten()
}

// ── Save / Reset ──────────────────────────────────────────────────

async function downloadImage() {
  const workingCanvas = getWorkingCanvas()
  const originalImageObj = getOriginalImageObj()
  if (!workingCanvas || !originalImageObj) return
  isDownloading.value = true
  try {
    const fileBase = fileName.value.trim() || ImageProcessor.getFileNameWithoutExtension(originalImageObj.file.name)
    const safeBase = ImageProcessor.safeBaseName(fileBase)

    // Build export canvas with current filters applied
    const tempImageObj: ImageObject = {
      ...originalImageObj,
      canvas: workingCanvas,
      ctx: workingCanvas.getContext('2d')!,
      filters: { ...localFilters.value },
    }
    const exportCanvas = ImageProcessor.getExportCanvas(tempImageObj)

    if (selectedFormat.value === 'application/pdf') {
      const { default: jsPDF } = await import('jspdf')
      const dataUrl = exportCanvas.toDataURL('image/jpeg', 0.92)
      const w = exportCanvas.width
      const h = exportCanvas.height
      const pdf = new jsPDF({
        orientation: w >= h ? 'l' : 'p',
        unit: 'px',
        format: [w, h],
        hotfixes: ['px_scaling'],
      })
      pdf.addImage(dataUrl, 'JPEG', 0, 0, w, h)
      pdf.save(`${safeBase}.pdf`)
      return
    }

    const format = availableFormats.value.find(f => f.mimeType === selectedFormat.value)
    if (!format) throw new Error('Ungültiges Format')
    const blob = await ImageProcessor.convertToFormat(
      { ...tempImageObj, canvas: exportCanvas, ctx: exportCanvas.getContext('2d')! },
      format
    )
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `${safeBase}.${format.ext}`
    document.body.appendChild(a); a.click(); a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : t('alerts.unknownError')
    alert(t('alerts.downloadError', { error: errorMessage }))
  } finally {
    isDownloading.value = false
  }
}

function resetToOriginal() {
  const originalCanvas = getOriginalCanvas()
  const workingCanvas = getWorkingCanvas()
  if (!originalCanvas || !workingCanvas) return
  workingCanvas.width = originalCanvas.width; workingCanvas.height = originalCanvas.height
  const ctx = workingCanvas.getContext('2d')
  if (ctx) { ctx.clearRect(0, 0, workingCanvas.width, workingCanvas.height); ctx.drawImage(originalCanvas, 0, 0) }
  const originalImageObj = getOriginalImageObj()
  if (originalImageObj) fileName.value = ImageProcessor.getFileNameWithoutExtension(originalImageObj.file.name)
  setAspectRatio(workingCanvas.width / workingCanvas.height)
  localFilters.value = { ...defaultFilters }
  textItems.value = []
  selectedTextId.value = null
  isStraightenMode.value = false
  straightenAngle.value = 0
  changesApplied.value = false
  initHistory(defaultFilters)
  updatePreview()
}

function applyChanges() {
  const workingCanvas = getWorkingCanvas()
  if (!workingCanvas) return

  const newWidth = resizeWidth.value || workingCanvas.width
  const newHeight = resizeHeight.value || workingCanvas.height

  if (newWidth > 0 && newHeight > 0 && (newWidth !== workingCanvas.width || newHeight !== workingCanvas.height)) {
    const tempCanvas = document.createElement('canvas')
    tempCanvas.width = newWidth; tempCanvas.height = newHeight
    const tempCtx = tempCanvas.getContext('2d')
    if (tempCtx) {
      tempCtx.drawImage(workingCanvas, 0, 0, workingCanvas.width, workingCanvas.height, 0, 0, newWidth, newHeight)
      workingCanvas.width = newWidth; workingCanvas.height = newHeight
      const ctx = workingCanvas.getContext('2d')
      if (ctx) { ctx.clearRect(0, 0, newWidth, newHeight); ctx.drawImage(tempCanvas, 0, 0) }
    }
    setAspectRatio(newWidth / newHeight)
  }

  updatePreview()
  compareMode.value = 'after'
  changesApplied.value = true
}

function bakeTextToCanvas() {
  const workingCanvas = getWorkingCanvas()
  if (!workingCanvas || textItems.value.length === 0) return
  const ctx = workingCanvas.getContext('2d')
  if (!ctx) return
  const pw = previewCanvas.value?.width ?? workingCanvas.width
  const scale = workingCanvas.width / pw

  for (const item of textItems.value) {
    if (!item.text.trim()) continue
    const x = (item.x / 100) * workingCanvas.width
    const y = (item.y / 100) * workingCanvas.height
    const bakeFontSize = Math.max(1, Math.round(item.fontSize * scale))
    const lineHeight = bakeFontSize * 1.35

    ctx.save()
    ctx.globalAlpha = item.opacity / 100
    ctx.font = [
      item.italic ? 'italic' : '',
      item.bold ? 'bold' : '',
      `${bakeFontSize}px`,
      item.fontFamily,
    ].filter(Boolean).join(' ')
    ctx.textAlign = item.align
    ctx.textBaseline = 'top'

    // Shadow
    const sc = item.shadowColor ?? '#000000'
    const sr = parseInt(sc.slice(1, 3), 16)
    const sg = parseInt(sc.slice(3, 5), 16)
    const sb = parseInt(sc.slice(5, 7), 16)
    ctx.shadowColor = `rgba(${sr}, ${sg}, ${sb}, ${(item.shadowOpacity ?? 60) / 100})`
    ctx.shadowBlur = (item.shadowBlur ?? 0) * scale
    ctx.shadowOffsetX = (item.shadowOffsetX ?? 2) * scale
    ctx.shadowOffsetY = (item.shadowOffsetY ?? 2) * scale

    // Stroke first (rendered behind fill)
    if ((item.strokeWidth ?? 0) > 0) {
      ctx.strokeStyle = item.strokeColor ?? '#000000'
      ctx.lineWidth = (item.strokeWidth!) * 2 * scale
      ctx.lineJoin = 'round'
      item.text.split('\n').forEach((line, i) => {
        ctx.strokeText(line, x, y + i * lineHeight)
      })
      // Clear shadow so fill doesn't double it
      ctx.shadowColor = 'transparent'
      ctx.shadowBlur = 0
      ctx.shadowOffsetX = 0
      ctx.shadowOffsetY = 0
    }

    ctx.fillStyle = item.color
    item.text.split('\n').forEach((line, i) => {
      ctx.fillText(line, x, y + i * lineHeight)
    })
    ctx.restore()
  }
}

function saveChanges() {
  const workingCanvas = getWorkingCanvas()
  if (!props.image || !workingCanvas) return

  // Bake any pending text items into the canvas before saving
  bakeTextToCanvas()
  textItems.value = []
  selectedTextId.value = null

  /* eslint-disable vue/no-mutating-props */
  props.image.canvas.width = workingCanvas.width
  props.image.canvas.height = workingCanvas.height
  const ctx = props.image.canvas.getContext('2d')
  if (ctx) { ctx.clearRect(0, 0, workingCanvas.width, workingCanvas.height); ctx.drawImage(workingCanvas, 0, 0) }
  const newName = fileName.value.trim()
  if (newName) props.image.outputName = ImageProcessor.safeBaseName(newName)
  props.image.filters = { ...localFilters.value }
  /* eslint-enable vue/no-mutating-props */

  emit('save', props.image)
  toast.success(t('toast.changesSaved'))
  closeEditor()
}

function addTextItem() {
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2)
  const newItem: TextItem = {
    id,
    text: '',
    x: 10,
    y: 10,
    fontSize: 36,
    fontFamily: 'Arial, sans-serif',
    color: '#ffffff',
    bold: false,
    italic: false,
    align: 'left',
    opacity: 100,
    strokeWidth: 0,
    strokeColor: '#000000',
    shadowColor: '#000000',
    shadowOpacity: 60,
    shadowBlur: 0,
    shadowOffsetX: 2,
    shadowOffsetY: 2,
  }
  textItems.value = [...textItems.value, newItem]
  selectedTextId.value = id
  snapshotNow()
}

function deleteTextItem(id: string) {
  textItems.value = textItems.value.filter(i => i.id !== id)
  if (selectedTextId.value === id) selectedTextId.value = null
  snapshotNow()
}

function closeEditor() {
  isCropMode.value = false
  textItems.value = []
  selectedTextId.value = null
  emit('close')
}
</script>

<style scoped>
@import './editor/editor-shared.css';

/* ── Overlay ─────────────────────────────────────────────── */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: var(--space-4);
}

/* ── Modal container ─────────────────────────────────────── */
.modal-container {
  background: var(--bg);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-2xl);
  max-width: 1100px;
  width: 100%;
  height: 88vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.35);
  overflow: hidden;
}

/* ── Header ──────────────────────────────────────────────── */
.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--space-5);
  height: 52px;
  flex-shrink: 0;
  border-bottom: 1px solid var(--border-color);
  background: var(--panel);
}

.header-left {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  min-width: 0;
}

.header-icon { color: var(--accent); font-size: 1rem; }

.modal-title {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--text);
  white-space: nowrap;
}

.header-filename {
  font-size: 0.8rem;
  color: var(--muted);
  background: var(--bg);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: 2px 10px;
  max-width: 240px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.icon-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  color: var(--muted);
  cursor: pointer;
  border-radius: var(--radius-md);
  transition: all 0.15s;
  flex-shrink: 0;
}
.icon-btn:hover { background: var(--bg); color: var(--text); }

/* ── Body ────────────────────────────────────────────────── */
.editor-body {
  display: flex;
  flex: 1;
  min-height: 0;
}

/* ── Preview panel (left) ────────────────────────────────── */
.preview-panel {
  flex: 0 0 58%;
  display: flex;
  flex-direction: column;
  padding: var(--space-3) var(--space-4) var(--space-4);
  gap: var(--space-2);
  background: var(--bg);
  border-right: 1px solid var(--border-color);
  min-width: 0;
}

/* Compare toolbar */
.compare-toolbar {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-1);
  flex-shrink: 0;
}

.cmp-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  background: transparent;
  color: var(--muted);
  font-size: 0.73rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
}
.cmp-btn:hover { color: var(--text); border-color: var(--accent); }
.cmp-btn.active { background: var(--accent); border-color: var(--accent); color: white; }

.cmp-sep {
  color: var(--border-color);
  font-size: 0.8rem;
  user-select: none;
}

/* Preview area */
.preview-area {
  flex: 1;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: color-mix(in oklab, var(--bg) 60%, var(--panel) 40%);
  border: 1px dashed var(--border-color);
  border-radius: var(--radius-xl);
  overflow: hidden;
  padding: var(--space-3);
}

/* Canvas wrapper — inline-block so it sizes to the edited canvas */
.canvas-crop-wrapper {
  position: relative;
  display: inline-block;
  max-width: 100%;
  max-height: 100%;
}

/* Edited canvas (determines wrapper size) */
.edited-canvas {
  display: block;
  max-width: 100%;
  max-height: 100%;
  border-radius: var(--radius-md);
}

/* Original canvas (absolute overlay for comparison — same pixel dims as edited, no CSS size override) */
.original-canvas {
  position: absolute;
  top: 0;
  left: 0;
  border-radius: var(--radius-md);
  pointer-events: none;
}

/* Split divider line */
.split-line {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 2px;
  background: white;
  transform: translateX(-50%);
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.3);
  pointer-events: none;
}

/* Split drag handle */
.split-handle {
  position: absolute;
  top: 50%;
  width: 32px;
  height: 32px;
  background: white;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: ew-resize;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.35);
  color: #333;
  font-size: 13px;
  user-select: none;
}

/* Split labels */
.split-label {
  position: absolute;
  top: 8px;
  padding: 2px 7px;
  background: rgba(0, 0, 0, 0.52);
  color: white;
  font-size: 0.65rem;
  font-weight: 700;
  border-radius: 4px;
  pointer-events: none;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
.split-label-l { left: 8px; }
.split-label-r { right: 8px; }

/* Image meta */
.image-meta {
  display: flex;
  justify-content: space-between;
  font-size: 0.78rem;
  color: var(--muted);
  padding: 0 var(--space-1);
  gap: var(--space-3);
}
.image-meta i { margin-right: 4px; opacity: 0.6; }

/* ── Controls panel (right) ──────────────────────────────── */
.controls-panel {
  flex: 0 0 42%;
  overflow-y: auto;
  background: var(--panel);
  display: flex;
  flex-direction: column;
}

/* Undo / Redo bar */
.undo-redo-bar {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-4);
  border-bottom: 1px solid var(--border-color);
  background: color-mix(in oklab, var(--panel) 85%, var(--bg) 15%);
  position: sticky;
  top: 0;
  z-index: 3;
  flex-shrink: 0;
}

.undo-redo-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  background: var(--bg);
  color: var(--muted);
  font-size: 0.73rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;
}
.undo-redo-btn:hover:not(:disabled) { color: var(--text); border-color: var(--accent); }
.undo-redo-btn:disabled { opacity: 0.35; cursor: not-allowed; }

.undo-redo-hint {
  font-size: 0.67rem;
  color: var(--muted);
  opacity: 0.65;
  margin-left: auto;
  white-space: nowrap;
}

/* ── Footer ──────────────────────────────────────────────── */
.modal-footer {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-5);
  border-top: 1px solid var(--border-color);
  background: var(--panel);
  flex-shrink: 0;
}

/* ── Footer / inline buttons ─────────────────────────────── */
.btn {
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  background: var(--bg);
  color: var(--text);
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
}
.btn:hover:not(:disabled) { border-color: var(--accent); }
.btn:disabled { opacity: 0.45; cursor: not-allowed; }

.btn-primary {
  background: var(--accent);
  border-color: var(--accent);
  color: white;
}
.btn-primary:hover:not(:disabled) {
  background: color-mix(in oklab, var(--accent) 82%, black);
  border-color: color-mix(in oklab, var(--accent) 82%, black);
}

.btn-save {
  background: var(--green, #22c55e);
  border-color: var(--green, #22c55e);
  color: white;
  font-weight: 600;
}
.btn-save:hover:not(:disabled) {
  background: color-mix(in oklab, var(--green, #22c55e) 85%, black);
  border-color: color-mix(in oklab, var(--green, #22c55e) 85%, black);
}

.btn-swap-enter-active,
.btn-swap-leave-active { transition: opacity 0.15s ease, transform 0.15s ease; }
.btn-swap-enter-from { opacity: 0; transform: translateY(4px); }
.btn-swap-leave-to { opacity: 0; transform: translateY(-4px); }

/* ── Animations ──────────────────────────────────────────── */
.modal-enter-active,
.modal-leave-active { transition: opacity 0.25s ease; }
.modal-enter-from,
.modal-leave-to { opacity: 0; }
.modal-enter-active .modal-container,
.modal-leave-active .modal-container { transition: transform 0.25s ease; }
.modal-enter-from .modal-container,
.modal-leave-to .modal-container { transform: scale(0.97) translateY(10px); }

/* ── Responsive ──────────────────────────────────────────── */
@media (max-width: 768px) {
  .editor-body { flex-direction: column; }

  .preview-panel {
    flex: 0 0 auto;
    height: 45vh;
    border-right: none;
    border-bottom: 1px solid var(--border-color);
  }

  .controls-panel { flex: 1; }

  .modal-container {
    height: 95vh;
    border-radius: var(--radius-xl);
  }

  .header-filename { display: none; }
}

@media (max-width: 480px) {
  .modal-overlay { padding: 0; }
  .modal-container { height: 100dvh; border-radius: 0; }
}
</style>
