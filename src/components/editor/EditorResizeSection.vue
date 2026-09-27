<template>
  <div class="ctrl-section">
    <div class="ctrl-header">
      <i class="fa-solid fa-expand"></i>
      {{ t('imageEditor.sections.resize') }}
    </div>
    <div class="size-row">
      <label class="size-label" for="resizeWidth">B</label>
      <NumberSpinner
        id="resizeWidth"
        :model-value="resizeWidth"
        :min="1"
        :max="5000"
        unit="px"
        @update:model-value="onWidthInput"
      />
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
      <NumberSpinner
        id="resizeHeight"
        :model-value="resizeHeight"
        :min="1"
        :max="5000"
        unit="px"
        @update:model-value="onHeightInput"
      />
    </div>
    <button type="button" class="btn-history btn-reset" @click="emit('reset-size')">
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
        <path d="M3 3v5h5" />
      </svg>
      {{ t('imageEditor.resize.resetSize') }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import NumberSpinner from '../NumberSpinner.vue'

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

function onWidthInput(value: number) {
  emit('update:resizeWidth', value)
  emit('width-change')
}

function onHeightInput(value: number) {
  emit('update:resizeHeight', value)
  emit('height-change')
}
</script>

<style scoped>
@import './editor-shared.css';
</style>
