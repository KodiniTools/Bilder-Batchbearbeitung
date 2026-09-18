<template>
  <div class="preset-block">
    <span class="preset-label">{{ t('batchEdit.presets.label') }}</span>
    <div class="preset-chips">
      <button
        v-for="preset in presets"
        :key="preset.key"
        type="button"
        class="preset-chip"
        @click="emit('preset', preset.key)"
      >
        {{ t(`batchEdit.presets.${preset.key}`) }}
      </button>
    </div>
  </div>

  <div class="section-divider"></div>

  <div class="sliders-container">
    <SliderRow
      v-for="slider in sliderConfig"
      :key="slider.key"
      :model-value="filters[slider.key]"
      :label="t(`batchEdit.filters.${slider.key}`)"
      :icon="slider.icon"
      :min="slider.min"
      :max="slider.max"
      :default="slider.default"
      :unit="slider.unit"
      :reset-title="t('batchEdit.resetSlider')"
      @update:model-value="setFilter(slider.key, $event)"
    />
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { ImageFilters } from '@/lib/core/types'
import type { FilterPreset } from '@/lib/core/filter-presets'
import SliderRow from '../SliderRow.vue'

const { t } = useI18n()

const props = defineProps<{
  filters: ImageFilters
  presets: ReadonlyArray<FilterPreset>
}>()

const emit = defineEmits<{
  /** Neues Filter-Objekt (Prop wird nie direkt mutiert) */
  'update:filters': [filters: ImageFilters]
  /** Preset-Key eines One-Click-Looks */
  preset: [key: string]
}>()

function setFilter(key: keyof ImageFilters, value: number) {
  emit('update:filters', { ...props.filters, [key]: value })
}

interface SliderConfig {
  key: keyof ImageFilters
  icon: string
  min: number
  max: number
  default: number
  unit: string
}

const sliderConfig: ReadonlyArray<SliderConfig> = [
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
  { key: 'invert', icon: 'fa-right-left', min: 0, max: 100, default: 0, unit: '%' },
]
</script>

<style scoped>
@import './batch-edit-shared.css';

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
</style>
