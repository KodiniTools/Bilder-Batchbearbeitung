<template>
  <div class="num-spinner" :class="{ fluid, disabled }">
    <input
      :id="id"
      class="spin-input"
      type="number"
      :min="min"
      :max="max"
      :step="step"
      :value="modelValue"
      :disabled="disabled"
      @input="onInput"
      @change="onChange"
    />
    <span v-if="unit" class="spin-unit">{{ unit }}</span>
    <div class="spin-buttons">
      <button
        type="button"
        class="spin-btn"
        tabindex="-1"
        :disabled="disabled || modelValue >= max"
        @mousedown="startHold(1, $event)"
        @touchstart.prevent="startHold(1, $event)"
      >
        <i class="fa-solid fa-chevron-up"></i>
      </button>
      <button
        type="button"
        class="spin-btn"
        tabindex="-1"
        :disabled="disabled || modelValue <= min"
        @mousedown="startHold(-1, $event)"
        @touchstart.prevent="startHold(-1, $event)"
      >
        <i class="fa-solid fa-chevron-down"></i>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onUnmounted } from 'vue'

/**
 * Zahlenfeld mit sichtbaren Auf/Ab-Pfeilen (Press-and-Hold mit Beschleunigung).
 * Obere Grenze wird sofort geklemmt, untere erst bei Blur/Change, damit z. B.
 * ein Minuszeichen noch eingetippt werden kann.
 */
const props = withDefaults(
  defineProps<{
    modelValue: number
    min: number
    max: number
    step?: number
    unit?: string
    /** Wert bei ungültiger Eingabe (Change); Default: min */
    fallback?: number
    disabled?: boolean
    /** Volle Breite des Containers nutzen (z. B. Breite/Höhe-Felder) */
    fluid?: boolean
    /** id für das <input>, damit ein <label for> daran binden kann */
    id?: string
  }>(),
  { step: 1, unit: '', fallback: undefined, disabled: false, fluid: false, id: undefined }
)

const emit = defineEmits<{
  'update:modelValue': [value: number]
}>()

function clamp(value: number, clampLow = true): number {
  let v = value
  if (v > props.max) v = props.max
  if (clampLow && v < props.min) v = props.min
  return v
}

function emitValue(v: number) {
  emit('update:modelValue', v)
}

function onInput(event: Event) {
  const raw = (event.target as HTMLInputElement).value
  if (raw === '' || raw === '-') return
  const v = Number(raw)
  if (!Number.isNaN(v)) emitValue(clamp(v, false))
}

function onChange(event: Event) {
  const v = Number((event.target as HTMLInputElement).value)
  emitValue(Number.isNaN(v) ? (props.fallback ?? props.min) : clamp(v))
}

function stepBy(direction: 1 | -1) {
  emitValue(clamp(props.modelValue + direction * props.step))
}

// Press-and-hold: erst eine Verzögerung, dann fortlaufende Schritte,
// die mit der Haltezeit leicht beschleunigen.
let holdTimeout: ReturnType<typeof setTimeout> | null = null
let holdInterval: ReturnType<typeof setInterval> | null = null

function stopHold() {
  if (holdTimeout) {
    clearTimeout(holdTimeout)
    holdTimeout = null
  }
  if (holdInterval) {
    clearInterval(holdInterval)
    holdInterval = null
  }
  window.removeEventListener('mouseup', stopHold)
  window.removeEventListener('touchend', stopHold)
  window.removeEventListener('touchcancel', stopHold)
}

function startHold(direction: 1 | -1, event: Event) {
  if (props.disabled) return
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
      if (
        (direction === 1 && props.modelValue >= props.max) ||
        (direction === -1 && props.modelValue <= props.min)
      ) {
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

onUnmounted(stopHold)
</script>

<style scoped>
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

.num-spinner.disabled {
  opacity: 0.6;
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
  transition:
    color 0.15s ease,
    background 0.15s ease;
}

.spin-btn:hover:not(:disabled) {
  color: var(--accent);
  background: color-mix(in oklab, var(--accent) 15%, transparent);
}

.spin-btn:disabled {
  opacity: 0.35;
  cursor: default;
}

/* Fluid-Variante: füllt den Container, Wert linksbündig, größere Pfeile */
.num-spinner.fluid {
  width: 100%;
  height: 36px;
  padding: 0 4px 0 var(--space-2);
  border-radius: var(--radius-md);
  gap: var(--space-1);
}

.num-spinner.fluid .spin-input {
  flex: 1;
  width: auto;
  min-width: 0;
  text-align: left;
  color: var(--text);
  font-size: 0.875rem;
}

.num-spinner.fluid .spin-unit {
  font-size: 0.8rem;
  padding-right: 2px;
}

.num-spinner.fluid .spin-btn {
  width: 20px;
  height: 14px;
  font-size: 0.6rem;
}
</style>
