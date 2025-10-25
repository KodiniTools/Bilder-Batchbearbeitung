<script setup lang="ts">
import { computed, ref, watch, onMounted } from 'vue'
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
const previewCanvas = ref<HTMLCanvasElement | null>(null)

const displayName = computed(() => {
  const base = ImageProcessor.resolveBaseName(props.image)
  const ext = ImageProcessor.getFileExtension(props.image.file.name)
  return `${base}.${ext}`
})

const handleCardClick = () => {
  imageStore.toggleImageSelection(props.image.id)
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

const updatePreview = () => {
  if (!previewCanvas.value) return
  
  const ctx = previewCanvas.value.getContext('2d')
  if (!ctx) return
  
  // Update canvas dimensions
  previewCanvas.value.width = props.image.canvas.width
  previewCanvas.value.height = props.image.canvas.height
  
  // Clear and redraw
  ctx.clearRect(0, 0, previewCanvas.value.width, previewCanvas.value.height)
  ctx.drawImage(props.image.canvas, 0, 0)
}

// Watch for canvas dimension changes (triggered when image is edited)
watch(() => [props.image.canvas.width, props.image.canvas.height], () => {
  updatePreview()
}, { deep: true })

// Watch for outputName changes
watch(() => props.image.outputName, () => {
  // Force re-render of displayName
})

onMounted(() => {
  updatePreview()
})
</script>

<template>
  <div
    class="image-card"
    :class="{ selected: image.selected }"
    @click="handleCardClick"
  >
    <div class="image-preview" @click.stop="handlePreview">
      <canvas
        ref="previewCanvas"
        :width="image.canvas.width"
        :height="image.canvas.height"
      />
    </div>
    
    <div class="image-info">
      {{ displayName }}
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
.image-card {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding: var(--space-4);
  background: var(--panel);
  border: 1px solid transparent;
  border-radius: var(--radius-2xl);
  box-shadow: var(--surface-elevation);
  transition: all 0.4s var(--ease-spring);
  cursor: pointer;
  opacity: 0;
  transform: translateY(40px);
  animation: cardFadeIn 0.6s var(--ease-smooth) forwards;
  
  background: 
    var(--panel) padding-box,
    linear-gradient(135deg, 
      color-mix(in oklab, var(--border-color) 40%, transparent), 
      color-mix(in oklab, var(--accent) 15%, transparent)) border-box;
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
  box-shadow: var(--surface-hover);
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
  box-shadow: 
    var(--surface-hover),
    0 0 0 4px color-mix(in oklab, var(--accent) 15%, transparent);
}

.image-preview {
  position: relative;
  overflow: hidden;
  border-radius: var(--radius-lg);
  background: var(--bg);
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
  border: 1px solid var(--border-color);
  cursor: pointer;
  transition: all 0.3s var(--ease-spring);
  position: relative;
  overflow: hidden;
}

.image-action-btn:hover {
  transform: translateY(-3px) scale(1.1);
  box-shadow: 0 8px 20px var(--shadow-color);
  color: var(--text);
  border-color: var(--accent);
}
</style>
