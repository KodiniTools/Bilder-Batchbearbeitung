<template>
  <div class="ctrl-section">
    <div class="ctrl-header">
      <i class="fa-solid fa-sliders"></i>
      {{ t('imageEditor.sections.filters') }}
    </div>

    <div v-if="presets && presets.length" class="preset-block">
      <span class="preset-label">{{ t('imageEditor.presets.label') }}</span>
      <div class="preset-chips">
        <button
          v-for="preset in presets"
          :key="preset.key"
          type="button"
          class="preset-chip"
          @click="emit('preset', preset.key)"
        >{{ t(`imageEditor.presets.${preset.key}`) }}</button>
      </div>
    </div>

    <div
      v-for="fd in filterDefs"
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
          :value="(localFilters as Record<string, number>)[fd.key]"
          @input="emit('filter-input', fd.key, $event)"
        >
        <span class="filter-value">{{ (localFilters as Record<string, number>)[fd.key] }}{{ fd.unit }}</span>
      </div>
    </div>
    <button type="button" class="btn btn-xs btn-ghost" @click="emit('reset')">
      <i class="fa-solid fa-arrow-rotate-left"></i>
      {{ t('imageEditor.filters.reset') }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { ImageFilters } from '@/lib/core/types'

const { t } = useI18n()

interface FilterDef {
  key: string
  min: number
  max: number
  step: number
  unit: string
}

interface FilterPreset {
  key: string
  filters: Partial<ImageFilters>
}

defineProps<{
  localFilters: ImageFilters
  filterDefs: FilterDef[]
  presets?: ReadonlyArray<FilterPreset>
}>()

const emit = defineEmits<{
  'filter-input': [key: string, event: Event]
  preset: [key: string]
  reset: []
}>()
</script>

<style scoped>
@import './editor-shared.css';

.preset-block {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: var(--space-2);
}

.preset-label {
  font-size: 0.72rem;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.preset-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

.preset-chip {
  padding: 4px 10px;
  border: 1px solid var(--border-color);
  border-radius: 999px;
  background: var(--bg);
  color: var(--text);
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;
}

.preset-chip:hover {
  border-color: var(--accent);
  color: var(--accent);
  transform: translateY(-1px);
}

.preset-chip:active {
  transform: translateY(0);
}
</style>
