<template>
  <div class="transform-subsection">
    <!-- Aktivieren -->
    <div class="checkbox-group">
      <label class="checkbox-label">
        <input v-model="enabled" type="checkbox" />
        <span>{{ t('batchEdit.watermark.enable') }}</span>
      </label>
    </div>

    <template v-if="watermark.enabled">
      <!-- Text -->
      <div class="property-group">
        <label>{{ t('batchEdit.watermark.text') }}</label>
        <input
          v-model="text"
          type="text"
          :placeholder="t('batchEdit.watermark.textPlaceholder')"
          class="text-input"
        />
      </div>

      <!-- Schriftart -->
      <div class="property-group">
        <label>{{ t('batchEdit.watermark.fontFamily') }}</label>
        <select v-model="fontFamily" class="property-select font-select">
          <option
            v-for="font in CUSTOM_FONT_FAMILIES"
            :key="font"
            :value="font"
            :style="{ fontFamily: font }"
          >
            {{ font }}
          </option>
        </select>
      </div>

      <!-- Schriftgröße -->
      <SliderRow
        v-model="fontSize"
        :label="t('batchEdit.watermark.fontSize')"
        :min="10"
        :max="200"
        :default="48"
        unit="px"
        :reset-title="t('batchEdit.resetSlider')"
      />

      <!-- Fett / Kursiv -->
      <div class="style-toggles">
        <button
          class="style-toggle-btn"
          type="button"
          :class="{ active: watermark.bold }"
          :title="t('batchEdit.watermark.bold')"
          @click="bold = !bold"
        >
          <i class="fa-solid fa-bold"></i>
        </button>
        <button
          class="style-toggle-btn"
          type="button"
          :class="{ active: watermark.italic }"
          :title="t('batchEdit.watermark.italic')"
          @click="italic = !italic"
        >
          <i class="fa-solid fa-italic"></i>
        </button>
      </div>

      <!-- Farbe -->
      <div class="color-group">
        <label>{{ t('batchEdit.watermark.color') }}</label>
        <div class="color-input-wrapper">
          <input v-model="color" type="color" />
          <span class="color-value">{{ watermark.color }}</span>
        </div>
      </div>

      <!-- Deckkraft -->
      <SliderRow
        v-model="opacity"
        :label="t('batchEdit.watermark.opacity')"
        :min="0"
        :max="100"
        :default="50"
        unit="%"
        :reset-title="t('batchEdit.resetSlider')"
      />

      <!-- Drehung -->
      <SliderRow
        v-model="rotation"
        :label="t('batchEdit.watermark.rotation')"
        :min="-180"
        :max="180"
        :default="-30"
        unit="°"
        :reset-title="t('batchEdit.resetSlider')"
      />

      <!-- Position -->
      <div class="property-group">
        <label>{{ t('batchEdit.watermark.position') }}</label>
        <select v-model="position" class="property-select">
          <option v-for="pos in watermarkPositions" :key="pos.value" :value="pos.value">
            {{ t(pos.labelKey) }}
          </option>
        </select>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { WatermarkSettings } from '@/lib/core/types'
import { CUSTOM_FONT_FAMILIES } from '../FrontPageDesigner.vue'
import SliderRow from '../SliderRow.vue'

const { t } = useI18n()

const props = defineProps<{
  watermark: WatermarkSettings
}>()

const emit = defineEmits<{
  /** Neues Wasserzeichen-Objekt (Prop wird nie direkt mutiert) */
  'update:watermark': [watermark: WatermarkSettings]
}>()

/** Schreibbarer Proxy für ein Feld: liest aus dem Prop, schreibt per Emit */
function field<K extends keyof WatermarkSettings>(key: K) {
  return computed<WatermarkSettings[K]>({
    get: () => props.watermark[key],
    set: (value) => emit('update:watermark', { ...props.watermark, [key]: value }),
  })
}

const enabled = field('enabled')
const text = field('text')
const fontFamily = field('fontFamily')
const fontSize = field('fontSize')
const bold = field('bold')
const italic = field('italic')
const color = field('color')
const opacity = field('opacity')
const rotation = field('rotation')
const position = field('position')

const watermarkPositions: ReadonlyArray<{
  value: WatermarkSettings['position']
  labelKey: string
}> = [
  { value: 'center', labelKey: 'batchEdit.watermark.positions.center' },
  { value: 'top-left', labelKey: 'batchEdit.watermark.positions.topLeft' },
  { value: 'top-right', labelKey: 'batchEdit.watermark.positions.topRight' },
  { value: 'bottom-left', labelKey: 'batchEdit.watermark.positions.bottomLeft' },
  { value: 'bottom-right', labelKey: 'batchEdit.watermark.positions.bottomRight' },
  { value: 'tile', labelKey: 'batchEdit.watermark.positions.tile' },
]
</script>

<style scoped>
@import './batch-edit-shared.css';

.property-group {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.property-group label {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text);
}

.text-input {
  width: 100%;
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  background: var(--bg);
  color: var(--text);
  font-size: 0.875rem;
  transition: border-color 0.2s ease;
}

.text-input:focus {
  outline: none;
  border-color: var(--accent);
}

.text-input::placeholder {
  color: var(--muted);
}

.property-select {
  width: 100%;
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  background: var(--bg);
  color: var(--text);
  font-size: 0.875rem;
  cursor: pointer;
}

.property-select:focus {
  outline: none;
  border-color: var(--accent);
}

.font-select option {
  padding: var(--space-2);
}

.style-toggles {
  display: flex;
  gap: var(--space-2);
}

.style-toggle-btn {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  background: var(--btn);
  color: var(--muted);
  cursor: pointer;
  transition: all 0.2s var(--ease-smooth);
}

.style-toggle-btn:hover {
  background: var(--btn-hover);
  border-color: var(--accent);
  color: var(--text);
}

.style-toggle-btn.active {
  background: color-mix(in oklab, var(--accent) 20%, transparent);
  border-color: var(--accent);
  color: var(--accent);
}
</style>
