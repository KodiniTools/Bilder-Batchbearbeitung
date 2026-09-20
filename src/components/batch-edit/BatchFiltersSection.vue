<template>
  <!-- One-Click-Looks -->
  <div class="preset-block">
    <span class="block-label">{{ t('batchEdit.presets.label') }}</span>
    <div class="preset-grid">
      <button
        v-for="preset in presets"
        :key="preset.key"
        type="button"
        class="preset-chip"
        :class="{ active: preset.key === activePreset }"
        :aria-pressed="preset.key === activePreset"
        @click="emit('preset', preset.key)"
      >
        {{ t(`batchEdit.presets.${preset.key}`) }}
      </button>
    </div>
  </div>

  <!-- Regler, thematisch gruppiert -->
  <div v-for="group in sliderGroups" :key="group.key" class="filter-group">
    <div class="filter-group__head">
      <i :class="['fa-solid', group.icon]"></i>
      <span class="block-label">{{ t(`batchEdit.groups.${group.key}`) }}</span>
    </div>
    <div class="filter-group__body">
      <SliderRow
        v-for="slider in group.sliders"
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
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { ImageFilters } from '@/lib/core/types'
import type { FilterPreset } from '@/lib/core/filter-presets'
import SliderRow from '../SliderRow.vue'

const { t } = useI18n()

const props = withDefaults(
  defineProps<{
    filters: ImageFilters
    presets: ReadonlyArray<FilterPreset>
    /** Key des Presets, das dem aktuellen Filtersatz exakt entspricht */
    activePreset?: string | null
  }>(),
  { activePreset: null }
)

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

interface SliderGroup {
  key: 'light' | 'color' | 'effects'
  icon: string
  sliders: ReadonlyArray<SliderConfig>
}

const sliderGroups: ReadonlyArray<SliderGroup> = [
  {
    key: 'light',
    icon: 'fa-sun',
    sliders: [
      { key: 'brightness', icon: 'fa-sun', min: 0, max: 200, default: 100, unit: '%' },
      { key: 'contrast', icon: 'fa-circle-half-stroke', min: 0, max: 200, default: 100, unit: '%' },
    ],
  },
  {
    key: 'color',
    icon: 'fa-palette',
    sliders: [
      { key: 'saturation', icon: 'fa-droplet', min: 0, max: 200, default: 100, unit: '%' },
      { key: 'vibrance', icon: 'fa-wand-sparkles', min: -100, max: 100, default: 0, unit: '' },
      {
        key: 'temperature',
        icon: 'fa-temperature-half',
        min: -100,
        max: 100,
        default: 0,
        unit: '',
      },
      { key: 'hue', icon: 'fa-palette', min: 0, max: 360, default: 0, unit: '°' },
    ],
  },
  {
    key: 'effects',
    icon: 'fa-wand-magic-sparkles',
    sliders: [
      { key: 'opacity', icon: 'fa-eye', min: 0, max: 100, default: 100, unit: '%' },
      { key: 'blur', icon: 'fa-water', min: 0, max: 20, default: 0, unit: 'px' },
      { key: 'grayscale', icon: 'fa-swatchbook', min: 0, max: 100, default: 0, unit: '%' },
      { key: 'sepia', icon: 'fa-image', min: 0, max: 100, default: 0, unit: '%' },
      { key: 'vignette', icon: 'fa-circle-dot', min: 0, max: 100, default: 0, unit: '%' },
      { key: 'invert', icon: 'fa-right-left', min: 0, max: 100, default: 0, unit: '%' },
    ],
  },
]
</script>

<style scoped>
@import './batch-edit-shared.css';

.block-label {
  font-size: 0.72rem;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-weight: 600;
}

.preset-block {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.preset-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 6px;
}

.preset-chip {
  padding: 7px 6px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  background: var(--bg);
  color: var(--text);
  font-size: 0.78rem;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
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

.preset-chip.active {
  background: color-mix(in oklab, var(--accent) 14%, transparent);
  border-color: var(--accent);
  color: var(--accent);
  font-weight: 600;
}

/* Gruppen-Karten */
.filter-group {
  background: color-mix(in oklab, var(--bg) 50%, transparent);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: var(--space-3);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.filter-group__head {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.filter-group__head i {
  width: 16px;
  text-align: center;
  font-size: 0.75rem;
  color: var(--accent);
}

.filter-group__body {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
</style>
