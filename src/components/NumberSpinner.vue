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
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 15 6-6 6 6" /></svg>
      </button>
      <button
        type="button"
        class="spin-btn"
        tabindex="-1"
        :disabled="disabled || modelValue <= min"
        @mousedown="startHold(-1, $event)"
        @touchstart.prevent="startHold(-1, $event)"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
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

function stepBy(direction: 1 | -1, factor = 1): boolean {
  // toFixed entfernt Float-Drift bei Dezimalschritten (z. B. 0.1 + 0.2)
  const next = clamp(Number((props.modelValue + direction * props.step * factor).toFixed(6)))
  if (next === props.modelValue) return false
  emitValue(next)
  return true
}

// Press-and-hold: ein Schritt sofort, nach HOLD_DELAY ein Dauerlauf, der
// langsam (für feines Nachjustieren) beginnt und immer schneller wird.
const HOLD_DELAY = 400
const HOLD_PHASES = [
  { until: 5, interval: 140, factor: 1 },
  { until: 15, interval: 70, factor: 1 },
  { until: 30, interval: 40, factor: 1 },
  { until: Infinity, interval: 40, factor: 5 },
]

let holdTimer: ReturnType<typeof setTimeout> | null = null
let holdTicks = 0

function stopHold() {
  if (holdTimer) {
    clearTimeout(holdTimer)
    holdTimer = null
  }
  holdTicks = 0
  window.removeEventListener('mouseup', stopHold)
  window.removeEventListener('touchend', stopHold)
  window.removeEventListener('touchcancel', stopHold)
}

function repeatHold(direction: 1 | -1) {
  holdTicks += 1
  const phase = HOLD_PHASES.find((p) => holdTicks <= p.until) ?? HOLD_PHASES[HOLD_PHASES.length - 1]
  // An der Grenze anhalten
  if (!stepBy(direction, phase.factor)) {
    stopHold()
    return
  }
  holdTimer = setTimeout(() => repeatHold(direction), phase.interval)
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

  holdTimer = setTimeout(() => repeatHold(direction), HOLD_DELAY)
}

onUnmounted(stopHold)
</script>

<style scoped>
/* Kompaktes Zahlenfeld im Visualizer-Stil: 22px hoch, umrandet, Monospace.
   Eigene Pfeile statt der nativen, weil sie das langsam→schnell tragen. */
.num-spinner {
  flex: none;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  width: 66px;
  height: 22px;
  padding: 0 0 0 4px;
  border: 1px solid var(--control-border);
  border-radius: 4px;
  background: var(--control-bg);
  transition: border-color 0.15s ease;
}

.num-spinner:focus-within {
  border-color: var(--color-gold);
}

.num-spinner.disabled {
  opacity: 0.6;
}

.spin-input {
  flex: 1 1 auto;
  width: 100%;
  min-width: 0;
  border: none;
  background: transparent;
  color: var(--text);
  font-family: 'Courier New', var(--font-mono);
  font-size: 0.68rem;
  font-weight: 600;
  line-height: 1.3;
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
  flex: none;
  margin-left: 1px;
  font-family: 'Courier New', var(--font-mono);
  font-size: 0.62rem;
  color: var(--control-muted);
}

.spin-buttons {
  flex: none;
  display: flex;
  flex-direction: column;
  align-self: stretch;
  margin-left: 2px;
  border-left: 1px solid var(--control-border);
}

.spin-btn {
  flex: 1 1 0;
  width: 14px;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  color: var(--control-muted);
  cursor: pointer;
  padding: 0;
  touch-action: none;
  transition:
    color 0.15s ease,
    background 0.15s ease;
}

.spin-btn svg {
  width: 8px;
  height: 8px;
  fill: none;
  stroke: currentColor;
  stroke-width: 3;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.spin-btn:hover:not(:disabled) {
  color: var(--color-gold);
  background: color-mix(in oklab, var(--color-gold) 15%, transparent);
}

.spin-btn:disabled {
  opacity: 0.35;
  cursor: default;
}

/* Fluid-Variante (Breite/Höhe-Felder): füllt den Container, Wert linksbündig */
.num-spinner.fluid {
  width: 100%;
  height: 36px;
  padding: 0 0 0 var(--space-2);
  border-radius: var(--radius-md);
}

.num-spinner.fluid .spin-input {
  text-align: left;
  font-size: 0.875rem;
}

.num-spinner.fluid .spin-unit {
  font-size: 0.8rem;
  padding-right: 4px;
}

.num-spinner.fluid .spin-btn {
  width: 22px;
}

.num-spinner.fluid .spin-btn svg {
  width: 10px;
  height: 10px;
}

/* Touch: höheres Feld, damit die Pfeile treffbar bleiben */
@media (max-width: 768px) {
  .num-spinner:not(.fluid) {
    width: 72px;
    height: 28px;
  }

  .num-spinner:not(.fluid) .spin-input {
    font-size: 0.75rem;
  }

  .spin-btn {
    width: 18px;
  }
}
</style>
