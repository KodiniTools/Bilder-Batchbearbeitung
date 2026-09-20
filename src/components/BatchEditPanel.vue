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

type PanelTab = 'filters' | 'transforms' | 'watermark'

// Lokaler Bearbeitungszustand; die Kind-Module liefern per v-model neue Objekte
const filters = ref<ImageFilters>({ ...defaultFilters })
const transforms = ref<ImageTransforms>({ ...defaultTransforms })
const watermark = ref<WatermarkSettings>({ ...defaultWatermark })

const activeTab = ref<PanelTab>('filters')

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

/** Anzahl der Schlüssel, deren Wert vom Standardobjekt abweicht */
function countDiffs<T extends object>(current: T, defaults: T): number {
  return (Object.keys(defaults) as Array<keyof T>).filter((k) => current[k] !== defaults[k]).length
}

const filtersModifiedCount = computed(() => countDiffs(filters.value, defaultFilters))
const transformsModifiedCount = computed(() => countDiffs(transforms.value, defaultTransforms))
const watermarkActive = computed(() => watermark.value.enabled)
const hasAnyChange = computed(
  () => filtersModifiedCount.value > 0 || transformsModifiedCount.value > 0 || watermarkActive.value
)

/** Preset, dessen vollständiger Filtersatz exakt dem aktuellen Zustand entspricht */
const activePreset = computed<string | null>(() => {
  const match = FILTER_PRESETS.find((preset) => {
    const full: ImageFilters = { ...defaultFilters, ...preset.filters }
    return countDiffs(filters.value, full) === 0
  })
  return match?.key ?? null
})

interface TabConfig {
  key: PanelTab
  icon: string
  label: string
  badge: number | boolean
}

const tabs = computed<ReadonlyArray<TabConfig>>(() => [
  {
    key: 'filters',
    icon: 'fa-sliders',
    label: t('batchEdit.tabs.filters'),
    badge: filtersModifiedCount.value,
  },
  {
    key: 'transforms',
    icon: 'fa-wand-magic-sparkles',
    label: t('batchEdit.transforms.title'),
    badge: transformsModifiedCount.value,
  },
  {
    key: 'watermark',
    icon: 'fa-stamp',
    label: t('batchEdit.watermark.title'),
    badge: watermarkActive.value,
  },
])

// Beim Öffnen alle Werte zurücksetzen
watch(
  () => props.isOpen,
  (open) => {
    if (open) {
      filters.value = { ...defaultFilters }
      transforms.value = { ...defaultTransforms }
      watermark.value = { ...defaultWatermark }
      activeTab.value = 'filters'
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
    <aside v-if="isOpen" class="batch-edit-panel" :aria-label="t('batchEdit.title')">
      <header class="panel-header">
        <div class="panel-title">
          <span class="panel-title__icon">
            <i class="fa-solid fa-sliders"></i>
          </span>
          <div class="panel-title__text">
            <h3>{{ t('batchEdit.title') }}</h3>
            <span class="panel-title__meta">
              <i class="fa-solid fa-images"></i>
              {{ t('batchEdit.selectedCount', { count: selectedCount }) }}
            </span>
          </div>
        </div>
        <button class="btn-close" type="button" :title="t('buttons.close')" @click="close">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </header>

      <nav class="panel-tabs" role="tablist">
        <button
          v-for="tab in tabs"
          :id="`batch-tab-${tab.key}`"
          :key="tab.key"
          type="button"
          role="tab"
          class="panel-tab"
          :class="{ active: activeTab === tab.key }"
          :aria-selected="activeTab === tab.key"
          :aria-controls="`batch-panel-${tab.key}`"
          @click="activeTab = tab.key"
        >
          <i :class="['fa-solid', tab.icon]"></i>
          <span class="panel-tab__label">{{ tab.label }}</span>
          <span v-if="typeof tab.badge === 'number' && tab.badge > 0" class="panel-tab__badge">
            {{ tab.badge }}
          </span>
          <span v-else-if="tab.badge === true" class="panel-tab__dot"></span>
        </button>
      </nav>

      <div class="panel-content">
        <section
          v-show="activeTab === 'filters'"
          id="batch-panel-filters"
          role="tabpanel"
          aria-labelledby="batch-tab-filters"
          class="tab-panel"
        >
          <BatchFiltersSection
            v-model:filters="filters"
            :presets="FILTER_PRESETS"
            :active-preset="activePreset"
            @preset="applyPreset"
          />
        </section>

        <section
          v-show="activeTab === 'transforms'"
          id="batch-panel-transforms"
          role="tabpanel"
          aria-labelledby="batch-tab-transforms"
          class="tab-panel"
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
        </section>

        <section
          v-show="activeTab === 'watermark'"
          id="batch-panel-watermark"
          role="tabpanel"
          aria-labelledby="batch-tab-watermark"
          class="tab-panel"
        >
          <BatchWatermarkControls v-model:watermark="watermark" />
        </section>
      </div>

      <footer class="panel-footer">
        <span class="panel-footer__hint">
          <i class="fa-solid fa-bolt"></i>
          {{ t('batchEdit.liveHint') }}
        </span>
        <button
          class="btn btn-reset-all"
          type="button"
          :disabled="!hasSelection || !hasAnyChange"
          @click="resetAll"
        >
          <i class="fa-solid fa-arrow-rotate-left"></i>
          {{ t('batchEdit.buttons.reset') }}
        </button>
      </footer>
    </aside>
  </Transition>
</template>

<style scoped>
@import './batch-edit/batch-edit-shared.css';

/* Sticky-Spalte im Workspace: bleibt beim Scrollen sichtbar, überdeckt aber
   nicht die globale Navigation (die im Document Flow liegt). */
.batch-edit-panel {
  position: sticky;
  top: var(--app-header-height, 0px);
  align-self: flex-start;
  flex: 0 0 var(--batch-sidebar-width, 360px);
  width: var(--batch-sidebar-width, 360px);
  height: calc(100vh - var(--app-header-height, 0px));
  height: calc(100dvh - var(--app-header-height, 0px));
  background: var(--panel);
  border-right: 1px solid var(--border-color);
  box-shadow: 4px 0 24px color-mix(in oklab, var(--shadow-color) 40%, transparent);
  z-index: 20;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* Kopf */
.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--border-color);
  background: var(--glass-bg);
  backdrop-filter: blur(10px);
}

.panel-title {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  min-width: 0;
}

.panel-title__icon {
  flex-shrink: 0;
  width: 38px;
  height: 38px;
  display: grid;
  place-items: center;
  border-radius: var(--radius-md);
  background: linear-gradient(135deg, var(--accent), var(--accent-hover));
  color: var(--accent-text);
  font-size: 1rem;
  box-shadow: 0 4px 12px color-mix(in oklab, var(--accent) 35%, transparent);
}

.panel-title__text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.panel-title__text h3 {
  margin: 0;
  font-size: 1rem;
  font-weight: 700;
  color: var(--text);
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.panel-title__meta {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.78rem;
  font-weight: 500;
  color: var(--accent);
}

.btn-close {
  flex-shrink: 0;
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  border: 1px solid transparent;
  background: transparent;
  color: var(--muted);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all 0.2s var(--ease-smooth);
}

.btn-close:hover {
  background: var(--btn-hover);
  border-color: var(--border-color);
  color: var(--text);
}

/* Segmentierte Tab-Leiste */
.panel-tabs {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 4px;
  margin: var(--space-3) var(--space-4) 0;
  padding: 4px;
  border-radius: var(--radius-md);
  background: color-mix(in oklab, var(--bg) 70%, var(--panel));
  border: 1px solid var(--border-color);
}

.panel-tab {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: var(--space-2) var(--space-1);
  border: none;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--muted);
  font-size: 0.72rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s var(--ease-smooth);
}

.panel-tab i {
  font-size: 0.95rem;
}

.panel-tab__label {
  max-width: 100%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.panel-tab:hover {
  color: var(--text);
  background: color-mix(in oklab, var(--panel) 60%, transparent);
}

.panel-tab.active {
  color: var(--accent);
  background: var(--panel);
  box-shadow: 0 2px 8px color-mix(in oklab, var(--shadow-color) 40%, transparent);
}

.panel-tab__badge,
.panel-tab__dot {
  position: absolute;
  top: 4px;
  right: 6px;
}

.panel-tab__badge {
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  border-radius: 999px;
  background: var(--accent);
  color: var(--accent-text);
  font-size: 0.62rem;
  font-weight: 700;
  line-height: 16px;
  text-align: center;
}

.panel-tab__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--accent);
}

/* Inhalt */
.panel-content {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: var(--space-4);
  scrollbar-width: thin;
  scrollbar-color: color-mix(in oklab, var(--muted) 40%, transparent) transparent;
}

.tab-panel {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

/* Fuß */
.panel-footer {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-4);
  border-top: 1px solid var(--border-color);
  background: var(--glass-bg);
  backdrop-filter: blur(10px);
}

.panel-footer__hint {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.72rem;
  color: var(--muted);
}

.panel-footer__hint i {
  color: var(--secondary);
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

/* Slide-Animation */
.panel-slide-enter-active,
.panel-slide-leave-active {
  transition: transform 0.3s var(--ease-smooth);
}

.panel-slide-enter-from,
.panel-slide-leave-to {
  transform: translateX(-100%);
}

/* Mobil: Bottom-Sheet statt Seitenspalte */
@media (max-width: 768px) {
  .batch-edit-panel {
    position: fixed;
    top: auto;
    left: 0;
    right: 0;
    bottom: 0;
    width: 100%;
    height: min(78vh, 78dvh);
    border-right: none;
    border-top: 1px solid var(--border-color);
    border-radius: var(--radius-xl) var(--radius-xl) 0 0;
    box-shadow: 0 -8px 32px color-mix(in oklab, var(--shadow-color) 50%, transparent);
    z-index: 900;
  }

  .panel-slide-enter-from,
  .panel-slide-leave-to {
    transform: translateY(100%);
  }
}
</style>
