<script setup lang="ts">
import { ref } from 'vue'
import { useImageStore } from '@/stores/imageStore'
import ImageCard from './ImageCard.vue'
import type { ImageObject } from '@/lib/core/types'

const imageStore = useImageStore()

const emit = defineEmits<{
  'open-editor': [ImageObject]
  'open-preview': [ImageObject]
}>()

// Drag & Drop State
const draggedIndex = ref<number | null>(null)
const dropTargetIndex = ref<number | null>(null)

function handleOpenEditor(image: ImageObject) {
  emit('open-editor', image)
}

function handleOpenPreview(image: ImageObject) {
  emit('open-preview', image)
}

// Generate unique key for each image based on dimensions and name
// This forces re-render when image is edited
function getImageKey(image: ImageObject): string {
  return `${image.id}-${image.canvas.width}x${image.canvas.height}-${image.outputName || ''}`
}

// Drag & Drop Handlers
function handleDragStart(event: DragEvent, index: number) {
  draggedIndex.value = index
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', index.toString())
  }
  // Element mit Verzögerung als "dragging" markieren für visuelles Feedback
  const target = event.target as HTMLElement
  setTimeout(() => {
    target.classList.add('dragging')
  }, 0)
}

function handleDragEnd(event: DragEvent) {
  draggedIndex.value = null
  dropTargetIndex.value = null
  const target = event.target as HTMLElement
  target.classList.remove('dragging')
}

function handleDragOver(event: DragEvent, index: number) {
  event.preventDefault()
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move'
  }
  if (draggedIndex.value !== null && draggedIndex.value !== index) {
    dropTargetIndex.value = index
  }
}

function handleDragLeave() {
  dropTargetIndex.value = null
}

function handleDrop(event: DragEvent, toIndex: number) {
  event.preventDefault()
  if (draggedIndex.value !== null && draggedIndex.value !== toIndex) {
    imageStore.moveImage(draggedIndex.value, toIndex)
  }
  draggedIndex.value = null
  dropTargetIndex.value = null
}

function getImageIndex(imageId: string): number {
  return imageStore.images.findIndex(img => img.id === imageId)
}
</script>

<template>
  <div class="images-scroll-container">
    <section class="image-container">
      <div
        v-for="(image, index) in imageStore.images"
        :key="getImageKey(image)"
        class="drag-wrapper"
        :class="{
          'drop-target': dropTargetIndex === index,
          'drop-before': dropTargetIndex === index && draggedIndex !== null && draggedIndex > index,
          'drop-after': dropTargetIndex === index && draggedIndex !== null && draggedIndex < index
        }"
        draggable="true"
        @dragstart="handleDragStart($event, index)"
        @dragend="handleDragEnd"
        @dragover="handleDragOver($event, index)"
        @dragleave="handleDragLeave"
        @drop="handleDrop($event, index)"
      >
        <ImageCard
          :image="image"
          @open-editor="handleOpenEditor"
          @open-preview="handleOpenPreview"
        />
      </div>
    </section>
  </div>
</template>

<style scoped>
.images-scroll-container {
  position: relative;
}

.image-container {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: var(--space-5);
}

.drag-wrapper {
  position: relative;
  cursor: grab;
  transition: transform 0.2s var(--ease-smooth);
}

.drag-wrapper:active {
  cursor: grabbing;
}

.drag-wrapper.dragging {
  opacity: 0.5;
  transform: scale(0.95);
}

/* Drop-Target Indikatoren */
.drag-wrapper.drop-target::before {
  content: '';
  position: absolute;
  z-index: 20;
  background: linear-gradient(135deg, var(--accent), var(--green));
  border-radius: var(--radius-lg);
  pointer-events: none;
  animation: dropPulse 0.5s ease infinite alternate;
}

.drag-wrapper.drop-before::before {
  left: -8px;
  top: 0;
  bottom: 0;
  width: 4px;
}

.drag-wrapper.drop-after::before {
  right: -8px;
  top: 0;
  bottom: 0;
  width: 4px;
}

@keyframes dropPulse {
  0% {
    opacity: 0.6;
    box-shadow: 0 0 8px var(--accent);
  }
  100% {
    opacity: 1;
    box-shadow: 0 0 16px var(--accent);
  }
}

/* Deep selector für ImageCard im Drag-Zustand */
.drag-wrapper.dragging :deep(.image-card) {
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
}

@media (max-width: 768px) {
  .image-container {
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: var(--space-4);
  }
}

@media (max-width: 480px) {
  .image-container {
    grid-template-columns: 1fr;
    gap: var(--space-3);
  }
}
</style>
