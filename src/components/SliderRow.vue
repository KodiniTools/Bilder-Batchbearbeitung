<script setup lang="ts">
import { computed } from 'vue'
import NumberSpinner from './NumberSpinner.vue'

/**
 * Regler im Visualizer-Muster: Label oben, darunter eine Zeile aus
 * Verlaufsspur, Zahlen-Spinner und Reset-Button (↺). Der Reset-Button ist am
 * Standardwert deaktiviert; ohne `default` gibt es keinen.
 */
const props = withDefaults(
  defineProps<{
    modelValue: number
    label: string
    min: number
    max: number
    /** Neutraler Wert für den Reset-Button; ohne Angabe kein Reset-Button */
    default?: number
    icon?: string
    step?: number
    unit?: string
    resetTitle?: string
    disabled?: boolean
    /** id des Reglers, damit ein äußeres <label for> daran binden kann */
    id?: string
  }>(),
  {
    default: undefined,
    icon: '',
    step: 1,
    unit: '',
    resetTitle: '',
    disabled: false,
    id: undefined,
  }
)

const emit = defineEmits<{
  'update:modelValue': [value: number]
}>()

const hasDefault = computed(() => typeof props.default === 'number')
const isModified = computed(() => hasDefault.value && props.modelValue !== props.default)

// Bereiche um null (z. B. −100…100) zeigen den Nullpunkt mittig.
const centered = computed(() => props.min < 0 && props.max > 0)

const resetLabel = computed(() => {
  const value = `${props.default}${props.unit}`
  return props.resetTitle ? `${props.resetTitle} (${value})` : value
})

function clamp(value: number): number {
  return Math.min(props.max, Math.max(props.min, value))
}

function emitValue(v: number) {
  emit('update:modelValue', v)
}

// Range slider: immer strikt geklemmt (kann keine ungültigen Werte liefern)
function onRangeInput(event: Event) {
  const v = Number((event.target as HTMLInputElement).value)
  if (!Number.isNaN(v)) emitValue(clamp(v))
}

function resetValue() {
  if (hasDefault.value && isModified.value) emitValue(props.default as number)
}
</script>

<template>
  <div class="slider-group" :class="{ 'is-modified': isModified, 'is-disabled': disabled }">
    <label class="slider-head" :for="id">
      <i v-if="icon" :class="['fa-solid', icon]"></i>
      <span class="slider-name" :title="label">{{ label }}</span>
    </label>

    <div class="slider-row">
      <input
        :id="id"
        class="slider"
        :class="{ 'slider--center': centered }"
        type="range"
        :min="min"
        :max="max"
        :step="step"
        :value="modelValue"
        :disabled="disabled"
        :aria-label="label"
        @input="onRangeInput"
      />

      <NumberSpinner
        :model-value="modelValue"
        :min="min"
        :max="max"
        :step="step"
        :unit="unit"
        :fallback="props.default"
        :disabled="disabled"
        @update:model-value="emitValue"
      />

      <button
        v-if="hasDefault"
        type="button"
        class="btn-reset-slider"
        :title="resetLabel"
        :aria-label="resetLabel"
        :disabled="disabled || !isModified"
        @click="resetValue"
      >
        ↺
      </button>
    </div>
  </div>
</template>

<style scoped>
/* Label oben, darunter eine Zeile: Regler · Spinner · Reset */
.slider-group {
  display: flex;
  flex-direction: column;
  gap: 5px;
  min-width: 0;
}

.slider-group.is-disabled {
  opacity: 0.55;
}

.slider-head {
  display: flex;
  align-items: center;
  gap: 5px;
  min-width: 0;
  margin: 0;
  font-size: 0.65rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--control-muted);
}

.slider-head > i {
  width: 12px;
  font-size: 0.7rem;
  text-align: center;
  flex-shrink: 0;
}

.slider-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.slider-group.is-modified .slider-head > i {
  color: var(--accent);
}

.slider-row {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

/* Dünne Verlaufsspur, kleiner Thumb mit weißem Rand */
.slider {
  flex: 1 1 auto;
  min-width: 0;
  height: 3px;
  margin: 0;
  -webkit-appearance: none;
  appearance: none;
  border-radius: 2px;
  background: var(--ds-border-strong);
  cursor: pointer;
  touch-action: none;
  outline: none;
}

.slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--slider-thumb);
  border: 2px solid var(--ds-surface-1);
  cursor: pointer;
  transition: transform 0.15s ease;
}

.slider::-moz-range-thumb {
  width: 12px;
  height: 12px;
  box-sizing: border-box;
  border-radius: 50%;
  background: var(--slider-thumb);
  border: 2px solid var(--ds-surface-1);
  cursor: pointer;
}

.slider::-moz-range-track {
  background: transparent;
}

.slider:focus-visible {
  box-shadow: var(--ds-focus-ring);
}

.slider:disabled {
  cursor: not-allowed;
}

.btn-reset-slider {
  flex: none;
  width: 22px;
  height: 22px;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--control-bg);
  border: 1px solid var(--control-border);
  border-radius: 4px;
  color: var(--control-muted);
  font-size: 0.8rem;
  line-height: 1;
  cursor: pointer;
  transition:
    color 0.15s ease,
    border-color 0.15s ease;
}

.btn-reset-slider:hover:not(:disabled) {
  color: var(--color-gold);
  border-color: var(--color-gold);
}

.btn-reset-slider:focus-visible {
  outline: 2px solid var(--color-gold);
  outline-offset: 1px;
}

.btn-reset-slider:disabled {
  opacity: 0.35;
  cursor: default;
}

/* Touch: größerer Thumb und Reset */
@media (max-width: 768px) {
  .slider::-webkit-slider-thumb {
    width: 20px;
    height: 20px;
  }

  .slider::-moz-range-thumb {
    width: 20px;
    height: 20px;
  }

  .btn-reset-slider {
    width: 28px;
    height: 28px;
    font-size: 0.95rem;
  }
}
</style>
