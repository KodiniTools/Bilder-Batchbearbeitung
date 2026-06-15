<template>
  <div class="ctrl-section">
    <div class="ctrl-header">
      <i class="fa-solid fa-crop-simple"></i>
      {{ t('imageEditor.sections.crop') }}
    </div>
    <div v-if="!isCropMode">
      <button type="button" class="btn btn-sm" @click="emit('start')">
        <i class="fa-solid fa-crop-simple"></i>
        {{ t('imageEditor.crop.start') }}
      </button>
    </div>
    <template v-else>
      <div class="ctrl-row">
        <span class="ctrl-sublabel">{{ t('imageEditor.crop.ratio') }}</span>
        <div class="btn-cluster">
          <button
            v-for="preset in cropPresets"
            :key="preset.label"
            type="button"
            class="btn btn-xs"
            :class="{ 'btn-active': cropLockedRatio === preset.ratio }"
            @click="emit('set-ratio', preset.ratio)"
          >{{ preset.label }}</button>
        </div>
      </div>
      <div class="btn-row">
        <button type="button" class="btn btn-sm btn-primary" @click="emit('apply')">
          <i class="fa-solid fa-check"></i>
          {{ t('imageEditor.crop.apply') }}
        </button>
        <button type="button" class="btn btn-sm" @click="emit('cancel')">
          {{ t('imageEditor.crop.cancel') }}
        </button>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

interface CropPreset {
  label: string
  ratio: number | null
}

defineProps<{
  isCropMode: boolean
  cropLockedRatio: number | null
  cropPresets: ReadonlyArray<CropPreset>
}>()

const emit = defineEmits<{
  start: []
  apply: []
  cancel: []
  'set-ratio': [ratio: number | null]
}>()
</script>

<style scoped>
@import './editor-shared.css';
</style>
