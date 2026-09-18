<template>
  <div class="transform-subsection">
    <h4>
      <i class="fa-solid fa-up-right-and-down-left-from-center"></i>
      {{ t('batchEdit.transforms.resize.title') }}
    </h4>
    <div class="resize-inputs">
      <div class="resize-field">
        <label for="batch-resize-width">{{ t('batchEdit.transforms.resize.width') }}</label>
        <div class="resize-input-wrapper">
          <input
            id="batch-resize-width"
            type="number"
            min="1"
            max="10000"
            class="resize-input"
            :value="width"
            :disabled="isApplying"
            @input="onWidthInput"
          />
          <span class="resize-unit">px</span>
        </div>
      </div>
      <div class="resize-link-icon" :class="{ active: keepAspect }">
        <i class="fa-solid fa-link"></i>
      </div>
      <div class="resize-field">
        <label for="batch-resize-height">{{ t('batchEdit.transforms.resize.height') }}</label>
        <div class="resize-input-wrapper">
          <input
            id="batch-resize-height"
            type="number"
            min="1"
            max="10000"
            class="resize-input"
            :value="height"
            :disabled="isApplying"
            @input="onHeightInput"
          />
          <span class="resize-unit">px</span>
        </div>
      </div>
    </div>
    <div class="checkbox-group">
      <label class="checkbox-label">
        <input
          type="checkbox"
          :checked="keepAspect"
          :disabled="isApplying"
          @change="onKeepAspectInput"
        />
        <span>{{ t('batchEdit.transforms.resize.keepAspect') }}</span>
      </label>
    </div>
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
        class="btn btn-undo-resize"
        type="button"
        :disabled="!canUndo"
        :title="t('batchEdit.transforms.resize.undoTitle')"
        @click="emit('undo')"
      >
        <i class="fa-solid fa-rotate-left"></i>
        {{ t('batchEdit.transforms.resize.undo') }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

defineProps<{
  width: number
  height: number
  keepAspect: boolean
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
  /** Nach der Wertänderung: Parent leitet ggf. die andere Seite ab */
  'width-change': []
  'height-change': []
  'keep-aspect-change': []
  apply: []
  undo: []
}>()

// Reihenfolge ist wichtig: erst Wert übernehmen, dann Kopplungslogik auslösen
function onWidthInput(event: Event) {
  emit('update:width', Number((event.target as HTMLInputElement).value))
  emit('width-change')
}

function onHeightInput(event: Event) {
  emit('update:height', Number((event.target as HTMLInputElement).value))
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

.resize-input-wrapper {
  display: flex;
  align-items: center;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  background: var(--bg);
  overflow: hidden;
}

.resize-input {
  flex: 1;
  width: 100%;
  min-width: 0;
  padding: var(--space-2) var(--space-2);
  border: none;
  background: transparent;
  color: var(--text);
  font-size: 0.875rem;
  font-family: var(--font-mono);
  outline: none;
  -moz-appearance: textfield;
}

.resize-input::-webkit-inner-spin-button,
.resize-input::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.resize-input:focus {
  outline: none;
}

.resize-input-wrapper:focus-within {
  border-color: var(--accent);
}

.resize-unit {
  padding: 0 var(--space-2);
  font-size: 0.8rem;
  color: var(--muted);
  font-family: var(--font-mono);
  flex-shrink: 0;
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

.btn-undo-resize {
  width: 100%;
  padding: var(--space-2) var(--space-3);
  background: var(--btn);
  color: var(--text);
  border: 1px solid var(--border-color);
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

.btn-undo-resize:hover:not(:disabled) {
  background: var(--btn-hover);
  border-color: var(--accent);
  color: var(--accent);
}

.btn-undo-resize:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
