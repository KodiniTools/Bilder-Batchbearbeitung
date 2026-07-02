<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="modelValue" class="modal-overlay" @click.self="handleClose">
        <div class="designer-modal">
          <!-- Header -->
          <div class="modal-header">
            <h2>
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
              {{ t('commentPageDesigner.title') }}
            </h2>

            <!-- Orientation Badge -->
            <div class="orientation-badge" :class="orientation">
              {{ orientation === 'landscape' ? '⬛ Querformat' : '▯ Hochformat' }}
            </div>

            <!-- Page Counter Badge -->
            <div class="page-badge">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
              </svg>
              {{ pages.length }} {{ pages.length === 1 ? t('commentPageDesigner.page.singular') : t('commentPageDesigner.page.plural') }}
            </div>

            <button class="close-btn" :title="t('commentPageDesigner.close')" @click="handleClose">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          <!-- Main Content -->
          <div class="modal-body">
            <!-- Left Sidebar - Tools & Settings -->
            <div class="sidebar">
              <!-- Element Tools Section -->
              <div class="tool-section">
                <h3>
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 19l7-7 3 3-7 7-3-3z"></path>
                    <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"></path>
                    <path d="M2 2l7.586 7.586"></path>
                  </svg>
                  {{ t('commentPageDesigner.tools.title') }}
                </h3>

                <!-- Add Text Button -->
                <button class="tool-btn" :disabled="currentElements.length >= 20" @click="addTextElement">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="4 7 4 4 20 4 20 7"></polyline>
                    <line x1="9" y1="20" x2="15" y2="20"></line>
                    <line x1="12" y1="4" x2="12" y2="20"></line>
                  </svg>
                  {{ t('commentPageDesigner.tools.addText') }}
                </button>

                <!-- Add Image Button -->
                <button class="tool-btn" :disabled="currentElements.length >= 20" @click="triggerImageUpload">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                    <circle cx="8.5" cy="8.5" r="1.5"></circle>
                    <polyline points="21 15 16 10 5 21"></polyline>
                  </svg>
                  {{ t('commentPageDesigner.tools.addImage') }}
                </button>
                <input
                    ref="imageInput"
                    type="file"
                    accept="image/*"
                    style="display: none"
                    @change="handleImageUpload"
                >

                <!-- Clear Current Page Button -->
                <button v-if="currentElements.length > 0" class="tool-btn danger" @click="clearCurrentPage">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                  </svg>
                  {{ t('commentPageDesigner.tools.clearPage') }}
                </button>
              </div>

              <!-- Element Properties -->
              <CommentPageDesignerProperties
                  v-if="selectedElement"
                  :element="selectedElement"
                  :page-width="pageWidth"
                  :page-height="pageHeight"
                  @move-to-front="moveToFront"
                  @move-to-back="moveToBack"
                  @delete="deleteSelectedElement"
              />

              <!-- Info when no element selected -->
              <div v-else-if="currentElements.length > 0" class="no-selection">
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="16" x2="12" y2="12"></line>
                  <line x1="12" y1="8" x2="12.01" y2="8"></line>
                </svg>
                <p>{{ t('commentPageDesigner.properties.noSelection') }}</p>
              </div>
            </div>

            <!-- Canvas Area -->
            <div class="canvas-area">
              <!-- Page Navigation Toolbar -->
              <div class="page-toolbar">
                <div class="page-toolbar-left">
                  <button
                      :disabled="currentPageIndex === 0"
                      class="ptb-btn"
                      :title="t('commentPageDesigner.pageManagement.previousPage')"
                      @click="previousPage"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polyline points="15 18 9 12 15 6"></polyline>
                    </svg>
                  </button>

                  <div class="ptb-thumbs">
                    <button
                        v-for="(page, index) in pages"
                        :key="page.id"
                        :class="['ptb-thumb', { active: index === currentPageIndex }]"
                        :title="t('commentPageDesigner.pageManagement.pageTitle', { number: index + 1 })"
                        @click="goToPage(index)"
                    >{{ index + 1 }}</button>
                  </div>

                  <button
                      :disabled="currentPageIndex === pages.length - 1"
                      class="ptb-btn"
                      :title="t('commentPageDesigner.pageManagement.nextPage')"
                      @click="nextPage"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polyline points="9 18 15 12 9 6"></polyline>
                    </svg>
                  </button>

                  <span class="ptb-info">
                    {{ t('commentPageDesigner.pageManagement.pageOf', { current: currentPageIndex + 1, total: pages.length }) }}
                    <span class="ptb-elem-count">· {{ t('commentPageDesigner.pageManagement.elementCount', { count: currentElements.length }, currentElements.length) }}</span>
                  </span>
                </div>

                <div class="page-toolbar-right">
                  <button class="ptb-action primary" :title="t('commentPageDesigner.pageManagement.addPageTooltip')" @click="addNewPage">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                      <polyline points="14 2 14 8 20 8"/>
                      <line x1="12" y1="18" x2="12" y2="12"></line>
                      <line x1="9" y1="15" x2="15" y2="15"></line>
                    </svg>
                    {{ t('commentPageDesigner.pageManagement.addPageButton') }}
                  </button>

                  <button
                      class="ptb-action danger"
                      :disabled="pages.length === 1"
                      :title="t('commentPageDesigner.pageManagement.deletePageTooltip')"
                      @click="deletePage"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polyline points="3 6 5 6 21 6"></polyline>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                    {{ t('commentPageDesigner.pageManagement.deletePageButton') }}
                  </button>
                </div>
              </div>

              <!-- Zoom Controls -->
              <div class="zoom-controls">
                <button :disabled="zoomLevel <= 0.25" :title="t('commentPageDesigner.zoom.zoomOut')" @click="zoomOut">−</button>
                <span>{{ Math.round(zoomLevel * 100) }}%</span>
                <button :disabled="zoomLevel >= 2" :title="t('commentPageDesigner.zoom.zoomIn')" @click="zoomIn">+</button>
                <button :title="t('commentPageDesigner.zoom.reset')" @click="resetZoom">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"></path>
                    <path d="M21 3v5h-5"></path>
                    <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"></path>
                    <path d="M3 21v-5h5"></path>
                  </svg>
                </button>
              </div>

              <div ref="canvasWrapperRef" class="canvas-wrapper">
                <div class="canvas-inner" :style="{ paddingTop: canvasVerticalPadding + 'px', paddingBottom: canvasVerticalPadding + 'px' }">
                <div
                    ref="canvasRef"
                    class="canvas"
                    :style="{
                    width: pageWidth + 'px',
                    height: pageHeight + 'px',
                    transform: `scale(${zoomLevel})`,
                    transformOrigin: 'top left',
                    marginRight: `${pageWidth * (zoomLevel - 1)}px`,
                    marginBottom: `${pageHeight * (zoomLevel - 1)}px`
                  }"
                    @mousedown="handleCanvasClick"
                >
                  <!-- PDF Footer Preview (shows what will appear in exported PDF) -->
                  <div class="canvas-footer-preview">
                    {{ footerPreviewText }}
                  </div>

                  <!-- Render elements for current page -->
                  <CommentPageDesignerElement
                      v-for="element in currentElements"
                      :key="element.id"
                      :element="element"
                      :selected="selectedElement?.id === element.id"
                      :editing="editingTextId === element.id"
                      @select="selectElement"
                      @edit-start="startInlineEdit"
                      @edit-stop="stopInlineEdit"
                      @resize-start="startTextResize"
                  />
                </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Footer -->
          <div class="modal-footer">
            <div class="footer-info">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="16" x2="12" y2="12"></line>
                <line x1="12" y1="8" x2="12.01" y2="8"></line>
              </svg>
              <span>{{ t('commentPageDesigner.footer.info', { current: currentPageIndex + 1, total: pages.length, count: getTotalElementCount() }) }}</span>
            </div>
            <div class="footer-actions">
              <button class="btn-secondary" @click="handleClose">{{ t('commentPageDesigner.footer.cancel') }}</button>
              <button class="btn-preview" :disabled="getTotalElementCount() === 0" @click="openPreview">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                  <circle cx="12" cy="12" r="3"></circle>
                </svg>
                Vorschau
              </button>
              <button
                  class="btn-primary"
                  @click="handleSave"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                {{ t('commentPageDesigner.footer.save', { count: getTotalElementCount(), elements: getTotalElementCount() === 1 ? t('commentPageDesigner.element.singular') : t('commentPageDesigner.element.plural') }) }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>

  <!-- Vorschau-Modal -->
  <CommentPageDesignerPreview
      v-model="showPreview"
      :pages="pages"
      :page-width="pageWidth"
      :page-height="pageHeight"
      :orientation="orientation"
      :initial-page="currentPageIndex"
      @save="handleSave"
  />
</template>

<script setup>
import { ref, computed, nextTick, onMounted, onUnmounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import CommentPageDesignerElement from './CommentPageDesignerElement.vue'
import CommentPageDesignerProperties from './CommentPageDesignerProperties.vue'
import CommentPageDesignerPreview from './CommentPageDesignerPreview.vue'
import { useCommentPages } from '@/composables/useCommentPages'
import { useCanvasInteraction } from '@/composables/useCanvasInteraction'

const { t } = useI18n()

// Props — v-model based public API
const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  initialElements: {
    type: Array,
    default: () => []
  },
  orientation: {
    type: String,
    default: 'portrait'
  }
})

// Emits — v-model and @save
const emit = defineEmits(['update:modelValue', 'save'])

// Canvas dimensions (A4 bei 96 DPI) — abhängig von Orientierung
const pageWidth = computed(() => props.orientation === 'landscape' ? 1123 : 794)
const pageHeight = computed(() => props.orientation === 'landscape' ? 794 : 1123)

// Template refs
const canvasRef = ref(null)
const canvasWrapperRef = ref(null)
const imageInput = ref(null)

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
  handleCanvasClick
} = useCommentPages({ pageWidth, pageHeight, imageInput, canvasRef })

// Direct manipulation: drag / resize / zoom
const {
  zoomLevel,
  canvasVerticalPadding,
  selectElement,
  startTextResize,
  zoomIn,
  zoomOut,
  fitToScreen,
  resetZoom
} = useCanvasInteraction({ selectedElement, editingTextId, pageWidth, pageHeight, canvasWrapperRef })

// Footer preview text (matches PDF export footer)
const footerPreviewText = computed(() => {
  const dateStr = new Date().toLocaleDateString('de-DE')
  const pageNum = currentPageIndex.value + 1
  const total = pages.value.length
  return `Erstellt am ${dateStr} • Kommentarseite ${pageNum}${total > 1 ? ` von ${total}` : ''}`
})

function openPreview() {
  showPreview.value = true
}

// Load initial elements when the modal opens — distribute by page number
watch(() => props.modelValue, (newVal) => {
  if (newVal) {
    initFromElements(props.initialElements)
    nextTick(() => fitToScreen())
  }
})

// Auto-fit on orientation change
watch(() => props.orientation, () => {
  nextTick(() => fitToScreen())
})

// Close handler — v-model
function handleClose() {
  emit('update:modelValue', false)
}

function handleSave() {
  emit('save', exportElements())
  emit('update:modelValue', false)
}

// Keyboard shortcuts
function handleKeyDown(event) {
  // Don't handle shortcuts while editing text inline
  if (editingTextId.value) return

  if ((event.key === 'Delete' || event.key === 'Backspace') && selectedElement.value) {
    event.preventDefault()
    deleteSelectedElement()
  }

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
  backdrop-filter: blur(4px);
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
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* Header */
.modal-header {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px 24px;
  border-bottom: 1px solid var(--border-color);
  background: linear-gradient(135deg, var(--accent) 0%, var(--accent-hover) 100%);
  color: var(--accent-text);
}

.modal-header h2 {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 20px;
  font-weight: 600;
  margin: 0;
  flex: 1;
}

.orientation-badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  background: var(--accent);
  color: white;
  white-space: nowrap;
}

.page-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: color-mix(in oklab, var(--accent-text) 15%, transparent);
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  backdrop-filter: blur(10px);
}

.close-btn {
  width: 36px;
  height: 36px;
  border: none;
  background: color-mix(in oklab, var(--accent-text) 15%, transparent);
  color: var(--accent-text);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn:hover {
  background: color-mix(in oklab, var(--accent-text) 25%, transparent);
  transform: scale(1.05);
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

/* Page Toolbar (above canvas) */
.page-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 14px;
  background: var(--panel);
  border-bottom: 1px solid var(--border-color);
  flex-shrink: 0;
}

.page-toolbar-left {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
  min-width: 0;
}

.page-toolbar-right {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.ptb-btn {
  width: 30px;
  height: 30px;
  border: 1px solid var(--border-color);
  background: var(--bg);
  color: var(--text);
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  flex-shrink: 0;
}

.ptb-btn:hover:not(:disabled) {
  background: var(--accent);
  color: var(--accent-text);
  border-color: var(--accent);
}

.ptb-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.ptb-thumbs {
  display: flex;
  gap: 4px;
  overflow-x: auto;
  padding: 2px;
  flex-shrink: 1;
  min-width: 0;
}

.ptb-thumb {
  min-width: 28px;
  height: 28px;
  padding: 0 6px;
  border: 1px solid var(--border-color);
  background: var(--bg);
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 500;
  color: var(--muted);
  transition: all 0.2s;
  flex-shrink: 0;
}

.ptb-thumb:hover {
  border-color: var(--accent);
  color: var(--accent);
}

.ptb-thumb.active {
  background: linear-gradient(135deg, var(--accent) 0%, var(--accent-hover) 100%);
  color: var(--accent-text);
  border-color: transparent;
  font-weight: 600;
}

.ptb-info {
  font-size: 12px;
  font-weight: 600;
  color: var(--text);
  white-space: nowrap;
  padding-left: 4px;
}

.ptb-elem-count {
  font-weight: 400;
  color: var(--muted);
}

.ptb-action {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  height: 30px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  border: 1px solid var(--border-color);
  background: var(--bg);
  color: var(--text);
  transition: all 0.2s;
  white-space: nowrap;
}

.ptb-action:hover:not(:disabled) {
  border-color: var(--accent);
  color: var(--accent);
}

.ptb-action.primary {
  background: linear-gradient(135deg, var(--accent) 0%, var(--accent-hover) 100%);
  color: var(--accent-text);
  border-color: transparent;
}

.ptb-action.primary:hover:not(:disabled) {
  opacity: 0.9;
  color: var(--accent-text);
}

.ptb-action.danger {
  border-color: var(--red, #e53e3e);
  color: var(--red, #e53e3e);
}

.ptb-action.danger:hover:not(:disabled) {
  background: var(--red, #e53e3e);
  color: white;
}

.ptb-action:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

/* Tool Section */
.tool-section {
  background: var(--bg);
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 1px 3px var(--shadow-color);
  border: 1px solid var(--border-color);
}

.tool-section h3 {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
  margin: 0 0 12px 0;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--border-color);
}

.tool-btn {
  width: 100%;
  padding: 10px 16px;
  border: 1px solid var(--border-color);
  background: var(--bg);
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  color: var(--text);
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.tool-btn:hover:not(:disabled) {
  background: var(--panel);
  border-color: var(--accent);
  color: var(--accent);
}

.tool-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.tool-btn.primary {
  background: linear-gradient(135deg, var(--accent) 0%, var(--accent-hover) 100%);
  color: var(--accent-text);
  border: none;
  font-weight: 600;
}

.tool-btn.primary:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px color-mix(in oklab, var(--accent) 30%, transparent);
}

.tool-btn.danger {
  background: color-mix(in oklab, var(--red) 15%, var(--bg));
  border-color: color-mix(in oklab, var(--red) 40%, var(--border-color));
  color: var(--red);
}

.tool-btn.danger:hover:not(:disabled) {
  background: color-mix(in oklab, var(--red) 25%, var(--bg));
  border-color: var(--red);
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

.zoom-controls {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px;
  background: var(--panel);
  border-bottom: 1px solid var(--border-color);
}

.zoom-controls button {
  width: 32px;
  height: 32px;
  border: 1px solid var(--border-color);
  background: var(--bg);
  color: var(--text);
  border-radius: 6px;
  cursor: pointer;
  font-size: 18px;
  font-weight: 500;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.zoom-controls button:hover:not(:disabled) {
  background: var(--panel);
  border-color: var(--accent);
}

.zoom-controls button:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.zoom-controls span {
  font-size: 13px;
  font-weight: 500;
  color: var(--text);
  min-width: 50px;
  text-align: center;
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
  transition: transform 0.2s ease, margin-right 0.2s ease, margin-bottom 0.2s ease;
}

.canvas-grid {
  display: none;
}

/* PDF Footer Preview — matches renderSingleCommentPage footer at pageHeight-10mm */
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

/* Footer */
.modal-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  border-top: 1px solid var(--border-color);
  background: var(--panel);
}

.footer-info {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--muted);
}

.footer-info svg {
  color: var(--muted);
}

.footer-actions {
  display: flex;
  gap: 12px;
}

.btn-secondary,
.btn-primary {
  padding: 10px 24px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn-secondary {
  background: var(--bg);
  border: 1px solid var(--border-color);
  color: var(--text);
}

.btn-secondary:hover {
  background: var(--panel);
  border-color: var(--muted);
}

.btn-primary {
  background: linear-gradient(135deg, var(--accent) 0%, var(--accent-hover) 100%);
  border: none;
  color: var(--accent-text);
  font-weight: 600;
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px color-mix(in oklab, var(--accent) 40%, transparent);
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
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

  .page-thumbnails {
    max-width: 150px;
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

  .page-thumbnails {
    max-width: 100px;
  }
}

/* ---- Vorschau ---- */
.btn-preview {
  padding: 8px 16px;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 6px;
  border: 1px solid var(--accent);
  background: transparent;
  color: var(--accent);
  font-size: 0.9rem;
}
.btn-preview:hover:not(:disabled) {
  background: color-mix(in oklab, var(--accent) 10%, transparent);
}
.btn-preview:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
</style>
