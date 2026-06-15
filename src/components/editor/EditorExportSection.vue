<template>
  <div class="ctrl-section">
    <div class="ctrl-header">
      <i class="fa-solid fa-file-export"></i>
      {{ t('imageEditor.sections.export') }}
    </div>
    <div class="export-row">
      <select
        id="exportFormat"
        class="ctrl-select"
        :value="selectedFormat"
        @change="emit('update:selectedFormat', ($event.target as HTMLSelectElement).value)"
      >
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
        @click="emit('download')"
      >
        <i :class="isDownloading ? 'fa-solid fa-spinner fa-spin' : 'fa-solid fa-download'"></i>
        {{ isDownloading ? t('imageEditor.export.downloading') : t('imageEditor.export.downloadButton') }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { ImageFormat } from '@/lib/core/types'

const { t } = useI18n()

defineProps<{
  availableFormats: ImageFormat[]
  selectedFormat: string
  isDownloading: boolean
}>()

const emit = defineEmits<{
  'update:selectedFormat': [v: string]
  download: []
}>()
</script>

<style scoped>
@import './editor-shared.css';
</style>
