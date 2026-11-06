<template>
  <Teleport to="#modal-portal">
    <Transition name="picker-fade">
      <div v-if="modelValue" class="picker-overlay" @click.self="close">
        <div
          class="picker-modal"
          role="dialog"
          aria-modal="true"
          :aria-label="t('commentPageDesigner.imagePicker.title')"
          @keydown.esc.stop.prevent="close"
        >
          <div class="picker-header">
            <h3>{{ t('commentPageDesigner.imagePicker.title') }}</h3>
            <button
              class="picker-close"
              :aria-label="t('commentPageDesigner.imagePicker.cancel')"
              @click="close"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          <div class="picker-toolbar">
            <span class="picker-hint">
              {{ t('commentPageDesigner.imagePicker.hint', { count: freeSlots }, freeSlots) }}
            </span>
            <button class="picker-link" :disabled="busy" @click="toggleAll">
              {{
                allSelected
                  ? t('commentPageDesigner.imagePicker.selectNone')
                  : t('commentPageDesigner.imagePicker.selectAll')
              }}
            </button>
          </div>

          <div class="picker-body">
            <p v-if="images.length === 0" class="picker-empty">
              {{ t('commentPageDesigner.imagePicker.empty') }}
            </p>
            <ul v-else class="picker-grid">
              <li v-for="img in images" :key="img.id">
                <button
                  type="button"
                  class="picker-item"
                  :class="{ selected: isSelected(img.id) }"
                  :disabled="busy || (!isSelected(img.id) && limitReached)"
                  :aria-pressed="isSelected(img.id)"
                  :title="img.outputName || img.file.name"
                  @click="toggle(img.id)"
                >
                  <span class="picker-thumb">
                    <img v-if="thumbs[img.id]" :src="thumbs[img.id]" alt="" />
                  </span>
                  <span class="picker-name">{{ img.outputName || img.file.name }}</span>
                  <span v-if="isSelected(img.id)" class="picker-check" aria-hidden="true">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="3"
                    >
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  </span>
                </button>
              </li>
            </ul>
          </div>

          <div class="picker-footer">
            <span class="picker-count">
              {{
                busy
                  ? t('commentPageDesigner.imagePicker.adding', {
                      current: progress,
                      total: selectedIds.length,
                    })
                  : t(
                      'commentPageDesigner.imagePicker.selected',
                      { count: selectedIds.length },
                      selectedIds.length
                    )
              }}
            </span>
            <div class="picker-actions">
              <button class="btn-secondary" :disabled="busy" @click="close">
                {{ t('commentPageDesigner.imagePicker.cancel') }}
              </button>
              <button
                class="btn-primary"
                :disabled="busy || selectedIds.length === 0"
                @click="confirm"
              >
                {{
                  t(
                    'commentPageDesigner.imagePicker.add',
                    { count: selectedIds.length },
                    selectedIds.length
                  )
                }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { ImageObject } from '@/lib/core/types'
import {
  createThumbnail,
  libraryImageToSource,
  type DesignerImageSource,
  type LibraryImageConverter,
} from '@/lib/designer/library-image'
import { useToast } from '@/composables/useToast'

const { t } = useI18n()
const toast = useToast()

const props = withDefaults(
  defineProps<{
    /** Sichtbarkeit (v-model) */
    modelValue?: boolean
    /** Bilder der geladenen Serie */
    images?: ImageObject[]
    /** Freie Plätze auf der aktuellen Seite */
    freeSlots: number
    /** Umwandlung Bild → Data-URL (austauschbar für Tests) */
    convert?: LibraryImageConverter
  }>(),
  {
    modelValue: false,
    images: () => [],
    convert: (image: ImageObject) => libraryImageToSource(image),
  }
)

const emit = defineEmits<{
  'update:modelValue': [visible: boolean]
  add: [sources: DesignerImageSource[]]
}>()

const selectedIds = ref<string[]>([])
const thumbs = ref<Record<string, string>>({})
const busy = ref(false)
const progress = ref(0)

const limitReached = computed(() => selectedIds.value.length >= props.freeSlots)
const selectableCount = computed(() => Math.min(props.images.length, props.freeSlots))
const allSelected = computed(
  () => selectableCount.value > 0 && selectedIds.value.length >= selectableCount.value
)

function isSelected(id: string): boolean {
  return selectedIds.value.includes(id)
}

function toggle(id: string) {
  if (isSelected(id)) selectedIds.value = selectedIds.value.filter((s) => s !== id)
  else if (!limitReached.value) selectedIds.value = [...selectedIds.value, id]
}

function toggleAll() {
  selectedIds.value = allSelected.value
    ? []
    : props.images.slice(0, props.freeSlots).map((img) => img.id)
}

/** Vorschaubilder nur für noch fehlende Einträge erzeugen (beim Öffnen) */
function buildThumbnails() {
  const next: Record<string, string> = {}
  for (const img of props.images) {
    try {
      next[img.id] = thumbs.value[img.id] ?? createThumbnail(img.canvas)
    } catch (err) {
      console.warn('[ImagePicker] Vorschaubild fehlgeschlagen:', err)
    }
  }
  thumbs.value = next
}

watch(
  () => props.modelValue,
  (open) => {
    if (!open) return
    selectedIds.value = []
    progress.value = 0
    buildThumbnails()
    // Fokus in den Dialog, damit Esc hier ankommt
    nextTick(() => document.querySelector<HTMLElement>('.picker-modal .picker-close')?.focus())
  },
  { immediate: true }
)

function close() {
  if (busy.value) return
  emit('update:modelValue', false)
}

async function confirm() {
  if (busy.value || selectedIds.value.length === 0) return
  busy.value = true
  progress.value = 0
  // Reihenfolge wie in der Bildliste, nicht nach Klickreihenfolge
  const chosen = props.images.filter((img) => selectedIds.value.includes(img.id))
  const sources: DesignerImageSource[] = []
  const failed: string[] = []
  try {
    for (const img of chosen) {
      try {
        sources.push(await props.convert(img))
      } catch (err) {
        console.error('[ImagePicker] Bild konnte nicht übernommen werden:', err)
        failed.push(img.outputName || img.file.name)
      }
      progress.value++
    }
  } finally {
    busy.value = false
  }
  if (failed.length > 0) {
    toast.warning(t('commentPageDesigner.imagePicker.failed', { names: failed.join(', ') }))
  }
  if (sources.length > 0) emit('add', sources)
  emit('update:modelValue', false)
}
</script>

<style scoped>
.picker-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--ds-space-5);
}

.picker-modal {
  width: min(760px, 100%);
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  background: var(--ds-surface-1);
  border: var(--ds-border-width) solid var(--ds-border);
  border-radius: var(--ds-radius-lg);
  box-shadow: var(--ds-shadow-overlay);
  overflow: hidden;
}

.picker-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--ds-space-4) var(--ds-space-5);
  border-bottom: var(--ds-border-width) solid var(--ds-border);
}

.picker-header h3 {
  margin: 0;
  font-size: var(--ds-text-lg);
  font-weight: var(--ds-weight-semibold);
  color: var(--ds-text);
}

.picker-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: var(--ds-control-md);
  height: var(--ds-control-md);
  border: none;
  border-radius: var(--ds-radius-sm);
  background: transparent;
  color: var(--ds-text-2);
  cursor: pointer;
  transition: color var(--ds-duration) var(--ds-ease);
}

.picker-close:hover {
  color: var(--ds-text);
}

.picker-close:focus-visible,
.picker-link:focus-visible,
.picker-item:focus-visible,
.btn-primary:focus-visible,
.btn-secondary:focus-visible {
  outline: none;
  box-shadow: var(--ds-focus-ring);
}

.picker-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--ds-space-3);
  padding: var(--ds-space-3) var(--ds-space-5);
  font-size: var(--ds-text-sm);
  color: var(--ds-text-2);
}

.picker-link {
  border: none;
  background: none;
  padding: 0;
  font: inherit;
  color: var(--ds-link);
  cursor: pointer;
}

.picker-link:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.picker-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 0 var(--ds-space-5) var(--ds-space-4);
}

.picker-empty {
  margin: var(--ds-space-8) 0;
  text-align: center;
  color: var(--ds-text-2);
  font-size: var(--ds-text-md);
}

.picker-grid {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: var(--ds-space-3);
}

.picker-item {
  position: relative;
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: var(--ds-space-1);
  padding: var(--ds-space-1);
  border: 2px solid var(--ds-border);
  border-radius: var(--ds-radius-md);
  background: var(--ds-surface-0);
  color: var(--ds-text);
  cursor: pointer;
  transition: border-color var(--ds-duration) var(--ds-ease);
}

.picker-item:hover:not(:disabled) {
  border-color: var(--ds-border-strong);
}

.picker-item.selected {
  border-color: var(--ds-accent);
  background: var(--ds-accent-soft);
}

.picker-item:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.picker-thumb {
  display: flex;
  align-items: center;
  justify-content: center;
  aspect-ratio: 1;
  border-radius: var(--ds-radius-sm);
  background: var(--ds-surface-2);
  overflow: hidden;
}

.picker-thumb img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.picker-name {
  font-size: var(--ds-text-xs);
  color: var(--ds-text-2);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-align: left;
}

.picker-check {
  position: absolute;
  top: var(--ds-space-2);
  right: var(--ds-space-2);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: var(--ds-icon-md);
  height: var(--ds-icon-md);
  border-radius: var(--ds-radius-full);
  background: var(--ds-accent);
  color: var(--ds-on-accent);
}

.picker-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--ds-space-3);
  padding: var(--ds-space-4) var(--ds-space-5);
  border-top: var(--ds-border-width) solid var(--ds-border);
}

.picker-count {
  font-size: var(--ds-text-sm);
  color: var(--ds-text-2);
}

.picker-actions {
  display: flex;
  gap: var(--ds-space-2);
}

.btn-secondary,
.btn-primary {
  height: var(--ds-control-md);
  padding: 0 var(--ds-space-4);
  border-radius: var(--ds-radius-sm);
  font-size: var(--ds-text-md);
  font-weight: var(--ds-weight-medium);
  cursor: pointer;
  transition:
    background var(--ds-duration) var(--ds-ease),
    border-color var(--ds-duration) var(--ds-ease);
}

.btn-secondary {
  background: var(--ds-surface-0);
  border: var(--ds-border-width) solid var(--ds-border);
  color: var(--ds-text);
}

.btn-secondary:hover:not(:disabled) {
  border-color: var(--ds-border-strong);
}

.btn-primary {
  background: var(--ds-accent);
  border: var(--ds-border-width) solid var(--ds-accent);
  color: var(--ds-on-accent);
}

.btn-primary:hover:not(:disabled) {
  background: var(--ds-accent-hover);
}

.btn-primary:disabled,
.btn-secondary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.picker-fade-enter-active,
.picker-fade-leave-active {
  transition: opacity var(--ds-duration) var(--ds-ease);
}

.picker-fade-enter-from,
.picker-fade-leave-to {
  opacity: 0;
}

@media (max-width: 600px) {
  .picker-footer {
    flex-direction: column;
    align-items: stretch;
  }

  .picker-actions {
    justify-content: flex-end;
  }
}
</style>
