<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import type { ImageObject } from '@/lib/core/types'
import { defaultFilters, defaultTransforms, defaultWatermark } from '@/lib/core/types'
import { ImageProcessor } from '@/lib/core/image-processor'

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

// Computed CSS filter string based on image filters
const filterStyle = computed(() => {
  if (!props.image) return {}
  const f = props.image.filters || defaultFilters
  return {
    filter: `
      brightness(${f.brightness}%)
      contrast(${f.contrast}%)
      saturate(${f.saturation}%)
      hue-rotate(${f.hue}deg)
      blur(${f.blur}px)
      grayscale(${f.grayscale}%)
      sepia(${f.sepia}%)
      invert(${f.invert}%)
    `.trim(),
    opacity: f.opacity / 100
  }
})

// Computed CSS transform style (border, radius, shadow)
const transformStyle = computed(() => {
  if (!props.image) return {}
  const t = props.image.transforms || defaultTransforms
  const style: Record<string, string> = {}
  if (t.borderWidth > 0) {
    style.border = `${t.borderWidth}px solid ${t.borderColor}`
  }
  if (t.borderRadius > 0) {
    const pct = (t.borderRadius / 200) * 50
    style.borderRadius = `${pct}%`
  }
  if (t.shadowBlur > 0) {
    const rgba = ImageProcessor.hexToRgba(t.shadowColor, t.shadowOpacity / 100)
    style.boxShadow = `${t.shadowOffsetX}px ${t.shadowOffsetY}px ${t.shadowBlur}px ${rgba}`
  }
  return style
})

// Watermark state
const watermarkActive = computed(() => {
  if (!props.image) return false
  const w = props.image.watermark || defaultWatermark
  return w.enabled && w.text.trim().length > 0
})

const watermarkCanvasRef = ref<HTMLCanvasElement | null>(null)

function renderWatermarkPreview() {
  if (!props.image || !watermarkCanvasRef.value) return
  const w = props.image.watermark || defaultWatermark
  if (!w.enabled || !w.text.trim()) return

  const srcCanvas = props.image.canvas
  const wmPreview = watermarkCanvasRef.value

  // Gleiche Dimensionen wie das Preview-Canvas
  if (previewCanvas.value) {
    wmPreview.width = previewCanvas.value.width
    wmPreview.height = previewCanvas.value.height
  } else {
    wmPreview.width = srcCanvas.width
    wmPreview.height = srcCanvas.height
  }

  // Skaliertes transparentes Canvas erstellen
  const transparentCanvas = document.createElement('canvas')
  transparentCanvas.width = wmPreview.width
  transparentCanvas.height = wmPreview.height

  const wmCanvas = ImageProcessor.getCanvasWithWatermark(transparentCanvas, w)
  const ctx = wmPreview.getContext('2d')
  if (ctx) {
    ctx.clearRect(0, 0, wmPreview.width, wmPreview.height)
    ctx.drawImage(wmCanvas, 0, 0)
  }
}

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

  // Wasserzeichen auch aktualisieren
  nextTick(() => renderWatermarkPreview())
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

// Wasserzeichen bei Änderung aktualisieren
watch(() => props.image?.watermark, () => {
  if (props.isOpen && watermarkActive.value) {
    nextTick(() => renderWatermarkPreview())
  }
}, { deep: true })

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
      <button
        class="preview-close-float"
        aria-label="Schließen"
        @click.stop="handleClose"
      >
        <i class="fa-solid fa-xmark"></i>
      </button>
      <div class="preview-container" @click.stop>
        <div class="preview-header">
          <div class="preview-title">
            <i class="fa-solid fa-eye"></i>
            Bildvorschau
          </div>
          <button
            class="preview-close-btn"
            aria-label="Schließen"
            @click="handleClose"
          >
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>
        
        <div class="preview-content">
          <div class="preview-canvas-wrapper">
            <canvas ref="previewCanvas" :style="[filterStyle, transformStyle]"></canvas>
            <canvas
              v-if="watermarkActive"
              ref="watermarkCanvasRef"
              class="watermark-canvas"
            ></canvas>
          </div>
        </div>
        
        <div v-if="image" class="preview-info">
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
  z-index: 10000;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(8px);
  display: grid;
  place-items: center;
  padding: var(--space-4);
}

.preview-container {
  position: relative;
  max-width: 95vw;
  max-height: 95vh;
  background: var(--panel);
  border-radius: 0;
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

.preview-close-float {
  position: fixed;
  top: 16px;
  right: 16px;
  z-index: 10001;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: rgba(0, 0, 0, 0.65);
  backdrop-filter: blur(8px);
  border: 1.5px solid rgba(255, 255, 255, 0.25);
  color: white;
  font-size: 1.1rem;
  cursor: pointer;
  transition: all 0.2s var(--ease-spring);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
}

.preview-close-float:hover {
  background: var(--accent);
  border-color: var(--accent);
  transform: scale(1.1);
  box-shadow: 0 4px 16px color-mix(in oklab, var(--accent) 50%, transparent);
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

.preview-canvas-wrapper {
  position: relative;
  display: inline-block;
}

/* Wasserzeichen-Canvas-Overlay */
.watermark-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 5;
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
