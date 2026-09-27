<template>
  <div v-if="element" class="properties-section">
    <h3>{{ t('commentPageDesigner.properties.title') }}</h3>

    <div class="property-group">
      <label>{{ t('commentPageDesigner.properties.elementType') }}</label>
      <div class="property-value">
        {{
          element.type === 'text'
            ? t('commentPageDesigner.properties.typeText')
            : t('commentPageDesigner.properties.typeImage')
        }}
      </div>
    </div>

    <!-- Text Properties -->
    <template v-if="element.type === 'text'">
      <div class="property-group">
        <label for="text-content">{{ t('commentPageDesigner.properties.textLabel') }}</label>
        <textarea
          id="text-content"
          v-model="content"
          rows="4"
          :placeholder="t('commentPageDesigner.properties.textPlaceholder')"
        ></textarea>
        <div class="inline-edit-hint">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="16" x2="12" y2="12"></line>
            <line x1="12" y1="8" x2="12.01" y2="8"></line>
          </svg>
          {{ t('commentPageDesigner.properties.inlineEditHint') }}
        </div>
      </div>

      <div class="property-group">
        <label>{{ t('commentPageDesigner.properties.fontFamily') }}</label>
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

      <div class="property-group">
        <SliderRow
          id="font-size"
          :model-value="fontSize ?? 10"
          :label="t('commentPageDesigner.properties.fontSize')"
          :min="10"
          :max="72"
          unit="px"
          @update:model-value="fontSize = $event"
        />
      </div>

      <div class="property-group">
        <label for="text-color">{{ t('commentPageDesigner.properties.textColor') }}</label>
        <input id="text-color" v-model="color" type="color" />
      </div>

      <div class="property-group">
        <label>{{ t('commentPageDesigner.properties.textAlignment') }}</label>
        <div class="align-buttons">
          <button
            :class="{ active: element.align === 'left' }"
            :title="t('commentPageDesigner.properties.alignLeft')"
            @click="align = 'left'"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <line x1="17" y1="10" x2="3" y2="10"></line>
              <line x1="21" y1="6" x2="3" y2="6"></line>
              <line x1="21" y1="14" x2="3" y2="14"></line>
              <line x1="17" y1="18" x2="3" y2="18"></line>
            </svg>
          </button>
          <button
            :class="{ active: element.align === 'center' }"
            :title="t('commentPageDesigner.properties.alignCenter')"
            @click="align = 'center'"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <line x1="18" y1="10" x2="6" y2="10"></line>
              <line x1="21" y1="6" x2="3" y2="6"></line>
              <line x1="21" y1="14" x2="3" y2="14"></line>
              <line x1="18" y1="18" x2="6" y2="18"></line>
            </svg>
          </button>
          <button
            :class="{ active: element.align === 'right' }"
            :title="t('commentPageDesigner.properties.alignRight')"
            @click="align = 'right'"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <line x1="21" y1="10" x2="7" y2="10"></line>
              <line x1="21" y1="6" x2="3" y2="6"></line>
              <line x1="21" y1="14" x2="3" y2="14"></line>
              <line x1="21" y1="18" x2="7" y2="18"></line>
            </svg>
          </button>
        </div>
      </div>

      <div class="property-group">
        <label>
          <input v-model="bold" type="checkbox" />
          {{ t('commentPageDesigner.properties.bold') }}
        </label>
        <label>
          <input v-model="italic" type="checkbox" />
          {{ t('commentPageDesigner.properties.italic') }}
        </label>
      </div>

      <div class="property-group">
        <SliderRow
          id="text-width"
          :model-value="width ?? 80"
          :label="t('commentPageDesigner.properties.width')"
          :min="80"
          :max="pageWidth"
          :step="10"
          unit="px"
          @update:model-value="width = $event"
        />
      </div>

      <div class="property-group">
        <SliderRow
          id="text-height"
          :model-value="height ?? 30"
          :label="t('commentPageDesigner.properties.height')"
          :min="30"
          :max="pageHeight"
          :step="10"
          unit="px"
          @update:model-value="height = $event"
        />
      </div>
    </template>

    <!-- Image Properties -->
    <template v-if="element.type === 'image'">
      <div class="property-group">
        <SliderRow
          id="img-width"
          :model-value="width ?? 50"
          :label="t('commentPageDesigner.properties.width')"
          :min="50"
          :max="500"
          :step="10"
          unit="px"
          @update:model-value="width = $event"
        />
      </div>

      <div class="property-group">
        <SliderRow
          id="img-opacity"
          :model-value="opacityPercent"
          :label="t('commentPageDesigner.properties.opacity')"
          :min="10"
          :max="100"
          :step="10"
          unit="%"
          @update:model-value="opacityPercent = $event"
        />
      </div>
    </template>

    <!-- Position -->
    <div class="property-group">
      <label>{{ t('commentPageDesigner.properties.position') }}</label>
      <div class="position-inputs">
        <div>
          <span>X:</span>
          <input v-model.number="x" type="number" min="0" :max="pageWidth" step="1" />
          px
        </div>
        <div>
          <span>Y:</span>
          <input v-model.number="y" type="number" min="0" :max="pageHeight" step="1" />
          px
        </div>
      </div>
    </div>

    <!-- Z-Index (Layer) -->
    <div class="property-group">
      <label>{{ t('commentPageDesigner.properties.layer') }}</label>
      <div class="layer-buttons">
        <button
          :title="t('commentPageDesigner.properties.toFrontTooltip')"
          @click="emit('moveToFront')"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <polyline points="18 15 12 9 6 15"></polyline>
          </svg>
          {{ t('commentPageDesigner.properties.toFrontButton') }}
        </button>
        <button
          :title="t('commentPageDesigner.properties.toBackTooltip')"
          @click="emit('moveToBack')"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
          {{ t('commentPageDesigner.properties.toBackButton') }}
        </button>
      </div>
    </div>

    <!-- Delete Button -->
    <button class="delete-element-btn" @click="emit('delete')">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      >
        <polyline points="3 6 5 6 21 6"></polyline>
        <path
          d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
        ></path>
      </svg>
      {{ t('commentPageDesigner.properties.deleteElement') }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import SliderRow from '../SliderRow.vue'
import { CUSTOM_FONT_FAMILIES } from '../FrontPageDesigner.vue'
import type { CanvasElement } from '@/lib/features/export-pdf'

const { t } = useI18n()

const props = defineProps<{
  element: CanvasElement | null
  pageWidth: number
  pageHeight: number
}>()

const emit = defineEmits<{
  /** Teil-Patch für das ausgewählte Element; der Parent wendet ihn an (kein Prop-Mutating) */
  update: [patch: Partial<CanvasElement>]
  moveToFront: []
  moveToBack: []
  delete: []
}>()

/** Schreibbarer Proxy für ein Element-Feld: liest aus dem Prop, schreibt per update-Emit */
function field<K extends keyof CanvasElement>(key: K) {
  return computed<CanvasElement[K] | undefined>({
    get: () => props.element?.[key],
    set: (value) => emit('update', { [key]: value } as Partial<CanvasElement>),
  })
}

const content = field('content')
const fontFamily = field('fontFamily')
const fontSize = field('fontSize')
const color = field('color')
const align = field('align')
const bold = field('bold')
const italic = field('italic')
const width = field('width')
const height = field('height')
const opacity = field('opacity')
/** Deckkraft (0.1–1) als Prozent für den Regler */
const opacityPercent = computed({
  get: () => Math.round((opacity.value ?? 1) * 100),
  set: (value: number) => {
    opacity.value = value / 100
  },
})
const x = field('x')
const y = field('y')
</script>

<style scoped>
.properties-section {
  background: var(--bg);
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 1px 3px var(--shadow-color);
  border: 1px solid var(--border-color);
}

.properties-section h3 {
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
  margin: 0 0 12px 0;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--border-color);
}

.property-group {
  margin-bottom: 16px;
}

.property-group:last-child {
  margin-bottom: 0;
}

.property-group label {
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: var(--muted);
  margin-bottom: 6px;
}

.property-value {
  padding: 8px 12px;
  background: var(--panel);
  border-radius: 6px;
  font-size: 13px;
  color: var(--text);
}

.property-select {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--panel);
  color: var(--text);
  font-size: 13px;
  cursor: pointer;
  transition: border-color 0.2s;
}

.property-select:focus {
  outline: none;
  border-color: var(--accent);
}

.font-select option {
  padding: 4px 8px;
  font-size: 14px;
}

.property-group textarea,
.property-group input[type='number'] {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  font-size: 13px;
  font-family: inherit;
  background: var(--panel);
  color: var(--text);
  transition: border-color 0.2s;
}

.property-group textarea:focus,
.property-group input[type='number']:focus {
  outline: none;
  border-color: var(--accent);
}

.property-group input[type='color'] {
  width: 100%;
  height: 40px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  cursor: pointer;
}

.align-buttons,
.layer-buttons {
  display: flex;
  gap: 6px;
}

.align-buttons button,
.layer-buttons button {
  flex: 1;
  padding: 8px;
  border: 1px solid var(--border-color);
  background: var(--panel);
  color: var(--text);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  font-size: 12px;
}

.align-buttons button:hover,
.layer-buttons button:hover {
  background: var(--bg);
  border-color: var(--accent);
}

.align-buttons button.active {
  background: var(--accent);
  color: var(--accent-text);
  border-color: var(--accent);
}

.property-group label input[type='checkbox'] {
  margin-right: 6px;
}

.delete-element-btn {
  width: 100%;
  padding: 10px 16px;
  background: color-mix(in oklab, var(--red) 15%, var(--bg));
  border: 1px solid color-mix(in oklab, var(--red) 40%, var(--border-color));
  color: var(--red);
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: 16px;
}

.delete-element-btn:hover {
  background: color-mix(in oklab, var(--red) 25%, var(--bg));
  border-color: var(--red);
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

.position-inputs {
  display: flex;
  gap: 12px;
}

.position-inputs > div {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
}

.position-inputs input {
  width: 70px;
}
</style>
