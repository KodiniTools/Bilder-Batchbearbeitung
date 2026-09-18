<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useImageStore } from '@/stores/imageStore'
import { useToast } from '@/composables/useToast'
import { useDebouncedWatch } from '@/composables/useDebouncedWatch'
import { useBatchResize } from '@/composables/useBatchResize'
import { defaultFilters, defaultTransforms, defaultWatermark } from '@/lib/core/types'
import type { ImageFilters, ImageTransforms, WatermarkSettings } from '@/lib/core/types'
import { FILTER_PRESETS } from '@/lib/core/filter-presets'
import BatchCollapsibleSection from './batch-edit/BatchCollapsibleSection.vue'
import BatchFiltersSection from './batch-edit/BatchFiltersSection.vue'
import BatchResizeSubsection from './batch-edit/BatchResizeSubsection.vue'
import BatchTransformControls from './batch-edit/BatchTransformControls.vue'
import BatchWatermarkControls from './batch-edit/BatchWatermarkControls.vue'

const props = defineProps<{
  isOpen: boolean
}>()

const emit = defineEmits<{
  close: []
}>()

const { t } = useI18n()
const imageStore = useImageStore()
const toast = useToast()

// Lokaler Bearbeitungszustand; die Kind-Module liefern per v-model neue Objekte
const filters = ref<ImageFilters>({ ...defaultFilters })
const transforms = ref<ImageTransforms>({ ...defaultTransforms })
const watermark = ref<WatermarkSettings>({ ...defaultWatermark })

const transformsOpen = ref(false)
const watermarkOpen = ref(false)

const {
  width: resizeWidth,
  height: resizeHeight,
  keepAspect: resizeKeepAspect,
  canApply: canApplyResize,
  isApplying: isResizing,
  progressCurrent: resizeProgressCurrent,
  progressTotal: resizeProgressTotal,
  canUndoResize,
  onWidthChange: onResizeWidthChange,
  onHeightChange: onResizeHeightChange,
  onKeepAspectChange: onResizeKeepAspectChange,
  initFromSelection: initResizeFromSelection,
  applyResize,
  undoResize,
} = useBatchResize()

const hasSelection = computed(() => imageStore.hasSelection)
const selectedCount = computed(() => imageStore.selectedCount)

// Beim Öffnen alle Werte zurücksetzen
watch(
  () => props.isOpen,
  (open) => {
    if (open) {
      filters.value = { ...defaultFilters }
      transforms.value = { ...defaultTransforms }
      watermark.value = { ...defaultWatermark }
      initResizeFromSelection()
    }
  }
)

// Panel schließen, sobald keine Bilder mehr ausgewählt sind
watch(
  () => imageStore.hasSelection,
  (hasSelection) => {
    if (!hasSelection && props.isOpen) {
      emit('close')
    }
  }
)

// Änderungen debounced (~60 fps) auf die Auswahl übertragen
const canApply = () => props.isOpen && imageStore.hasSelection

useDebouncedWatch(filters, () => {
  if (canApply()) imageStore.applyFiltersToSelectedImages({ ...filters.value })
})

useDebouncedWatch(transforms, () => {
  if (canApply()) imageStore.applyTransformsToSelectedImages({ ...transforms.value })
})

useDebouncedWatch(watermark, () => {
  if (canApply()) imageStore.applyWatermarkToSelectedImages({ ...watermark.value })
})

// Preset (One-Click-Look) vollständig setzen, nicht mergen; der Watcher überträgt es
function applyPreset(presetKey: string) {
  const preset = FILTER_PRESETS.find((p) => p.key === presetKey)
  if (!preset) return
  filters.value = { ...defaultFilters, ...preset.filters }
}

// Filter, Transformationen und Wasserzeichen der Auswahl zurücksetzen
function resetAll() {
  filters.value = { ...defaultFilters }
  transforms.value = { ...defaultTransforms }
  watermark.value = { ...defaultWatermark }
  imageStore.resetFiltersForSelectedImages()
  imageStore.resetTransformsForSelectedImages()
  imageStore.resetWatermarkForSelectedImages()
  toast.success(t('batchEdit.toast.reset', { count: selectedCount.value }))
}

function close() {
  emit('close')
}
</script>

<template>
  <Transition name="panel-slide">
    <aside v-if="isOpen" class="batch-edit-panel">
      <div class="panel-header">
        <h3>
          <i class="fa-solid fa-sliders"></i>
          {{ t('batchEdit.title') }}
        </h3>
        <button class="btn-close" :title="t('buttons.close')" @click="close">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>

      <div class="panel-info">
        <i class="fa-solid fa-images"></i>
        <span>{{ t('batchEdit.selectedCount', { count: selectedCount }) }}</span>
      </div>

      <div class="panel-content">
        <BatchFiltersSection
          v-model:filters="filters"
          :presets="FILTER_PRESETS"
          @preset="applyPreset"
        />

        <div class="section-divider"></div>

        <BatchCollapsibleSection
          v-model:open="transformsOpen"
          icon="fa-wand-magic-sparkles"
          :title="t('batchEdit.transforms.title')"
        >
          <BatchResizeSubsection
            v-model:width="resizeWidth"
            v-model:height="resizeHeight"
            v-model:keep-aspect="resizeKeepAspect"
            :can-apply="canApplyResize"
            :is-applying="isResizing"
            :progress-current="resizeProgressCurrent"
            :progress-total="resizeProgressTotal"
            :can-undo="canUndoResize"
            @width-change="onResizeWidthChange"
            @height-change="onResizeHeightChange"
            @keep-aspect-change="onResizeKeepAspectChange"
            @apply="applyResize"
            @undo="undoResize"
          />
          <BatchTransformControls v-model:transforms="transforms" />
        </BatchCollapsibleSection>

        <div class="section-divider"></div>

        <BatchCollapsibleSection
          v-model:open="watermarkOpen"
          icon="fa-stamp"
          :title="t('batchEdit.watermark.title')"
        >
          <BatchWatermarkControls v-model:watermark="watermark" />
        </BatchCollapsibleSection>
      </div>

      <div class="panel-footer">
        <button class="btn btn-reset-all" :disabled="!hasSelection" @click="resetAll">
          <i class="fa-solid fa-arrow-rotate-left"></i>
          {{ t('batchEdit.buttons.reset') }}
        </button>
      </div>
    </aside>
  </Transition>
</template>

<style scoped>
@import './batch-edit/batch-edit-shared.css';

.batch-edit-panel {
  position: fixed;
  top: 0;
  left: 0;
  width: 320px;
  height: 100vh;
  background: var(--panel);
  border-right: 1px solid var(--border-color);
  box-shadow: 4px 0 24px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-4);
  border-bottom: 1px solid var(--border-color);
  background: var(--glass-bg);
  backdrop-filter: blur(10px);
}

.panel-header h3 {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text);
}

.panel-header h3 i {
  color: var(--accent);
}

.btn-close {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  color: var(--muted);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all 0.2s var(--ease-smooth);
}

.btn-close:hover {
  background: var(--btn-hover);
  color: var(--text);
}

.panel-info {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-4);
  background: color-mix(in oklab, var(--accent) 8%, transparent);
  border-bottom: 1px solid var(--border-color);
  font-size: 0.875rem;
  color: var(--accent);
  font-weight: 500;
}

.panel-content {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-4);
}

.panel-footer {
  display: flex;
  gap: var(--space-2);
  padding: var(--space-4);
  border-top: 1px solid var(--border-color);
  background: var(--glass-bg);
}

.btn-reset-all {
  width: 100%;
  background: var(--btn);
  color: var(--text);
  border: 1px solid var(--border-color);
}

.btn-reset-all:hover:not(:disabled) {
  background: color-mix(in oklab, var(--red) 15%, transparent);
  border-color: var(--red);
  color: var(--red);
}

/* Panel slide animation */
.panel-slide-enter-active,
.panel-slide-leave-active {
  transition: transform 0.3s var(--ease-smooth);
}

.panel-slide-enter-from,
.panel-slide-leave-to {
  transform: translateX(-100%);
}

/* Responsive */
@media (max-width: 480px) {
  .batch-edit-panel {
    width: 100%;
  }
}
</style>
