<script setup lang="ts">
import { ref, watch, computed, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useImageStore } from '@/stores/imageStore'
import { useToast } from '@/composables/useToast'
import { defaultFilters, defaultTransforms, defaultWatermark } from '@/lib/core/types'
import type { ImageFilters, ImageTransforms, WatermarkSettings } from '@/lib/core/types'
import { FILTER_PRESETS } from '@/lib/core/filter-presets'
import { CUSTOM_FONT_FAMILIES } from './FrontPageDesigner.vue'
import SliderRow from './SliderRow.vue'

const props = defineProps<{
  isOpen: boolean
}>()

const emit = defineEmits<{
  close: []
}>()

const { t } = useI18n()
const imageStore = useImageStore()
const toast = useToast()

// Local filter state
const filters = ref<ImageFilters>({ ...defaultFilters })

// Local transform state
const transforms = ref<ImageTransforms>({ ...defaultTransforms })
const transformsOpen = ref(false)

// Local resize state
const resizeWidth = ref(1920)
const resizeHeight = ref(1080)
const resizeKeepAspect = ref(true)
const resizeAspectRatio = ref(1920 / 1080)

// Local watermark state
const watermark = ref<WatermarkSettings>({ ...defaultWatermark })
const watermarkOpen = ref(false)

// Watermark position options
const watermarkPositions = [
  { value: 'center', labelKey: 'batchEdit.watermark.positions.center' },
  { value: 'top-left', labelKey: 'batchEdit.watermark.positions.topLeft' },
  { value: 'top-right', labelKey: 'batchEdit.watermark.positions.topRight' },
  { value: 'bottom-left', labelKey: 'batchEdit.watermark.positions.bottomLeft' },
  { value: 'bottom-right', labelKey: 'batchEdit.watermark.positions.bottomRight' },
  { value: 'tile', labelKey: 'batchEdit.watermark.positions.tile' }
] as const

// Debounce timers
let debounceTimer: ReturnType<typeof setTimeout> | null = null
let transformDebounceTimer: ReturnType<typeof setTimeout> | null = null
let watermarkDebounceTimer: ReturnType<typeof setTimeout> | null = null

// Reset filters, transforms, and watermark when panel opens
watch(() => props.isOpen, (open) => {
  if (open) {
    filters.value = { ...defaultFilters }
    transforms.value = { ...defaultTransforms }
    watermark.value = { ...defaultWatermark }
    initResizeFromSelection()
  }
})

// Close panel when no images are selected
watch(() => imageStore.hasSelection, (hasSelection) => {
  if (!hasSelection && props.isOpen) {
    emit('close')
  }
})

// Apply filters with debounce for smooth slider movement
function applyFiltersDebounced() {
  if (debounceTimer) {
    clearTimeout(debounceTimer)
  }
  debounceTimer = setTimeout(() => {
    if (props.isOpen && imageStore.hasSelection) {
      imageStore.applyFiltersToSelectedImages({ ...filters.value })
    }
  }, 16) // ~60fps
}

// Watch for filter changes and apply with debounce
watch(filters, () => {
  applyFiltersDebounced()
}, { deep: true })

// Apply transforms with debounce for smooth slider movement
function applyTransformsDebounced() {
  if (transformDebounceTimer) {
    clearTimeout(transformDebounceTimer)
  }
  transformDebounceTimer = setTimeout(() => {
    if (props.isOpen && imageStore.hasSelection) {
      imageStore.applyTransformsToSelectedImages({ ...transforms.value })
    }
  }, 16)
}

// Watch for transform changes and apply with debounce
watch(transforms, () => {
  applyTransformsDebounced()
}, { deep: true })

// Apply watermark with debounce
function applyWatermarkDebounced() {
  if (watermarkDebounceTimer) {
    clearTimeout(watermarkDebounceTimer)
  }
  watermarkDebounceTimer = setTimeout(() => {
    if (props.isOpen && imageStore.hasSelection) {
      imageStore.applyWatermarkToSelectedImages({ ...watermark.value })
    }
  }, 16)
}

// Watch for watermark changes and apply with debounce
watch(watermark, () => {
  applyWatermarkDebounced()
}, { deep: true })

// Cleanup on unmount
onUnmounted(() => {
  if (debounceTimer) clearTimeout(debounceTimer)
  if (transformDebounceTimer) clearTimeout(transformDebounceTimer)
  if (watermarkDebounceTimer) clearTimeout(watermarkDebounceTimer)
})

// Computed for disabled state
const hasSelection = computed(() => imageStore.hasSelection)
const selectedCount = computed(() => imageStore.selectedCount)

// Resize: Seitenverhältnis beibehalten
function onResizeWidthChange() {
  if (resizeKeepAspect.value && resizeWidth.value > 0) {
    resizeHeight.value = Math.round(resizeWidth.value / resizeAspectRatio.value)
  }
}

function onResizeHeightChange() {
  if (resizeKeepAspect.value && resizeHeight.value > 0) {
    resizeWidth.value = Math.round(resizeHeight.value * resizeAspectRatio.value)
  }
}

function onKeepAspectChange() {
  if (resizeKeepAspect.value && resizeWidth.value > 0 && resizeHeight.value > 0) {
    resizeAspectRatio.value = resizeWidth.value / resizeHeight.value
  }
}

// Resize anwenden
async function applyResize() {
  if (!hasSelection.value || resizeWidth.value <= 0 || resizeHeight.value <= 0) return
  await imageStore.resizeSelectedImages(resizeWidth.value, resizeHeight.value, resizeKeepAspect.value)
  toast.success(t('batchEdit.resize.toast', { count: selectedCount.value }))
}

// Initialisiere Resize-Werte basierend auf dem ersten ausgewählten Bild
function initResizeFromSelection() {
  const selected = imageStore.selectedImages
  if (selected.length > 0) {
    const first = selected[0]
    resizeWidth.value = first.canvas.width
    resizeHeight.value = first.canvas.height
    resizeAspectRatio.value = first.canvas.width / first.canvas.height
  }
}

// Preset (One-Click-Look) auf die Auswahl anwenden
const presets = FILTER_PRESETS
function applyPreset(presetKey: string) {
  const preset = FILTER_PRESETS.find(p => p.key === presetKey)
  if (!preset) return
  // Vollständig setzen (nicht mergen), damit der Look exakt übernommen wird.
  // Der filters-Watcher überträgt die Änderung debounced auf die Auswahl.
  filters.value = { ...defaultFilters, ...preset.filters }
}

// Reset all filters, transforms, and watermark
function resetFilters() {
  filters.value = { ...defaultFilters }
  transforms.value = { ...defaultTransforms }
  watermark.value = { ...defaultWatermark }
  imageStore.resetFiltersForSelectedImages()
  imageStore.resetTransformsForSelectedImages()
  imageStore.resetWatermarkForSelectedImages()
  toast.success(t('batchEdit.toast.reset', { count: selectedCount.value }))
}

// Close panel
function close() {
  emit('close')
}

// Filter slider config
const sliderConfig = [
  { key: 'brightness', icon: 'fa-sun', min: 0, max: 200, default: 100, unit: '%' },
  { key: 'contrast', icon: 'fa-circle-half-stroke', min: 0, max: 200, default: 100, unit: '%' },
  { key: 'saturation', icon: 'fa-droplet', min: 0, max: 200, default: 100, unit: '%' },
  { key: 'vibrance', icon: 'fa-wand-sparkles', min: -100, max: 100, default: 0, unit: '' },
  { key: 'temperature', icon: 'fa-temperature-half', min: -100, max: 100, default: 0, unit: '' },
  { key: 'hue', icon: 'fa-palette', min: 0, max: 360, default: 0, unit: '°' },
  { key: 'opacity', icon: 'fa-eye', min: 0, max: 100, default: 100, unit: '%' },
  { key: 'blur', icon: 'fa-water', min: 0, max: 20, default: 0, unit: 'px' },
  { key: 'grayscale', icon: 'fa-swatchbook', min: 0, max: 100, default: 0, unit: '%' },
  { key: 'sepia', icon: 'fa-image', min: 0, max: 100, default: 0, unit: '%' },
  { key: 'vignette', icon: 'fa-circle-dot', min: 0, max: 100, default: 0, unit: '%' },
  { key: 'invert', icon: 'fa-right-left', min: 0, max: 100, default: 0, unit: '%' }
] as const
</script>

<template>
  <Transition name="panel-slide">
    <aside v-if="isOpen" class="batch-edit-panel">
      <div class="panel-header">
        <h3>
          <i class="fa-solid fa-sliders"></i>
          {{ t('batchEdit.title') }}
        </h3>
        <button class="btn-close" :title="t('buttons.close')" @click="close">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>

      <div class="panel-info">
        <i class="fa-solid fa-images"></i>
        <span>{{ t('batchEdit.selectedCount', { count: selectedCount }) }}</span>
      </div>

      <div class="panel-content">
        <div class="preset-block">
          <span class="preset-label">{{ t('batchEdit.presets.label') }}</span>
          <div class="preset-chips">
            <button
              v-for="preset in presets"
              :key="preset.key"
              type="button"
              class="preset-chip"
              @click="applyPreset(preset.key)"
            >{{ t(`batchEdit.presets.${preset.key}`) }}</button>
          </div>
        </div>

        <div class="section-divider"></div>

        <div class="sliders-container">
          <SliderRow
            v-for="slider in sliderConfig"
            :key="slider.key"
            v-model="filters[slider.key]"
            :label="t(`batchEdit.filters.${slider.key}`)"
            :icon="slider.icon"
            :min="slider.min"
            :max="slider.max"
            :default="slider.default"
            :unit="slider.unit"
            :reset-title="t('batchEdit.resetSlider')"
          />
        </div>

        <div class="section-divider"></div>

        <button class="section-toggle" @click="transformsOpen = !transformsOpen">
          <i class="fa-solid fa-wand-magic-sparkles"></i>
          <span>{{ t('batchEdit.transforms.title') }}</span>
          <i :class="['fa-solid', transformsOpen ? 'fa-chevron-up' : 'fa-chevron-down']" class="toggle-icon"></i>
        </button>

        <div v-show="transformsOpen" class="transforms-container">
          <!-- Größe ändern -->
          <div class="transform-subsection">
            <h4>
              <i class="fa-solid fa-up-right-and-down-left-from-center"></i>
              {{ t('batchEdit.transforms.resize.title') }}
            </h4>
            <div class="resize-inputs">
              <div class="resize-field">
                <label>{{ t('batchEdit.transforms.resize.width') }}</label>
                <div class="resize-input-wrapper">
                  <input
                    v-model.number="resizeWidth"
                    type="number"
                    min="1"
                    max="10000"
                    class="resize-input"
                    @input="onResizeWidthChange"
                  />
                  <span class="resize-unit">px</span>
                </div>
              </div>
              <div class="resize-link-icon" :class="{ active: resizeKeepAspect }">
                <i class="fa-solid fa-link"></i>
              </div>
              <div class="resize-field">
                <label>{{ t('batchEdit.transforms.resize.height') }}</label>
                <div class="resize-input-wrapper">
                  <input
                    v-model.number="resizeHeight"
                    type="number"
                    min="1"
                    max="10000"
                    class="resize-input"
                    @input="onResizeHeightChange"
                  />
                  <span class="resize-unit">px</span>
                </div>
              </div>
            </div>
            <div class="checkbox-group">
              <label class="checkbox-label">
                <input
                  v-model="resizeKeepAspect"
                  type="checkbox"
                  @change="onKeepAspectChange"
                />
                <span>{{ t('batchEdit.transforms.resize.keepAspect') }}</span>
              </label>
            </div>
            <button
              class="btn btn-apply-resize"
              :disabled="!hasSelection || resizeWidth <= 0 || resizeHeight <= 0"
              @click="applyResize"
            >
              <i class="fa-solid fa-check"></i>
              {{ t('batchEdit.transforms.resize.apply') }}
            </button>
          </div>

          <!-- Bildrand -->
          <div class="transform-subsection">
            <h4>
              <i class="fa-solid fa-border-all"></i>
              {{ t('batchEdit.transforms.border.title') }}
            </h4>
            <SliderRow
              v-model="transforms.borderWidth"
              :label="t('batchEdit.transforms.border.width')"
              :min="0"
              :max="50"
              :default="0"
              unit="px"
              :reset-title="t('batchEdit.resetSlider')"
            />
            <div class="color-group">
              <label>{{ t('batchEdit.transforms.border.color') }}</label>
              <div class="color-input-wrapper">
                <input v-model="transforms.borderColor" type="color" />
                <span class="color-value">{{ transforms.borderColor }}</span>
              </div>
            </div>
          </div>

          <!-- Abgerundete Ecken -->
          <div class="transform-subsection">
            <h4>
              <i class="fa-solid fa-vector-square"></i>
              {{ t('batchEdit.transforms.corners.title') }}
            </h4>
            <SliderRow
              v-model="transforms.borderRadius"
              :label="t('batchEdit.transforms.corners.radius')"
              :min="0"
              :max="200"
              :default="0"
              unit="px"
              :reset-title="t('batchEdit.resetSlider')"
            />
          </div>

          <!-- Schatten -->
          <div class="transform-subsection">
            <h4>
              <i class="fa-solid fa-clone"></i>
              {{ t('batchEdit.transforms.shadow.title') }}
            </h4>
            <SliderRow
              v-model="transforms.shadowBlur"
              :label="t('batchEdit.transforms.shadow.blur')"
              :min="0"
              :max="50"
              :default="0"
              unit="px"
              :reset-title="t('batchEdit.resetSlider')"
            />
            <SliderRow
              v-model="transforms.shadowOpacity"
              :label="t('batchEdit.transforms.shadow.opacity')"
              :min="0"
              :max="100"
              :default="40"
              unit="%"
              :reset-title="t('batchEdit.resetSlider')"
            />
            <div class="color-group">
              <label>{{ t('batchEdit.transforms.shadow.color') }}</label>
              <div class="color-input-wrapper">
                <input v-model="transforms.shadowColor" type="color" />
                <span class="color-value">{{ transforms.shadowColor }}</span>
              </div>
            </div>
            <SliderRow
              v-model="transforms.shadowOffsetX"
              :label="t('batchEdit.transforms.shadow.offsetX')"
              :min="-25"
              :max="25"
              :default="5"
              unit="px"
              :reset-title="t('batchEdit.resetSlider')"
            />
            <SliderRow
              v-model="transforms.shadowOffsetY"
              :label="t('batchEdit.transforms.shadow.offsetY')"
              :min="-25"
              :max="25"
              :default="5"
              unit="px"
              :reset-title="t('batchEdit.resetSlider')"
            />
          </div>
        </div>

        <div class="section-divider"></div>

        <!-- Wasserzeichen -->
        <button class="section-toggle" @click="watermarkOpen = !watermarkOpen">
          <i class="fa-solid fa-stamp"></i>
          <span>{{ t('batchEdit.watermark.title') }}</span>
          <i :class="['fa-solid', watermarkOpen ? 'fa-chevron-up' : 'fa-chevron-down']" class="toggle-icon"></i>
        </button>

        <div v-show="watermarkOpen" class="transforms-container">
          <div class="transform-subsection">
            <!-- Aktivieren -->
            <div class="checkbox-group">
              <label class="checkbox-label">
                <input v-model="watermark.enabled" type="checkbox" />
                <span>{{ t('batchEdit.watermark.enable') }}</span>
              </label>
            </div>

            <template v-if="watermark.enabled">
              <!-- Text -->
              <div class="property-group">
                <label>{{ t('batchEdit.watermark.text') }}</label>
                <input
                  v-model="watermark.text"
                  type="text"
                  :placeholder="t('batchEdit.watermark.textPlaceholder')"
                  class="text-input"
                />
              </div>

              <!-- Schriftart -->
              <div class="property-group">
                <label>{{ t('batchEdit.watermark.fontFamily') }}</label>
                <select v-model="watermark.fontFamily" class="property-select font-select">
                  <option
                    v-for="font in CUSTOM_FONT_FAMILIES"
                    :key="font"
                    :value="font"
                    :style="{ fontFamily: font }"
                  >{{ font }}</option>
                </select>
              </div>

              <!-- Schriftgröße -->
              <SliderRow
                v-model="watermark.fontSize"
                :label="t('batchEdit.watermark.fontSize')"
                :min="10"
                :max="200"
                :default="48"
                unit="px"
                :reset-title="t('batchEdit.resetSlider')"
              />

              <!-- Fett / Kursiv -->
              <div class="style-toggles">
                <button
                  class="style-toggle-btn"
                  :class="{ active: watermark.bold }"
                  :title="t('batchEdit.watermark.bold')"
                  @click="watermark.bold = !watermark.bold"
                >
                  <i class="fa-solid fa-bold"></i>
                </button>
                <button
                  class="style-toggle-btn"
                  :class="{ active: watermark.italic }"
                  :title="t('batchEdit.watermark.italic')"
                  @click="watermark.italic = !watermark.italic"
                >
                  <i class="fa-solid fa-italic"></i>
                </button>
              </div>

              <!-- Farbe -->
              <div class="color-group">
                <label>{{ t('batchEdit.watermark.color') }}</label>
                <div class="color-input-wrapper">
                  <input v-model="watermark.color" type="color" />
                  <span class="color-value">{{ watermark.color }}</span>
                </div>
              </div>

              <!-- Deckkraft -->
              <SliderRow
                v-model="watermark.opacity"
                :label="t('batchEdit.watermark.opacity')"
                :min="0"
                :max="100"
                :default="50"
                unit="%"
                :reset-title="t('batchEdit.resetSlider')"
              />

              <!-- Drehung -->
              <SliderRow
                v-model="watermark.rotation"
                :label="t('batchEdit.watermark.rotation')"
                :min="-180"
                :max="180"
                :default="-30"
                unit="°"
                :reset-title="t('batchEdit.resetSlider')"
              />

              <!-- Position -->
              <div class="property-group">
                <label>{{ t('batchEdit.watermark.position') }}</label>
                <select v-model="watermark.position" class="property-select">
                  <option
                    v-for="pos in watermarkPositions"
                    :key="pos.value"
                    :value="pos.value"
                  >{{ t(pos.labelKey) }}</option>
                </select>
              </div>
            </template>
          </div>
        </div>
      </div>

      <div class="panel-footer">
        <button
          class="btn btn-reset-all"
          :disabled="!hasSelection"
          @click="resetFilters"
        >
          <i class="fa-solid fa-arrow-rotate-left"></i>
          {{ t('batchEdit.buttons.reset') }}
        </button>
      </div>
    </aside>
  </Transition>
</template>

<style scoped>
.batch-edit-panel {
  position: fixed;
  top: 0;
  left: 0;
  width: 320px;
  height: 100vh;
  background: var(--panel);
  border-right: 1px solid var(--border-color);
  box-shadow: 4px 0 24px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-4);
  border-bottom: 1px solid var(--border-color);
  background: var(--glass-bg);
  backdrop-filter: blur(10px);
}

.panel-header h3 {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text);
}

.panel-header h3 i {
  color: var(--accent);
}

.btn-close {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  color: var(--muted);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all 0.2s var(--ease-smooth);
}

.btn-close:hover {
  background: var(--btn-hover);
  color: var(--text);
}

.panel-info {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-4);
  background: color-mix(in oklab, var(--accent) 8%, transparent);
  border-bottom: 1px solid var(--border-color);
  font-size: 0.875rem;
  color: var(--accent);
  font-weight: 500;
}

.panel-content {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-4);
}

.preset-block {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.preset-label {
  font-size: 0.72rem;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-weight: 600;
}

.preset-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.preset-chip {
  padding: 5px 11px;
  border: 1px solid var(--border-color);
  border-radius: 999px;
  background: var(--bg);
  color: var(--text);
  font-size: 0.78rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s var(--ease-smooth);
}

.preset-chip:hover {
  border-color: var(--accent);
  color: var(--accent);
  transform: translateY(-1px);
}

.preset-chip:active {
  transform: translateY(0);
}

.sliders-container {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.section-divider {
  height: 1px;
  background: var(--border-color);
  margin: var(--space-2) 0;
}

.section-toggle {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  width: 100%;
  padding: var(--space-3);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  background: var(--btn);
  color: var(--text);
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s var(--ease-smooth);
}

.section-toggle:hover {
  background: var(--btn-hover);
  border-color: var(--accent);
}

.section-toggle i:first-child {
  color: var(--accent);
}

.section-toggle .toggle-icon {
  margin-left: auto;
  font-size: 0.75rem;
  color: var(--muted);
}

.transforms-container {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  margin-top: var(--space-3);
}

.transform-subsection {
  background: color-mix(in oklab, var(--bg) 50%, transparent);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: var(--space-3);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.transform-subsection h4 {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin: 0;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text);
}

.transform-subsection h4 i {
  color: var(--muted);
  width: 16px;
  text-align: center;
}

.color-group {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.color-group label {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text);
}

.color-input-wrapper {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.color-input-wrapper input[type="color"] {
  width: 36px;
  height: 28px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  cursor: pointer;
  padding: 2px;
  background: var(--bg);
}

.color-input-wrapper .color-value {
  font-family: var(--font-mono);
  font-size: 0.8rem;
  color: var(--muted);
}

.resize-inputs {
  display: flex;
  align-items: flex-end;
  gap: var(--space-2);
}

.resize-field {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.resize-field label {
  font-size: 0.8rem;
  font-weight: 500;
  color: var(--muted);
}

.resize-input-wrapper {
  display: flex;
  align-items: center;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  background: var(--bg);
  overflow: hidden;
}

.resize-input {
  flex: 1;
  width: 100%;
  min-width: 0;
  padding: var(--space-2) var(--space-2);
  border: none;
  background: transparent;
  color: var(--text);
  font-size: 0.875rem;
  font-family: var(--font-mono);
  outline: none;
  -moz-appearance: textfield;
}

.resize-input::-webkit-inner-spin-button,
.resize-input::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.resize-input:focus {
  outline: none;
}

.resize-input-wrapper:focus-within {
  border-color: var(--accent);
}

.resize-unit {
  padding: 0 var(--space-2);
  font-size: 0.8rem;
  color: var(--muted);
  font-family: var(--font-mono);
  flex-shrink: 0;
}

.resize-link-icon {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--muted);
  font-size: 0.7rem;
  margin-bottom: 4px;
  opacity: 0.4;
  transition: all 0.2s ease;
}

.resize-link-icon.active {
  color: var(--accent);
  opacity: 1;
}

.btn-apply-resize {
  width: 100%;
  padding: var(--space-2) var(--space-3);
  background: color-mix(in oklab, var(--accent) 15%, transparent);
  color: var(--accent);
  border: 1px solid color-mix(in oklab, var(--accent) 30%, transparent);
  border-radius: var(--radius-md);
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  transition: all 0.2s var(--ease-smooth);
}

.btn-apply-resize:hover:not(:disabled) {
  background: color-mix(in oklab, var(--accent) 25%, transparent);
  border-color: var(--accent);
}

.btn-apply-resize:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.checkbox-group {
  display: flex;
  align-items: center;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text);
  cursor: pointer;
}

.checkbox-label input[type="checkbox"] {
  width: 18px;
  height: 18px;
  accent-color: var(--accent);
  cursor: pointer;
}

.property-group {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.property-group label {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text);
}

.text-input {
  width: 100%;
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  background: var(--bg);
  color: var(--text);
  font-size: 0.875rem;
  transition: border-color 0.2s ease;
}

.text-input:focus {
  outline: none;
  border-color: var(--accent);
}

.text-input::placeholder {
  color: var(--muted);
}

.property-select {
  width: 100%;
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  background: var(--bg);
  color: var(--text);
  font-size: 0.875rem;
  cursor: pointer;
}

.property-select:focus {
  outline: none;
  border-color: var(--accent);
}

.font-select option {
  padding: var(--space-2);
}

.style-toggles {
  display: flex;
  gap: var(--space-2);
}

.style-toggle-btn {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  background: var(--btn);
  color: var(--muted);
  cursor: pointer;
  transition: all 0.2s var(--ease-smooth);
}

.style-toggle-btn:hover {
  background: var(--btn-hover);
  border-color: var(--accent);
  color: var(--text);
}

.style-toggle-btn.active {
  background: color-mix(in oklab, var(--accent) 20%, transparent);
  border-color: var(--accent);
  color: var(--accent);
}

.panel-footer {
  display: flex;
  gap: var(--space-2);
  padding: var(--space-4);
  border-top: 1px solid var(--border-color);
  background: var(--glass-bg);
}

.btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  padding: var(--space-3);
  border-radius: var(--radius-md);
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s var(--ease-smooth);
  border: none;
}

.btn:disabled {
  opacity: 0.5;
  pointer-events: none;
}

.btn-reset-all {
  width: 100%;
  background: var(--btn);
  color: var(--text);
  border: 1px solid var(--border-color);
}

.btn-reset-all:hover:not(:disabled) {
  background: color-mix(in oklab, var(--red) 15%, transparent);
  border-color: var(--red);
  color: var(--red);
}

/* Panel slide animation */
.panel-slide-enter-active,
.panel-slide-leave-active {
  transition: transform 0.3s var(--ease-smooth);
}

.panel-slide-enter-from,
.panel-slide-leave-to {
  transform: translateX(-100%);
}

/* Responsive */
@media (max-width: 480px) {
  .batch-edit-panel {
    width: 100%;
  }
}
</style>
