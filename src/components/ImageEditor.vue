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
                    :style="[filterStyle, transformStyle, editedCanvasStyle]"
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

              <!-- Text -->
              <div class="ctrl-section">
                <div class="ctrl-header">
                  <i class="fa-solid fa-font"></i>
                  {{ t('imageEditor.sections.text') }}
                  <button type="button" class="btn btn-xs btn-primary text-add-btn" @click="addTextItem">
                    <i class="fa-solid fa-plus"></i>
                    {{ t('imageEditor.text.add') }}
                  </button>
                </div>

                <!-- Selected text properties -->
                <template v-if="selectedText">
                  <textarea
                    class="ctrl-textarea"
                    :placeholder="t('imageEditor.text.contentPlaceholder')"
                    :value="selectedText.text"
                    rows="3"
                    @input="updateSelectedText({ text: ($event.target as HTMLTextAreaElement).value })"
                  ></textarea>

                  <div class="ctrl-row">
                    <span class="ctrl-sublabel">{{ t('imageEditor.text.fontSize') }}</span>
                    <input
                      type="number"
                      class="size-input"
                      min="6"
                      max="300"
                      :value="selectedText.fontSize"
                      @input="updateSelectedText({ fontSize: +($event.target as HTMLInputElement).value })"
                    >
                    <span class="size-unit">px</span>
                  </div>

                  <div class="ctrl-row">
                    <span class="ctrl-sublabel">{{ t('imageEditor.text.fontFamily') }}</span>
                    <select
                      class="ctrl-select ctrl-select-sm"
                      :value="selectedText.fontFamily"
                      @change="updateSelectedText({ fontFamily: ($event.target as HTMLSelectElement).value })"
                    >
                      <option v-for="f in FONT_FAMILIES" :key="f.value" :value="f.value">{{ f.label }}</option>
                    </select>
                  </div>

                  <div class="ctrl-row">
                    <span class="ctrl-sublabel">{{ t('imageEditor.text.color') }}</span>
                    <input
                      type="color"
                      class="color-input"
                      :value="selectedText.color"
                      @input="updateSelectedText({ color: ($event.target as HTMLInputElement).value })"
                    >
                  </div>

                  <div class="ctrl-row">
                    <span class="ctrl-sublabel">{{ t('imageEditor.text.style') }}</span>
                    <div class="btn-cluster">
                      <button
                        type="button"
                        class="btn btn-xs"
                        :class="{ 'btn-active': selectedText.bold }"
                        :title="t('imageEditor.text.bold')"
                        @click="updateSelectedText({ bold: !selectedText.bold })"
                      ><b>B</b></button>
                      <button
                        type="button"
                        class="btn btn-xs"
                        :class="{ 'btn-active': selectedText.italic }"
                        :title="t('imageEditor.text.italic')"
                        @click="updateSelectedText({ italic: !selectedText.italic })"
                      ><i>I</i></button>
                      <button
                        type="button"
                        class="btn btn-xs"
                        :class="{ 'btn-active': selectedText.align === 'left' }"
                        :title="t('imageEditor.text.alignLeft')"
                        @click="updateSelectedText({ align: 'left' })"
                      ><i class="fa-solid fa-align-left"></i></button>
                      <button
                        type="button"
                        class="btn btn-xs"
                        :class="{ 'btn-active': selectedText.align === 'center' }"
                        :title="t('imageEditor.text.alignCenter')"
                        @click="updateSelectedText({ align: 'center' })"
                      ><i class="fa-solid fa-align-center"></i></button>
                      <button
                        type="button"
                        class="btn btn-xs"
                        :class="{ 'btn-active': selectedText.align === 'right' }"
                        :title="t('imageEditor.text.alignRight')"
                        @click="updateSelectedText({ align: 'right' })"
                      ><i class="fa-solid fa-align-right"></i></button>
                    </div>
                  </div>

                  <div class="filter-row">
                    <label class="filter-label">{{ t('imageEditor.text.opacity') }}</label>
                    <div class="filter-slider-wrap">
                      <input
                        type="range"
                        class="filter-slider"
                        min="0"
                        max="100"
                        step="1"
                        :value="selectedText.opacity"
                        @input="updateSelectedText({ opacity: +($event.target as HTMLInputElement).value })"
                      >
                      <span class="filter-value">{{ selectedText.opacity }}%</span>
                    </div>
                  </div>

                  <!-- Stroke (Umrandung) -->
                  <div class="ctrl-subheader">{{ t('imageEditor.text.stroke') }}</div>
                  <div class="ctrl-row">
                    <span class="ctrl-sublabel">{{ t('imageEditor.text.strokeColor') }}</span>
                    <input
                      type="color"
                      class="color-input"
                      :value="selectedText.strokeColor"
                      @input="updateSelectedText({ strokeColor: ($event.target as HTMLInputElement).value })"
                    >
                  </div>
                  <div class="filter-row">
                    <label class="filter-label">{{ t('imageEditor.text.strokeWidth') }}</label>
                    <div class="filter-slider-wrap">
                      <input
                        type="range"
                        class="filter-slider"
                        min="0"
                        max="20"
                        step="0.5"
                        :value="selectedText.strokeWidth"
                        @input="updateSelectedText({ strokeWidth: +($event.target as HTMLInputElement).value })"
                      >
                      <span class="filter-value">{{ selectedText.strokeWidth }}px</span>
                    </div>
                  </div>

                  <!-- Shadow (Schatten) -->
                  <div class="ctrl-subheader">{{ t('imageEditor.text.shadow') }}</div>
                  <div class="ctrl-row">
                    <span class="ctrl-sublabel">{{ t('imageEditor.text.shadowColor') }}</span>
                    <input
                      type="color"
                      class="color-input"
                      :value="selectedText.shadowColor"
                      @input="updateSelectedText({ shadowColor: ($event.target as HTMLInputElement).value })"
                    >
                  </div>
                  <div class="filter-row">
                    <label class="filter-label">{{ t('imageEditor.text.shadowOpacity') }}</label>
                    <div class="filter-slider-wrap">
                      <input
                        type="range"
                        class="filter-slider"
                        min="0"
                        max="100"
                        step="1"
                        :value="selectedText.shadowOpacity"
                        @input="updateSelectedText({ shadowOpacity: +($event.target as HTMLInputElement).value })"
                      >
                      <span class="filter-value">{{ selectedText.shadowOpacity }}%</span>
                    </div>
                  </div>
                  <div class="filter-row">
                    <label class="filter-label">{{ t('imageEditor.text.shadowBlur') }}</label>
                    <div class="filter-slider-wrap">
                      <input
                        type="range"
                        class="filter-slider"
                        min="0"
                        max="30"
                        step="1"
                        :value="selectedText.shadowBlur"
                        @input="updateSelectedText({ shadowBlur: +($event.target as HTMLInputElement).value })"
                      >
                      <span class="filter-value">{{ selectedText.shadowBlur }}px</span>
                    </div>
                  </div>
                  <div class="filter-row">
                    <label class="filter-label">{{ t('imageEditor.text.shadowOffsetX') }}</label>
                    <div class="filter-slider-wrap">
                      <input
                        type="range"
                        class="filter-slider"
                        min="-20"
                        max="20"
                        step="1"
                        :value="selectedText.shadowOffsetX"
                        @input="updateSelectedText({ shadowOffsetX: +($event.target as HTMLInputElement).value })"
                      >
                      <span class="filter-value">{{ selectedText.shadowOffsetX }}px</span>
                    </div>
                  </div>
                  <div class="filter-row">
                    <label class="filter-label">{{ t('imageEditor.text.shadowOffsetY') }}</label>
                    <div class="filter-slider-wrap">
                      <input
                        type="range"
                        class="filter-slider"
                        min="-20"
                        max="20"
                        step="1"
                        :value="selectedText.shadowOffsetY"
                        @input="updateSelectedText({ shadowOffsetY: +($event.target as HTMLInputElement).value })"
                      >
                      <span class="filter-value">{{ selectedText.shadowOffsetY }}px</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    class="btn btn-xs btn-ghost"
                    style="color: #ef4444; align-self: flex-start;"
                    @click="deleteTextItem(selectedText.id)"
                  >
                    <i class="fa-solid fa-trash"></i>
                    {{ t('imageEditor.text.delete') }}
                  </button>
                </template>

                <!-- Text items list -->
                <div v-if="textItems.length > 0 && !selectedText" class="text-list">
                  <button
                    v-for="item in textItems"
                    :key="item.id"
                    type="button"
                    class="text-list-item"
                    @click="selectedTextId = item.id"
                  >
                    <i class="fa-solid fa-font"></i>
                    <span class="text-list-preview">{{ item.text || '…' }}</span>
                  </button>
                </div>

                <p v-if="textItems.length === 0" class="text-hint">
                  <i class="fa-solid fa-circle-info"></i>
                  {{ t('imageEditor.text.hint') }}
                </p>
              </div>

              <!-- Filter -->
              <div class="ctrl-section">
                <div class="ctrl-header">
                  <i class="fa-solid fa-sliders"></i>
                  {{ t('imageEditor.sections.filters') }}
                </div>
                <div
                  v-for="fd in FILTER_DEFS"
                  :key="fd.key"
                  class="filter-row"
                >
                  <label class="filter-label">{{ t(`imageEditor.filters.${fd.key}`) }}</label>
                  <div class="filter-slider-wrap">
                    <input
                      type="range"
                      class="filter-slider"
                      :min="fd.min"
                      :max="fd.max"
                      :step="fd.step"
                      :value="localFilters[fd.key]"
                      @input="onFilterInput(fd.key, $event)"
                    >
                    <span class="filter-value">{{ localFilters[fd.key] }}{{ fd.unit }}</span>
                  </div>
                </div>
                <button type="button" class="btn btn-xs btn-ghost" @click="resetFilters">
                  <i class="fa-solid fa-arrow-rotate-left"></i>
                  {{ t('imageEditor.filters.reset') }}
                </button>
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
import { ref, computed, watch, nextTick, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import type { ImageObject, ImageFilters, TextItem } from '@/lib/core/types'
import { defaultFilters, defaultTransforms } from '@/lib/core/types'
import { ImageProcessor } from '@/lib/core/image-processor'
import { useToast } from '@/composables/useToast'
import CropTool from './CropTool.vue'
import TextOverlay from './TextOverlay.vue'

const { t } = useI18n()
const toast = useToast()

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
  { key: 'brightness', min: 0, max: 200, step: 1, unit: '%' },
  { key: 'contrast',   min: 0, max: 200, step: 1, unit: '%' },
  { key: 'saturation', min: 0, max: 200, step: 1, unit: '%' },
  { key: 'hue',        min: -180, max: 180, step: 1, unit: '°' },
  { key: 'grayscale',  min: 0, max: 100, step: 1, unit: '%' },
  { key: 'sepia',      min: 0, max: 100, step: 1, unit: '%' },
  { key: 'blur',       min: 0, max: 20,  step: 0.5, unit: 'px' },
  { key: 'opacity',    min: 0, max: 100, step: 1, unit: '%' },
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
const currentWidth = ref(0)
const currentHeight = ref(0)

// Filter state (local copy, baked on save)
const localFilters = ref<ImageFilters>({ ...defaultFilters })

// Crop state
const isCropMode = ref(false)
const cropLockedRatio = ref<number | null>(null)
const cropNorm = ref({ x: 0, y: 0, w: 1, h: 1 })

// Two-step save state
const changesApplied = ref(false)

// Text overlay state
const textItems = ref<TextItem[]>([])
const selectedTextId = ref<string | null>(null)

const selectedText = computed(() =>
  textItems.value.find(i => i.id === selectedTextId.value) ?? null
)

function updateSelectedText(patch: Partial<TextItem>) {
  if (!selectedTextId.value) return
  textItems.value = textItems.value.map(i =>
    i.id === selectedTextId.value ? { ...i, ...patch } : i
  )
}

// Compare mode state
const compareMode = ref<'before' | 'split' | 'after'>('after')
const splitDividerPos = ref(50)
let isDraggingSplit = false

let workingCanvas: HTMLCanvasElement | null = null
let originalCanvas: HTMLCanvasElement | null = null
let originalImageObj: ImageObject | null = null
let aspectRatio = 1

// ── Computed ──────────────────────────────────────────────────────

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
  const f = localFilters.value
  return {
    filter: [
      `brightness(${f.brightness}%)`,
      `contrast(${f.contrast}%)`,
      `saturate(${f.saturation}%)`,
      `hue-rotate(${f.hue}deg)`,
      `blur(${f.blur}px)`,
      `grayscale(${f.grayscale}%)`,
      `sepia(${f.sepia}%)`,
      `invert(${f.invert}%)`,
    ].join(' '),
    opacity: f.opacity / 100,
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

  // Copy existing filters from the image object
  localFilters.value = { ...(image.filters || defaultFilters) }

  // Reset text overlay
  textItems.value = []
  selectedTextId.value = null

  const ext = ImageProcessor.getFileExtension(image.file.name).toLowerCase()
  const format = availableFormats.value.find(f => f.ext === ext)
  if (format) selectedFormat.value = format.mimeType

  nextTick(() => updatePreview())
}

// ── Preview ───────────────────────────────────────────────────────

function updatePreview() {
  if (!previewCanvas.value || !workingCanvas) return

  currentWidth.value = workingCanvas.width
  currentHeight.value = workingCanvas.height

  const panel = previewAreaRef.value
  const maxW = panel ? panel.clientWidth - 48 : 500
  const maxH = panel ? panel.clientHeight - 80 : 500
  const scale = Math.min(maxW / workingCanvas.width, maxH / workingCanvas.height, 1)

  const dw = Math.max(1, Math.floor(workingCanvas.width * scale))
  const dh = Math.max(1, Math.floor(workingCanvas.height * scale))

  previewCanvas.value.width = dw
  previewCanvas.value.height = dh

  const ctx = previewCanvas.value.getContext('2d')
  if (ctx) {
    ctx.clearRect(0, 0, dw, dh)
    ctx.drawImage(workingCanvas, 0, 0, dw, dh)
  }

  resizeWidth.value = workingCanvas.width
  resizeHeight.value = workingCanvas.height

  updateOriginalPreview(dw, dh)
}

function updateOriginalPreview(dw: number, dh: number) {
  if (!originalPreviewCanvas.value || !originalCanvas) return
  const target = originalPreviewCanvas.value
  target.width = dw
  target.height = dh
  const ctx = target.getContext('2d')
  if (ctx) {
    ctx.clearRect(0, 0, dw, dh)
    ctx.drawImage(originalCanvas, 0, 0, dw, dh)
  }
}

// ── Transforms ───────────────────────────────────────────────────

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

// ── Filters ───────────────────────────────────────────────────────

function onFilterInput(key: FilterKey, event: Event) {
  const value = Number((event.target as HTMLInputElement).value)
  localFilters.value = { ...localFilters.value, [key]: value }
  changesApplied.value = false
}

function resetFilters() {
  localFilters.value = { ...defaultFilters }
  changesApplied.value = false
}

// ── Crop ─────────────────────────────────────────────────────────

function startCropMode() {
  cropLockedRatio.value = null
  isCropMode.value = true
  compareMode.value = 'after'
}

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

// ── Split compare drag ────────────────────────────────────────────

function startSplitDrag(event: MouseEvent | TouchEvent) {
  isDraggingSplit = true
  document.addEventListener('mousemove', onSplitMouseMove)
  document.addEventListener('mouseup', stopSplitDrag)
  document.addEventListener('touchmove', onSplitTouchMove, { passive: false })
  document.addEventListener('touchend', stopSplitDrag)
}

function onSplitMouseMove(event: MouseEvent) {
  if (!isDraggingSplit) return
  moveSplitTo(event.clientX)
}

function onSplitTouchMove(event: TouchEvent) {
  if (!isDraggingSplit) return
  event.preventDefault()
  moveSplitTo(event.touches[0].clientX)
}

function moveSplitTo(clientX: number) {
  if (!canvasWrapperRef.value) return
  const rect = canvasWrapperRef.value.getBoundingClientRect()
  const pos = ((clientX - rect.left) / rect.width) * 100
  splitDividerPos.value = Math.max(2, Math.min(98, pos))
}

function stopSplitDrag() {
  isDraggingSplit = false
  document.removeEventListener('mousemove', onSplitMouseMove)
  document.removeEventListener('mouseup', stopSplitDrag)
  document.removeEventListener('touchmove', onSplitTouchMove)
  document.removeEventListener('touchend', stopSplitDrag)
}

onUnmounted(() => {
  document.removeEventListener('mousemove', onSplitMouseMove)
  document.removeEventListener('mouseup', stopSplitDrag)
  document.removeEventListener('touchmove', onSplitTouchMove)
  document.removeEventListener('touchend', stopSplitDrag)
})

// ── Save / Reset ──────────────────────────────────────────────────

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
  localFilters.value = { ...defaultFilters }
  textItems.value = []
  selectedTextId.value = null
  changesApplied.value = false
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
  compareMode.value = 'after'
  changesApplied.value = true
}

function bakeTextToCanvas() {
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
}

function deleteTextItem(id: string) {
  textItems.value = textItems.value.filter(i => i.id !== id)
  if (selectedTextId.value === id) selectedTextId.value = null
}

function closeEditor() {
  isCropMode.value = false
  textItems.value = []
  selectedTextId.value = null
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

.ctrl-row { display: flex; align-items: center; gap: var(--space-2); }

.ctrl-sublabel {
  font-size: 0.78rem;
  color: var(--muted);
  min-width: 68px;
  flex-shrink: 0;
}

.btn-cluster { display: flex; gap: 4px; flex-wrap: wrap; }
.btn-row { display: flex; gap: var(--space-2); }

/* ── Text section ────────────────────────────────────────── */
.text-add-btn {
  margin-left: auto;
}

.ctrl-subheader {
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--accent);
  margin-top: var(--space-1);
}

.ctrl-textarea {
  width: 100%;
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  background: var(--bg);
  color: var(--text);
  font-size: 0.875rem;
  resize: vertical;
  font-family: inherit;
  box-sizing: border-box;
  transition: border-color 0.15s;
  min-height: 60px;
}
.ctrl-textarea:focus { outline: none; border-color: var(--accent); }

.ctrl-select-sm {
  flex: 1;
  min-width: 0;
  font-size: 0.8rem;
}

.color-input {
  width: 36px;
  height: 28px;
  padding: 2px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  background: var(--bg);
  cursor: pointer;
}

.text-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.text-list-item {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: 5px var(--space-3);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  background: var(--bg);
  color: var(--text);
  font-size: 0.8rem;
  cursor: pointer;
  text-align: left;
  transition: all 0.15s;
}
.text-list-item:hover { border-color: var(--accent); }
.text-list-item i { color: var(--muted); flex-shrink: 0; }

.text-list-preview {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.text-hint {
  font-size: 0.78rem;
  color: var(--muted);
  display: flex;
  align-items: flex-start;
  gap: 6px;
  margin: 0;
}
.text-hint i { color: var(--accent); flex-shrink: 0; margin-top: 1px; }

/* ── Filter sliders ──────────────────────────────────────── */
.filter-row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.filter-label {
  font-size: 0.78rem;
  color: var(--muted);
  min-width: 84px;
  flex-shrink: 0;
}

.filter-slider-wrap {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex: 1;
  min-width: 0;
}

.filter-slider {
  flex: 1;
  height: 4px;
  -webkit-appearance: none;
  appearance: none;
  border-radius: 2px;
  background: var(--border-color);
  outline: none;
  cursor: pointer;
  min-width: 0;
}

.filter-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--accent);
  cursor: pointer;
  box-shadow: 0 1px 4px rgba(0,0,0,0.2);
}

.filter-slider::-moz-range-thumb {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--accent);
  cursor: pointer;
  border: none;
}

.filter-value {
  font-size: 0.73rem;
  color: var(--muted);
  min-width: 38px;
  text-align: right;
  font-variant-numeric: tabular-nums;
  flex-shrink: 0;
}

/* Size row */
.size-row { display: flex; align-items: center; gap: 6px; }

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
.btn-swap-leave-active { transition: opacity 0.15s ease, transform 0.15s ease; }
.btn-swap-enter-from { opacity: 0; transform: translateY(4px); }
.btn-swap-leave-to { opacity: 0; transform: translateY(-4px); }

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
  .size-row { flex-wrap: wrap; }
}

@media (max-width: 480px) {
  .modal-overlay { padding: 0; }
  .modal-container { height: 100dvh; border-radius: 0; }
}
</style>
