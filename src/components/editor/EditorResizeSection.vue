<template>
  <div class="ctrl-section">
    <div class="ctrl-header">
      <i class="fa-solid fa-expand"></i>
      {{ t('imageEditor.sections.resize') }}
    </div>
    <div class="size-row">
      <label class="size-label" for="resizeWidth">B</label>
      <input
        id="resizeWidth"
        type="number"
        class="size-input"
        min="1"
        max="5000"
        :value="resizeWidth"
        @input="onWidthInput"
      >
      <span class="size-unit">px</span>
      <button
        type="button"
        class="link-btn"
        :class="{ active: keepAspectRatio }"
        :title="t('imageEditor.resize.keepAspectRatio')"
        @click="emit('update:keepAspectRatio', !keepAspectRatio)"
      >
        <i :class="keepAspectRatio ? 'fa-solid fa-link' : 'fa-solid fa-link-slash'"></i>
      </button>
      <label class="size-label" for="resizeHeight">H</label>
      <input
        id="resizeHeight"
        type="number"
        class="size-input"
        min="1"
        max="5000"
        :value="resizeHeight"
        @input="onHeightInput"
      >
      <span class="size-unit">px</span>
    </div>
    <button type="button" class="btn btn-xs btn-ghost" @click="emit('reset-size')">
      <i class="fa-solid fa-arrow-rotate-left"></i>
      {{ t('imageEditor.resize.resetSize') }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

defineProps<{
  resizeWidth: number
  resizeHeight: number
  keepAspectRatio: boolean
}>()

const emit = defineEmits<{
  'update:resizeWidth': [v: number]
  'update:resizeHeight': [v: number]
  'update:keepAspectRatio': [v: boolean]
  'width-change': []
  'height-change': []
  'reset-size': []
}>()

function onWidthInput(event: Event) {
  emit('update:resizeWidth', Number((event.target as HTMLInputElement).value))
  emit('width-change')
}

function onHeightInput(event: Event) {
  emit('update:resizeHeight', Number((event.target as HTMLInputElement).value))
  emit('height-change')
}
</script>

<style scoped>
@import './editor-shared.css';
</style>
