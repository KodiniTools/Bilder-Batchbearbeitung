<template>
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
          @click="emit('rotate', -90)"
        >
          <i class="fa-solid fa-rotate-left"></i> −90°
        </button>
        <button
          type="button"
          class="btn btn-icon-sm"
          :title="t('imageEditor.transformations.rotate.rotate180')"
          @click="emit('rotate', 180)"
        >180°</button>
        <button
          type="button"
          class="btn btn-icon-sm"
          :title="t('imageEditor.transformations.rotate.right90')"
          @click="emit('rotate', 90)"
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
          @click="emit('flip', 'horizontal')"
        >
          <i class="fa-solid fa-left-right"></i>
          {{ t('imageEditor.transformations.flip.horizontal') }}
        </button>
        <button
          type="button"
          class="btn btn-icon-sm"
          :title="t('imageEditor.transformations.flip.verticalTitle')"
          @click="emit('flip', 'vertical')"
        >
          <i class="fa-solid fa-up-down"></i>
          {{ t('imageEditor.transformations.flip.vertical') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const emit = defineEmits<{
  rotate: [degrees: number]
  flip: [direction: string]
}>()
</script>

<style scoped>
@import './editor-shared.css';
</style>
