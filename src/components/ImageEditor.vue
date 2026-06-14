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
              <div class="preview-area">
                <div class="canvas-crop-wrapper">
                  <canvas
                    ref="previewCanvas"
                    class="preview-canvas"
                    :style="[filterStyle, transformStyle]"
                  ></canvas>
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

              <!-- Zuschneiden -->
              <div class="ctrl-section">
                <div class="ctrl-header">
                  <i class="fa-solid fa-crop-simple"></i>
                  {{ t('imageEditor.sections.crop') }}
                </div>
                <div v-if="!isCropMode">
                  <button type="button" class="btn btn-sm" @click="startCropMode">
                    <i class="fa-solid fa-crop-simple"></i>
                    {{ t('imageEditor.crop.start') }}
                  </button>
                </div>
                <template v-else>
                  <div class="ctrl-row">
                    <span class="ctrl-sublabel">{{ t('imageEditor.crop.ratio') }}</span>
                    <div class="btn-cluster">
                      <button
                        v-for="preset in CROP_RATIO_PRESETS"
                        :key="preset.label"
                        type="button"
                        class="btn btn-xs"
                        :class="{ 'btn-active': cropLockedRatio === preset.ratio }"
                        @click="setCropRatio(preset.ratio)"
                      >{{ preset.label }}</button>
                    </div>
                  </div>
                  <div class="btn-row">
                    <button type="button" class="btn btn-sm btn-primary" @click="applyCrop">
                      <i class="fa-solid fa-check"></i>
                      {{ t('imageEditor.crop.apply') }}
                    </button>
                    <button type="button" class="btn btn-sm" @click="cancelCropMode">
                      {{ t('imageEditor.crop.cancel') }}
                    </button>
                  </div>
                </template>
              </div>

              <!-- Transformationen -->
              <div class="ctrl-section">
                <div class="ctrl-header">
                  <i class="fa-solid fa-rotate"></i>
                  {{ t('imageEditor.sections.transformations') }}
                </div>
                <div class="ctrl-row">
                  <span class="ctrl-sublabel">{{ t('imageEditor.transformations.rotate.label') }}</span>
                  <div class="btn-cluster">
                    <button
                      type="button"
                      class="btn btn-icon-sm"
                      :title="t('imageEditor.transformations.rotate.left90')"
                      @click="rotate(-90)"
                    >
                      <i class="fa-solid fa-rotate-left"></i> −90°
                    </button>
                    <button
                      type="button"
                      class="btn btn-icon-sm"
                      :title="t('imageEditor.transformations.rotate.rotate180')"
                      @click="rotate(180)"
                    >180°</button>
                    <button
                      type="button"
                      class="btn btn-icon-sm"
                      :title="t('imageEditor.transformations.rotate.right90')"
                      @click="rotate(90)"
                    >
                      +90° <i class="fa-solid fa-rotate-right"></i>
                    </button>
                  </div>
                </div>
                <div class="ctrl-row">
                  <span class="ctrl-sublabel">{{ t('imageEditor.transformations.flip.label') }}</span>
                  <div class="btn-cluster">
                    <button
                      type="button"
                      class="btn btn-icon-sm"
                      :title="t('imageEditor.transformations.flip.horizontalTitle')"
                      @click="flip('horizontal')"
                    >
                      <i class="fa-solid fa-left-right"></i>
                      {{ t('imageEditor.transformations.flip.horizontal') }}
                    </button>
                    <button
                      type="button"
                      class="btn btn-icon-sm"
                      :title="t('imageEditor.transformations.flip.verticalTitle')"
                      @click="flip('vertical')"
                    >
                      <i class="fa-solid fa-up-down"></i>
                      {{ t('imageEditor.transformations.flip.vertical') }}
                    </button>
                  </div>
                </div>
              </div>

              <!-- Größe ändern -->
              <div class="ctrl-section">
                <div class="ctrl-header">
                  <i class="fa-solid fa-expand"></i>
                  {{ t('imageEditor.sections.resize') }}
                </div>
                <div class="size-row">
                  <label class="size-label" for="resizeWidth">B</label>
                  <input
                    id="resizeWidth"
                    v-model.number="resizeWidth"
                    type="number"
                    class="size-input"
                    min="1"
                    max="5000"
                    @input="onResizeWidthChange"
                  >
                  <span class="size-unit">px</span>
                  <button
                    type="button"
                    class="link-btn"
                    :class="{ active: keepAspectRatio }"
                    :title="t('imageEditor.resize.keepAspectRatio')"
                    @click="keepAspectRatio = !keepAspectRatio"
                  >
                    <i :class="keepAspectRatio ? 'fa-solid fa-link' : 'fa-solid fa-link-slash'"></i>
                  </button>
                  <label class="size-label" for="resizeHeight">H</label>
                  <input
                    id="resizeHeight"
                    v-model.number="resizeHeight"
                    type="number"
                    class="size-input"
                    min="1"
                    max="5000"
                    @input="onResizeHeightChange"
                  >
                  <span class="size-unit">px</span>
                </div>
                <button type="button" class="btn btn-xs btn-ghost" @click="resetSize">
                  <i class="fa-solid fa-arrow-rotate-left"></i>
                  {{ t('imageEditor.resize.resetSize') }}
                </button>
              </div>

              <!-- Export -->
              <div class="ctrl-section">
                <div class="ctrl-header">
                  <i class="fa-solid fa-file-export"></i>
                  {{ t('imageEditor.sections.export') }}
                </div>
                <div class="export-row">
                  <select id="exportFormat" v-model="selectedFormat" class="ctrl-select">
                    <option
                      v-for="format in availableFormats"
                      :key="format.mimeType"
                      :value="format.mimeType"
                    >{{ format.name }}</option>
                  </select>
                  <button
                    type="button"
                    class="btn btn-sm"
                    :disabled="isDownloading"
                    @click="downloadImage"
                  >
                    <i :class="isDownloading ? 'fa-solid fa-spinner fa-spin' : 'fa-solid fa-download'"></i>
                    {{ isDownloading ? t('imageEditor.export.downloading') : t('imageEditor.export.downloadButton') }}
                  </button>
                </div>
              </div>

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
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import type { ImageObject } from '@/lib/core/types'
import { defaultFilters, defaultTransforms } from '@/lib/core/types'
import { ImageProcessor } from '@/lib/core/image-processor'
import { useToast } from '@/composables/useToast'
import CropTool from './CropTool.vue'

const { t } = useI18n()
const toast = useToast()

const CROP_RATIO_PRESETS = [
  { label: t('imageEditor.crop.ratioFree'), ratio: null },
  { label: '1:1', ratio: 1 },
  { label: '4:3', ratio: 4 / 3 },
  { label: '16:9', ratio: 16 / 9 },
] as const

interface Props {
  image: ImageObject | null
  isOpen: boolean
}

const props = defineProps<Props>()
const emit = defineEmits<{
  close: []
  save: [image: ImageObject]
}>()

const previewCanvas = ref<HTMLCanvasElement | null>(null)
const previewAreaRef = ref<HTMLElement | null>(null)
const fileName = ref('')
const resizeWidth = ref(0)
const resizeHeight = ref(0)
const keepAspectRatio = ref(true)
const selectedFormat = ref('image/png')
const isDownloading = ref(false)

const currentWidth = ref(0)
const currentHeight = ref(0)

// Crop state
const isCropMode = ref(false)
const cropLockedRatio = ref<number | null>(null)
const cropNorm = ref({ x: 0, y: 0, w: 1, h: 1 })

// Two-step save state
const changesApplied = ref(false)

let workingCanvas: HTMLCanvasElement | null = null
let originalCanvas: HTMLCanvasElement | null = null
let originalImageObj: ImageObject | null = null
let aspectRatio = 1

const dimensions = computed(() => {
  if (currentWidth.value === 0 || currentHeight.value === 0) return '0 × 0 px'
  return `${currentWidth.value} × ${currentHeight.value} px`
})

const fileSize = computed(() => {
  if (!originalImageObj) return '0 KB'
  const originalSize = originalImageObj.file.size
  const originalPixels = originalImageObj.canvas.width * originalImageObj.canvas.height
  const newWidth = resizeWidth.value || originalImageObj.canvas.width
  const newHeight = resizeHeight.value || originalImageObj.canvas.height
  const newPixels = newWidth * newHeight
  const estimatedSize = Math.round(originalSize * (newPixels / originalPixels))
  return ImageProcessor.formatFileSize(estimatedSize)
})

const availableFormats = computed(() =>
  ImageProcessor.availableFormats.filter(format =>
    ImageProcessor.supportsFormat(format.mimeType)
  )
)

const filterStyle = computed(() => {
  if (!props.image) return {}
  const f = props.image.filters || defaultFilters
  return {
    filter: `
      brightness(${f.brightness}%)
      contrast(${f.contrast}%)
      saturate(${f.saturation}%)
      hue-rotate(${f.hue}deg)
      blur(${f.blur}px)
      grayscale(${f.grayscale}%)
      sepia(${f.sepia}%)
      invert(${f.invert}%)
    `.trim(),
    opacity: f.opacity / 100
  }
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

watch(() => props.image, (newImage) => {
  if (newImage && props.isOpen) initializeEditor(newImage)
}, { immediate: true })

watch(() => props.isOpen, (isOpen) => {
  if (isOpen && props.image) nextTick(() => initializeEditor(props.image!))
  if (!isOpen) changesApplied.value = false
})

// Resize input changes invalidate the applied state
watch([resizeWidth, resizeHeight], () => {
  if (resizeWidth.value !== currentWidth.value || resizeHeight.value !== currentHeight.value) {
    changesApplied.value = false
  }
})

function initializeEditor(image: ImageObject) {
  if (!image) return
  originalImageObj = image

  workingCanvas = document.createElement('canvas')
  workingCanvas.width = image.canvas.width
  workingCanvas.height = image.canvas.height
  workingCanvas.getContext('2d')?.drawImage(image.canvas, 0, 0)

  originalCanvas = document.createElement('canvas')
  originalCanvas.width = image.canvas.width
  originalCanvas.height = image.canvas.height
  originalCanvas.getContext('2d')?.drawImage(image.canvas, 0, 0)

  fileName.value = image.outputName || ImageProcessor.getFileNameWithoutExtension(image.file.name)
  resizeWidth.value = workingCanvas.width
  resizeHeight.value = workingCanvas.height
  aspectRatio = workingCanvas.width / workingCanvas.height

  const ext = ImageProcessor.getFileExtension(image.file.name).toLowerCase()
  const format = availableFormats.value.find(f => f.ext === ext)
  if (format) selectedFormat.value = format.mimeType

  nextTick(() => updatePreview())
}

function updatePreview() {
  if (!previewCanvas.value || !workingCanvas) return

  currentWidth.value = workingCanvas.width
  currentHeight.value = workingCanvas.height

  const panel = previewAreaRef.value
  const maxW = panel ? panel.clientWidth - 48 : 500
  const maxH = panel ? panel.clientHeight - 80 : 500
  const scale = Math.min(maxW / workingCanvas.width, maxH / workingCanvas.height, 1)

  previewCanvas.value.width = Math.max(1, Math.floor(workingCanvas.width * scale))
  previewCanvas.value.height = Math.max(1, Math.floor(workingCanvas.height * scale))

  const ctx = previewCanvas.value.getContext('2d')
  if (ctx) {
    ctx.clearRect(0, 0, previewCanvas.value.width, previewCanvas.value.height)
    ctx.drawImage(workingCanvas, 0, 0, previewCanvas.value.width, previewCanvas.value.height)
  }

  resizeWidth.value = workingCanvas.width
  resizeHeight.value = workingCanvas.height
}

function rotate(degrees: number) {
  if (!workingCanvas) return
  changesApplied.value = false
  const tempCanvas = document.createElement('canvas')
  const tempCtx = tempCanvas.getContext('2d')
  if (!tempCtx) return
  const w = workingCanvas.width
  const h = workingCanvas.height
  if (Math.abs(degrees) === 90) {
    tempCanvas.width = h; tempCanvas.height = w
    tempCtx.translate(h / 2, w / 2)
    tempCtx.rotate((degrees * Math.PI) / 180)
    tempCtx.drawImage(workingCanvas, -w / 2, -h / 2)
    workingCanvas.width = h; workingCanvas.height = w
  } else {
    tempCanvas.width = w; tempCanvas.height = h
    tempCtx.translate(w / 2, h / 2)
    tempCtx.rotate((degrees * Math.PI) / 180)
    tempCtx.drawImage(workingCanvas, -w / 2, -h / 2)
  }
  const ctx = workingCanvas.getContext('2d')
  if (ctx) { ctx.clearRect(0, 0, workingCanvas.width, workingCanvas.height); ctx.drawImage(tempCanvas, 0, 0) }
  aspectRatio = workingCanvas.width / workingCanvas.height
  updatePreview()
}

function flip(direction: 'horizontal' | 'vertical') {
  if (!workingCanvas) return
  changesApplied.value = false
  const tempCanvas = document.createElement('canvas')
  tempCanvas.width = workingCanvas.width; tempCanvas.height = workingCanvas.height
  const tempCtx = tempCanvas.getContext('2d')
  if (!tempCtx) return
  tempCtx.save()
  if (direction === 'horizontal') {
    tempCtx.scale(-1, 1); tempCtx.drawImage(workingCanvas, -workingCanvas.width, 0)
  } else {
    tempCtx.scale(1, -1); tempCtx.drawImage(workingCanvas, 0, -workingCanvas.height)
  }
  tempCtx.restore()
  const ctx = workingCanvas.getContext('2d')
  if (ctx) { ctx.clearRect(0, 0, workingCanvas.width, workingCanvas.height); ctx.drawImage(tempCanvas, 0, 0) }
  updatePreview()
}

function onResizeWidthChange() {
  if (keepAspectRatio.value && resizeWidth.value > 0) {
    resizeHeight.value = Math.round(resizeWidth.value / aspectRatio)
  }
}

function onResizeHeightChange() {
  if (keepAspectRatio.value && resizeHeight.value > 0) {
    resizeWidth.value = Math.round(resizeHeight.value * aspectRatio)
  }
}

function resetSize() {
  if (originalCanvas) {
    resizeWidth.value = originalCanvas.width
    resizeHeight.value = originalCanvas.height
  }
}

async function downloadImage() {
  if (!workingCanvas || !originalImageObj) return
  isDownloading.value = true
  try {
    const format = availableFormats.value.find(f => f.mimeType === selectedFormat.value)
    if (!format) throw new Error('Ungültiges Format')
    const tempImageObj: ImageObject = { ...originalImageObj, canvas: workingCanvas, ctx: workingCanvas.getContext('2d')! }
    const exportCanvas = ImageProcessor.getExportCanvas(tempImageObj)
    const blob = await ImageProcessor.convertToFormat(
      { ...tempImageObj, canvas: exportCanvas, ctx: exportCanvas.getContext('2d')! },
      format
    )
    const fileBase = fileName.value.trim() || ImageProcessor.getFileNameWithoutExtension(originalImageObj.file.name)
    const downloadFileName = `${ImageProcessor.safeBaseName(fileBase)}.${format.ext}`
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = downloadFileName
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
  if (!originalCanvas || !workingCanvas) return
  workingCanvas.width = originalCanvas.width; workingCanvas.height = originalCanvas.height
  const ctx = workingCanvas.getContext('2d')
  if (ctx) { ctx.clearRect(0, 0, workingCanvas.width, workingCanvas.height); ctx.drawImage(originalCanvas, 0, 0) }
  if (originalImageObj) fileName.value = ImageProcessor.getFileNameWithoutExtension(originalImageObj.file.name)
  aspectRatio = workingCanvas.width / workingCanvas.height
  updatePreview()
}

function applyChanges() {
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
    aspectRatio = newWidth / newHeight
  }

  updatePreview()
  changesApplied.value = true
}

function saveChanges() {
  if (!props.image || !workingCanvas) return

  /* eslint-disable vue/no-mutating-props */
  props.image.canvas.width = workingCanvas.width
  props.image.canvas.height = workingCanvas.height
  const ctx = props.image.canvas.getContext('2d')
  if (ctx) { ctx.clearRect(0, 0, workingCanvas.width, workingCanvas.height); ctx.drawImage(workingCanvas, 0, 0) }
  const newName = fileName.value.trim()
  if (newName) props.image.outputName = ImageProcessor.safeBaseName(newName)
  /* eslint-enable vue/no-mutating-props */

  emit('save', props.image)
  toast.success(t('toast.changesSaved'))
  closeEditor()
}

// Crop functions
function startCropMode() { cropLockedRatio.value = null; isCropMode.value = true }
function cancelCropMode() { isCropMode.value = false }
function setCropRatio(ratio: number | null) { cropLockedRatio.value = ratio }
function onCropUpdate(rect: { x: number; y: number; w: number; h: number }) { cropNorm.value = rect }

function applyCrop() {
  if (!workingCanvas) return
  const x = Math.round(cropNorm.value.x * workingCanvas.width)
  const y = Math.round(cropNorm.value.y * workingCanvas.height)
  const w = Math.max(1, Math.round(cropNorm.value.w * workingCanvas.width))
  const h = Math.max(1, Math.round(cropNorm.value.h * workingCanvas.height))
  const tempCanvas = document.createElement('canvas')
  tempCanvas.width = w; tempCanvas.height = h
  const tempCtx = tempCanvas.getContext('2d')
  if (!tempCtx) return
  tempCtx.drawImage(workingCanvas, x, y, w, h, 0, 0, w, h)
  workingCanvas.width = w; workingCanvas.height = h
  const ctx = workingCanvas.getContext('2d')
  if (ctx) { ctx.clearRect(0, 0, w, h); ctx.drawImage(tempCanvas, 0, 0) }
  aspectRatio = w / h
  isCropMode.value = false
  changesApplied.value = false
  updatePreview()
}

function closeEditor() {
  isCropMode.value = false
  emit('close')
}
</script>

<style scoped>
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

.header-icon {
  color: var(--accent);
  font-size: 1rem;
}

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
  padding: var(--space-4);
  gap: var(--space-2);
  background: var(--bg);
  border-right: 1px solid var(--border-color);
  min-width: 0;
}

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

.canvas-crop-wrapper {
  position: relative;
  display: inline-block;
  max-width: 100%;
  max-height: 100%;
}

.preview-canvas {
  display: block;
  max-width: 100%;
  max-height: 100%;
  border-radius: var(--radius-md);
}

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

.ctrl-section {
  padding: var(--space-4) var(--space-5);
  border-bottom: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.ctrl-header {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: var(--muted);
}

.ctrl-input {
  width: 100%;
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  background: var(--bg);
  color: var(--text);
  font-size: 0.875rem;
  box-sizing: border-box;
  transition: border-color 0.15s;
}

.ctrl-input:focus { outline: none; border-color: var(--accent); }

.ctrl-row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.ctrl-sublabel {
  font-size: 0.78rem;
  color: var(--muted);
  min-width: 68px;
  flex-shrink: 0;
}

.btn-cluster { display: flex; gap: 4px; flex-wrap: wrap; }
.btn-row { display: flex; gap: var(--space-2); }

/* Size row */
.size-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.size-label {
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--muted);
  min-width: 12px;
}

.size-input {
  width: 68px;
  padding: 5px 6px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  background: var(--bg);
  color: var(--text);
  font-size: 0.875rem;
  text-align: center;
  transition: border-color 0.15s;
}

.size-input:focus { outline: none; border-color: var(--accent); }

.size-unit { font-size: 0.75rem; color: var(--muted); }

.link-btn {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  background: var(--bg);
  color: var(--muted);
  cursor: pointer;
  transition: all 0.15s;
  flex-shrink: 0;
}

.link-btn:hover { border-color: var(--accent); color: var(--accent); }
.link-btn.active { border-color: var(--accent); color: var(--accent); background: color-mix(in oklab, var(--accent) 10%, transparent); }

/* Export row */
.export-row { display: flex; gap: var(--space-2); align-items: center; }

.ctrl-select {
  flex: 1;
  padding: 6px var(--space-3);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  background: var(--bg);
  color: var(--text);
  font-size: 0.875rem;
  min-width: 0;
}

/* ── Buttons ─────────────────────────────────────────────── */
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

.btn-sm { padding: 6px 12px; font-size: 0.82rem; }
.btn-xs { padding: 3px 8px; font-size: 0.78rem; }
.btn-icon-sm { padding: 5px 10px; font-size: 0.8rem; }

.btn-ghost {
  background: transparent;
  border-color: transparent;
  color: var(--muted);
}
.btn-ghost:hover:not(:disabled) {
  background: var(--bg);
  border-color: var(--border-color);
  color: var(--text);
}

.btn-primary {
  background: var(--accent);
  border-color: var(--accent);
  color: white;
}
.btn-primary:hover:not(:disabled) {
  background: color-mix(in oklab, var(--accent) 82%, black);
  border-color: color-mix(in oklab, var(--accent) 82%, black);
}

.btn-active {
  background: var(--accent);
  border-color: var(--accent);
  color: white;
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
.btn-swap-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.btn-swap-enter-from {
  opacity: 0;
  transform: translateY(4px);
}

.btn-swap-leave-to {
  opacity: 0;
  transform: translateY(-4px);
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
    height: 42vh;
    border-right: none;
    border-bottom: 1px solid var(--border-color);
  }

  .controls-panel { flex: 1; }

  .modal-container {
    height: 95vh;
    border-radius: var(--radius-xl);
  }

  .header-filename { display: none; }

  .size-row { flex-wrap: wrap; }
}

@media (max-width: 480px) {
  .modal-overlay { padding: 0; }
  .modal-container { height: 100dvh; border-radius: 0; }
}
</style>
