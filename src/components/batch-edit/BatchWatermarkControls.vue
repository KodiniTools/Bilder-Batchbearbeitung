<template>
  <div class="transform-subsection">
    <!-- Aktivieren -->
    <div class="checkbox-group">
      <label class="checkbox-label">
        <input v-model="enabled" type="checkbox" />
        <span>{{ t('batchEdit.watermark.enable') }}</span>
      </label>
    </div>

    <template v-if="watermark.enabled">
      <!-- Text -->
      <div class="property-group">
        <label>{{ t('batchEdit.watermark.text') }}</label>
        <input
          v-model="text"
          type="text"
          :placeholder="t('batchEdit.watermark.textPlaceholder')"
          class="text-input"
        />
      </div>

      <!-- Schriftart -->
      <div class="property-group">
        <label>{{ t('batchEdit.watermark.fontFamily') }}</label>
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

      <!-- Schriftgröße -->
      <SliderRow
        v-model="fontSize"
        :label="t('batchEdit.watermark.fontSize')"
        :min="10"
        :max="200"
        :default="48"
        unit="px"
        :reset-title="t('batchEdit.resetSlider')"
      />

      <!-- Fett / Kursiv -->
      <div class="style-toggles">
        <button
          class="style-toggle-btn"
          type="button"
          :class="{ active: watermark.bold }"
          :title="t('batchEdit.watermark.bold')"
          @click="bold = !bold"
        >
          <i class="fa-solid fa-bold"></i>
        </button>
        <button
          class="style-toggle-btn"
          type="button"
          :class="{ active: watermark.italic }"
          :title="t('batchEdit.watermark.italic')"
          @click="italic = !italic"
        >
          <i class="fa-solid fa-italic"></i>
        </button>
      </div>

      <!-- Farbe -->
      <div class="color-group">
        <label>{{ t('batchEdit.watermark.color') }}</label>
        <div class="color-input-wrapper">
          <input v-model="color" type="color" />
          <span class="color-value">{{ watermark.color }}</span>
        </div>
      </div>

      <!-- Deckkraft -->
      <SliderRow
        v-model="opacity"
        :label="t('batchEdit.watermark.opacity')"
        :min="0"
        :max="100"
        :default="50"
        unit="%"
        :reset-title="t('batchEdit.resetSlider')"
      />

      <!-- Drehung -->
      <SliderRow
        v-model="rotation"
        :label="t('batchEdit.watermark.rotation')"
        :min="-180"
        :max="180"
        :default="-30"
        unit="°"
        :reset-title="t('batchEdit.resetSlider')"
      />

      <!-- Position -->
      <div class="property-group">
        <label>{{ t('batchEdit.watermark.position') }}</label>
        <select v-model="position" class="property-select">
          <option v-for="pos in watermarkPositions" :key="pos.value" :value="pos.value">
            {{ t(pos.labelKey) }}
          </option>
        </select>
      </div>

      <!-- Logo (zusätzlich zum Text) -->
      <div v-if="!hideLogo" class="wm-logo">
        <span class="wm-logo__title">{{ t('batchEdit.watermark.logo.title') }}</span>
        <div class="wm-logo__row">
          <img
            v-if="watermark.logoDataUrl"
            :src="watermark.logoDataUrl"
            alt=""
            class="wm-logo__thumb"
          />
          <button
            type="button"
            class="wm-logo__btn"
            :disabled="loadingLogo"
            @click="logoInput?.click()"
          >
            <i class="fa-solid fa-image" aria-hidden="true"></i>
            {{
              watermark.logoDataUrl
                ? t('batchEdit.watermark.logo.replace')
                : t('batchEdit.watermark.logo.choose')
            }}
          </button>
          <button
            v-if="watermark.logoDataUrl"
            type="button"
            class="wm-logo__btn wm-logo__btn--icon"
            :title="t('batchEdit.watermark.logo.remove')"
            :aria-label="t('batchEdit.watermark.logo.remove')"
            @click="logoDataUrl = ''"
          >
            <i class="fa-solid fa-trash" aria-hidden="true"></i>
          </button>
          <input
            ref="logoInput"
            type="file"
            :accept="WATERMARK_LOGO_ACCEPT"
            hidden
            @change="onLogoSelected"
          />
        </div>

        <template v-if="watermark.logoDataUrl">
          <SliderRow
            v-model="logoSize"
            :label="t('batchEdit.watermark.logo.size')"
            :min="LOGO_SIZE_MIN"
            :max="LOGO_SIZE_MAX"
            :default="defaultWatermark.logoSize"
            unit="%"
            :reset-title="t('batchEdit.resetSlider')"
          />
          <SliderRow
            v-model="logoOpacity"
            :label="t('batchEdit.watermark.logo.opacity')"
            :min="0"
            :max="100"
            :default="defaultWatermark.logoOpacity"
            unit="%"
            :reset-title="t('batchEdit.resetSlider')"
          />
          <div class="property-group">
            <label>{{ t('batchEdit.watermark.logo.position') }}</label>
            <select v-model="logoPosition" class="property-select">
              <option v-for="pos in watermarkPositions" :key="pos.value" :value="pos.value">
                {{ t(pos.labelKey) }}
              </option>
            </select>
          </div>
        </template>
        <p class="wm-logo__hint">{{ t('batchEdit.watermark.logo.hint') }}</p>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { WatermarkSettings } from '@/lib/core/types'
import { defaultWatermark } from '@/lib/core/types'
import { CUSTOM_FONT_FAMILIES } from '@/lib/core/custom-fonts'
import {
  LOGO_SIZE_MAX,
  LOGO_SIZE_MIN,
  WATERMARK_LOGO_ACCEPT,
  WatermarkLogoError,
  prepareWatermarkLogo,
} from '@/lib/core/watermark-logo'
import { useToast } from '@/composables/useToast'
import SliderRow from '../SliderRow.vue'

const { t } = useI18n()
const toast = useToast()

const props = defineProps<{
  watermark: WatermarkSettings
  /** Logo-Bereich ausblenden (PDF-Seitenwasserzeichen hat ein eigenes Logo) */
  hideLogo?: boolean
}>()

const emit = defineEmits<{
  /** Neues Wasserzeichen-Objekt (Prop wird nie direkt mutiert) */
  'update:watermark': [watermark: WatermarkSettings]
}>()

/** Schreibbarer Proxy für ein Feld: liest aus dem Prop, schreibt per Emit */
function field<K extends keyof WatermarkSettings>(key: K) {
  return computed<WatermarkSettings[K]>({
    // Ältere Sitzungen/Objekte kennen die Logo-Felder noch nicht
    get: () => props.watermark[key] ?? defaultWatermark[key],
    set: (value) => emit('update:watermark', { ...props.watermark, [key]: value }),
  })
}

const enabled = field('enabled')
const text = field('text')
const fontFamily = field('fontFamily')
const fontSize = field('fontSize')
const bold = field('bold')
const italic = field('italic')
const color = field('color')
const opacity = field('opacity')
const rotation = field('rotation')
const position = field('position')
const logoDataUrl = field('logoDataUrl')
const logoSize = field('logoSize')
const logoOpacity = field('logoOpacity')
const logoPosition = field('logoPosition')

const logoInput = ref<HTMLInputElement | null>(null)
const loadingLogo = ref(false)

async function onLogoSelected(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  loadingLogo.value = true
  try {
    logoDataUrl.value = await prepareWatermarkLogo(file)
  } catch (error) {
    console.warn('[Wasserzeichen] Logo abgelehnt:', error)
    const reason = error instanceof WatermarkLogoError ? error.reason : 'decode'
    const key = reason === 'type' ? 'errorType' : reason === 'size' ? 'errorSize' : 'errorDecode'
    toast.error(t(`batchEdit.watermark.logo.${key}`))
  } finally {
    loadingLogo.value = false
  }
}

const watermarkPositions: ReadonlyArray<{
  value: WatermarkSettings['position']
  labelKey: string
}> = [
  { value: 'center', labelKey: 'batchEdit.watermark.positions.center' },
  { value: 'top-left', labelKey: 'batchEdit.watermark.positions.topLeft' },
  { value: 'top-right', labelKey: 'batchEdit.watermark.positions.topRight' },
  { value: 'bottom-left', labelKey: 'batchEdit.watermark.positions.bottomLeft' },
  { value: 'bottom-right', labelKey: 'batchEdit.watermark.positions.bottomRight' },
  { value: 'tile', labelKey: 'batchEdit.watermark.positions.tile' },
]
</script>

<style scoped>
@import './batch-edit-shared.css';

.property-group {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.property-group label {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text);
}

.text-input {
  width: 100%;
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  background: var(--bg);
  color: var(--text);
  font-size: 0.875rem;
  transition: border-color 0.2s ease;
}

.text-input:focus {
  outline: none;
  border-color: var(--accent);
}

.text-input::placeholder {
  color: var(--muted);
}

.property-select {
  width: 100%;
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  background: var(--bg);
  color: var(--text);
  font-size: 0.875rem;
  cursor: pointer;
}

.property-select:focus {
  outline: none;
  border-color: var(--accent);
}

.font-select option {
  padding: var(--space-2);
}

.style-toggles {
  display: flex;
  gap: var(--space-2);
}

.style-toggle-btn {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  background: var(--btn);
  color: var(--muted);
  cursor: pointer;
  transition: all 0.2s var(--ease-smooth);
}

.style-toggle-btn:hover {
  background: var(--btn-hover);
  border-color: var(--accent);
  color: var(--text);
}

.style-toggle-btn.active {
  background: color-mix(in oklab, var(--accent) 20%, transparent);
  border-color: var(--accent);
  color: var(--accent);
}
.wm-logo {
  display: flex;
  flex-direction: column;
  gap: var(--ds-space-2);
  padding-top: var(--ds-space-3);
  border-top: var(--ds-border-width) solid var(--ds-border);
}

.wm-logo__title {
  font-size: var(--ds-text-sm);
  font-weight: var(--ds-weight-medium);
  color: var(--ds-text);
}

.wm-logo__row {
  display: flex;
  align-items: center;
  gap: var(--ds-space-2);
  flex-wrap: wrap;
}

.wm-logo__thumb {
  width: 40px;
  height: 40px;
  object-fit: contain;
  border: var(--ds-border-width) solid var(--ds-border);
  border-radius: var(--ds-radius-sm);
  /* Mittelton, damit helle und dunkle Logos sichtbar sind */
  background: var(--ds-text-3);
}

.wm-logo__btn {
  display: inline-flex;
  align-items: center;
  gap: var(--ds-space-2);
  height: var(--ds-control-sm);
  padding: 0 var(--ds-space-3);
  border: var(--ds-border-width) solid var(--ds-border);
  border-radius: var(--ds-radius-sm);
  background: var(--ds-surface-0);
  color: var(--ds-text);
  font-size: var(--ds-text-sm);
  font-weight: var(--ds-weight-medium);
  cursor: pointer;
  transition:
    color var(--ds-duration) var(--ds-ease),
    border-color var(--ds-duration) var(--ds-ease);
}

.wm-logo__btn:hover:not(:disabled) {
  border-color: var(--ds-accent);
  color: var(--ds-accent);
}

.wm-logo__btn--icon {
  justify-content: center;
  width: var(--ds-control-sm);
  padding: 0;
}

.wm-logo__btn--icon:hover:not(:disabled) {
  border-color: var(--ds-danger);
  color: var(--ds-danger);
}

.wm-logo__btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.wm-logo__btn:focus-visible {
  outline: none;
  box-shadow: var(--ds-focus-ring);
}

.wm-logo__hint {
  margin: 0;
  font-size: var(--ds-text-xs);
  color: var(--ds-text-3);
}
</style>
