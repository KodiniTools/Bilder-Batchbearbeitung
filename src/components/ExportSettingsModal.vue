<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="isOpen" class="modal-overlay" @click.self="$emit('close')">
        <div class="modal-content">
          <div class="modal-header">
            <h2>{{ getModalTitle() }}</h2>
            <button class="close-btn" @click="$emit('close')">×</button>
          </div>

          <div class="modal-body">
            <!-- PDF Export Settings -->
            <template v-if="mode === 'pdf-all' || mode === 'pdf-selected'">
              <!-- Orientation -->
              <div class="setting-group">
                <label>{{ t('exportModal.pdf.orientation.label') }}:</label>
                <select v-model="settings.orientation">
                  <option value="portrait">{{ t('exportModal.pdf.orientation.portrait') }}</option>
                  <option value="landscape">{{ t('exportModal.pdf.orientation.landscape') }}</option>
                </select>
              </div>

              <!-- Author -->
              <div class="setting-group">
                <label>{{ t('exportModal.pdf.author') }}:</label>
                <input 
                  type="text" 
                  v-model="settings.author" 
                  :placeholder="t('exportModal.pdf.authorPlaceholder')"
                >
              </div>

              <!-- ✨ NEU: Eigene Startseite gestalten -->
              <div class="setting-group">
                <label class="checkbox-label">
                  <input 
                    type="checkbox" 
                    v-model="settings.includeCustomFrontPage"
                  >
                  {{ t('exportModal.pdf.frontPage.label') }}
                </label>
                <p class="setting-hint">{{ t('exportModal.pdf.frontPage.description') }}</p>
              </div>

              <!-- ✨ NEU: Startseite Designer Button -->
              <div v-if="settings.includeCustomFrontPage" class="designer-section front-page-section">
                <button 
                  type="button"
                  class="designer-btn"
                  @click="showFrontPageDesigner = true"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="3" y1="9" x2="21" y2="9"></line>
                  </svg>
                  {{ t('exportModal.pdf.frontPage.designButton') }}
                  <span v-if="settings.frontPageElements.length > 0" class="badge">
                    {{ settings.frontPageElements.length }}
                  </span>
                </button>

                <!-- Element-Vorschau für Startseite -->
                <div v-if="settings.frontPageElements.length > 0" class="elements-preview">
                  <div class="preview-header">
                    <span>{{ settings.frontPageElements.length }} {{ t('exportModal.pdf.frontPage.elementsAdded') }}</span>
                    <button type="button" @click="clearFrontPageElements" class="clear-btn">
                      {{ t('exportModal.pdf.frontPage.clearButton') }}
                    </button>
                  </div>
                  <ul class="element-list">
                    <li v-for="element in settings.frontPageElements.slice(0, 3)" :key="element.id">
                      <svg v-if="element.type === 'text'" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="4 7 4 4 20 4 20 7"></polyline>
                        <line x1="9" y1="20" x2="15" y2="20"></line>
                        <line x1="12" y1="4" x2="12" y2="20"></line>
                      </svg>
                      <svg v-else xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                        <circle cx="8.5" cy="8.5" r="1.5"></circle>
                        <polyline points="21 15 16 10 5 21"></polyline>
                      </svg>
                      <span>{{ element.type === 'text' ? element.content?.substring(0, 25) : t('frontPageDesigner.properties.typeImage') }}</span>
                    </li>
                    <li v-if="settings.frontPageElements.length > 3" class="more-indicator">
                      +{{ settings.frontPageElements.length - 3 }} weitere
                    </li>
                  </ul>
                </div>
              </div>

              <!-- ✨ Kommentarseite hinzufügen -->
              <div class="setting-group">
                <label class="checkbox-label">
                  <input 
                    type="checkbox" 
                    v-model="settings.includeCommentPages"
                  >
                  {{ t('exportModal.pdf.commentPage.label') }}
                </label>
              </div>

              <!-- ✨ Kommentarseite Designer Button -->
              <div v-if="settings.includeCommentPages" class="designer-section comment-page-section">
                <button 
                  type="button"
                  class="designer-btn"
                  @click="showCommentPageDesigner = true"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                  {{ t('exportModal.pdf.commentPage.designButton') }}
                  <span v-if="settings.commentPageElements.length > 0" class="badge">
                    {{ settings.commentPageElements.length }}
                  </span>
                </button>

                <!-- Element-Vorschau für Kommentarseite -->
                <div v-if="settings.commentPageElements.length > 0" class="elements-preview">
                  <div class="preview-header">
                    <span>{{ settings.commentPageElements.length }} {{ t('exportModal.pdf.commentPage.elementsAdded') }}</span>
                    <button type="button" @click="clearCommentPageElements" class="clear-btn">
                      {{ t('exportModal.pdf.commentPage.clearButton') }}
                    </button>
                  </div>
                  <ul class="element-list">
                    <li v-for="element in settings.commentPageElements.slice(0, 3)" :key="element.id">
                      <svg v-if="element.type === 'text'" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="4 7 4 4 20 4 20 7"></polyline>
                        <line x1="9" y1="20" x2="15" y2="20"></line>
                        <line x1="12" y1="4" x2="12" y2="20"></line>
                      </svg>
                      <svg v-else xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                        <circle cx="8.5" cy="8.5" r="1.5"></circle>
                        <polyline points="21 15 16 10 5 21"></polyline>
                      </svg>
                      <span>{{ element.type === 'text' ? element.content?.substring(0, 25) : t('commentPageDesigner.properties.typeImage') }}</span>
                    </li>
                    <li v-if="settings.commentPageElements.length > 3" class="more-indicator">
                      +{{ settings.commentPageElements.length - 3 }} weitere
                    </li>
                  </ul>
                </div>
              </div>
            </template>

            <!-- ZIP Export Settings -->
            <template v-if="mode === 'zip'">
              <div class="setting-group">
                <label>{{ t('exportModal.zip.fileName') }}:</label>
                <input
                  type="text"
                  v-model="settings.zipName"
                  :placeholder="t('exportModal.zip.fileNamePlaceholder')"
                >
              </div>

              <div class="setting-group">
                <label>{{ t('exportModal.format.title') }}:</label>
                <select v-model="settings.format">
                  <option value="png">PNG</option>
                  <option value="jpg">JPG</option>
                  <option value="webp">WebP</option>
                </select>
              </div>

              <div class="setting-group">
                <label>{{ t('exportModal.format.quality.label') }}: {{ settings.quality }}%</label>
                <input
                  type="range"
                  v-model.number="settings.quality"
                  min="1"
                  max="100"
                  class="quality-slider"
                >
              </div>
            </template>

            <!-- SVG Export Settings -->
            <template v-if="mode === 'svg'">
              <div class="setting-group">
                <label>{{ t('exportModal.zip.fileName') }}:</label>
                <input
                  type="text"
                  v-model="settings.zipName"
                  :placeholder="t('exportModal.zip.fileNamePlaceholder')"
                >
              </div>

              <div class="setting-group">
                <label>{{ t('exportModal.svg.colormode') || 'Farbmodus' }}:</label>
                <select v-model="settings.svgColormode">
                  <option value="color">{{ t('exportModal.svg.colormodeColor') || 'Farbe' }}</option>
                  <option value="binary">{{ t('exportModal.svg.colormodeBinary') || 'Schwarz-Weiß' }}</option>
                </select>
              </div>

              <div class="setting-group">
                <label>{{ t('exportModal.svg.detail') || 'Detailgrad' }}: {{ settings.svgFilterSpeckle }}</label>
                <input
                  type="range"
                  v-model.number="settings.svgFilterSpeckle"
                  min="1"
                  max="32"
                  class="quality-slider"
                >
                <p class="setting-hint">{{ t('exportModal.svg.detailHint') || 'Niedriger = mehr Details, Höher = glattere Kurven' }}</p>
              </div>

              <div class="svg-info-box">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path>
                </svg>
                <span>{{ t('exportModal.svg.info') || 'SVG-Vektorisierung funktioniert am besten bei Logos, Icons und einfachen Grafiken.' }}</span>
              </div>
            </template>

            <!-- SAVE Settings -->
            <template v-if="mode === 'save'">
              <div class="setting-group">
                <label>{{ t('exportModal.format.title') }}:</label>
                <select v-model="settings.format">
                  <option value="png">PNG</option>
                  <option value="jpg">JPG</option>
                  <option value="webp">WebP</option>
                </select>
              </div>

              <div class="setting-group">
                <label>{{ t('exportModal.format.quality.label') }}: {{ settings.quality }}%</label>
                <input 
                  type="range" 
                  v-model.number="settings.quality" 
                  min="1" 
                  max="100"
                  class="quality-slider"
                >
              </div>
            </template>

            <!-- Info Text -->
            <div class="info-box" :class="{ 'info-box-selected': hasSelection && (mode === 'zip' || mode === 'svg') }">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="16" x2="12" y2="12"></line>
                <line x1="12" y1="8" x2="12.01" y2="8"></line>
              </svg>
              <span v-if="hasSelection && (mode === 'zip' || mode === 'svg')">
                {{ imageCount }} {{ imageCount === 1 ? t('exportModal.info.selectedImage') : t('exportModal.info.selectedImages') }}
              </span>
              <span v-else>
                {{ imageCount }} {{ imageCount === 1 ? t('exportModal.info.image') : t('exportModal.info.images') }}
              </span>
            </div>
          </div>

          <div class="modal-footer">
            <button class="btn-secondary" @click="$emit('close')">
              {{ t('exportModal.buttons.cancel') }}
            </button>
            <button class="btn-primary" @click="handleConfirm">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
              {{ getButtonText() }}
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- ✨ NEU: Front Page Designer Modal -->
    <FrontPageDesigner
      v-model="showFrontPageDesigner"
      :initial-elements="settings.frontPageElements"
      @save="handleFrontPageDesignerSave"
    />

    <!-- ✨ Comment Page Designer Modal -->
    <CommentPageDesigner
      v-model="showCommentPageDesigner"
      :initial-elements="settings.commentPageElements"
      @save="handleCommentPageDesignerSave"
    />
  </Teleport>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useI18n } from 'vue-i18n'
import FrontPageDesigner from './FrontPageDesigner.vue'
import CommentPageDesigner from './CommentPageDesigner.vue'
import type { FrontPageElement } from './FrontPageDesigner.vue'
import type { CanvasElement } from '@/lib/features/export-pdf-with-comments'

const { t } = useI18n()

interface Props {
  isOpen: boolean
  mode: 'pdf-all' | 'pdf-selected' | 'zip' | 'svg' | 'save' | null
  imageCount: number
  hasSelection?: boolean
}

const props = defineProps<Props>()
const emit = defineEmits<{
  close: []
  confirm: [settings: any]
}>()

const showFrontPageDesigner = ref(false)
const showCommentPageDesigner = ref(false)

// Settings
const settings = reactive({
  // PDF Settings
  orientation: 'portrait' as 'portrait' | 'landscape',
  author: '',

  // ✨ NEU: Startseite
  includeCustomFrontPage: false,
  frontPageElements: [] as FrontPageElement[],

  // Kommentarseite
  includeCommentPages: false,
  commentPageElements: [] as CanvasElement[],

  // ZIP/Save Settings
  zipName: 'bilder-export',
  format: 'png',
  quality: 92,

  // SVG Settings
  svgColormode: 'color' as 'color' | 'binary',
  svgFilterSpeckle: 4
})

// ✨ NEU: Front Page Designer Save Handler
function handleFrontPageDesignerSave(elements: FrontPageElement[]) {
  settings.frontPageElements = elements
  console.log('✅ Startseiten-Elemente gespeichert:', elements.length)
}

// ✨ NEU: Clear Front Page Elements
function clearFrontPageElements() {
  if (confirm(t('exportModal.pdf.frontPage.confirmClear'))) {
    settings.frontPageElements = []
  }
}

// Comment Page Designer Save Handler
function handleCommentPageDesignerSave(elements: CanvasElement[]) {
  settings.commentPageElements = elements
  console.log('✅ Kommentarseiten-Elemente gespeichert:', elements.length)
}

// Clear Comment Page Elements
function clearCommentPageElements() {
  if (confirm(t('exportModal.pdf.commentPage.confirmClear'))) {
    settings.commentPageElements = []
  }
}

function getModalTitle() {
  switch (props.mode) {
    case 'pdf-all':
      return t('exportModal.title.pdfAll')
    case 'pdf-selected':
      return t('exportModal.title.pdfSelected')
    case 'zip':
      return t('exportModal.title.zip')
    case 'svg':
      return t('exportModal.title.svg') || 'Als SVG exportieren'
    case 'save':
      return t('exportModal.title.save')
    default:
      return t('exportModal.title.export')
  }
}

function getButtonText() {
  return t('exportModal.buttons.export')
}

function handleConfirm() {
  console.log('🚀 Export bestätigt mit Settings:', settings)
  emit('confirm', { ...settings })
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.modal-content {
  background: var(--bg);
  border-radius: var(--radius-2xl);
  width: 100%;
  max-width: 500px;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-5);
  border-bottom: 1px solid var(--border-color);
}

.modal-header h2 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text);
}

.close-btn {
  background: none;
  border: none;
  font-size: 2rem;
  line-height: 1;
  color: var(--muted);
  cursor: pointer;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-md);
  transition: all 0.2s;
}

.close-btn:hover {
  background: var(--panel);
  color: var(--text);
}

.modal-body {
  padding: var(--space-5);
  overflow-y: auto;
  flex: 1;
}

.setting-group {
  margin-bottom: var(--space-4);
}

.setting-group label {
  display: block;
  margin-bottom: var(--space-2);
  font-weight: 500;
  color: var(--text);
}

.setting-hint {
  margin: var(--space-2) 0 0 26px;
  font-size: 0.8rem;
  color: var(--muted);
  line-height: 1.4;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  cursor: pointer;
}

.checkbox-label input[type="checkbox"] {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.setting-group input[type="text"],
.setting-group select {
  width: 100%;
  padding: var(--space-3);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  background: var(--panel);
  color: var(--text);
  font-size: 0.95rem;
  transition: border-color 0.2s;
}

.setting-group input[type="text"]:focus,
.setting-group select:focus {
  outline: none;
  border-color: var(--accent);
}

.quality-slider {
  width: 100%;
  margin-top: var(--space-2);
}

.designer-section {
  margin-top: var(--space-4);
  padding: var(--space-4);
  background: var(--panel);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border-color);
}

.front-page-section {
  border-left: 3px solid var(--accent);
}

.comment-page-section {
  border-left: 3px solid var(--green);
}

.designer-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  padding: var(--space-3);
  background: linear-gradient(135deg, var(--accent), var(--accent-hover));
  color: var(--accent-text);
  border: none;
  border-radius: var(--radius-md);
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
  position: relative;
}

.designer-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px color-mix(in oklab, var(--accent) 40%, transparent);
}

.designer-btn:active {
  transform: translateY(0);
}

.badge {
  position: absolute;
  top: -8px;
  right: -8px;
  background: var(--red);
  color: white;
  border-radius: 9999px;
  padding: 2px 8px;
  font-size: 0.75rem;
  font-weight: 600;
}

.elements-preview {
  margin-top: var(--space-3);
  padding: var(--space-3);
  background: var(--bg);
  border-radius: var(--radius-md);
  border: 1px solid var(--border-color);
}

.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-2);
  font-size: 0.85rem;
  color: var(--muted);
}

.clear-btn {
  background: none;
  border: none;
  color: var(--red);
  cursor: pointer;
  font-size: 0.85rem;
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-sm);
  transition: background 0.2s;
}

.clear-btn:hover {
  background: color-mix(in oklab, var(--red) 10%, transparent);
}

.element-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.element-list li {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2);
  font-size: 0.85rem;
  color: var(--muted);
}

.element-list li svg {
  flex-shrink: 0;
  color: var(--accent);
}

.more-indicator {
  font-style: italic;
}

.info-box {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-3);
  background: color-mix(in oklab, var(--accent) 10%, transparent);
  border: 1px solid color-mix(in oklab, var(--accent) 25%, transparent);
  border-radius: var(--radius-md);
  color: var(--text);
  font-size: 0.9rem;
  margin-top: var(--space-4);
}

.info-box svg {
  flex-shrink: 0;
  color: var(--accent);
}

.info-box-selected {
  background: color-mix(in oklab, var(--green) 10%, transparent);
  border-color: color-mix(in oklab, var(--green) 25%, transparent);
}

.info-box-selected svg {
  color: var(--green);
}

.svg-info-box {
  display: flex;
  align-items: flex-start;
  gap: var(--space-2);
  padding: var(--space-3);
  background: color-mix(in oklab, var(--orange, #f97316) 10%, transparent);
  border: 1px solid color-mix(in oklab, var(--orange, #f97316) 25%, transparent);
  border-radius: var(--radius-md);
  color: var(--text);
  font-size: 0.85rem;
  margin-top: var(--space-4);
  line-height: 1.4;
}

.svg-info-box svg {
  flex-shrink: 0;
  color: var(--orange, #f97316);
  margin-top: 2px;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-3);
  padding: var(--space-5);
  border-top: 1px solid var(--border-color);
}

.btn-secondary,
.btn-primary {
  padding: var(--space-3) var(--space-5);
  border-radius: var(--radius-md);
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: var(--space-2);
  border: none;
}

.btn-secondary {
  background: var(--panel);
  color: var(--text);
  border: 1px solid var(--border-color);
}

.btn-secondary:hover {
  background: var(--bg);
}

.btn-primary {
  background: linear-gradient(135deg, var(--accent), var(--accent-hover));
  color: var(--accent-text);
  font-weight: 600;
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px color-mix(in oklab, var(--accent) 40%, transparent);
}

.btn-primary:active {
  transform: translateY(0);
}

/* Transition */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s, transform 0.3s;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
  transform: scale(0.95);
}

@media (max-width: 640px) {
  .modal-content {
    max-width: 100%;
    max-height: 95vh;
  }
  
  .modal-body {
    padding: var(--space-4);
  }
}
</style>
