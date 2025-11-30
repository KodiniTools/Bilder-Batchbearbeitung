<script setup lang="ts">
import { computed, ref, onMounted, nextTick } from 'vue'
import type { ImageObject } from '@/lib/core/types'
import { ImageProcessor } from '@/lib/core/image-processor'
import { useImageStore } from '@/stores/imageStore'

const props = defineProps<{
  image: ImageObject
}>()

const emit = defineEmits<{
  'open-editor': [ImageObject]
  'open-preview': [ImageObject]
}>()

const imageStore = useImageStore()
const previewContainer = ref<HTMLDivElement | null>(null)

// Inline-Umbenennung
const isEditing = ref(false)
const editInput = ref<HTMLInputElement | null>(null)
const editName = ref('')

const baseName = computed(() => ImageProcessor.resolveBaseName(props.image))
const fileExt = computed(() => ImageProcessor.getFileExtension(props.image.file.name))
const displayName = computed(() => `${baseName.value}.${fileExt.value}`)

const handleCardClick = () => {
  if (!isEditing.value) {
    imageStore.toggleImageSelection(props.image.id)
  }
}

const handleRemove = (event: Event) => {
  event.stopPropagation()
  imageStore.removeImage(props.image.id)
}

const handleEdit = (event: Event) => {
  event.stopPropagation()
  emit('open-editor', props.image)
}

const handlePreview = () => {
  emit('open-preview', props.image)
}

// Inline-Umbenennung starten bei Doppelklick
const startEditing = (event: Event) => {
  event.stopPropagation()
  editName.value = baseName.value
  isEditing.value = true
  nextTick(() => {
    editInput.value?.focus()
    editInput.value?.select()
  })
}

// Umbenennung speichern
const saveEdit = () => {
  const newName = editName.value.trim()
  if (newName && newName !== baseName.value) {
    imageStore.updateImageName(props.image.id, newName)
  }
  isEditing.value = false
}

// Umbenennung abbrechen
const cancelEdit = () => {
  isEditing.value = false
  editName.value = ''
}

// Tastatureingabe behandeln
const handleEditKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Enter') {
    event.preventDefault()
    saveEdit()
  } else if (event.key === 'Escape') {
    event.preventDefault()
    cancelEdit()
  }
}

onMounted(() => {
  // Append the actual canvas from the image object
  if (previewContainer.value && props.image.canvas) {
    // Clear any existing content
    previewContainer.value.innerHTML = ''
    // Append the actual canvas
    previewContainer.value.appendChild(props.image.canvas)
  }
})
</script>

<template>
  <div
    class="image-card"
    :class="{ selected: image.selected }"
    @click="handleCardClick"
  >
    <!-- Checkbox-Overlay für bessere Sichtbarkeit des Auswahlstatus -->
    <div class="checkbox-overlay" :class="{ checked: image.selected }">
      <i v-if="image.selected" class="fas fa-check"></i>
    </div>

    <div
      ref="previewContainer"
      class="image-preview"
      @click.stop="handlePreview"
    >
      <!-- Canvas wird hier von onMounted eingefügt -->
    </div>
    
    <div class="image-info" @dblclick="startEditing" :title="displayName">
      <template v-if="!isEditing">
        <span class="file-name">{{ baseName }}</span>
        <span class="file-ext">.{{ fileExt }}</span>
      </template>
      <div v-else class="inline-edit" @click.stop>
        <input
          ref="editInput"
          v-model="editName"
          type="text"
          class="edit-input"
          @blur="saveEdit"
          @keydown="handleEditKeydown"
        />
        <span class="file-ext">.{{ fileExt }}</span>
      </div>
    </div>
    
    <div class="image-actions">
      <button
        type="button"
        class="image-action-btn remove-btn"
        @click="handleRemove"
        title="Bild entfernen"
        aria-label="Bild entfernen"
      >
        <i class="fas fa-times"></i>
      </button>
      
      <button
        type="button"
        class="image-action-btn edit-btn"
        @click="handleEdit"
        title="Bearbeiten & Exportieren"
        aria-label="Bearbeiten"
      >
        <i class="fa-solid fa-wand-magic-sparkles"></i>
      </button>
    </div>
  </div>
</template>

<style scoped>
/* Checkbox-Overlay Styles */
.checkbox-overlay {
  position: absolute;
  top: var(--space-3);
  left: var(--space-3);
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--glass-bg);
  backdrop-filter: blur(8px);
  border: 2px solid var(--border-color);
  display: grid;
  place-items: center;
  z-index: 10;
  transition: all 0.3s var(--ease-spring);
  opacity: 0.7;
  cursor: pointer;
}

.checkbox-overlay:hover {
  opacity: 1;
  transform: scale(1.1);
  border-color: var(--accent);
}

.checkbox-overlay.checked {
  background: linear-gradient(135deg, var(--accent), color-mix(in oklab, var(--accent) 80%, var(--green)));
  border-color: var(--accent);
  opacity: 1;
  box-shadow: 0 4px 12px color-mix(in oklab, var(--accent) 40%, transparent);
}

.checkbox-overlay.checked i {
  color: var(--bg);
  font-size: 14px;
  font-weight: bold;
}

.image-card:hover .checkbox-overlay {
  opacity: 1;
}

.image-card {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding: var(--space-4);
  background: var(--panel);
  border: 2px solid var(--border-color);
  border-radius: var(--radius-2xl);
  box-shadow: 
    0 4px 12px rgba(0, 0, 0, 0.08),
    0 2px 6px rgba(0, 0, 0, 0.04),
    inset 0 1px 0 rgba(255, 255, 255, 0.05);
  transition: all 0.4s var(--ease-spring);
  cursor: pointer;
  opacity: 0;
  transform: translateY(40px);
  animation: cardFadeIn 0.6s var(--ease-smooth) forwards;
  
  background: 
    var(--panel) padding-box,
    linear-gradient(135deg, 
      color-mix(in oklab, var(--border-color) 60%, transparent), 
      color-mix(in oklab, var(--accent) 25%, transparent)) border-box;
}

@keyframes cardFadeIn {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.image-card::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: linear-gradient(135deg, 
    color-mix(in oklab, var(--accent) 8%, transparent) 0%,
    transparent 40%,
    color-mix(in oklab, var(--green) 6%, transparent) 100%);
  opacity: 0;
  transition: opacity 0.4s var(--ease-smooth);
  pointer-events: none;
}

.image-card:hover {
  transform: translateY(-12px) scale(1.02);
  box-shadow: 
    0 12px 28px rgba(0, 0, 0, 0.15),
    0 6px 12px rgba(0, 0, 0, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
  border-color: color-mix(in oklab, var(--accent) 40%, var(--border-color));
}

.image-card:hover::before {
  opacity: 1;
}

.image-card.selected {
  background: 
    var(--panel) padding-box,
    linear-gradient(135deg, 
      var(--accent), 
      color-mix(in oklab, var(--accent) 70%, var(--green))) border-box;
  border-color: var(--accent);
  box-shadow: 
    0 12px 28px rgba(0, 0, 0, 0.15),
    0 6px 12px rgba(0, 0, 0, 0.08),
    0 0 0 4px color-mix(in oklab, var(--accent) 20%, transparent),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
}

.image-preview {
  position: relative;
  overflow: hidden;
  border-radius: var(--radius-lg);
  background: var(--bg);
  border: 1px solid color-mix(in oklab, var(--border-color) 50%, transparent);
  box-shadow: 
    0 2px 8px rgba(0, 0, 0, 0.06),
    inset 0 1px 2px rgba(0, 0, 0, 0.05);
}

.image-preview canvas {
  width: 100%;
  height: auto;
  display: block;
  aspect-ratio: 4 / 3;
  object-fit: cover;
  transition: all 0.4s var(--ease-smooth);
}

.image-card:hover .image-preview canvas {
  transform: scale(1.05);
}

.image-info {
  font-size: 0.92rem;
  color: var(--muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  cursor: text;
  padding: 4px 0;
  border-radius: var(--radius-md);
  transition: background 0.2s;
}

.image-info:hover:not(:has(.inline-edit)) {
  background: color-mix(in oklab, var(--accent) 10%, transparent);
}

.file-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-ext {
  color: var(--muted);
  flex-shrink: 0;
}

.inline-edit {
  display: flex;
  align-items: center;
  width: 100%;
  gap: 2px;
}

.edit-input {
  flex: 1;
  min-width: 0;
  padding: 4px 8px;
  font-size: 0.92rem;
  font-family: inherit;
  color: var(--text);
  background: var(--bg);
  border: 2px solid var(--accent);
  border-radius: var(--radius-md);
  outline: none;
  transition: all 0.2s;
}

.edit-input:focus {
  box-shadow: 0 0 0 3px color-mix(in oklab, var(--accent) 25%, transparent);
}

.image-actions {
  display: flex;
  gap: var(--space-2);
  position: relative;
  z-index: 2;
}

.image-action-btn {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: inline-grid;
  place-items: center;
  background: var(--btn);
  color: var(--muted);
  border: 1.5px solid var(--border-color);
  cursor: pointer;
  transition: all 0.3s var(--ease-spring);
  position: relative;
  overflow: hidden;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
}

.image-action-btn:hover {
  transform: translateY(-3px) scale(1.1);
  box-shadow: 0 8px 20px var(--shadow-color);
  color: var(--text);
  border-color: var(--accent);
}
</style>
