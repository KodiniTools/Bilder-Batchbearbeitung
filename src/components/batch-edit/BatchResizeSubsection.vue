<template>
  <div class="transform-subsection">
    <h4>
      <i class="fa-solid fa-up-right-and-down-left-from-center"></i>
      {{ t('batchEdit.transforms.resize.title') }}
    </h4>
    <div
      class="resize-modes"
      role="radiogroup"
      :aria-label="t('batchEdit.transforms.resize.modeLabel')"
    >
      <label
        v-for="m in RESIZE_MODES"
        :key="m"
        class="resize-mode"
        :class="{ 'resize-mode--active': mode === m }"
      >
        <input
          type="radio"
          name="batch-resize-mode"
          class="resize-mode__input"
          :value="m"
          :checked="mode === m"
          :disabled="isApplying"
          @change="emit('update:mode', m)"
        />
        {{ t(`batchEdit.transforms.resize.modes.${m}`) }}
      </label>
    </div>
    <p class="resize-hint">{{ t(`batchEdit.transforms.resize.modeHints.${mode}`) }}</p>

    <div v-if="mode === 'exact' || mode === 'fit'" class="resize-inputs">
      <div class="resize-field">
        <label for="batch-resize-width">
          {{
            t(
              mode === 'fit'
                ? 'batchEdit.transforms.resize.maxWidth'
                : 'batchEdit.transforms.resize.width'
            )
          }}
        </label>
        <NumberSpinner
          id="batch-resize-width"
          :model-value="width"
          :min="1"
          :max="RESIZE_PX_MAX"
          unit="px"
          fluid
          :disabled="isApplying"
          @update:model-value="onWidthUpdate"
        />
      </div>
      <div v-if="mode === 'exact'" class="resize-link-icon" :class="{ active: keepAspect }">
        <i class="fa-solid fa-link"></i>
      </div>
      <div class="resize-field">
        <label for="batch-resize-height">
          {{
            t(
              mode === 'fit'
                ? 'batchEdit.transforms.resize.maxHeight'
                : 'batchEdit.transforms.resize.height'
            )
          }}
        </label>
        <NumberSpinner
          id="batch-resize-height"
          :model-value="height"
          :min="1"
          :max="RESIZE_PX_MAX"
          unit="px"
          fluid
          :disabled="isApplying"
          @update:model-value="onHeightUpdate"
        />
      </div>
    </div>

    <div v-else-if="mode === 'percent'" class="resize-field">
      <label for="batch-resize-percent">{{ t('batchEdit.transforms.resize.percent') }}</label>
      <NumberSpinner
        id="batch-resize-percent"
        :model-value="percent"
        :min="RESIZE_PERCENT_MIN"
        :max="RESIZE_PERCENT_MAX"
        unit="%"
        fluid
        :disabled="isApplying"
        @update:model-value="emit('update:percent', $event)"
      />
    </div>

    <div v-else class="resize-field">
      <label for="batch-resize-long-edge">{{ t('batchEdit.transforms.resize.longEdge') }}</label>
      <NumberSpinner
        id="batch-resize-long-edge"
        :model-value="longEdge"
        :min="1"
        :max="RESIZE_PX_MAX"
        unit="px"
        fluid
        :disabled="isApplying"
        @update:model-value="emit('update:longEdge', $event)"
      />
    </div>

    <div class="checkbox-group">
      <label v-if="mode === 'exact'" class="checkbox-label">
        <input
          type="checkbox"
          :checked="keepAspect"
          :disabled="isApplying"
          @change="onKeepAspectInput"
        />
        <span>{{ t('batchEdit.transforms.resize.keepAspect') }}</span>
      </label>
      <label v-else-if="mode === 'fit' || mode === 'longEdge'" class="checkbox-label">
        <input
          type="checkbox"
          :checked="noUpscale"
          :disabled="isApplying"
          @change="emit('update:noUpscale', ($event.target as HTMLInputElement).checked)"
        />
        <span>{{ t('batchEdit.transforms.resize.noUpscale') }}</span>
      </label>
    </div>

    <p v-if="preview" class="resize-preview">
      <i class="fa-solid fa-circle-info" aria-hidden="true"></i>
      <span v-if="preview.to">
        {{
          t('batchEdit.transforms.resize.preview', {
            from: `${preview.from.width} × ${preview.from.height}`,
            to: `${preview.to.width} × ${preview.to.height}`,
          })
        }}
      </span>
      <span v-else>
        {{
          t('batchEdit.transforms.resize.previewUnchanged', {
            size: `${preview.from.width} × ${preview.from.height}`,
          })
        }}
      </span>
    </p>
    <div class="resize-actions">
      <button
        class="btn btn-apply-resize"
        type="button"
        :disabled="!canApply"
        :aria-busy="isApplying"
        @click="emit('apply')"
      >
        <i :class="isApplying ? 'fa-solid fa-spinner fa-spin' : 'fa-solid fa-check'"></i>
        {{
          isApplying
            ? t('batchEdit.transforms.resize.applying', {
                current: progressCurrent,
                total: progressTotal,
              })
            : t('batchEdit.transforms.resize.apply')
        }}
      </button>
      <button
        class="btn-history btn-reset btn-history--full"
        type="button"
        :disabled="!canUndo"
        :title="t('batchEdit.transforms.resize.undoTitle')"
        @click="emit('undo')"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M3 7v6h6" />
          <path d="M3 13C5.33 7.5 10 4 16 4a9 9 0 0 1 0 18H8" />
        </svg>
        {{ t('batchEdit.transforms.resize.undo') }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import NumberSpinner from '../NumberSpinner.vue'
import {
  RESIZE_MODES,
  RESIZE_PERCENT_MAX,
  RESIZE_PERCENT_MIN,
  RESIZE_PX_MAX,
  type ResizeMode,
  type Size,
} from '@/lib/core/resize-modes'

const { t } = useI18n()

defineProps<{
  width: number
  height: number
  keepAspect: boolean
  mode: ResizeMode
  percent: number
  longEdge: number
  noUpscale: boolean
  /** Ergebnis für das erste ausgewählte Bild; to = null: bleibt unverändert */
  preview: { from: Size; to: Size | null } | null
  canApply: boolean
  /** Größenänderung läuft: Spinner zeigen, Eingaben sperren */
  isApplying: boolean
  progressCurrent: number
  progressTotal: number
  /** Letzte Größenänderung ist noch der jüngste Historienschritt */
  canUndo: boolean
}>()

const emit = defineEmits<{
  'update:width': [value: number]
  'update:height': [value: number]
  'update:keepAspect': [value: boolean]
  'update:mode': [value: ResizeMode]
  'update:percent': [value: number]
  'update:longEdge': [value: number]
  'update:noUpscale': [value: boolean]
  /** Nach der Wertänderung: Parent leitet ggf. die andere Seite ab */
  'width-change': []
  'height-change': []
  'keep-aspect-change': []
  apply: []
  undo: []
}>()

// Reihenfolge ist wichtig: erst Wert übernehmen, dann Kopplungslogik auslösen
function onWidthUpdate(value: number) {
  emit('update:width', value)
  emit('width-change')
}

function onHeightUpdate(value: number) {
  emit('update:height', value)
  emit('height-change')
}

function onKeepAspectInput(event: Event) {
  emit('update:keepAspect', (event.target as HTMLInputElement).checked)
  emit('keep-aspect-change')
}
</script>

<style scoped>
@import './batch-edit-shared.css';

.resize-inputs {
  display: flex;
  align-items: flex-end;
  gap: var(--space-2);
}

.resize-field {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.resize-field label {
  font-size: 0.8rem;
  font-weight: 500;
  color: var(--muted);
}

.resize-link-icon {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--muted);
  font-size: 0.7rem;
  margin-bottom: 4px;
  opacity: 0.4;
  transition: all 0.2s ease;
}

.resize-link-icon.active {
  color: var(--accent);
  opacity: 1;
}

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

.resize-preview {
  margin: 0;
  display: flex;
  align-items: baseline;
  gap: var(--ds-space-2);
  font-size: var(--ds-text-xs);
  color: var(--ds-text-2);
}

.resize-preview i {
  color: var(--ds-accent);
}

.resize-actions {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.btn-apply-resize {
  width: 100%;
  padding: var(--space-2) var(--space-3);
  background: color-mix(in oklab, var(--accent) 15%, transparent);
  color: var(--accent);
  border: 1px solid color-mix(in oklab, var(--accent) 30%, transparent);
  border-radius: var(--radius-md);
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  transition: all 0.2s var(--ease-smooth);
}

.btn-apply-resize:hover:not(:disabled) {
  background: color-mix(in oklab, var(--accent) 25%, transparent);
  border-color: var(--accent);
}

.btn-apply-resize:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-apply-resize[aria-busy='true'] {
  opacity: 0.85;
  cursor: progress;
}
</style>
