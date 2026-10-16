<template>
  <div class="ctrl-section">
    <div class="ctrl-header">
      <i class="fa-solid fa-expand"></i>
      {{ t('imageEditor.sections.resize') }}
    </div>

    <div class="resize-modes" role="radiogroup" :aria-label="t('imageEditor.resize.modeLabel')">
      <label
        v-for="m in RESIZE_MODES"
        :key="m"
        class="resize-mode"
        :class="{ 'resize-mode--active': spec.mode === m }"
      >
        <input
          type="radio"
          name="editor-resize-mode"
          class="resize-mode__input"
          :value="m"
          :checked="spec.mode === m"
          @change="updateSpec('mode', m)"
        />
        {{ t(`batchEdit.transforms.resize.modes.${m}`) }}
      </label>
    </div>
    <p class="resize-hint">{{ t(`imageEditor.resize.modeHints.${spec.mode}`) }}</p>

    <div v-if="spec.mode === 'exact'" class="size-row">
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

    <template v-else>
      <div v-if="spec.mode === 'fit'" class="resize-inputs">
        <div class="resize-field">
          <label for="editor-resize-max-width">
            {{ t('batchEdit.transforms.resize.maxWidth') }}
          </label>
          <NumberSpinner
            id="editor-resize-max-width"
            :model-value="spec.width"
            :min="1"
            :max="RESIZE_PX_MAX"
            unit="px"
            fluid
            @update:model-value="updateSpec('width', $event)"
          />
        </div>
        <div class="resize-field">
          <label for="editor-resize-max-height">
            {{ t('batchEdit.transforms.resize.maxHeight') }}
          </label>
          <NumberSpinner
            id="editor-resize-max-height"
            :model-value="spec.height"
            :min="1"
            :max="RESIZE_PX_MAX"
            unit="px"
            fluid
            @update:model-value="updateSpec('height', $event)"
          />
        </div>
      </div>

      <div v-else-if="spec.mode === 'percent'" class="resize-field">
        <label for="editor-resize-percent">{{ t('batchEdit.transforms.resize.percent') }}</label>
        <NumberSpinner
          id="editor-resize-percent"
          :model-value="spec.percent"
          :min="RESIZE_PERCENT_MIN"
          :max="RESIZE_PERCENT_MAX"
          unit="%"
          fluid
          @update:model-value="updateSpec('percent', $event)"
        />
      </div>

      <div v-else class="resize-field">
        <label for="editor-resize-long-edge">
          {{ t('batchEdit.transforms.resize.longEdge') }}
        </label>
        <NumberSpinner
          id="editor-resize-long-edge"
          :model-value="spec.longEdge"
          :min="1"
          :max="RESIZE_PX_MAX"
          unit="px"
          fluid
          @update:model-value="updateSpec('longEdge', $event)"
        />
      </div>

      <label v-if="spec.mode !== 'percent'" class="resize-check">
        <input
          type="checkbox"
          :checked="spec.noUpscale"
          @change="updateSpec('noUpscale', ($event.target as HTMLInputElement).checked)"
        />
        <span>{{ t('imageEditor.resize.noUpscale') }}</span>
      </label>

      <p class="resize-result">
        <i class="fa-solid fa-circle-info" aria-hidden="true"></i>
        <span v-if="isChanged">
          {{
            t('imageEditor.resize.result', {
              from: `${sourceWidth} × ${sourceHeight}`,
              to: `${resizeWidth} × ${resizeHeight}`,
            })
          }}
        </span>
        <span v-else>
          {{
            t('imageEditor.resize.resultUnchanged', { size: `${sourceWidth} × ${sourceHeight}` })
          }}
        </span>
      </p>
    </template>

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
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import NumberSpinner from '../NumberSpinner.vue'
import {
  RESIZE_MODES,
  RESIZE_PERCENT_MAX,
  RESIZE_PERCENT_MIN,
  RESIZE_PX_MAX,
  type ResizeSpec,
} from '@/lib/core/resize-modes'

const { t } = useI18n()

const props = defineProps<{
  /** Zielmaße, die „Anwenden“ übernimmt; in den relativen Modi vom Parent berechnet */
  resizeWidth: number
  resizeHeight: number
  keepAspectRatio: boolean
  /** Modus und Eingaben der relativen Modi; width/height gelten nur für „fit“ */
  spec: ResizeSpec
  /** Aktuelle Größe des Arbeits-Canvas, Bezug der relativen Modi */
  sourceWidth: number
  sourceHeight: number
}>()

const emit = defineEmits<{
  'update:resizeWidth': [v: number]
  'update:resizeHeight': [v: number]
  'update:keepAspectRatio': [v: boolean]
  'update:spec': [v: ResizeSpec]
  'width-change': []
  'height-change': []
  'reset-size': []
}>()

const isChanged = computed(
  () => props.resizeWidth !== props.sourceWidth || props.resizeHeight !== props.sourceHeight
)

function updateSpec<K extends keyof ResizeSpec>(key: K, value: ResizeSpec[K]) {
  emit('update:spec', { ...props.spec, [key]: value })
}

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

.resize-modes {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--ds-space-1);
}

.resize-mode {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: var(--ds-control-sm);
  padding: 0 var(--ds-space-2);
  border: var(--ds-border-width) solid var(--ds-border);
  border-radius: var(--ds-radius-sm);
  background: var(--ds-surface-0);
  color: var(--ds-text-2);
  font-size: var(--ds-text-sm);
  font-weight: var(--ds-weight-medium);
  text-align: center;
  cursor: pointer;
  transition:
    color var(--ds-duration) var(--ds-ease),
    border-color var(--ds-duration) var(--ds-ease);
}

.resize-mode:hover {
  border-color: var(--ds-accent);
  color: var(--ds-accent);
}

.resize-mode--active,
.resize-mode--active:hover {
  border-color: var(--ds-accent);
  background: var(--ds-accent);
  color: var(--ds-on-accent);
}

.resize-mode:has(.resize-mode__input:focus-visible) {
  box-shadow: var(--ds-focus-ring);
}

/* Radio nur für Tastatur und Screenreader, optisch die Kachel */
.resize-mode__input {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
  pointer-events: none;
}

.resize-hint {
  margin: 0;
  font-size: var(--ds-text-xs);
  color: var(--ds-text-3);
}

.resize-inputs {
  display: flex;
  gap: var(--space-2);
}

.resize-field {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.resize-field label {
  font-size: 0.78rem;
  font-weight: 500;
  color: var(--muted);
}

.resize-check {
  display: flex;
  align-items: flex-start;
  gap: var(--ds-space-2);
  font-size: var(--ds-text-xs);
  color: var(--ds-text-2);
  cursor: pointer;
}

.resize-check input {
  margin-top: 2px;
  accent-color: var(--ds-accent);
}

.resize-result {
  margin: 0;
  display: flex;
  align-items: baseline;
  gap: var(--ds-space-2);
  font-size: var(--ds-text-xs);
  color: var(--ds-text-2);
}

.resize-result i {
  color: var(--ds-accent);
}
</style>
