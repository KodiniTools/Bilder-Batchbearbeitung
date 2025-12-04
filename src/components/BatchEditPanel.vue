<script setup lang="ts">
import { ref, watch, computed, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useImageStore } from '@/stores/imageStore'
import { useToast } from '@/composables/useToast'
import { defaultFilters } from '@/lib/core/types'
import type { ImageFilters } from '@/lib/core/types'

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

// Debounce timer
let debounceTimer: ReturnType<typeof setTimeout> | null = null

// Reset filters when panel opens
watch(() => props.isOpen, (open) => {
  if (open) {
    filters.value = { ...defaultFilters }
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

// Cleanup on unmount
onUnmounted(() => {
  if (debounceTimer) {
    clearTimeout(debounceTimer)
  }
})

// Computed for disabled state
const hasSelection = computed(() => imageStore.hasSelection)
const selectedCount = computed(() => imageStore.selectedCount)

// Reset single slider and apply
function resetSlider(key: keyof ImageFilters, defaultValue: number) {
  filters.value[key] = defaultValue
}

// Reset all filters
function resetFilters() {
  filters.value = { ...defaultFilters }
  imageStore.resetFiltersForSelectedImages()
  toast.success(t('batchEdit.toast.reset', { count: selectedCount.value }))
}

// Close panel
function close() {
  emit('close')
}

// Filter slider config
const sliderConfig = [
  { key: 'brightness', icon: 'fa-sun', min: 0, max: 200, default: 100 },
  { key: 'contrast', icon: 'fa-circle-half-stroke', min: 0, max: 200, default: 100 },
  { key: 'saturation', icon: 'fa-droplet', min: 0, max: 200, default: 100 },
  { key: 'hue', icon: 'fa-palette', min: 0, max: 360, default: 0 },
  { key: 'opacity', icon: 'fa-eye', min: 0, max: 100, default: 100 },
  { key: 'blur', icon: 'fa-water', min: 0, max: 20, default: 0 }
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
        <button class="btn-close" @click="close" :title="t('buttons.close')">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>

      <div class="panel-info">
        <i class="fa-solid fa-images"></i>
        <span>{{ t('batchEdit.selectedCount', { count: selectedCount }) }}</span>
      </div>

      <div class="panel-content">
        <div class="sliders-container">
          <div
            v-for="slider in sliderConfig"
            :key="slider.key"
            class="slider-group"
          >
            <label class="slider-label">
              <i :class="['fa-solid', slider.icon]"></i>
              <span>{{ t(`batchEdit.filters.${slider.key}`) }}</span>
              <span class="slider-value">{{ filters[slider.key] }}{{ slider.key === 'hue' ? '°' : slider.key === 'blur' ? 'px' : '%' }}</span>
            </label>
            <div class="slider-wrapper">
              <input
                type="range"
                :min="slider.min"
                :max="slider.max"
                v-model.number="filters[slider.key]"
                class="slider"
                :style="{
                  '--progress': `${((filters[slider.key] - slider.min) / (slider.max - slider.min)) * 100}%`
                }"
              />
              <button
                class="btn-reset-slider"
                @click="resetSlider(slider.key, slider.default)"
                :title="t('batchEdit.resetSlider')"
                :class="{ 'is-visible': filters[slider.key] !== slider.default }"
              >
                <i class="fa-solid fa-rotate-left"></i>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="panel-footer">
        <button
          class="btn btn-reset-all"
          @click="resetFilters"
          :disabled="!hasSelection"
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

.sliders-container {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.slider-group {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.slider-label {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text);
}

.slider-label i {
  width: 18px;
  text-align: center;
  color: var(--muted);
}

.slider-label .slider-value {
  margin-left: auto;
  font-family: 'SF Mono', Monaco, monospace;
  font-size: 0.8rem;
  color: var(--accent);
  background: color-mix(in oklab, var(--accent) 10%, transparent);
  padding: 2px 8px;
  border-radius: var(--radius-sm);
  width: 60px;
  min-width: 60px;
  text-align: center;
  flex-shrink: 0;
}

.slider-wrapper {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.slider {
  flex: 1;
  -webkit-appearance: none;
  appearance: none;
  height: 6px;
  border-radius: 3px;
  background: linear-gradient(
    to right,
    var(--accent) 0%,
    var(--accent) var(--progress, 50%),
    var(--border-color) var(--progress, 50%),
    var(--border-color) 100%
  );
  cursor: pointer;
  touch-action: none;
}

.slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--accent);
  border: 3px solid var(--panel);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
  cursor: grab;
}

.slider::-webkit-slider-thumb:active {
  cursor: grabbing;
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.25);
}

.slider::-moz-range-thumb {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--accent);
  border: 3px solid var(--panel);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
  cursor: grab;
}

.slider::-moz-range-thumb:active {
  cursor: grabbing;
}

.btn-reset-slider {
  width: 24px;
  height: 24px;
  min-width: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  color: transparent;
  border-radius: var(--radius-sm);
  cursor: default;
  font-size: 0.7rem;
  pointer-events: none;
  transition: opacity 0.15s ease, background 0.15s ease, color 0.15s ease;
  opacity: 0;
}

.btn-reset-slider.is-visible {
  background: color-mix(in oklab, var(--muted) 15%, transparent);
  color: var(--muted);
  cursor: pointer;
  pointer-events: auto;
  opacity: 1;
}

.btn-reset-slider.is-visible:hover {
  background: color-mix(in oklab, var(--accent) 20%, transparent);
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
