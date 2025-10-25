<script setup lang="ts">
import { ref, computed } from 'vue'

interface CommentEntry {
  id: string
  text: string
  image: File | null
  imagePreviewUrl: string | null
  position: { x: number; y: number; scale: number }
}

interface Props {
  orientation: 'portrait' | 'landscape'
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:entries': [CommentEntry[]]
}>()

// Comment entries
const entries = ref<CommentEntry[]>([
  {
    id: crypto.randomUUID(),
    text: '',
    image: null,
    imagePreviewUrl: null,
    position: { x: 50, y: 50, scale: 0.3 }
  }
])

const activeEntryId = ref<string>(entries.value[0].id)

const activeEntry = computed(() => 
  entries.value.find(e => e.id === activeEntryId.value) || entries.value[0]
)

const pageAspectRatio = computed(() => 
  props.orientation === 'portrait' ? 1 / 1.414 : 1.414
)

// Estimate pages needed based on content
const estimatedPages = computed(() => {
  let pages = 0
  
  for (const entry of entries.value) {
    // Estimate lines for text (rough calculation)
    const textLines = entry.text ? Math.ceil(entry.text.length / 80) : 0
    // Each entry needs space for text + image
    const spaceNeeded = Math.max(textLines * 0.15, 0.3) + (entry.image ? 0.4 : 0)
    pages += Math.ceil(spaceNeeded)
  }
  
  return Math.max(pages, 1)
})

function addEntry() {
  const newEntry: CommentEntry = {
    id: crypto.randomUUID(),
    text: '',
    image: null,
    imagePreviewUrl: null,
    position: { x: 50, y: 50, scale: 0.3 }
  }
  entries.value.push(newEntry)
  activeEntryId.value = newEntry.id
  emitUpdate()
}

function removeEntry(id: string) {
  if (entries.value.length === 1) return
  
  const index = entries.value.findIndex(e => e.id === id)
  entries.value.splice(index, 1)
  
  if (activeEntryId.value === id) {
    activeEntryId.value = entries.value[0].id
  }
  
  emitUpdate()
}

function moveEntry(id: string, direction: 'up' | 'down') {
  const index = entries.value.findIndex(e => e.id === id)
  if (index === -1) return
  
  if (direction === 'up' && index > 0) {
    [entries.value[index], entries.value[index - 1]] = 
    [entries.value[index - 1], entries.value[index]]
  } else if (direction === 'down' && index < entries.value.length - 1) {
    [entries.value[index], entries.value[index + 1]] = 
    [entries.value[index + 1], entries.value[index]]
  }
  
  emitUpdate()
}

function handleImageUpload(event: Event, entryId: string) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  const entry = entries.value.find(e => e.id === entryId)
  
  if (!file || !entry) return
  
  entry.image = file
  
  const reader = new FileReader()
  reader.onload = (e) => {
    entry.imagePreviewUrl = e.target?.result as string
    emitUpdate()
  }
  reader.readAsDataURL(file)
}

function removeImage(entryId: string) {
  const entry = entries.value.find(e => e.id === entryId)
  if (!entry) return
  
  entry.image = null
  entry.imagePreviewUrl = null
  emitUpdate()
}

function updateEntryText(entryId: string, text: string) {
  const entry = entries.value.find(e => e.id === entryId)
  if (!entry) return
  
  entry.text = text
  emitUpdate()
}

function updateImagePosition(entryId: string, position: { x: number; y: number; scale: number }) {
  const entry = entries.value.find(e => e.id === entryId)
  if (!entry) return
  
  entry.position = position
  emitUpdate()
}

function emitUpdate() {
  emit('update:entries', entries.value)
}

// Drag state for active entry
const isDragging = ref(false)
const previewContainer = ref<HTMLDivElement | null>(null)

function startDrag(event: MouseEvent) {
  if (!previewContainer.value || !activeEntry.value.imagePreviewUrl) return
  
  isDragging.value = true
  
  const rect = previewContainer.value.getBoundingClientRect()
  const startX = event.clientX
  const startY = event.clientY
  const startPosX = activeEntry.value.position.x
  const startPosY = activeEntry.value.position.y
  
  function onMouseMove(e: MouseEvent) {
    if (!previewContainer.value) return
    const deltaX = ((e.clientX - startX) / rect.width) * 100
    const deltaY = ((e.clientY - startY) / rect.height) * 100
    
    activeEntry.value.position = {
      ...activeEntry.value.position,
      x: Math.max(0, Math.min(100, startPosX + deltaX)),
      y: Math.max(0, Math.min(100, startPosY + deltaY))
    }
    emitUpdate()
  }
  
  function onMouseUp() {
    isDragging.value = false
    document.removeEventListener('mousemove', onMouseMove)
    document.removeEventListener('mouseup', onMouseUp)
  }
  
  document.addEventListener('mousemove', onMouseMove)
  document.addEventListener('mouseup', onMouseUp)
}
</script>

<template>
  <div class="multi-comment-system">
    <div class="system-header">
      <h4>
        <i class="fa-solid fa-file-lines"></i>
        Arbeitsrapport / Kommentare
      </h4>
      
      <div class="page-estimate">
        <i class="fa-solid fa-copy"></i>
        Ca. {{ estimatedPages }} {{ estimatedPages === 1 ? 'Seite' : 'Seiten' }}
      </div>
    </div>

    <div class="entries-layout">
      <!-- Entry List -->
      <div class="entries-list">
        <div class="list-header">
          <span>Einträge ({{ entries.length }})</span>
          <button @click="addEntry" class="add-entry-btn" title="Neuer Eintrag">
            <i class="fa-solid fa-plus"></i>
            Hinzufügen
          </button>
        </div>

        <div class="entries-scroll">
          <div
            v-for="(entry, index) in entries"
            :key="entry.id"
            class="entry-item"
            :class="{ active: entry.id === activeEntryId }"
            @click="activeEntryId = entry.id"
          >
            <div class="entry-number">{{ index + 1 }}</div>
            
            <div class="entry-content">
              <div class="entry-preview">
                <i v-if="!entry.text && !entry.image" class="fa-regular fa-file"></i>
                <i v-else-if="entry.text && !entry.image" class="fa-solid fa-align-left"></i>
                <i v-else-if="entry.image" class="fa-solid fa-image"></i>
                <span>{{ entry.text ? entry.text.slice(0, 30) + '...' : 'Leer' }}</span>
              </div>
            </div>

            <div class="entry-actions">
              <button
                @click.stop="moveEntry(entry.id, 'up')"
                :disabled="index === 0"
                class="move-btn"
                title="Nach oben"
              >
                <i class="fa-solid fa-arrow-up"></i>
              </button>
              <button
                @click.stop="moveEntry(entry.id, 'down')"
                :disabled="index === entries.length - 1"
                class="move-btn"
                title="Nach unten"
              >
                <i class="fa-solid fa-arrow-down"></i>
              </button>
              <button
                @click.stop="removeEntry(entry.id)"
                :disabled="entries.length === 1"
                class="remove-btn"
                title="Entfernen"
              >
                <i class="fa-solid fa-trash"></i>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Active Entry Editor -->
      <div class="entry-editor">
        <div class="editor-header">
          <span>Eintrag #{{ entries.findIndex(e => e.id === activeEntryId) + 1 }} bearbeiten</span>
        </div>

        <div class="editor-body">
          <!-- Text Input -->
          <div class="form-group">
            <label>
              <i class="fa-solid fa-pen"></i>
              Kommentar / Beschreibung
            </label>
            <textarea
              :value="activeEntry.text"
              @input="updateEntryText(activeEntryId, ($event.target as HTMLTextAreaElement).value)"
              placeholder="Beschreibung der ausgeführten Arbeiten..."
              rows="4"
              class="textarea-field"
            ></textarea>
          </div>

          <!-- Image Upload -->
          <div class="form-group">
            <label>
              <i class="fa-solid fa-image"></i>
              Bild
            </label>
            
            <div v-if="!activeEntry.image" class="upload-area">
              <input
                type="file"
                accept="image/*"
                @change="handleImageUpload($event, activeEntryId)"
                class="file-input"
                :id="`file-${activeEntryId}`"
              />
              <label :for="`file-${activeEntryId}`" class="upload-label">
                <i class="fa-solid fa-cloud-arrow-up"></i>
                <span>Bild hochladen</span>
              </label>
            </div>

            <div v-else class="image-uploaded">
              <img :src="activeEntry.imagePreviewUrl" alt="Preview" />
              <div class="image-controls">
                <div class="scale-control">
                  <label>
                    <i class="fa-solid fa-search-minus"></i>
                    Größe
                    <i class="fa-solid fa-search-plus"></i>
                  </label>
                  <input
                    type="range"
                    :value="activeEntry.position.scale"
                    @input="updateImagePosition(activeEntryId, { 
                      ...activeEntry.position, 
                      scale: parseFloat(($event.target as HTMLInputElement).value) 
                    })"
                    min="0.1"
                    max="1"
                    step="0.05"
                    class="scale-slider"
                  />
                  <span class="scale-value">{{ Math.round(activeEntry.position.scale * 100) }}%</span>
                </div>
                <button @click="removeImage(activeEntryId)" class="remove-image-btn">
                  <i class="fa-solid fa-trash"></i>
                  Entfernen
                </button>
              </div>
            </div>
          </div>

          <!-- Preview -->
          <div class="form-group">
            <label>
              <i class="fa-solid fa-eye"></i>
              Vorschau
            </label>
            
            <div
              ref="previewContainer"
              class="mini-preview"
              :class="{ 'orientation-landscape': orientation === 'landscape' }"
              :style="{ aspectRatio: pageAspectRatio }"
            >
              <div class="preview-text" v-if="activeEntry.text">
                {{ activeEntry.text }}
              </div>
              <div v-else class="preview-placeholder">
                <i class="fa-solid fa-pen"></i>
                Kommentar hinzufügen...
              </div>

              <div
                v-if="activeEntry.imagePreviewUrl"
                class="preview-image"
                :class="{ dragging: isDragging }"
                :style="{
                  left: activeEntry.position.x + '%',
                  top: activeEntry.position.y + '%',
                  transform: `translate(-50%, -50%) scale(${activeEntry.position.scale})`
                }"
                @mousedown="startDrag"
              >
                <img :src="activeEntry.imagePreviewUrl" alt="Position preview" />
                <div class="drag-hint">
                  <i class="fa-solid fa-up-down-left-right"></i>
                </div>
              </div>
            </div>
            
            <p class="hint">
              <i class="fa-solid fa-info-circle"></i>
              {{ activeEntry.imagePreviewUrl ? 'Ziehen Sie das Bild mit der Maus' : 'Laden Sie ein Bild hoch um es zu positionieren' }}
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.multi-comment-system {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.system-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-4);
  background: linear-gradient(135deg,
    color-mix(in oklab, var(--accent) 10%, transparent),
    color-mix(in oklab, var(--green) 8%, transparent));
  border: 1px solid color-mix(in oklab, var(--accent) 25%, transparent);
  border-radius: var(--radius-xl);
}

.system-header h4 {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin: 0;
  color: var(--text);
  font-size: 1.1rem;
  font-weight: 600;
}

.system-header h4 i {
  color: var(--accent);
}

.page-estimate {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  background: color-mix(in oklab, var(--accent) 20%, transparent);
  border-radius: var(--radius-md);
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text);
}

.entries-layout {
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: var(--space-4);
}

/* Entries List */
.entries-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  background: var(--panel);
  border: 2px solid var(--border-color);
  border-radius: var(--radius-xl);
  padding: var(--space-4);
  max-height: 600px;
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: var(--space-3);
  border-bottom: 1px solid var(--border-color);
  font-weight: 600;
  color: var(--text);
}

.add-entry-btn {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  background: var(--accent);
  color: white;
  border: none;
  border-radius: var(--radius-md);
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s var(--ease-smooth);
}

.add-entry-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px color-mix(in oklab, var(--accent) 30%, transparent);
}

.entries-scroll {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.entry-item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3);
  background: var(--bg);
  border: 2px solid var(--border-color);
  border-radius: var(--radius-lg);
  cursor: pointer;
  transition: all 0.2s var(--ease-smooth);
}

.entry-item:hover {
  border-color: var(--accent);
  transform: translateX(4px);
}

.entry-item.active {
  border-color: var(--accent);
  background: color-mix(in oklab, var(--accent) 10%, transparent);
  box-shadow: 0 0 0 3px color-mix(in oklab, var(--accent) 15%, transparent);
}

.entry-number {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--accent);
  color: white;
  display: grid;
  place-items: center;
  font-weight: 700;
  font-size: 0.85rem;
  flex-shrink: 0;
}

.entry-content {
  flex: 1;
  min-width: 0;
}

.entry-preview {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: 0.85rem;
  color: var(--muted);
}

.entry-preview i {
  color: var(--accent);
}

.entry-preview span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.entry-actions {
  display: flex;
  gap: var(--space-1);
  flex-shrink: 0;
}

.move-btn,
.remove-btn {
  width: 28px;
  height: 28px;
  border-radius: var(--radius-sm);
  display: grid;
  place-items: center;
  background: var(--btn);
  border: 1px solid var(--border-color);
  color: var(--muted);
  cursor: pointer;
  transition: all 0.2s var(--ease-smooth);
  font-size: 0.75rem;
}

.move-btn:hover:not(:disabled) {
  background: var(--accent);
  color: white;
  border-color: var(--accent);
}

.remove-btn:hover:not(:disabled) {
  background: #dc2626;
  color: white;
  border-color: #dc2626;
}

.move-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

/* Entry Editor */
.entry-editor {
  display: flex;
  flex-direction: column;
  background: var(--panel);
  border: 2px solid var(--border-color);
  border-radius: var(--radius-xl);
  overflow: hidden;
  max-height: 600px;
}

.editor-header {
  padding: var(--space-4);
  background: var(--bg);
  border-bottom: 1px solid var(--border-color);
  font-weight: 600;
  color: var(--text);
}

.editor-body {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.form-group label {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-bottom: var(--space-3);
  font-weight: 600;
  color: var(--text);
  font-size: 0.95rem;
}

.form-group label i {
  color: var(--accent);
}

.textarea-field {
  width: 100%;
  padding: var(--space-3);
  background: var(--bg);
  border: 2px solid var(--border-color);
  border-radius: var(--radius-lg);
  color: var(--text);
  font-family: inherit;
  font-size: 0.95rem;
  resize: vertical;
  transition: all 0.2s var(--ease-smooth);
}

.textarea-field:focus {
  outline: none;
  border-color: var(--accent);
  box-shadow: 0 0 0 3px color-mix(in oklab, var(--accent) 15%, transparent);
}

/* Upload Area */
.upload-area {
  position: relative;
}

.file-input {
  display: none;
}

.upload-label {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-6);
  background: var(--bg);
  border: 2px dashed var(--border-color);
  border-radius: var(--radius-lg);
  cursor: pointer;
  transition: all 0.2s var(--ease-smooth);
  color: var(--muted);
}

.upload-label:hover {
  border-color: var(--accent);
  background: color-mix(in oklab, var(--accent) 5%, transparent);
}

.upload-label i {
  font-size: 2.5rem;
  color: var(--accent);
}

/* Image Uploaded */
.image-uploaded {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.image-uploaded img {
  width: 100%;
  max-height: 200px;
  object-fit: contain;
  border-radius: var(--radius-lg);
  background: var(--bg);
  padding: var(--space-2);
  border: 1px solid var(--border-color);
}

.image-controls {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding: var(--space-3);
  background: var(--bg);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border-color);
}

.scale-control {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.scale-control label {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: 0.85rem;
  color: var(--muted);
  font-weight: 500;
  margin: 0;
}

.scale-slider {
  flex: 1;
  height: 6px;
  border-radius: 3px;
  background: color-mix(in oklab, var(--border-color) 50%, transparent);
  outline: none;
  -webkit-appearance: none;
  appearance: none;
  cursor: pointer;
}

.scale-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--accent);
  cursor: pointer;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
}

.scale-slider::-moz-range-thumb {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--accent);
  border: none;
  cursor: pointer;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
}

.scale-value {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--accent);
  min-width: 45px;
  text-align: right;
}

.remove-image-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  background: #dc2626;
  color: white;
  border: none;
  border-radius: var(--radius-md);
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s var(--ease-smooth);
}

.remove-image-btn:hover {
  background: #b91c1c;
  transform: translateY(-2px);
}

/* Mini Preview */
.mini-preview {
  position: relative;
  width: 100%;
  max-width: 300px;
  background: white;
  border-radius: var(--radius-lg);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  margin: 0 auto;
}

.preview-text {
  padding: var(--space-3);
  font-size: 0.75rem;
  color: #333;
  line-height: 1.5;
  white-space: pre-wrap;
  word-wrap: break-word;
  max-height: 150px;
  overflow-y: auto;
}

.preview-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  padding: var(--space-4);
  color: #999;
  font-size: 0.85rem;
  font-style: italic;
}

.preview-image {
  position: absolute;
  cursor: move;
  z-index: 10;
  transition: transform 0.2s var(--ease-smooth);
  user-select: none;
}

.preview-image.dragging {
  cursor: grabbing;
  z-index: 20;
}

.preview-image img {
  display: block;
  max-width: 100%;
  border-radius: var(--radius-md);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  pointer-events: none;
}

.drag-hint {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 32px;
  height: 32px;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  border-radius: 50%;
  display: grid;
  place-items: center;
  opacity: 0;
  transition: opacity 0.2s var(--ease-smooth);
  pointer-events: none;
  font-size: 0.9rem;
}

.preview-image:hover .drag-hint {
  opacity: 1;
}

.hint {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-top: var(--space-2);
  font-size: 0.85rem;
  color: var(--muted);
  font-style: italic;
}

.hint i {
  color: var(--accent);
}

/* Responsive */
@media (max-width: 1024px) {
  .entries-layout {
    grid-template-columns: 1fr;
  }
  
  .entries-list {
    max-height: 300px;
  }
}

@media (max-width: 640px) {
  .system-header {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--space-3);
  }
  
  .entry-actions {
    flex-direction: column;
  }
}

/* Dark mode */
[data-theme="dark"] .mini-preview {
  background: #f5f5f5;
}
</style>
