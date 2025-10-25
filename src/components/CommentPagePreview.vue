<script setup lang="ts">
import { ref, computed, watch } from 'vue'

interface Props {
  commentText: string
  commentImage: File | null
  orientation: 'portrait' | 'landscape'
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:position': [{ x: number; y: number; scale: number }]
}>()

// Image positioning state
const imagePreviewUrl = ref<string | null>(null)
const isDragging = ref(false)
const imagePosition = ref({ x: 50, y: 30 }) // Percentage-based positioning
const imageScale = ref(0.3) // Scale factor (0.1 to 1)

// Preview container ref
const previewContainer = ref<HTMLDivElement | null>(null)

// Load image when file changes
watch(() => props.commentImage, (newImage) => {
  if (newImage) {
    const reader = new FileReader()
    reader.onload = (e) => {
      imagePreviewUrl.value = e.target?.result as string
    }
    reader.readAsDataURL(newImage)
  } else {
    imagePreviewUrl.value = null
  }
}, { immediate: true })

// Emit position changes
watch([imagePosition, imageScale], () => {
  emit('update:position', {
    x: imagePosition.value.x,
    y: imagePosition.value.y,
    scale: imageScale.value
  })
}, { deep: true })

// Drag handlers
function startDrag(event: MouseEvent) {
  if (!previewContainer.value) return
  isDragging.value = true
  
  const rect = previewContainer.value.getBoundingClientRect()
  const startX = event.clientX
  const startY = event.clientY
  const startPosX = imagePosition.value.x
  const startPosY = imagePosition.value.y
  
  function onMouseMove(e: MouseEvent) {
    if (!previewContainer.value) return
    const deltaX = ((e.clientX - startX) / rect.width) * 100
    const deltaY = ((e.clientY - startY) / rect.height) * 100
    
    imagePosition.value = {
      x: Math.max(0, Math.min(100, startPosX + deltaX)),
      y: Math.max(0, Math.min(100, startPosY + deltaY))
    }
  }
  
  function onMouseUp() {
    isDragging.value = false
    document.removeEventListener('mousemove', onMouseMove)
    document.removeEventListener('mouseup', onMouseUp)
  }
  
  document.addEventListener('mousemove', onMouseMove)
  document.addEventListener('mouseup', onMouseUp)
}

function resetPosition() {
  imagePosition.value = { x: 50, y: 30 }
  imageScale.value = 0.3
}

const pageAspectRatio = computed(() => {
  return props.orientation === 'portrait' ? 1 / 1.414 : 1.414
})
</script>

<template>
  <div class="comment-preview-wrapper">
    <div class="preview-header">
      <h4>
        <i class="fa-solid fa-eye"></i>
        Kommentarseite Vorschau
      </h4>
      
      <div v-if="commentImage" class="preview-controls">
        <div class="scale-control">
          <label>
            <i class="fa-solid fa-search-minus"></i>
            Größe
            <i class="fa-solid fa-search-plus"></i>
          </label>
          <input 
            type="range" 
            v-model.number="imageScale" 
            min="0.1" 
            max="1" 
            step="0.05"
            class="scale-slider"
          />
          <span class="scale-value">{{ Math.round(imageScale * 100) }}%</span>
        </div>
        
        <button 
          @click="resetPosition" 
          class="reset-btn"
          title="Position zurücksetzen"
        >
          <i class="fa-solid fa-arrows-rotate"></i>
          Zentrieren
        </button>
      </div>
    </div>

    <div 
      ref="previewContainer"
      class="page-preview"
      :class="{ 'orientation-landscape': orientation === 'landscape' }"
      :style="{ aspectRatio: pageAspectRatio }"
    >
      <!-- Comment Text Area -->
      <div class="text-content">
        <div v-if="commentText" class="comment-text">
          {{ commentText }}
        </div>
        <div v-else class="placeholder-text">
          <i class="fa-solid fa-pen"></i>
          Kommentartext wird hier erscheinen...
        </div>
      </div>

      <!-- Draggable Image -->
      <div 
        v-if="imagePreviewUrl"
        class="draggable-image"
        :class="{ dragging: isDragging }"
        :style="{
          left: imagePosition.x + '%',
          top: imagePosition.y + '%',
          transform: `translate(-50%, -50%) scale(${imageScale})`
        }"
        @mousedown="startDrag"
      >
        <img :src="imagePreviewUrl" alt="Comment image" />
        <div class="drag-hint">
          <i class="fa-solid fa-up-down-left-right"></i>
          Verschieben
        </div>
      </div>

      <!-- Placeholder when no image -->
      <div v-else class="image-placeholder">
        <i class="fa-regular fa-image"></i>
        <span>Bild hochladen um es zu positionieren</span>
      </div>
    </div>

    <div class="preview-info">
      <i class="fa-solid fa-info-circle"></i>
      <span v-if="commentImage">
        Ziehen Sie das Bild mit der Maus, um es zu positionieren
      </span>
      <span v-else>
        Laden Sie ein Bild hoch, um die Vorschau zu sehen
      </span>
    </div>
  </div>
</template>

<style scoped>
.comment-preview-wrapper {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  padding: var(--space-4);
  background: var(--bg);
  border-radius: var(--radius-xl);
  border: 2px solid var(--border-color);
}

.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--space-4);
  flex-wrap: wrap;
}

.preview-header h4 {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin: 0;
  color: var(--text);
  font-size: 1.1rem;
  font-weight: 600;
}

.preview-header h4 i {
  color: var(--accent);
}

.preview-controls {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  flex-wrap: wrap;
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
  font-size: 0.9rem;
  color: var(--muted);
  font-weight: 500;
}

.scale-slider {
  width: 120px;
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
  appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--accent);
  cursor: pointer;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
  transition: transform 0.2s var(--ease-smooth);
}

.scale-slider::-webkit-slider-thumb:hover {
  transform: scale(1.2);
}

.scale-slider::-moz-range-thumb {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--accent);
  cursor: pointer;
  border: none;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
}

.scale-value {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--accent);
  min-width: 45px;
  text-align: right;
}

.reset-btn {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  background: color-mix(in oklab, var(--text) 10%, transparent);
  color: var(--text);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s var(--ease-smooth);
}

.reset-btn:hover {
  background: color-mix(in oklab, var(--text) 15%, transparent);
  transform: translateY(-2px);
}

.page-preview {
  position: relative;
  width: 100%;
  max-width: 400px;
  margin: 0 auto;
  background: white;
  border-radius: var(--radius-lg);
  box-shadow: 
    0 10px 30px rgba(0, 0, 0, 0.15),
    0 0 0 1px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  cursor: default;
}

.page-preview.orientation-landscape {
  max-width: 565px;
}

.text-content {
  position: absolute;
  top: var(--space-5);
  left: var(--space-5);
  right: var(--space-5);
  z-index: 1;
}

.comment-text {
  padding: var(--space-4);
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid #e0e0e0;
  border-radius: var(--radius-md);
  color: #333;
  font-size: 0.9rem;
  line-height: 1.6;
  white-space: pre-wrap;
  word-wrap: break-word;
  max-height: 200px;
  overflow-y: auto;
}

.placeholder-text {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-4);
  background: rgba(240, 240, 240, 0.8);
  border: 2px dashed #d0d0d0;
  border-radius: var(--radius-md);
  color: #999;
  font-size: 0.85rem;
  font-style: italic;
}

.draggable-image {
  position: absolute;
  cursor: move;
  z-index: 10;
  transition: transform 0.2s var(--ease-smooth);
  user-select: none;
}

.draggable-image.dragging {
  cursor: grabbing;
  z-index: 20;
}

.draggable-image img {
  display: block;
  max-width: 100%;
  max-height: 100%;
  border-radius: var(--radius-md);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  pointer-events: none;
}

.drag-hint {
  position: absolute;
  bottom: -30px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  background: rgba(0, 0, 0, 0.8);
  color: white;
  border-radius: var(--radius-md);
  font-size: 0.75rem;
  font-weight: 500;
  white-space: nowrap;
  opacity: 0;
  transition: opacity 0.2s var(--ease-smooth);
  pointer-events: none;
}

.draggable-image:hover .drag-hint {
  opacity: 1;
}

.image-placeholder {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-3);
  color: #999;
  text-align: center;
  padding: var(--space-5);
}

.image-placeholder i {
  font-size: 3rem;
  opacity: 0.5;
}

.image-placeholder span {
  font-size: 0.9rem;
  max-width: 200px;
}

.preview-info {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  background: color-mix(in oklab, var(--accent) 10%, transparent);
  border: 1px solid color-mix(in oklab, var(--accent) 20%, transparent);
  border-radius: var(--radius-md);
  font-size: 0.85rem;
  color: var(--text);
}

.preview-info i {
  color: var(--accent);
  font-size: 1rem;
}

/* Responsive */
@media (max-width: 640px) {
  .preview-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .preview-controls {
    width: 100%;
    flex-direction: column;
    align-items: stretch;
  }

  .scale-control {
    width: 100%;
    justify-content: space-between;
  }

  .scale-slider {
    flex: 1;
  }

  .reset-btn {
    width: 100%;
    justify-content: center;
  }
}

/* Dark mode adjustments */
[data-theme="dark"] .page-preview {
  background: #f5f5f5;
}
</style>
