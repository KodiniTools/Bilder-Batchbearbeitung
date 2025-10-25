<template>
  <Teleport to="body">
    <Transition name="designer-modal">
      <div v-if="modelValue" class="designer-overlay" @click.self="closeDesigner">
        <div class="designer-container">
          <!-- Header -->
          <div class="designer-header">
            <div class="header-content">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="3" y1="9" x2="21" y2="9"></line>
              </svg>
              <div>
                <h2>{{ t('frontPageDesigner.title') }}</h2>
                <p>{{ t('frontPageDesigner.subtitle') }}</p>
              </div>
            </div>
            <button class="close-btn" @click="closeDesigner" :title="t('frontPageDesigner.close')">×</button>
          </div>

          <!-- Toolbar -->
          <div class="toolbar">
            <div class="tool-group">
              <button 
                class="tool-btn" 
                @click="addTextElement"
                :title="t('frontPageDesigner.toolbar.addTextTooltip')"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="4 7 4 4 20 4 20 7"></polyline>
                  <line x1="9" y1="20" x2="15" y2="20"></line>
                  <line x1="12" y1="4" x2="12" y2="20"></line>
                </svg>
                {{ t('frontPageDesigner.toolbar.addText') }}
              </button>
              
              <button 
                class="tool-btn" 
                @click="triggerImageUpload"
                :title="t('frontPageDesigner.toolbar.addImageTooltip')"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                  <circle cx="8.5" cy="8.5" r="1.5"></circle>
                  <polyline points="21 15 16 10 5 21"></polyline>
                </svg>
                {{ t('frontPageDesigner.toolbar.addImage') }}
              </button>
              <input 
                ref="imageInput" 
                type="file" 
                accept="image/*" 
                @change="handleImageUpload" 
                style="display: none;"
              >
            </div>

            <div class="tool-group">
              <button 
                class="tool-btn danger" 
                @click="clearCanvas"
                :disabled="elements.length === 0"
                :title="t('frontPageDesigner.toolbar.clearAllTooltip')"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
                {{ t('frontPageDesigner.toolbar.clearAll') }}
              </button>
            </div>
          </div>

          <!-- Canvas Area -->
          <div class="canvas-container">
            <div class="canvas-wrapper">
              <div 
                class="canvas" 
                ref="canvasRef"
                @click="deselectAll"
              >
                <!-- A4 Page Background -->
                <div class="page-background">
                  <div class="page-info">{{ t('frontPageDesigner.canvas.pageInfo') }}</div>
                </div>

                <!-- Elements -->
                <div
                  v-for="element in elements"
                  :key="element.id"
                  class="element"
                  :class="{ 
                    selected: element.id === selectedElementId,
                    'element-text': element.type === 'text',
                    'element-image': element.type === 'image'
                  }"
                  :style="{
                    left: element.x + 'px',
                    top: element.y + 'px',
                    width: element.width + 'px',
                    height: element.height + 'px',
                    fontSize: element.fontSize + 'px',
                    fontWeight: element.fontWeight,
                    textAlign: element.textAlign,
                    color: element.color
                  }"
                  @click.stop="selectElement(element.id)"
                  @mousedown="startDrag($event, element.id)"
                >
                  <!-- Text Element -->
                  <template v-if="element.type === 'text'">
                    <div 
                      v-if="element.id !== editingTextId"
                      class="text-content"
                      @click.stop
                      @dblclick.stop="startEditingText(element.id)"
                    >
                      {{ element.content || t('frontPageDesigner.canvas.emptyText') }}
                    </div>
                    <textarea
                      v-else
                      ref="textareaRef"
                      v-model="element.content"
                      class="text-editor"
                      @click.stop
                      @blur="stopEditingText"
                      @keydown.esc="stopEditingText"
                      @mousedown.stop
                    />
                  </template>

                  <!-- Image Element -->
                  <template v-if="element.type === 'image'">
                    <img 
                      :src="element.src" 
                      :alt="element.alt || t('frontPageDesigner.properties.typeImage')"
                      class="image-content"
                      draggable="false"
                    >
                  </template>

                  <!-- Resize Handles -->
                  <div 
                    v-if="element.id === selectedElementId" 
                    class="resize-handles"
                  >
                    <div 
                      class="resize-handle nw" 
                      @mousedown.stop="startResize($event, element.id, 'nw')"
                    ></div>
                    <div 
                      class="resize-handle ne" 
                      @mousedown.stop="startResize($event, element.id, 'ne')"
                    ></div>
                    <div 
                      class="resize-handle sw" 
                      @mousedown.stop="startResize($event, element.id, 'sw')"
                    ></div>
                    <div 
                      class="resize-handle se" 
                      @mousedown.stop="startResize($event, element.id, 'se')"
                    ></div>
                  </div>

                  <!-- Delete Button -->
                  <button
                    v-if="element.id === selectedElementId"
                    class="delete-element-btn"
                    @click.stop="deleteElement(element.id)"
                    :title="t('frontPageDesigner.properties.deleteElement')"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            <!-- Properties Panel -->
            <div class="properties-panel" v-if="selectedElement">
              <h3>{{ t('frontPageDesigner.properties.title') }}</h3>
              
              <div class="property-group">
                <label>{{ t('frontPageDesigner.properties.elementType') }}</label>
                <div class="property-value">
                  {{ selectedElement.type === 'text' ? t('frontPageDesigner.properties.typeText') : t('frontPageDesigner.properties.typeImage') }}
                </div>
              </div>

              <!-- Text Properties -->
              <template v-if="selectedElement.type === 'text'">
                <div class="property-group">
                  <label>{{ t('frontPageDesigner.properties.fontSize') }}</label>
                  <div class="slider-group">
                    <input 
                      type="range" 
                      v-model.number="selectedElement.fontSize" 
                      min="12" 
                      max="72"
                      class="property-slider"
                    >
                    <span class="slider-value">{{ selectedElement.fontSize }}px</span>
                  </div>
                </div>

                <div class="property-group">
                  <label>{{ t('frontPageDesigner.properties.fontWeight') }}</label>
                  <select v-model="selectedElement.fontWeight" class="property-select">
                    <option value="normal">{{ t('frontPageDesigner.properties.fontWeightNormal') }}</option>
                    <option value="bold">{{ t('frontPageDesigner.properties.fontWeightBold') }}</option>
                  </select>
                </div>

                <div class="property-group">
                  <label>{{ t('frontPageDesigner.properties.textAlign') }}</label>
                  <div class="button-group">
                    <button 
                      @click="selectedElement.textAlign = 'left'"
                      :class="{ active: selectedElement.textAlign === 'left' }"
                      :title="t('frontPageDesigner.properties.textAlignLeft')"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="17" y1="10" x2="3" y2="10"></line>
                        <line x1="21" y1="6" x2="3" y2="6"></line>
                        <line x1="21" y1="14" x2="3" y2="14"></line>
                        <line x1="17" y1="18" x2="3" y2="18"></line>
                      </svg>
                    </button>
                    <button 
                      @click="selectedElement.textAlign = 'center'"
                      :class="{ active: selectedElement.textAlign === 'center' }"
                      :title="t('frontPageDesigner.properties.textAlignCenter')"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="10" x2="6" y2="10"></line>
                        <line x1="21" y1="6" x2="3" y2="6"></line>
                        <line x1="21" y1="14" x2="3" y2="14"></line>
                        <line x1="18" y1="18" x2="6" y2="18"></line>
                      </svg>
                    </button>
                    <button 
                      @click="selectedElement.textAlign = 'right'"
                      :class="{ active: selectedElement.textAlign === 'right' }"
                      :title="t('frontPageDesigner.properties.textAlignRight')"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="21" y1="10" x2="7" y2="10"></line>
                        <line x1="21" y1="6" x2="3" y2="6"></line>
                        <line x1="21" y1="14" x2="3" y2="14"></line>
                        <line x1="21" y1="18" x2="7" y2="18"></line>
                      </svg>
                    </button>
                  </div>
                </div>

                <div class="property-group">
                  <label>{{ t('frontPageDesigner.properties.textColor') }}</label>
                  <input 
                    type="color" 
                    v-model="selectedElement.color" 
                    class="color-picker"
                  >
                </div>
              </template>

              <!-- Image Properties -->
              <template v-if="selectedElement.type === 'image'">
                <div class="property-group">
                  <label>{{ t('frontPageDesigner.properties.imageSize') }}</label>
                  <div class="size-inputs">
                    <input 
                      type="number" 
                      v-model.number="selectedElement.width" 
                      @input="maintainAspectRatio"
                      min="50"
                    >
                    <span>×</span>
                    <input 
                      type="number" 
                      v-model.number="selectedElement.height" 
                      min="50"
                    >
                  </div>
                </div>
              </template>

              <!-- Position -->
              <div class="property-group">
                <label>{{ t('frontPageDesigner.properties.position') }}</label>
                <div class="size-inputs">
                  <div>
                    <small>X:</small>
                    <input 
                      type="number" 
                      v-model.number="selectedElement.x" 
                      min="0"
                    >
                  </div>
                  <div>
                    <small>Y:</small>
                    <input 
                      type="number" 
                      v-model.number="selectedElement.y" 
                      min="0"
                    >
                  </div>
                </div>
              </div>
            </div>

            <!-- No Selection Message -->
            <div class="properties-panel no-selection-panel" v-else>
              <div class="no-selection-message">
                {{ t('frontPageDesigner.properties.noSelection') }}
              </div>
            </div>
          </div>

          <!-- Footer -->
          <div class="designer-footer">
            <div class="element-count">
              {{ elements.length === 1 ? '1 Element' : `${elements.length} Elemente` }}
            </div>
            <div class="footer-actions">
              <button class="btn-secondary" @click="closeDesigner">
                {{ t('frontPageDesigner.footer.cancel') }}
              </button>
              <button class="btn-primary" @click="saveAndClose">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                {{ t('frontPageDesigner.footer.save') }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
const { t } = useI18n()

export interface FrontPageElement {
  id: string
  type: 'text' | 'image'
  x: number
  y: number
  width: number
  height: number
  // Text properties
  content?: string
  fontSize?: number
  fontWeight?: 'normal' | 'bold'
  textAlign?: 'left' | 'center' | 'right'
  color?: string
  // Image properties
  src?: string
  alt?: string
  originalWidth?: number
  originalHeight?: number
}

interface Props {
  modelValue: boolean
  initialElements?: FrontPageElement[]
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  save: [elements: FrontPageElement[]]
}>()

// Refs
const canvasRef = ref<HTMLElement | null>(null)
const imageInput = ref<HTMLInputElement | null>(null)
const textareaRef = ref<HTMLTextAreaElement | null>(null)

// State
const elements = ref<FrontPageElement[]>([])
const selectedElementId = ref<string | null>(null)
const editingTextId = ref<string | null>(null)

// Drag & Resize State
const isDragging = ref(false)
const isResizing = ref(false)
const resizeDirection = ref<string>('')
const dragStart = ref({ x: 0, y: 0 })
const elementStartPos = ref({ x: 0, y: 0, width: 0, height: 0 })

// Computed
const selectedElement = computed(() => 
  elements.value.find(el => el.id === selectedElementId.value)
)

// Initialize
onMounted(() => {
  if (props.initialElements && props.initialElements.length > 0) {
    elements.value = JSON.parse(JSON.stringify(props.initialElements))
  }

  // Global mouse events for drag and resize
  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', handleMouseUp)
})

onUnmounted(() => {
  document.removeEventListener('mousemove', handleMouseMove)
  document.removeEventListener('mouseup', handleMouseUp)
})

// Element Management
function addTextElement() {
  const newElement: FrontPageElement = {
    id: `text-${Date.now()}`,
    type: 'text',
    x: 50,
    y: 50 + elements.value.length * 20,
    width: 400,
    height: 60,
    content: t('frontPageDesigner.element.text.default'),
    fontSize: 24,
    fontWeight: 'normal',
    textAlign: 'left',
    color: '#000000'
  }
  elements.value.push(newElement)
  selectElement(newElement.id)
}

function triggerImageUpload() {
  imageInput.value?.click()
}

function handleImageUpload(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = (e) => {
    const img = new Image()
    img.onload = () => {
      const maxWidth = 400
      const maxHeight = 400
      let width = img.width
      let height = img.height

      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height)
        width = width * ratio
        height = height * ratio
      }

      const newElement: FrontPageElement = {
        id: `image-${Date.now()}`,
        type: 'image',
        x: 100,
        y: 100 + elements.value.length * 20,
        width: width,
        height: height,
        src: e.target?.result as string,
        alt: file.name,
        originalWidth: img.width,
        originalHeight: img.height
      }
      elements.value.push(newElement)
      selectElement(newElement.id)
    }
    img.src = e.target?.result as string
  }
  reader.readAsDataURL(file)

  // Reset input
  target.value = ''
}

function deleteElement(id: string) {
  elements.value = elements.value.filter(el => el.id !== id)
  selectedElementId.value = null
}

function clearCanvas() {
  if (confirm(t('frontPageDesigner.toolbar.confirmClearAll'))) {
    elements.value = []
    selectedElementId.value = null
  }
}

// Selection
function selectElement(id: string) {
  // Don't change selection if we're currently editing text
  if (editingTextId.value) return
  
  selectedElementId.value = id
  editingTextId.value = null
}

function deselectAll() {
  selectedElementId.value = null
  editingTextId.value = null
}

// Text Editing
function startEditingText(id: string) {
  editingTextId.value = id
  selectedElementId.value = id
  nextTick(() => {
    const textarea = Array.isArray(textareaRef.value) 
      ? textareaRef.value[0] 
      : textareaRef.value
    
    if (textarea) {
      textarea.focus()
      // Select all text for easy editing
      textarea.select()
    }
  })
}

function stopEditingText() {
  editingTextId.value = null
}

// Drag
function startDrag(event: MouseEvent, id: string) {
  if (editingTextId.value) return
  
  const element = elements.value.find(el => el.id === id)
  if (!element) return

  isDragging.value = true
  selectedElementId.value = id
  dragStart.value = { x: event.clientX, y: event.clientY }
  elementStartPos.value = { 
    x: element.x, 
    y: element.y,
    width: element.width,
    height: element.height
  }
}

// Resize
function startResize(event: MouseEvent, id: string, direction: string) {
  const element = elements.value.find(el => el.id === id)
  if (!element) return

  isResizing.value = true
  resizeDirection.value = direction
  selectedElementId.value = id
  dragStart.value = { x: event.clientX, y: event.clientY }
  elementStartPos.value = { 
    x: element.x, 
    y: element.y,
    width: element.width,
    height: element.height
  }
}

// Mouse Handlers
function handleMouseMove(event: MouseEvent) {
  if (isDragging.value) {
    const element = elements.value.find(el => el.id === selectedElementId.value)
    if (!element) return

    const dx = event.clientX - dragStart.value.x
    const dy = event.clientY - dragStart.value.y

    element.x = Math.max(0, elementStartPos.value.x + dx)
    element.y = Math.max(0, elementStartPos.value.y + dy)
  }

  if (isResizing.value) {
    const element = elements.value.find(el => el.id === selectedElementId.value)
    if (!element) return

    const dx = event.clientX - dragStart.value.x
    const dy = event.clientY - dragStart.value.y

    if (resizeDirection.value.includes('e')) {
      element.width = Math.max(50, elementStartPos.value.width + dx)
    }
    if (resizeDirection.value.includes('w')) {
      const newWidth = Math.max(50, elementStartPos.value.width - dx)
      element.x = elementStartPos.value.x + (elementStartPos.value.width - newWidth)
      element.width = newWidth
    }
    if (resizeDirection.value.includes('s')) {
      element.height = Math.max(30, elementStartPos.value.height + dy)
    }
    if (resizeDirection.value.includes('n')) {
      const newHeight = Math.max(30, elementStartPos.value.height - dy)
      element.y = elementStartPos.value.y + (elementStartPos.value.height - newHeight)
      element.height = newHeight
    }
  }
}

function handleMouseUp() {
  isDragging.value = false
  isResizing.value = false
  resizeDirection.value = ''
}

// Aspect Ratio (for images)
function maintainAspectRatio() {
  const element = selectedElement.value
  if (!element || element.type !== 'image' || !element.originalWidth || !element.originalHeight) return
  
  const ratio = element.originalWidth / element.originalHeight
  element.height = Math.round(element.width / ratio)
}

// Save & Close
function saveAndClose() {
  emit('save', JSON.parse(JSON.stringify(elements.value)))
  closeDesigner()
}

function closeDesigner() {
  emit('update:modelValue', false)
}
</script>

<style scoped>
.designer-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  padding: 20px;
}

.designer-container {
  background: var(--bg);
  border-radius: var(--radius-2xl);
  width: 100%;
  max-width: 1400px;
  height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
}

/* Header */
.designer-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-5);
  border-bottom: 1px solid var(--border-color);
  background: var(--panel);
}

.header-content {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.header-content svg {
  color: var(--accent);
  flex-shrink: 0;
}

.header-content h2 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text);
}

.header-content p {
  margin: 0;
  font-size: 0.875rem;
  color: var(--muted);
}

.close-btn {
  background: none;
  border: none;
  font-size: 2rem;
  line-height: 1;
  color: var(--muted);
  cursor: pointer;
  padding: 0;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-md);
  transition: all 0.2s;
}

.close-btn:hover {
  background: var(--bg);
  color: var(--text);
}

/* Toolbar */
.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-4);
  border-bottom: 1px solid var(--border-color);
  background: var(--panel);
  gap: var(--space-3);
}

.tool-group {
  display: flex;
  gap: var(--space-2);
}

.tool-btn {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-4);
  background: var(--bg);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  color: var(--text);
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.tool-btn:hover:not(:disabled) {
  background: var(--panel);
  border-color: var(--accent);
  transform: translateY(-1px);
}

.tool-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.tool-btn.danger {
  color: var(--red);
}

.tool-btn.danger:hover:not(:disabled) {
  background: color-mix(in oklab, var(--red) 10%, transparent);
  border-color: var(--red);
}

/* Canvas Container */
.canvas-container {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.canvas-wrapper {
  flex: 1;
  overflow: auto;
  padding: var(--space-6);
  background: var(--panel);
}

.canvas {
  position: relative;
  width: 794px; /* A4 width in pixels at 96 DPI */
  height: 1123px; /* A4 height in pixels at 96 DPI */
  margin: 0 auto;
  background: white;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
  border-radius: var(--radius-lg);
}

.page-background {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.page-info {
  position: absolute;
  top: var(--space-3);
  right: var(--space-3);
  padding: var(--space-2) var(--space-3);
  background: rgba(0, 0, 0, 0.05);
  border-radius: var(--radius-md);
  font-size: 0.75rem;
  color: rgba(0, 0, 0, 0.4);
}

/* Elements */
.element {
  position: absolute;
  cursor: move;
  user-select: none;
  border: 2px solid transparent;
  transition: border-color 0.2s;
}

.element.selected {
  border-color: var(--accent);
  box-shadow: 0 0 0 1px var(--accent);
}

.element-text .text-content {
  width: 100%;
  height: 100%;
  padding: var(--space-2);
  margin: 0;
  box-sizing: border-box;
  overflow: hidden;
  word-wrap: break-word;
  white-space: pre-wrap;
  line-height: 1.4;
}

.text-editor {
  width: 100%;
  height: 100%;
  padding: var(--space-2);
  margin: 0;
  border: none;
  outline: none;
  resize: none;
  font-family: inherit;
  font-size: inherit;
  font-weight: inherit;
  text-align: inherit;
  color: inherit;
  background: rgba(102, 126, 234, 0.05);
  box-sizing: border-box;
  line-height: inherit;
  overflow: hidden;
  word-wrap: break-word;
  white-space: pre-wrap;
}

.element-image {
  overflow: hidden;
}

.image-content {
  width: 100%;
  height: 100%;
  object-fit: contain;
  pointer-events: none;
}

/* Resize Handles */
.resize-handles {
  position: absolute;
  inset: -6px;
  pointer-events: none;
}

.resize-handle {
  position: absolute;
  width: 12px;
  height: 12px;
  background: white;
  border: 2px solid var(--accent);
  border-radius: 50%;
  pointer-events: all;
  cursor: pointer;
}

.resize-handle.nw {
  top: 0;
  left: 0;
  cursor: nw-resize;
}

.resize-handle.ne {
  top: 0;
  right: 0;
  cursor: ne-resize;
}

.resize-handle.sw {
  bottom: 0;
  left: 0;
  cursor: sw-resize;
}

.resize-handle.se {
  bottom: 0;
  right: 0;
  cursor: se-resize;
}

/* Delete Button */
.delete-element-btn {
  position: absolute;
  top: -12px;
  right: -12px;
  width: 24px;
  height: 24px;
  background: var(--red);
  color: white;
  border: 2px solid white;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.2s;
}

.delete-element-btn:hover {
  transform: scale(1.1);
}

/* Properties Panel */
.properties-panel {
  width: 300px;
  border-left: 1px solid var(--border-color);
  padding: var(--space-4);
  overflow-y: auto;
  background: var(--bg);
}

.properties-panel h3 {
  margin: 0 0 var(--space-4) 0;
  font-size: 1rem;
  font-weight: 600;
  color: var(--text);
}

.property-group {
  margin-bottom: var(--space-4);
}

.property-group label {
  display: block;
  margin-bottom: var(--space-2);
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text);
}

.property-value {
  padding: var(--space-2);
  background: var(--panel);
  border-radius: var(--radius-md);
  font-size: 0.875rem;
  color: var(--muted);
}

.slider-group {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.property-slider {
  flex: 1;
}

.slider-value {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text);
  min-width: 50px;
  text-align: right;
}

.property-select {
  width: 100%;
  padding: var(--space-2);
  background: var(--panel);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  color: var(--text);
  font-size: 0.875rem;
}

.button-group {
  display: flex;
  gap: var(--space-2);
}

.button-group button {
  flex: 1;
  padding: var(--space-2);
  background: var(--panel);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.button-group button:hover {
  background: var(--bg);
}

.button-group button.active {
  background: var(--accent);
  color: black;
  border-color: var(--accent);
}

.color-picker {
  width: 100%;
  height: 40px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  cursor: pointer;
}

.size-inputs {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.size-inputs input {
  flex: 1;
  padding: var(--space-2);
  background: var(--panel);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  color: var(--text);
  font-size: 0.875rem;
  text-align: center;
}

.size-inputs > div {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.size-inputs small {
  font-size: 0.75rem;
  color: var(--muted);
}

/* No Selection Panel */
.no-selection-panel {
  display: flex;
  align-items: center;
  justify-content: center;
}

.no-selection-message {
  text-align: center;
  color: var(--muted);
  font-size: 0.875rem;
  padding: var(--space-4);
}

/* Footer */
.designer-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-4);
  border-top: 1px solid var(--border-color);
  background: var(--panel);
}

.element-count {
  font-size: 0.875rem;
  color: var(--muted);
}

.footer-actions {
  display: flex;
  gap: var(--space-3);
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
  background: var(--bg);
  color: var(--text);
  border: 1px solid var(--border-color);
}

.btn-secondary:hover {
  background: var(--panel);
}

.btn-primary {
  background: linear-gradient(135deg, var(--accent), var(--accent-dark));
  color: black;
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

/* Transitions */
.designer-modal-enter-active,
.designer-modal-leave-active {
  transition: opacity 0.3s, transform 0.3s;
}

.designer-modal-enter-from,
.designer-modal-leave-to {
  opacity: 0;
  transform: scale(0.95);
}

/* Responsive */
@media (max-width: 1200px) {
  .properties-panel {
    width: 250px;
  }
}

@media (max-width: 768px) {
  .designer-container {
    height: 100vh;
    max-width: 100%;
    border-radius: 0;
  }
  
  .canvas-container {
    flex-direction: column;
  }
  
  .properties-panel {
    width: 100%;
    border-left: none;
    border-top: 1px solid var(--border-color);
    max-height: 300px;
  }
  
  .canvas {
    transform: scale(0.5);
    transform-origin: top center;
  }
}
</style>
