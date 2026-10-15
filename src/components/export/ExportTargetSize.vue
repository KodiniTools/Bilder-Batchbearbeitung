<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { ImageObject } from '@/lib/core/types'
import { ImageProcessor } from '@/lib/core/image-processor'
import { renderExportCanvas } from '@/lib/core/export-render'
import { TARGET_KB_MAX, TARGET_KB_MIN } from '@/lib/core/recipes'
import {
  estimateExportSize,
  kbToBytes,
  supportsTargetSize,
  type SizeEstimate,
} from '@/lib/features/target-size'

const props = defineProps<{
  /** Exportdialog offen und Rasterexport gewählt */
  active: boolean
  images: ImageObject[]
  format: string
  /** 1-100 */
  quality: number
  backgroundColor?: string
  /** EXIF der Originale wird mit exportiert (zählt zur Größe) */
  keepExif?: boolean
}>()

const enabled = defineModel<boolean>('enabled', { required: true })
const kb = defineModel<number>('kb', { required: true })
const downscale = defineModel<boolean>('downscale', { required: true })

const { t } = useI18n()

const mimeType = computed(() => `image/${props.format === 'jpg' ? 'jpeg' : props.format}`)
const supported = computed(() => supportsTargetSize(mimeType.value))
const targetActive = computed(() => enabled.value && supported.value)

const estimate = ref<SizeEstimate | null>(null)
const estimating = ref(false)
const estimateFailed = ref(false)

// Export-Canvas der Stichprobe nur einmal pro Dialog rendern
const canvasCache = new Map<string, Promise<HTMLCanvasElement>>()
function cacheKey(image: ImageObject, bg: string | undefined): string {
  return JSON.stringify([
    image.id,
    image.version,
    bg ?? '',
    image.filters,
    image.transforms,
    image.watermark,
  ])
}
function cachedCanvas(image: ImageObject): Promise<HTMLCanvasElement> {
  const key = cacheKey(image, props.backgroundColor)
  let entry = canvasCache.get(key)
  if (!entry) {
    entry = renderExportCanvas(image, { backgroundColor: props.backgroundColor })
    canvasCache.set(key, entry)
    entry.catch(() => canvasCache.delete(key))
  }
  return entry
}

let controller: AbortController | null = null
let timer: ReturnType<typeof setTimeout> | null = null

function cancelPending() {
  if (timer) clearTimeout(timer)
  timer = null
  controller?.abort()
  controller = null
}

async function runEstimate() {
  cancelPending()
  if (!props.active || props.images.length === 0) {
    estimate.value = null
    return
  }
  const ctrl = new AbortController()
  controller = ctrl
  estimating.value = true
  estimateFailed.value = false
  try {
    const result = await estimateExportSize({
      images: props.images,
      mimeType: mimeType.value,
      quality: props.format === 'png' ? 1 : props.quality / 100,
      backgroundColor: props.backgroundColor,
      target: targetActive.value
        ? { maxBytes: kbToBytes(kb.value), allowDownscale: downscale.value }
        : null,
      getCanvas: cachedCanvas,
      signal: ctrl.signal,
      keepExif: props.keepExif,
    })
    if (ctrl.signal.aborted) return
    estimate.value = result
  } catch (error) {
    if (ctrl.signal.aborted) return
    console.warn('[Export] Größenschätzung fehlgeschlagen:', error)
    estimate.value = null
    estimateFailed.value = true
  } finally {
    if (controller === ctrl) {
      controller = null
      estimating.value = false
    }
  }
}

function scheduleEstimate() {
  cancelPending()
  timer = setTimeout(() => void runEstimate(), 400)
}

watch(
  () => [
    props.active,
    props.format,
    props.quality,
    props.backgroundColor,
    props.keepExif,
    enabled.value,
    kb.value,
    downscale.value,
    props.images.map((img) => `${img.id}:${img.version}`).join(','),
  ],
  () => {
    if (!props.active) {
      cancelPending()
      canvasCache.clear()
      estimate.value = null
      estimating.value = false
      return
    }
    scheduleEstimate()
  },
  { immediate: true }
)

onBeforeUnmount(cancelPending)

function onKbInput(event: Event) {
  const value = Number((event.target as HTMLInputElement).value)
  if (Number.isFinite(value) && value > 0) {
    kb.value = Math.min(TARGET_KB_MAX, Math.max(TARGET_KB_MIN, Math.round(value)))
  }
}

const estimateText = computed(() => {
  const e = estimate.value
  if (!e) return ''
  return t('exportModal.targetSize.estimate', {
    perImage: ImageProcessor.formatFileSize(Math.round(e.perImage)),
    total: ImageProcessor.formatFileSize(Math.round(e.total)),
  })
})
</script>

<template>
  <div class="target-size">
    <label class="checkbox-label">
      <input v-model="enabled" type="checkbox" :disabled="!supported" />
      {{ t('exportModal.targetSize.enable') }}
    </label>

    <p v-if="!supported" class="target-size__hint">
      {{ t('exportModal.targetSize.lossyOnly') }}
    </p>

    <div v-else-if="enabled" class="target-size__controls">
      <label class="target-size__kb">
        <span>{{ t('exportModal.targetSize.maxLabel') }}</span>
        <input
          type="number"
          inputmode="numeric"
          :min="TARGET_KB_MIN"
          :max="TARGET_KB_MAX"
          step="10"
          :value="kb"
          @change="onKbInput"
        />
        <span class="target-size__unit">KB</span>
      </label>
      <label class="checkbox-label">
        <input v-model="downscale" type="checkbox" />
        {{ t('exportModal.targetSize.downscale') }}
      </label>
      <p class="target-size__hint">{{ t('exportModal.targetSize.qualityHint') }}</p>
    </div>

    <div class="target-size__estimate" aria-live="polite">
      <i class="fa-solid fa-scale-balanced" aria-hidden="true"></i>
      <span v-if="estimating">{{ t('exportModal.targetSize.estimating') }}</span>
      <span v-else-if="estimate">
        {{ estimateText }}
        <span class="target-size__sample">
          {{
            t('exportModal.targetSize.sampled', { sampled: estimate.sampled, count: images.length })
          }}
        </span>
      </span>
      <span v-else-if="estimateFailed">{{ t('exportModal.targetSize.estimateFailed') }}</span>
    </div>
    <p v-if="!estimating && estimate?.overTarget && targetActive" class="target-size__warn">
      <i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i>
      {{ t('exportModal.targetSize.notReachable') }}
    </p>
  </div>
</template>

<style scoped>
.target-size {
  display: flex;
  flex-direction: column;
  gap: var(--ds-space-2);
  padding: var(--ds-space-3);
  border: var(--ds-border-width) solid var(--ds-border);
  border-radius: var(--ds-radius-md);
  background: var(--ds-surface-1);
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: var(--ds-space-2);
  font-size: var(--ds-text-sm);
  color: var(--ds-text);
  cursor: pointer;
}

.checkbox-label input[type='checkbox'] {
  width: 18px;
  height: 18px;
  accent-color: var(--ds-accent);
  cursor: pointer;
}

.checkbox-label input[type='checkbox']:disabled {
  cursor: not-allowed;
}

.target-size__controls {
  display: flex;
  flex-direction: column;
  gap: var(--ds-space-2);
}

.target-size__kb {
  display: flex;
  align-items: center;
  gap: var(--ds-space-2);
  font-size: var(--ds-text-sm);
  color: var(--ds-text);
}

.target-size__kb input {
  width: 110px;
  height: var(--ds-control-sm);
  padding: 0 var(--ds-space-2);
  border: var(--ds-border-width) solid var(--ds-border);
  border-radius: var(--ds-radius-sm);
  background: var(--ds-surface-0);
  color: var(--ds-text);
  font-size: var(--ds-text-sm);
}

.target-size__kb input:focus-visible {
  outline: none;
  box-shadow: var(--ds-focus-ring);
}

.target-size__unit {
  color: var(--ds-text-2);
}

.target-size__hint,
.target-size__sample {
  margin: 0;
  font-size: var(--ds-text-xs);
  color: var(--ds-text-3);
}

.target-size__estimate {
  display: flex;
  align-items: baseline;
  gap: var(--ds-space-2);
  font-size: var(--ds-text-sm);
  color: var(--ds-text-2);
}

.target-size__estimate i {
  color: var(--ds-accent);
}

.target-size__warn {
  margin: 0;
  display: flex;
  gap: var(--ds-space-2);
  font-size: var(--ds-text-xs);
  color: var(--ds-warning);
}
</style>
