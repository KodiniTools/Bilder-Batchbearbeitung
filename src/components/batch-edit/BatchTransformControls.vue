<template>
  <!-- Bildrand -->
  <div class="transform-subsection">
    <h4>
      <i class="fa-solid fa-border-all"></i>
      {{ t('batchEdit.transforms.border.title') }}
    </h4>
    <SliderRow
      v-model="borderWidth"
      :label="t('batchEdit.transforms.border.width')"
      :min="0"
      :max="50"
      :default="0"
      unit="px"
      :reset-title="t('batchEdit.resetSlider')"
    />
    <div class="color-group">
      <label>{{ t('batchEdit.transforms.border.color') }}</label>
      <div class="color-input-wrapper">
        <input v-model="borderColor" type="color" />
        <span class="color-value">{{ transforms.borderColor }}</span>
      </div>
    </div>
  </div>

  <!-- Abgerundete Ecken -->
  <div class="transform-subsection">
    <h4>
      <i class="fa-solid fa-vector-square"></i>
      {{ t('batchEdit.transforms.corners.title') }}
    </h4>
    <SliderRow
      v-model="borderRadius"
      :label="t('batchEdit.transforms.corners.radius')"
      :min="0"
      :max="200"
      :default="0"
      unit="px"
      :reset-title="t('batchEdit.resetSlider')"
    />
  </div>

  <!-- Schatten -->
  <div class="transform-subsection">
    <h4>
      <i class="fa-solid fa-clone"></i>
      {{ t('batchEdit.transforms.shadow.title') }}
    </h4>
    <SliderRow
      v-model="shadowBlur"
      :label="t('batchEdit.transforms.shadow.blur')"
      :min="0"
      :max="50"
      :default="0"
      unit="px"
      :reset-title="t('batchEdit.resetSlider')"
    />
    <SliderRow
      v-model="shadowOpacity"
      :label="t('batchEdit.transforms.shadow.opacity')"
      :min="0"
      :max="100"
      :default="40"
      unit="%"
      :reset-title="t('batchEdit.resetSlider')"
    />
    <div class="color-group">
      <label>{{ t('batchEdit.transforms.shadow.color') }}</label>
      <div class="color-input-wrapper">
        <input v-model="shadowColor" type="color" />
        <span class="color-value">{{ transforms.shadowColor }}</span>
      </div>
    </div>
    <SliderRow
      v-model="shadowOffsetX"
      :label="t('batchEdit.transforms.shadow.offsetX')"
      :min="-25"
      :max="25"
      :default="5"
      unit="px"
      :reset-title="t('batchEdit.resetSlider')"
    />
    <SliderRow
      v-model="shadowOffsetY"
      :label="t('batchEdit.transforms.shadow.offsetY')"
      :min="-25"
      :max="25"
      :default="5"
      unit="px"
      :reset-title="t('batchEdit.resetSlider')"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { ImageTransforms } from '@/lib/core/types'
import SliderRow from '../SliderRow.vue'

const { t } = useI18n()

const props = defineProps<{
  transforms: ImageTransforms
}>()

const emit = defineEmits<{
  /** Neues Transform-Objekt (Prop wird nie direkt mutiert) */
  'update:transforms': [transforms: ImageTransforms]
}>()

/** Schreibbarer Proxy für ein Feld: liest aus dem Prop, schreibt per Emit */
function field<K extends keyof ImageTransforms>(key: K) {
  return computed<ImageTransforms[K]>({
    get: () => props.transforms[key],
    set: (value) => emit('update:transforms', { ...props.transforms, [key]: value }),
  })
}

const borderWidth = field('borderWidth')
const borderColor = field('borderColor')
const borderRadius = field('borderRadius')
const shadowBlur = field('shadowBlur')
const shadowOpacity = field('shadowOpacity')
const shadowColor = field('shadowColor')
const shadowOffsetX = field('shadowOffsetX')
const shadowOffsetY = field('shadowOffsetY')
</script>

<style scoped>
@import './batch-edit-shared.css';
</style>
