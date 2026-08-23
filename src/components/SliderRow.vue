<script setup lang="ts">
import { computed, onUnmounted } from 'vue'

const props = withDefaults(defineProps<{
  modelValue: number
  label: string
  min: number
  max: number
  default: number
  icon?: string
  step?: number
  unit?: string
  resetTitle?: string
}>(), {
  icon: '',
  step: 1,
  unit: '',
  resetTitle: '',
})

const emit = defineEmits<{
  'update:modelValue': [value: number]
}>()

const progress = computed(() => {
  const range = props.max - props.min
  if (range <= 0) return 0
  return ((props.modelValue - props.min) / range) * 100
})

const isModified = computed(() => props.modelValue !== props.default)

function clamp(value: number, clampLow = true): number {
  let v = value
  if (v > props.max) v = props.max
  if (clampLow && v < props.min) v = props.min
  return v
}

function emitValue(v: number) {
  emit('update:modelValue', v)
}

// Range slider: immer strikt geklemmt (kann keine ungültigen Werte liefern)
function onRangeInput(event: Event) {
  const v = Number((event.target as HTMLInputElement).value)
  if (!Number.isNaN(v)) emitValue(clamp(v))
}

// Spinner-Eingabe: obere Grenze sofort, untere erst bei Blur, damit z.B.
// negative Werte (Minus-Zeichen) noch eingetippt werden können.
function onSpinnerInput(event: Event) {
  const raw = (event.target as HTMLInputElement).value
  if (raw === '' || raw === '-') return
  const v = Number(raw)
  if (!Number.isNaN(v)) emitValue(clamp(v, false))
}

function onSpinnerChange(event: Event) {
  const v = Number((event.target as HTMLInputElement).value)
  emitValue(Number.isNaN(v) ? props.default : clamp(v))
}

function stepBy(direction: 1 | -1) {
  emitValue(clamp(props.modelValue + direction * props.step))
}

// Press-and-hold: erst eine Verzögerung, dann fortlaufende Schritte,
// die mit der Haltezeit leicht beschleunigen.
let holdTimeout: ReturnType<typeof setTimeout> | null = null
let holdInterval: ReturnType<typeof setInterval> | null = null

function stopHold() {
  if (holdTimeout) { clearTimeout(holdTimeout); holdTimeout = null }
  if (holdInterval) { clearInterval(holdInterval); holdInterval = null }
  window.removeEventListener('mouseup', stopHold)
  window.removeEventListener('touchend', stopHold)
  window.removeEventListener('touchcancel', stopHold)
}

function startHold(direction: 1 | -1, event: Event) {
  // Nur primäre Maustaste; bei Touch verhindern wir das nachgelagerte Klick-Event
  if (event instanceof MouseEvent && event.button !== 0) return
  if (event.type === 'touchstart') event.preventDefault()

  stopHold()
  stepBy(direction)

  window.addEventListener('mouseup', stopHold)
  window.addEventListener('touchend', stopHold)
  window.addEventListener('touchcancel', stopHold)

  holdTimeout = setTimeout(() => {
    let delay = 90
    const tick = () => {
      // An der Grenze anhalten
      if ((direction === 1 && props.modelValue >= props.max) ||
          (direction === -1 && props.modelValue <= props.min)) {
        stopHold()
        return
      }
      stepBy(direction)
      // sanft beschleunigen bis min. 30ms
      if (delay > 30) {
        delay = Math.max(30, delay - 8)
        if (holdInterval) clearInterval(holdInterval)
        holdInterval = setInterval(tick, delay)
      }
    }
    holdInterval = setInterval(tick, delay)
  }, 350)
}

function resetValue() {
  emitValue(props.default)
}

onUnmounted(stopHold)
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
      <div class="num-spinner">
        <input
          class="spin-input"
          type="number"
          :min="min"
          :max="max"
          :step="step"
          :value="modelValue"
          @input="onSpinnerInput"
          @change="onSpinnerChange"
        />
        <span v-if="unit" class="spin-unit">{{ unit }}</span>
        <div class="spin-buttons">
          <button
            type="button"
            class="spin-btn"
            tabindex="-1"
            :disabled="modelValue >= max"
            @mousedown="startHold(1, $event)"
            @touchstart.prevent="startHold(1, $event)"
          >
            <i class="fa-solid fa-chevron-up"></i>
          </button>
          <button
            type="button"
            class="spin-btn"
            tabindex="-1"
            :disabled="modelValue <= min"
            @mousedown="startHold(-1, $event)"
            @touchstart.prevent="startHold(-1, $event)"
          >
            <i class="fa-solid fa-chevron-down"></i>
          </button>
        </div>
      </div>

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

.num-spinner {
  display: flex;
  align-items: center;
  gap: 1px;
  height: 26px;
  padding: 0 2px 0 5px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  background: var(--bg);
  transition: border-color 0.15s ease;
  flex-shrink: 0;
}

.num-spinner:focus-within {
  border-color: var(--accent);
}

.spin-input {
  width: 30px;
  border: none;
  background: transparent;
  color: var(--accent);
  font-family: var(--font-mono);
  font-size: 0.8rem;
  text-align: right;
  outline: none;
  padding: 0;
  -moz-appearance: textfield;
  appearance: textfield;
}

.spin-input::-webkit-inner-spin-button,
.spin-input::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.spin-unit {
  font-family: var(--font-mono);
  font-size: 0.72rem;
  color: var(--muted);
  flex-shrink: 0;
}

.spin-buttons {
  display: flex;
  flex-direction: column;
  justify-content: center;
  flex-shrink: 0;
}

.spin-btn {
  width: 16px;
  height: 11px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  color: var(--muted);
  cursor: pointer;
  padding: 0;
  font-size: 0.5rem;
  border-radius: 2px;
  transition: color 0.15s ease, background 0.15s ease;
}

.spin-btn:hover:not(:disabled) {
  color: var(--accent);
  background: color-mix(in oklab, var(--accent) 15%, transparent);
}

.spin-btn:disabled {
  opacity: 0.35;
  cursor: default;
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
  transition: opacity 0.15s ease, background 0.15s ease, color 0.15s ease;
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
