<template>
  <div v-if="element" class="properties-panel">
    <h3>{{ t('frontPageDesigner.properties.title') }}</h3>

    <div class="property-group">
      <label>{{ t('frontPageDesigner.properties.elementType') }}</label>
      <div class="property-value">
        {{ element.type === 'text' ? t('frontPageDesigner.properties.typeText') : t('frontPageDesigner.properties.typeImage') }}
      </div>
    </div>

    <template v-if="element.type === 'text'">
      <div class="property-group">
        <label>{{ t('frontPageDesigner.properties.textLabel') }}</label>
        <textarea
          v-model="element.content"
          rows="4"
          class="property-textarea"
          :placeholder="t('frontPageDesigner.canvas.emptyText')"
        ></textarea>
        <div class="inline-edit-hint">
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="16" x2="12" y2="12"></line>
            <line x1="12" y1="8" x2="12.01" y2="8"></line>
          </svg>
          {{ t('frontPageDesigner.properties.inlineEditHint') }}
        </div>
      </div>

      <div class="property-group">
        <label>{{ t('frontPageDesigner.properties.fontSize') }}</label>
        <div class="slider-group">
          <input
            v-model.number="element.fontSize"
            type="range"
            min="12"
            max="72"
            class="property-slider"
          >
          <span class="slider-value">{{ element.fontSize }}px</span>
        </div>
      </div>

      <div class="property-group">
        <label>{{ t('frontPageDesigner.properties.fontFamily') }}</label>
        <select v-model="element.fontFamily" class="property-select font-select">
          <option
            v-for="font in CUSTOM_FONT_FAMILIES"
            :key="font"
            :value="font"
            :style="{ fontFamily: font }"
          >{{ font }}</option>
        </select>
      </div>

      <div class="property-group">
        <label>{{ t('frontPageDesigner.properties.fontWeight') }}</label>
        <select v-model="element.fontWeight" class="property-select">
          <option value="normal">{{ t('frontPageDesigner.properties.fontWeightNormal') }}</option>
          <option value="bold">{{ t('frontPageDesigner.properties.fontWeightBold') }}</option>
        </select>
      </div>

      <div class="property-group">
        <label>{{ t('frontPageDesigner.properties.textAlign') }}</label>
        <div class="button-group">
          <button
            :class="{ active: element.textAlign === 'left' }"
            :title="t('frontPageDesigner.properties.textAlignLeft')"
            @click="element.textAlign = 'left'"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="17" y1="10" x2="3" y2="10"></line>
              <line x1="21" y1="6" x2="3" y2="6"></line>
              <line x1="21" y1="14" x2="3" y2="14"></line>
              <line x1="17" y1="18" x2="3" y2="18"></line>
            </svg>
          </button>
          <button
            :class="{ active: element.textAlign === 'center' }"
            :title="t('frontPageDesigner.properties.textAlignCenter')"
            @click="element.textAlign = 'center'"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="10" x2="6" y2="10"></line>
              <line x1="21" y1="6" x2="3" y2="6"></line>
              <line x1="21" y1="14" x2="3" y2="14"></line>
              <line x1="18" y1="18" x2="6" y2="18"></line>
            </svg>
          </button>
          <button
            :class="{ active: element.textAlign === 'right' }"
            :title="t('frontPageDesigner.properties.textAlignRight')"
            @click="element.textAlign = 'right'"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="21" y1="10" x2="7" y2="10"></line>
              <line x1="21" y1="6" x2="3" y2="6"></line>
              <line x1="21" y1="14" x2="3" y2="14"></line>
              <line x1="21" y1="18" x2="7" y2="18"></line>
            </svg>
          </button>
        </div>
      </div>

      <div class="property-group">
        <label>{{ t('frontPageDesigner.properties.textColor') }}</label>
        <input
          v-model="element.color"
          type="color"
          class="color-picker"
        >
      </div>
    </template>

    <template v-if="element.type === 'image'">
      <div class="property-group">
        <label>{{ t('frontPageDesigner.properties.imageSize') }}</label>
        <div class="size-inputs">
          <input
            v-model.number="element.width"
            type="number"
            min="50"
            @input="emit('maintainAspectRatio')"
          >
          <span>×</span>
          <input
            v-model.number="element.height"
            type="number"
            min="50"
          >
        </div>
      </div>
    </template>

    <div class="property-group">
      <label>{{ t('frontPageDesigner.properties.position') }}</label>
      <div class="size-inputs">
        <div>
          <small>X:</small>
          <input v-model.number="element.x" type="number" min="0">
        </div>
        <div>
          <small>Y:</small>
          <input v-model.number="element.y" type="number" min="0">
        </div>
      </div>
    </div>
  </div>

  <div v-else class="properties-panel no-selection-panel">
    <div class="no-selection-message">
      {{ t('frontPageDesigner.properties.noSelection') }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { CUSTOM_FONT_FAMILIES } from './FrontPageDesigner.vue'
import type { FrontPageElement } from './FrontPageDesigner.vue'

const { t } = useI18n()

defineProps<{
  element: FrontPageElement | undefined
}>()

const emit = defineEmits<{
  maintainAspectRatio: []
}>()
</script>

<style scoped>
.properties-panel {
  width: 280px;
  flex-shrink: 0;
  border-left: 1px solid var(--border-color);
  padding: 16px;
  overflow-y: auto;
  overflow-x: hidden;
  background: var(--bg);
  box-sizing: border-box;
}

.properties-panel h3 {
  margin: 0 0 12px 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
}

.property-group {
  margin-bottom: 14px;
}

.property-group label {
  display: block;
  margin-bottom: 4px;
  font-size: 13px;
  font-weight: 500;
  color: var(--muted);
}

.property-value {
  padding: 6px 10px;
  background: var(--panel);
  border-radius: 6px;
  font-size: 13px;
  color: var(--muted);
}

.slider-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.property-slider {
  flex: 1;
}

.slider-value {
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
  min-width: 40px;
  text-align: right;
}

.property-select {
  width: 100%;
  padding: 6px 8px;
  background: var(--panel);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  color: var(--text);
  font-size: 13px;
}

.font-select option {
  padding: 4px 8px;
  font-size: 14px;
}

.button-group {
  display: flex;
  gap: 6px;
}

.button-group button {
  flex: 1;
  padding: 6px;
  background: var(--panel);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.button-group button:hover {
  background: var(--bg);
}

.button-group button.active {
  background: var(--accent);
  color: var(--accent-text);
  border-color: var(--accent);
}

.property-textarea {
  width: 100%;
  padding: 6px 8px;
  background: var(--panel);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  color: var(--text);
  font-size: 13px;
  font-family: inherit;
  box-sizing: border-box;
  resize: vertical;
  transition: border-color 0.2s;
}

.property-textarea:focus {
  outline: none;
  border-color: var(--accent);
}

.inline-edit-hint {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 6px;
  font-size: 11px;
  color: var(--muted);
  opacity: 0.8;
}

.color-picker {
  width: 100%;
  height: 40px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  cursor: pointer;
}

.size-inputs {
  display: flex;
  align-items: center;
  gap: 6px;
}

.size-inputs input {
  width: 70px;
  padding: 6px 4px;
  background: var(--panel);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  color: var(--text);
  font-size: 13px;
  text-align: center;
  box-sizing: border-box;
}

.size-inputs > div {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
}

.size-inputs small {
  font-size: 12px;
  color: var(--muted);
}

.no-selection-panel {
  display: flex;
  align-items: center;
  justify-content: center;
}

.no-selection-message {
  text-align: center;
  color: var(--muted);
  font-size: 0.875rem;
  padding: var(--space-4);
}

@media (max-width: 1200px) {
  .properties-panel {
    width: 240px;
  }
}

@media (max-width: 768px) {
  .properties-panel {
    width: 100%;
    border-left: none;
    border-top: 1px solid var(--border-color);
    max-height: 300px;
  }
}

@media (max-width: 480px) {
  .properties-panel {
    max-height: 240px;
    padding: var(--space-3);
  }
}
</style>
