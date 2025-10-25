<script setup lang="ts">
import { useImageStore } from '@/stores/imageStore'
import ImageCard from './ImageCard.vue'
import type { ImageObject } from '@/lib/core/types'

const imageStore = useImageStore()

const emit = defineEmits<{
  'open-editor': [ImageObject]
}>()

function handleOpenEditor(image: ImageObject) {
  emit('open-editor', image)
}

// Generate unique key for each image based on dimensions and name
// This forces re-render when image is edited
function getImageKey(image: ImageObject): string {
  return `${image.id}-${image.canvas.width}x${image.canvas.height}-${image.outputName || ''}`
}
</script>

<template>
  <div class="images-scroll-container">
    <section class="image-container">
      <ImageCard
        v-for="image in imageStore.images"
        :key="getImageKey(image)"
        :image="image"
        @open-editor="handleOpenEditor"
      />
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
