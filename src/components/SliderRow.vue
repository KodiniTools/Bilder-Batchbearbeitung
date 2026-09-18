<script setup lang="ts">
import { computed } from 'vue'
import NumberSpinner from './NumberSpinner.vue'

const props = withDefaults(
  defineProps<{
    modelValue: number
    label: string
    min: number
    max: number
    default: number
    icon?: string
    step?: number
    unit?: string
    resetTitle?: string
  }>(),
  {
    icon: '',
    step: 1,
    unit: '',
    resetTitle: '',
  }
)

const emit = defineEmits<{
  'update:modelValue': [value: number]
}>()

const progress = computed(() => {
  const range = props.max - props.min
  if (range <= 0) return 0
  return ((props.modelValue - props.min) / range) * 100
})

const isModified = computed(() => props.modelValue !== props.default)

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
  emitValue(props.default)
}
</script>

<template>
  <div class="slider-group">
    <div class="slider-head">
      <i v-if="icon" :class="['fa-solid', icon]"></i>
      <span class="slider-name" :title="label">{{ label }}</span>
    </div>

    <input
      class="slider"
      type="range"
      :min="min"
      :max="max"
      :step="step"
      :value="modelValue"
      :style="{ '--progress': `${progress}%` }"
      @input="onRangeInput"
    />

    <div class="slider-controls">
      <NumberSpinner
        :model-value="modelValue"
        :min="min"
        :max="max"
        :step="step"
        :unit="unit"
        :fallback="props.default"
        @update:model-value="emitValue"
      />

      <button
        class="btn-reset-slider"
        :title="resetTitle"
        :class="{ 'is-visible': isModified }"
        @click="resetValue"
      >
        <i class="fa-solid fa-rotate-left"></i>
      </button>
    </div>
  </div>
</template>

<style scoped>
/* Alles in einer Reihe: Label · Slider · Spinner · Reset.
   Der kurze Slider lässt Platz für Spinner und Reset-Button. */
.slider-group {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.slider-head {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text);
  /* darf schrumpfen (Ellipsis) statt den Slider zu verdrängen */
  flex: 0 1 auto;
  min-width: 0;
}

.slider-head > i {
  width: 16px;
  text-align: center;
  color: var(--muted);
  flex-shrink: 0;
}

.slider-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Spinner + Reset-Button; der Reset-Slot ist immer reserviert,
   sodass bei Aktivierung Leerraum für den Button vorhanden ist. */
.slider-controls {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-shrink: 0;
}

.btn-reset-slider {
  width: 24px;
  height: 24px;
  min-width: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  color: transparent;
  border-radius: var(--radius-sm);
  cursor: default;
  font-size: 0.7rem;
  pointer-events: none;
  transition:
    opacity 0.15s ease,
    background 0.15s ease,
    color 0.15s ease;
  opacity: 0;
}

.btn-reset-slider.is-visible {
  background: color-mix(in oklab, var(--muted) 15%, transparent);
  color: var(--muted);
  cursor: pointer;
  pointer-events: auto;
  opacity: 1;
}

.btn-reset-slider.is-visible:hover {
  background: color-mix(in oklab, var(--accent) 20%, transparent);
  color: var(--accent);
}

.slider {
  flex: 1 1 44px;
  min-width: 44px;
  -webkit-appearance: none;
  appearance: none;
  height: 6px;
  border-radius: 3px;
  background: linear-gradient(
    to right,
    var(--accent) 0%,
    var(--accent) var(--progress, 50%),
    var(--border-color) var(--progress, 50%),
    var(--border-color) 100%
  );
  cursor: pointer;
  touch-action: none;
}

.slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--accent);
  border: 3px solid var(--panel);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
  cursor: grab;
}

.slider::-webkit-slider-thumb:active {
  cursor: grabbing;
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.25);
}

.slider::-moz-range-thumb {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--accent);
  border: 3px solid var(--panel);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
  cursor: grab;
}

.slider::-moz-range-thumb:active {
  cursor: grabbing;
}
</style>
