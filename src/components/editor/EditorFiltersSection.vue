<template>
  <div class="ctrl-section">
    <div class="ctrl-header">
      <i class="fa-solid fa-sliders"></i>
      {{ t('imageEditor.sections.filters') }}
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

defineProps<{
  localFilters: ImageFilters
  filterDefs: FilterDef[]
}>()

const emit = defineEmits<{
  'filter-input': [key: string, event: Event]
  reset: []
}>()
</script>

<style scoped>
@import './editor-shared.css';
</style>
