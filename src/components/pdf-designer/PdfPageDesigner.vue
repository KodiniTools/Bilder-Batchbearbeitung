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

              <!-- Element Properties -->
              <PdfDesignerProperties
                v-if="selectedElement"
                :element="selectedElement"
                :page-width="pageWidth"
                :page-height="pageHeight"
                @update="updateSelectedElement"
                @move-to-front="moveToFront"
                @move-to-back="moveToBack"
                @delete="deleteSelectedElement"
              />

              <!-- Info when no element selected -->
              <div v-else-if="currentElements.length > 0" class="no-selection">
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
              </div>
            </div>

            <!-- Canvas Area -->
            <div class="canvas-area">
              <PdfDesignerPageToolbar
                v-if="!isCover"
                :pages="pages"
                :current-page-index="currentPageIndex"
                :element-count="currentElements.length"
                @previous="previousPage"
                @next="nextPage"
                @go-to-page="goToPage"
                @add-page="addNewPage"
                @delete-page="deletePage"
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
                      :selected="selectedElement?.id === element.id"
                      :editing="editingTextId === element.id"
                      @select="selectElement"
                      @edit-start="startInlineEdit"
                      @edit-stop="stopInlineEdit"
                      @resize-start="startTextResize"
                      @update-content="updateElementContent"
                    />
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
import { usePdfPages } from '@/composables/usePdfPages'
import { useCanvasInteraction } from '@/composables/useCanvasInteraction'
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
  addTextElement,
  triggerImageUpload,
  handleImageUpload,
  clearCurrentPage,
  deleteSelectedElement,
  moveToFront,
  moveToBack,
  startInlineEdit,
  stopInlineEdit,
  handleCanvasClick,
} = usePdfPages({ pageWidth, pageHeight, imageInput, canvasRef, singlePage: isCover })

// Direct manipulation: drag / resize / zoom
const {
  zoomLevel,
  canvasVerticalPadding,
  selectElement,
  startTextResize,
  zoomIn,
  zoomOut,
  fitToScreen,
  resetZoom,
} = useCanvasInteraction({
  selectedElement,
  editingTextId,
  pageWidth,
  pageHeight,
  canvasWrapperRef,
})

// Property-Panel: Teil-Patch auf das ausgewählte Element anwenden (Single Source of Truth hier)
function updateSelectedElement(patch: Partial<PdfElement>) {
  if (selectedElement.value) Object.assign(selectedElement.value, patch)
}

// Inline-Editor: Textinhalt eines Elements der aktuellen Seite setzen
function updateElementContent(id: string, content: string) {
  const el = currentElements.value.find((e) => e.id === id)
  if (el) el.content = content
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

// Keyboard shortcuts
function handleKeyDown(event: KeyboardEvent) {
  // Don't handle shortcuts while editing text inline
  if (editingTextId.value) return

  if ((event.key === 'Delete' || event.key === 'Backspace') && selectedElement.value) {
    event.preventDefault()
    deleteSelectedElement()
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

  if (event.ctrlKey && event.key === 'n') {
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
