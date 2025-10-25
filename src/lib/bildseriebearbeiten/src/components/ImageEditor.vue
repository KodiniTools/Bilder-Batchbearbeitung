<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="isOpen" class="modal-overlay" @click.self="closeEditor">
        <div class="modal-container editor-container">
          <div class="modal-header">
            <div class="modal-title">Bild bearbeiten</div>
            <button 
              class="image-action-btn" 
              aria-label="Schließen"
              @click="closeEditor"
            >
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>

          <div class="modal-body editor-body">
            <div class="editor-sections">
              
              <div class="editor-section">
                <h3>Vorschau</h3>
                <div class="preview-container">
                  <canvas 
                    ref="previewCanvas" 
                    class="editor-preview-canvas"
                  ></canvas>
                </div>
                <div class="image-info">
                  <span>{{ dimensions }}</span>
                  <span>{{ fileSize }}</span>
                </div>
              </div>

              <div class="editor-section">
                <h3>Dateiname</h3>
                <div class="input-group">
                  <label for="editorFileName">Neuer Name:</label>
                  <input 
                    id="editorFileName"
                    v-model="fileName"
                    type="text" 
                    placeholder="Dateiname ohne Erweiterung"
                  >
                  <small class="help-text">Der Name wird beim Speichern verwendet</small>
                </div>
              </div>

              <div class="editor-section">
                <h3>Transformationen</h3>
                <div class="transform-controls">
                  <div class="control-group">
                    <label>Drehen:</label>
                    <div class="button-group">
                      <button 
                        type="button" 
                        class="btn btn-sm" 
                        title="90° nach links"
                        @click="rotate(-90)"
                      >
                        <i class="fa-solid fa-rotate-left"></i> 90°
                      </button>
                      <button 
                        type="button" 
                        class="btn btn-sm" 
                        title="180°"
                        @click="rotate(180)"
                      >
                        <i class="fa-solid fa-arrow-rotate-right"></i> 180°
                      </button>
                      <button 
                        type="button" 
                        class="btn btn-sm" 
                        title="90° nach rechts"
                        @click="rotate(90)"
                      >
                        <i class="fa-solid fa-rotate-right"></i> 90°
                      </button>
                    </div>
                  </div>
                  
                  <div class="control-group">
                    <label>Spiegeln:</label>
                    <div class="button-group">
                      <button 
                        type="button" 
                        class="btn btn-sm" 
                        title="Horizontal spiegeln"
                        @click="flip('horizontal')"
                      >
                        <i class="fa-solid fa-left-right"></i> Horizontal
                      </button>
                      <button 
                        type="button" 
                        class="btn btn-sm" 
                        title="Vertikal spiegeln"
                        @click="flip('vertical')"
                      >
                        <i class="fa-solid fa-up-down"></i> Vertikal
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div class="editor-section">
                <h3>Größe ändern</h3>
                <div class="resize-controls">
                  <div class="input-row">
                    <div class="input-group">
                      <label for="resizeWidth">Breite:</label>
                      <input 
                        id="resizeWidth"
                        v-model.number="resizeWidth"
                        type="number" 
                        min="1" 
                        max="5000"
                        @input="onResizeWidthChange"
                      >
                      <span class="unit">px</span>
                    </div>
                    <div class="input-group">
                      <label for="resizeHeight">Höhe:</label>
                      <input 
                        id="resizeHeight"
                        v-model.number="resizeHeight"
                        type="number" 
                        min="1" 
                        max="5000"
                        @input="onResizeHeightChange"
                      >
                      <span class="unit">px</span>
                    </div>
                  </div>
                  
                  <div class="checkbox-group">
                    <input 
                      id="keepAspectRatio"
                      v-model="keepAspectRatio"
                      type="checkbox"
                    >
                    <label for="keepAspectRatio">Seitenverhältnis beibehalten</label>
                  </div>
                  
                  <div class="button-group">
                    <button 
                      type="button" 
                      class="btn btn-sm"
                      @click="resetSize"
                    >
                      <i class="fa-solid fa-arrow-rotate-left"></i> Ursprungsgröße
                    </button>
                    <button 
                      type="button" 
                      class="btn btn-sm"
                      @click="applyResize"
                    >
                      <i class="fa-solid fa-check"></i> Größe ändern
                    </button>
                  </div>
                </div>
              </div>

              <div class="editor-section">
                <h3>Exportieren</h3>
                <div class="resize-controls">
                  <div class="input-row">
                    <div class="input-group">
                      <label for="exportFormat">Format:</label>
                      <select id="exportFormat" v-model="selectedFormat">
                        <option 
                          v-for="format in availableFormats" 
                          :key="format.mimeType"
                          :value="format.mimeType"
                        >
                          {{ format.name }}
                        </option>
                      </select>
                    </div>
                  </div>
                  <div class="button-group">
                    <button 
                      type="button" 
                      class="btn"
                      :disabled="isDownloading"
                      @click="downloadImage"
                    >
                      <i :class="isDownloading ? 'fa-solid fa-spinner fa-spin' : 'fa-solid fa-download'"></i>
                      {{ isDownloading ? 'Erstelle...' : 'Als Datei herunterladen' }}
                    </button>
                  </div>
                </div>
              </div>

            </div>
          </div>
          
          <div class="modal-footer">
            <button type="button" class="btn" @click="closeEditor">
              Abbrechen
            </button>
            <button type="button" class="btn" @click="resetToOriginal">
              <i class="fa-solid fa-arrow-rotate-left"></i> Zurücksetzen
            </button>
            <button type="button" class="btn btn-primary" @click="saveChanges">
              <i class="fa-solid fa-check"></i> Änderungen übernehmen
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import type { ImageObject } from '@/lib/core/types'
import { ImageProcessor } from '@/lib/core/image-processor'

interface Props {
  image: ImageObject | null
  isOpen: boolean
}

interface Emits {
  (e: 'close'): void
  (e: 'save', image: ImageObject): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const previewCanvas = ref<HTMLCanvasElement | null>(null)
const fileName = ref('')
const resizeWidth = ref(0)
const resizeHeight = ref(0)
const keepAspectRatio = ref(true)
const selectedFormat = ref('image/png')
const isDownloading = ref(false)

let workingCanvas: HTMLCanvasElement | null = null
let originalCanvas: HTMLCanvasElement | null = null
let aspectRatio = 1

const dimensions = computed(() => {
  if (!workingCanvas) return '0 × 0 px'
  return `${workingCanvas.width} × ${workingCanvas.height} px`
})

const fileSize = computed(() => {
  if (!workingCanvas) return '0 KB'
  const estimatedSize = workingCanvas.width * workingCanvas.height * 4
  return ImageProcessor.formatFileSize(estimatedSize)
})

const availableFormats = computed(() => {
  return ImageProcessor.availableFormats.filter(format => 
    ImageProcessor.supportsFormat(format.mimeType)
  )
})

watch(() => props.image, (newImage) => {
  if (newImage && props.isOpen) {
    initializeEditor(newImage)
  }
}, { immediate: true })

watch(() => props.isOpen, (isOpen) => {
  if (isOpen && props.image) {
    nextTick(() => {
      initializeEditor(props.image!)
    })
  }
})

function initializeEditor(image: ImageObject) {
  if (!image) return

  workingCanvas = document.createElement('canvas')
  workingCanvas.width = image.canvas.width
  workingCanvas.height = image.canvas.height
  const ctx = workingCanvas.getContext('2d')
  if (ctx) {
    ctx.drawImage(image.canvas, 0, 0)
  }

  originalCanvas = document.createElement('canvas')
  originalCanvas.width = image.canvas.width
  originalCanvas.height = image.canvas.height
  const originalCtx = originalCanvas.getContext('2d')
  if (originalCtx) {
    originalCtx.drawImage(image.canvas, 0, 0)
  }

  fileName.value = ImageProcessor.resolveBaseName(image)
  resizeWidth.value = workingCanvas.width
  resizeHeight.value = workingCanvas.height
  aspectRatio = workingCanvas.width / workingCanvas.height

  const ext = ImageProcessor.getFileExtension(image.file.name).toLowerCase()
  const format = availableFormats.value.find(f => f.ext === ext)
  if (format) {
    selectedFormat.value = format.mimeType
  }

  updatePreview()
}

function updatePreview() {
  if (!previewCanvas.value || !workingCanvas) return

  const container = previewCanvas.value.parentElement
  if (!container) return

  const maxSize = Math.min(container.clientWidth || 300, 500)
  const scale = Math.min(maxSize / workingCanvas.width, maxSize / workingCanvas.height, 1)

  previewCanvas.value.width = Math.floor(workingCanvas.width * scale)
  previewCanvas.value.height = Math.floor(workingCanvas.height * scale)

  const ctx = previewCanvas.value.getContext('2d')
  if (ctx) {
    ctx.clearRect(0, 0, previewCanvas.value.width, previewCanvas.value.height)
    ctx.drawImage(workingCanvas, 0, 0, previewCanvas.value.width, previewCanvas.value.height)
  }

  resizeWidth.value = workingCanvas.width
  resizeHeight.value = workingCanvas.height
}

function rotate(degrees: number) {
  if (!workingCanvas) return

  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const radians = (degrees * Math.PI) / 180

  if (degrees === 90 || degrees === -90 || degrees === 270) {
    canvas.width = workingCanvas.height
    canvas.height = workingCanvas.width
  } else {
    canvas.width = workingCanvas.width
    canvas.height = workingCanvas.height
  }

  ctx.translate(canvas.width / 2, canvas.height / 2)
  ctx.rotate(radians)
  ctx.drawImage(workingCanvas, -workingCanvas.width / 2, -workingCanvas.height / 2)

  workingCanvas.width = canvas.width
  workingCanvas.height = canvas.height
  const workingCtx = workingCanvas.getContext('2d')
  if (workingCtx) {
    workingCtx.clearRect(0, 0, canvas.width, canvas.height)
    workingCtx.drawImage(canvas, 0, 0)
  }

  aspectRatio = workingCanvas.width / workingCanvas.height
  updatePreview()
}

function flip(direction: 'horizontal' | 'vertical') {
  if (!workingCanvas) return

  const ctx = workingCanvas.getContext('2d')
  if (!ctx) return

  const tempCanvas = document.createElement('canvas')
  tempCanvas.width = workingCanvas.width
  tempCanvas.height = workingCanvas.height
  const tempCtx = tempCanvas.getContext('2d')
  if (!tempCtx) return

  tempCtx.drawImage(workingCanvas, 0, 0)

  ctx.clearRect(0, 0, workingCanvas.width, workingCanvas.height)

  if (direction === 'horizontal') {
    ctx.scale(-1, 1)
    ctx.drawImage(tempCanvas, -workingCanvas.width, 0)
    ctx.scale(-1, 1)
  } else {
    ctx.scale(1, -1)
    ctx.drawImage(tempCanvas, 0, -workingCanvas.height)
    ctx.scale(1, -1)
  }

  updatePreview()
}

function onResizeWidthChange() {
  if (keepAspectRatio.value && resizeWidth.value > 0) {
    resizeHeight.value = Math.round(resizeWidth.value / aspectRatio)
  }
}

function onResizeHeightChange() {
  if (keepAspectRatio.value && resizeHeight.value > 0) {
    resizeWidth.value = Math.round(resizeHeight.value * aspectRatio)
  }
}

function resetSize() {
  if (!originalCanvas) return
  resizeWidth.value = originalCanvas.width
  resizeHeight.value = originalCanvas.height
}

function applyResize() {
  if (!workingCanvas || resizeWidth.value <= 0 || resizeHeight.value <= 0) return

  const newCanvas = document.createElement('canvas')
  newCanvas.width = resizeWidth.value
  newCanvas.height = resizeHeight.value
  const ctx = newCanvas.getContext('2d')
  if (!ctx) return

  ctx.drawImage(workingCanvas, 0, 0, resizeWidth.value, resizeHeight.value)

  workingCanvas.width = newCanvas.width
  workingCanvas.height = newCanvas.height
  const workingCtx = workingCanvas.getContext('2d')
  if (workingCtx) {
    workingCtx.clearRect(0, 0, newCanvas.width, newCanvas.height)
    workingCtx.drawImage(newCanvas, 0, 0)
  }

  aspectRatio = workingCanvas.width / workingCanvas.height
  updatePreview()
}

async function downloadImage() {
  if (!workingCanvas || !props.image) return

  isDownloading.value = true

  try {
    const format = availableFormats.value.find(f => f.mimeType === selectedFormat.value)
    if (!format) {
      throw new Error('Ungültiges Format ausgewählt.')
    }

    const blob = await new Promise<Blob>((resolve, reject) => {
      workingCanvas!.toBlob(
        (blob) => {
          if (blob) resolve(blob)
          else reject(new Error('Fehler beim Erstellen des Bildes'))
        },
        format.mimeType,
        0.92
      )
    })

    const fileBase = fileName.value.trim() || ImageProcessor.resolveBaseName(props.image)
    const downloadFileName = `${ImageProcessor.safeBaseName(fileBase)}.${format.ext}`

    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = downloadFileName
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  } catch (error) {
    console.error('Download-Fehler:', error)
    alert('Fehler beim Erstellen des Bildes: ' + (error as Error).message)
  } finally {
    isDownloading.value = false
  }
}

function resetToOriginal() {
  if (!originalCanvas || !workingCanvas) return

  workingCanvas.width = originalCanvas.width
  workingCanvas.height = originalCanvas.height
  const ctx = workingCanvas.getContext('2d')
  if (ctx) {
    ctx.clearRect(0, 0, workingCanvas.width, workingCanvas.height)
    ctx.drawImage(originalCanvas, 0, 0)
  }

  if (props.image) {
    fileName.value = ImageProcessor.resolveBaseName(props.image)
  }
  
  aspectRatio = workingCanvas.width / workingCanvas.height
  updatePreview()
}

function saveChanges() {
  if (!props.image || !workingCanvas) return

  props.image.canvas.width = workingCanvas.width
  props.image.canvas.height = workingCanvas.height
  const ctx = props.image.canvas.getContext('2d')
  if (ctx) {
    ctx.clearRect(0, 0, workingCanvas.width, workingCanvas.height)
    ctx.drawImage(workingCanvas, 0, 0)
  }

  const newName = fileName.value.trim()
  if (newName) {
    props.image.outputName = ImageProcessor.safeBaseName(newName)
  }

  emit('save', props.image)
  closeEditor()
}

function closeEditor() {
  emit('close')
}
</script>

<style scoped>
.modal-overlay {
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
  z-index: 1000;
  padding: var(--space-4);
}

.modal-container {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-2xl);
  max-width: 900px;
  width: 100%;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-4);
  border-bottom: 1px solid var(--border-color);
}

.modal-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text);
}

.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-5);
}

.editor-sections {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
}

.editor-section {
  background: var(--panel);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-xl);
  padding: var(--space-5);
}

.editor-section h3 {
  margin: 0 0 var(--space-4) 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text);
}

.preview-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 200px;
  background: var(--card-bg);
  border: 2px dashed var(--border-color);
  border-radius: var(--radius-lg);
  padding: var(--space-4);
}

.editor-preview-canvas {
  max-width: 100%;
  max-height: 400px;
  border-radius: var(--radius-md);
}

.image-info {
  display: flex;
  justify-content: space-between;
  margin-top: var(--space-3);
  color: var(--muted);
  font-size: 0.9rem;
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.input-group label {
  font-weight: 500;
  color: var(--text);
  font-size: 0.9rem;
}

.input-group input[type="text"],
.input-group input[type="number"],
.input-group select {
  padding: var(--space-3);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  background: var(--card-bg);
  color: var(--text);
  font-size: 1rem;
}

.help-text {
  color: var(--muted);
  font-size: 0.85rem;
}

.transform-controls,
.resize-controls {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.control-group {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.control-group label {
  font-weight: 500;
  color: var(--text);
  font-size: 0.9rem;
}

.button-group {
  display: flex;
  gap: var(--space-2);
  flex-wrap: wrap;
}

.input-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-3);
}

.checkbox-group {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.checkbox-group input[type="checkbox"] {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.checkbox-group label {
  cursor: pointer;
  font-size: 0.9rem;
  color: var(--text);
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-3);
  padding: var(--space-4);
  border-top: 1px solid var(--border-color);
}

.btn {
  padding: var(--space-3) var(--space-4);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  background: var(--card-bg);
  color: var(--text);
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
}

.btn:hover:not(:disabled) {
  background: var(--panel);
  border-color: var(--accent);
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-sm {
  padding: var(--space-2) var(--space-3);
  font-size: 0.85rem;
}

.btn-primary {
  background: var(--accent);
  border-color: var(--accent);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: color-mix(in oklab, var(--accent) 80%, black);
  border-color: color-mix(in oklab, var(--accent) 80%, black);
}

.image-action-btn {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  color: var(--muted);
  cursor: pointer;
  border-radius: var(--radius-md);
  transition: all 0.2s ease;
}

.image-action-btn:hover {
  background: var(--panel);
  color: var(--text);
}

.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-active .modal-container,
.modal-leave-active .modal-container {
  transition: transform 0.3s ease;
}

.modal-enter-from .modal-container,
.modal-leave-to .modal-container {
  transform: scale(0.95);
}

@media (max-width: 768px) {
  .modal-container {
    max-height: 95vh;
  }

  .input-row {
    grid-template-columns: 1fr;
  }

  .button-group {
    flex-direction: column;
  }

  .btn {
    width: 100%;
    justify-content: center;
  }
}
</style>
