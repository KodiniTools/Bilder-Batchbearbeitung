<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import type { ImageObject } from '@/lib/core/types'

const props = defineProps<{
  image: ImageObject | null
  isOpen: boolean
}>()

const emit = defineEmits<{
  close: []
}>()

const previewCanvas = ref<HTMLCanvasElement | null>(null)

const imageFormat = computed(() => {
  if (!props.image) return ''
  
  // Try exportFormat first, then extract from filename
  const format = props.image.exportFormat || 
                 props.image.file.name.split('.').pop()?.toUpperCase() || 
                 'UNKNOWN'
  
  return format.toUpperCase()
})

function updatePreview() {
  if (!previewCanvas.value || !props.image) return
  
  const canvas = previewCanvas.value
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  
  // Calculate scaling to fit window
  const maxWidth = window.innerWidth * 0.9
  const maxHeight = window.innerHeight * 0.9
  
  const scale = Math.min(
    maxWidth / props.image.canvas.width,
    maxHeight / props.image.canvas.height,
    1 // Don't scale up
  )
  
  canvas.width = props.image.canvas.width * scale
  canvas.height = props.image.canvas.height * scale
  
  // Draw the image
  ctx.drawImage(props.image.canvas, 0, 0, canvas.width, canvas.height)
}

function handleClose() {
  emit('close')
}

function handleKeyDown(event: KeyboardEvent) {
  if (event.key === 'Escape' && props.isOpen) {
    handleClose()
  }
}

watch(() => props.isOpen, (isOpen) => {
  if (isOpen) {
    setTimeout(updatePreview, 50) // Small delay to ensure DOM is ready
  }
})

watch(() => props.image, () => {
  if (props.isOpen) {
    updatePreview()
  }
})

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
})
</script>

<template>
  <Transition name="preview">
    <div v-if="isOpen" class="preview-overlay" @click="handleClose">
      <div class="preview-container" @click.stop>
        <div class="preview-header">
          <div class="preview-title">
            <i class="fa-solid fa-eye"></i>
            Bildvorschau
          </div>
          <button 
            class="preview-close-btn"
            @click="handleClose"
            aria-label="Schließen"
          >
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>
        
        <div class="preview-content">
          <canvas ref="previewCanvas"></canvas>
        </div>
        
        <div class="preview-info" v-if="image">
          <span>{{ image.canvas.width }} × {{ image.canvas.height }} px</span>
          <span class="format-badge">{{ imageFormat }}</span>
          <span>{{ image.outputName || image.file.name }}</span>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.preview-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(8px);
  display: grid;
  place-items: center;
  padding: var(--space-4);
}

.preview-container {
  max-width: 95vw;
  max-height: 95vh;
  background: var(--panel);
  border-radius: var(--radius-2xl);
  overflow: hidden;
  box-shadow: 
    0 25px 50px rgba(0, 0, 0, 0.3),
    0 0 0 1px var(--border-color);
  display: flex;
  flex-direction: column;
}

.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-4);
  background: var(--bg);
  border-bottom: 1px solid var(--border-color);
}

.preview-title {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  font-weight: 600;
  color: var(--text);
}

.preview-title i {
  color: var(--accent);
  font-size: 1.2rem;
}

.preview-close-btn {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: var(--btn);
  border: 1px solid var(--border-color);
  color: var(--muted);
  cursor: pointer;
  transition: all 0.3s var(--ease-spring);
}

.preview-close-btn:hover {
  background: var(--accent);
  color: white;
  transform: scale(1.1);
  border-color: var(--accent);
}

.preview-content {
  flex: 1;
  display: grid;
  place-items: center;
  padding: var(--space-5);
  background: var(--bg);
  overflow: auto;
}

.preview-content canvas {
  display: block;
  max-width: 100%;
  max-height: 100%;
  border-radius: var(--radius-lg);
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.2);
}

.preview-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-4);
  background: var(--bg);
  border-top: 1px solid var(--border-color);
  font-size: 0.9rem;
  color: var(--muted);
}

.format-badge {
  padding: var(--space-2) var(--space-3);
  background: linear-gradient(135deg, 
    color-mix(in oklab, var(--accent) 15%, transparent),
    color-mix(in oklab, var(--green) 12%, transparent));
  border: 1px solid color-mix(in oklab, var(--accent) 30%, transparent);
  border-radius: var(--radius-md);
  color: var(--text);
  font-weight: 600;
  font-size: 0.85rem;
  letter-spacing: 0.05em;
}

/* Transitions */
.preview-enter-active,
.preview-leave-active {
  transition: all 0.3s var(--ease-smooth);
}

.preview-enter-from,
.preview-leave-to {
  opacity: 0;
}

.preview-enter-from .preview-container,
.preview-leave-to .preview-container {
  transform: scale(0.95);
  opacity: 0;
}

@media (max-width: 768px) {
  .preview-info {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--space-2);
  }
}
</style>
