<template>
  <Teleport to="#modal-portal">
    <Transition name="modal">
      <div v-if="modelValue" class="modal-overlay" @click.self="handleClose">
        <div class="designer-modal">
          <PdfDesignerHeader
            :title="isCover ? t('frontPageDesigner.title') : t('commentPageDesigner.title')"
            :orientation="orientation"
            :page-count="isCover ? undefined : pages.length"
            @close="handleClose"
          />

          <div class="modal-body">
            <!-- Left Sidebar - Tools & Settings -->
            <div class="sidebar">
              <HistoryActions
                compact
                :can-undo="canUndo"
                :can-redo="canRedo"
                :undo-title="t('commentPageDesigner.history.undoTitle')"
                :redo-title="t('commentPageDesigner.history.redoTitle')"
                @undo="undo"
                @redo="redo"
              />

              <PdfDesignerTools
                :element-count="currentElements.length"
                @add-text="addTextElement"
                @add-image="triggerImageUpload"
                @clear-page="clearCurrentPage"
              />
              <input
                ref="imageInput"
                type="file"
                accept="image/*"
                style="display: none"
                @change="handleImageUpload"
              />

              <!-- Ausrichten, Verteilen, Duplizieren (auch Mehrfachauswahl) -->
              <PdfDesignerArrange
                v-if="selectedIds.length > 0"
                :count="selectedIds.length"
                @align="alignSelected"
                @distribute="distributeSelected"
                @duplicate="duplicateSelected"
                @delete="deleteSelectedElement"
              />

              <!-- Element Properties (nur Einzelauswahl) -->
              <PdfDesignerProperties
                v-if="selectedElement && selectedIds.length === 1"
                :element="selectedElement"
                :page-width="pageWidth"
                :page-height="pageHeight"
                @update="updateSelectedElement"
                @move-to-front="moveToFront"
                @move-to-back="moveToBack"
                @delete="deleteSelectedElement"
              />

              <!-- Info when no element selected -->
              <div
                v-else-if="currentElements.length > 0 && selectedIds.length === 0"
                class="no-selection"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="48"
                  height="48"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.5"
                >
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="16" x2="12" y2="12"></line>
                  <line x1="12" y1="8" x2="12.01" y2="8"></line>
                </svg>
                <p>{{ t('commentPageDesigner.properties.noSelection') }}</p>
                <p class="shortcut-hint">{{ t('commentPageDesigner.shortcutsHint') }}</p>
              </div>
            </div>

            <!-- Canvas Area -->
            <div class="canvas-area">
              <PdfDesignerPageToolbar
                v-if="!isCover"
                :pages="pages"
                :current-page-index="currentPageIndex"
                :element-count="currentElements.length"
                :page-width="pageWidth"
                :page-height="pageHeight"
                @previous="previousPage"
                @next="nextPage"
                @go-to-page="goToPage"
                @add-page="addNewPage"
                @delete-page="deletePage"
                @duplicate-page="duplicatePage"
                @move-page="movePage"
              />

              <PdfDesignerZoomControls
                :zoom-level="zoomLevel"
                @zoom-in="zoomIn"
                @zoom-out="zoomOut"
                @reset="resetZoom"
              />

              <div ref="canvasWrapperRef" class="canvas-wrapper">
                <div
                  class="canvas-inner"
                  :style="{
                    paddingTop: canvasVerticalPadding + 'px',
                    paddingBottom: canvasVerticalPadding + 'px',
                  }"
                >
                  <div
                    ref="canvasRef"
                    class="canvas"
                    :style="{
                      width: pageWidth + 'px',
                      height: pageHeight + 'px',
                      transform: `scale(${zoomLevel})`,
                      transformOrigin: 'top left',
                      marginRight: `${pageWidth * (zoomLevel - 1)}px`,
                      marginBottom: `${pageHeight * (zoomLevel - 1)}px`,
                    }"
                    @mousedown="handleCanvasClick"
                  >
                    <!-- PDF Footer Preview (shows what will appear in exported PDF) -->
                    <div v-if="!isCover" class="canvas-footer-preview">
                      {{ footerPreviewText }}
                    </div>

                    <!-- Render elements for current page -->
                    <PdfDesignerElement
                      v-for="element in currentElements"
                      :key="element.id"
                      :element="element"
                      :selected="selectedIds.includes(element.id)"
                      :handles="selectedIds.length === 1"
                      :editing="editingTextId === element.id"
                      @select="selectElement"
                      @edit-start="startInlineEdit"
                      @edit-stop="stopInlineEdit"
                      @resize-start="startTextResize"
                      @update-content="updateElementContent"
                    />

                    <!-- Hilfslinien beim Ziehen (Einrasten) -->
                    <div
                      v-for="gx in guides.x"
                      :key="'gx' + gx"
                      class="snap-guide snap-guide--v"
                      :style="{ left: gx + 'px' }"
                    ></div>
                    <div
                      v-for="gy in guides.y"
                      :key="'gy' + gy"
                      class="snap-guide snap-guide--h"
                      :style="{ top: gy + 'px' }"
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <PdfDesignerFooter
            :info-text="footerInfoText"
            :total-element-count="getTotalElementCount()"
            @cancel="handleClose"
            @preview="openPreview"
            @save="handleSave"
          />
        </div>
      </div>
    </Transition>
  </Teleport>

  <!-- Vorschau-Modal -->
  <PdfDesignerPreview
    v-model="showPreview"
    :title="isCover ? t('frontPageDesigner.previewTitle') : t('commentPageDesigner.previewTitle')"
    :show-footer="!isCover"
    :pages="pages"
    :page-width="pageWidth"
    :page-height="pageHeight"
    :orientation="orientation"
    :initial-page="currentPageIndex"
    @save="handleSave"
  />
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onMounted, onUnmounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { commentFooterText } from '@/utils/i18nFormat'
import PdfDesignerHeader from './PdfDesignerHeader.vue'
import PdfDesignerTools from './PdfDesignerTools.vue'
import PdfDesignerPageToolbar from './PdfDesignerPageToolbar.vue'
import PdfDesignerZoomControls from './PdfDesignerZoomControls.vue'
import PdfDesignerFooter from './PdfDesignerFooter.vue'
import PdfDesignerElement from './PdfDesignerElement.vue'
import PdfDesignerProperties from './PdfDesignerProperties.vue'
import PdfDesignerPreview from './PdfDesignerPreview.vue'
import PdfDesignerArrange from './PdfDesignerArrange.vue'
import HistoryActions from '../HistoryActions.vue'
import { usePdfPages } from '@/composables/usePdfPages'
import { useCanvasInteraction } from '@/composables/useCanvasInteraction'
import { useDesignerHistory } from '@/composables/useDesignerHistory'
import type { PdfElement } from '@/lib/features/export-pdf'

const { t, locale } = useI18n()

// Props — v-model based public API
const props = withDefaults(
  defineProps<{
    /** Sichtbarkeit des Designers (v-model) */
    modelValue?: boolean
    /** Bereits gespeicherte Elemente, werden beim Öffnen geladen */
    initialElements?: PdfElement[]
    orientation?: 'portrait' | 'landscape'
    /**
     * cover: eine einzelne Startseite (ohne Seitenverwaltung und Fußzeile);
     * comment: beliebig viele Kommentarseiten
     */
    mode?: 'cover' | 'comment'
  }>(),
  {
    modelValue: false,
    initialElements: () => [],
    orientation: 'portrait',
    mode: 'comment',
  }
)

const isCover = computed(() => props.mode === 'cover')

// Emits — v-model and @save
const emit = defineEmits<{
  'update:modelValue': [visible: boolean]
  save: [elements: PdfElement[]]
}>()

// Canvas dimensions (A4 bei 96 DPI) — abhängig von Orientierung
const pageWidth = computed(() => (props.orientation === 'landscape' ? 1123 : 794))
const pageHeight = computed(() => (props.orientation === 'landscape' ? 794 : 1123))

// Template refs
const canvasRef = ref<HTMLElement | null>(null)
const canvasWrapperRef = ref<HTMLElement | null>(null)
const imageInput = ref<HTMLInputElement | null>(null)

// Vorschau-State
const showPreview = ref(false)

// Document state + element/page operations
const {
  pages,
  currentPageIndex,
  selectedElement,
  selectedIds,
  selectedElements,
  editingTextId,
  currentElements,
  getTotalElementCount,
  initFromElements,
  exportElements,
  addNewPage,
  deletePage,
  previousPage,
  nextPage,
  goToPage,
  duplicatePage,
  movePage,
  selectElement: setSelection,
  selectAll,
  clearSelection,
  reselectAfterRestore,
  addTextElement,
  triggerImageUpload,
  handleImageUpload,
  clearCurrentPage,
  deleteSelectedElement,
  moveToFront,
  moveToBack,
  duplicateSelected,
  copySelected,
  pasteClipboard,
  nudgeSelected,
  alignSelected,
  distributeSelected,
  startInlineEdit,
  stopInlineEdit,
  handleCanvasClick,
} = usePdfPages({
  pageWidth,
  pageHeight,
  imageInput,
  canvasRef,
  singlePage: isCover,
  onBeforeChange: (key) => checkpoint(key),
})

// Undo/Redo (Strg+Z / Strg+Y)
const {
  canUndo,
  canRedo,
  checkpoint,
  undo,
  redo,
  reset: resetHistory,
} = useDesignerHistory({
  pages,
  currentPageIndex,
  onRestore: reselectAfterRestore,
})

// Direct manipulation: drag / resize / zoom
const {
  zoomLevel,
  canvasVerticalPadding,
  guides,
  selectElement,
  startTextResize,
  zoomIn,
  zoomOut,
  fitToScreen,
  resetZoom,
} = useCanvasInteraction({
  selectedElement,
  selectedElements,
  currentElements,
  editingTextId,
  pageWidth,
  pageHeight,
  canvasWrapperRef,
  onSelect: setSelection,
  onBeforeChange: () => checkpoint(),
})

// Property-Panel: Teil-Patch auf das ausgewählte Element anwenden (Single Source of Truth hier)
function updateSelectedElement(patch: Partial<PdfElement>) {
  const el = selectedElement.value
  if (!el) return
  // Fortlaufende Änderungen desselben Felds (Regler, Tippen) = ein Undo-Schritt
  checkpoint(`prop:${el.id}:${Object.keys(patch).join(',')}`)
  Object.assign(el, patch)
}

// Inline-Editor: Textinhalt eines Elements der aktuellen Seite setzen
function updateElementContent(id: string, content: string) {
  const el = currentElements.value.find((e) => e.id === id)
  if (!el) return
  checkpoint(`content:${id}`)
  el.content = content
}

// Info links im Footer: Seitenposition (Kommentarseiten) bzw. Elementanzahl (Startseite)
const footerInfoText = computed(() => {
  const count = getTotalElementCount()
  if (isCover.value) return t('frontPageDesigner.footer.elementCount', { count }, count)
  return t('commentPageDesigner.footer.info', {
    current: currentPageIndex.value + 1,
    total: pages.value.length,
    count,
  })
})

// Footer preview text (matches PDF export footer)
const footerPreviewText = computed(() => {
  return commentFooterText(t, locale.value, currentPageIndex.value + 1, pages.value.length)
})

function openPreview() {
  showPreview.value = true
}

// Load initial elements when the modal opens — distribute by page number
watch(
  () => props.modelValue,
  (newVal) => {
    if (newVal) {
      initFromElements(props.initialElements)
      resetHistory()
      nextTick(() => fitToScreen())
    }
  }
)

// Auto-fit on orientation change
watch(
  () => props.orientation,
  () => {
    nextTick(() => fitToScreen())
  }
)

// Close handler — v-model
function handleClose() {
  emit('update:modelValue', false)
}

function handleSave() {
  emit('save', exportElements())
  emit('update:modelValue', false)
}

/** Tastatureingaben in Formularfeldern nicht als Designer-Kürzel behandeln */
function isTypingTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null
  if (!el || !el.tagName) return false
  return el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName)
}

// Keyboard shortcuts
function handleKeyDown(event: KeyboardEvent) {
  // Nur bei geöffnetem Designer (beide Instanzen sind dauerhaft gemountet)
  if (!props.modelValue || showPreview.value) return
  // Don't handle shortcuts while editing text inline or typing in the properties panel
  if (editingTextId.value || isTypingTarget(event.target)) return

  const mod = event.ctrlKey || event.metaKey
  const key = event.key.toLowerCase()

  if (mod && key === 'z' && !event.shiftKey) {
    event.preventDefault()
    undo()
    return
  }
  if (mod && (key === 'y' || (key === 'z' && event.shiftKey))) {
    event.preventDefault()
    redo()
    return
  }
  if (mod && key === 'a') {
    event.preventDefault()
    selectAll()
    return
  }
  if (mod && key === 'd') {
    event.preventDefault()
    duplicateSelected()
    return
  }
  if (mod && key === 'c') {
    if (copySelected()) event.preventDefault()
    return
  }
  if (mod && key === 'v') {
    if (pasteClipboard()) event.preventDefault()
    return
  }

  if ((event.key === 'Delete' || event.key === 'Backspace') && selectedIds.value.length > 0) {
    event.preventDefault()
    deleteSelectedElement()
    return
  }

  if (event.key === 'Escape' && selectedIds.value.length > 0) {
    event.preventDefault()
    clearSelection()
    return
  }

  // Pfeiltasten verschieben die Auswahl (Umschalt: 10 px)
  const NUDGE: Record<string, [number, number]> = {
    ArrowLeft: [-1, 0],
    ArrowRight: [1, 0],
    ArrowUp: [0, -1],
    ArrowDown: [0, 1],
  }
  if (!mod && NUDGE[event.key] && selectedIds.value.length > 0) {
    event.preventDefault()
    const step = event.shiftKey ? 10 : 1
    nudgeSelected(NUDGE[event.key][0] * step, NUDGE[event.key][1] * step)
    return
  }

  // Seiten-Shortcuts nur bei mehrseitigen Kommentarseiten
  if (isCover.value) return

  if (event.ctrlKey && event.key === 'ArrowLeft') {
    event.preventDefault()
    previousPage()
  }
  if (event.ctrlKey && event.key === 'ArrowRight') {
    event.preventDefault()
    nextPage()
  }

  if (event.ctrlKey && key === 'n') {
    event.preventDefault()
    addNewPage()
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleKeyDown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeyDown)
})
</script>

<style scoped>
/* Base Modal Styles */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 20px;
}

.designer-modal {
  width: 95vw;
  height: 90vh;
  max-width: 1400px;
  background: var(--bg);
  border-radius: 16px;
  box-shadow: var(--ds-shadow-overlay);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* Main Body */
.modal-body {
  display: flex;
  flex: 1;
  overflow: hidden;
}

/* Sidebar */
.sidebar {
  width: 300px;
  background: var(--panel);
  border-right: 1px solid var(--border-color);
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px;
}

.no-selection {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  text-align: center;
  color: var(--muted);
}

.no-selection svg {
  margin-bottom: 12px;
  opacity: 0.5;
}

.no-selection p {
  margin: 0;
  font-size: 13px;
}

.no-selection .shortcut-hint {
  margin-top: var(--space-3);
  font-size: 11px;
  line-height: 1.5;
  opacity: 0.8;
}

/* Hilfslinien beim Einrasten */
.snap-guide {
  position: absolute;
  pointer-events: none;
  z-index: 10000;
  background: var(--accent);
}

.snap-guide--v {
  top: 0;
  bottom: 0;
  width: 1px;
}

.snap-guide--h {
  left: 0;
  right: 0;
  height: 1px;
}

/* Canvas Area */
.canvas-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}

.canvas-wrapper {
  flex: 1;
  overflow: auto;
  background:
    linear-gradient(90deg, var(--border-color) 1px, transparent 1px),
    linear-gradient(var(--border-color) 1px, transparent 1px);
  background-size: 20px 20px;
  background-position: -1px -1px;
  background-color: var(--panel);
}

.canvas-inner {
  width: fit-content;
  margin: 0 auto;
  padding-left: 40px;
  padding-right: 40px;
  /* padding-top / padding-bottom werden dynamisch per :style gesetzt */
}

.canvas {
  background: white;
  box-shadow: 0 10px 40px -10px rgba(0, 0, 0, 0.2);
  border-radius: 4px;
  position: relative;
  flex-shrink: 0;
  transform-origin: top left;
  transition:
    transform 0.2s ease,
    margin-right 0.2s ease,
    margin-bottom 0.2s ease;
}

/* PDF Footer Preview (nur Kommentarseiten) — entspricht der Fußzeile in renderSingleCommentPage (pageHeight − 10 mm) */
.canvas-footer-preview {
  position: absolute;
  bottom: 30px;
  left: 0;
  right: 0;
  text-align: center;
  font-family: Helvetica, Arial, sans-serif;
  font-size: 9px;
  line-height: 1;
  color: rgb(150, 150, 150);
  pointer-events: none;
  user-select: none;
}

/* Transitions */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease;
}

.modal-enter-active .designer-modal,
.modal-leave-active .designer-modal {
  transition: transform 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .designer-modal,
.modal-leave-to .designer-modal {
  transform: scale(0.95);
}

/* Responsive */
@media (max-width: 1200px) {
  .sidebar {
    width: 280px;
  }

  .designer-modal {
    width: 98vw;
    height: 95vh;
  }
}

@media (max-width: 768px) {
  .modal-overlay {
    padding: 0;
  }

  .designer-modal {
    width: 100vw;
    height: 100vh;
    border-radius: 0;
  }

  .modal-body {
    flex-direction: column;
  }

  .sidebar {
    width: 100%;
    max-height: 40vh;
    border-right: none;
    border-bottom: 1px solid var(--border-color);
  }

  .canvas-inner {
    padding: 20px;
  }
}

@media (max-width: 480px) {
  .designer-modal {
    height: 100dvh;
  }

  .sidebar {
    max-height: 35vh;
  }

  .canvas-inner {
    padding: 10px;
  }
}
</style>
