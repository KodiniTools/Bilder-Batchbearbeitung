<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { useImageStore } from '@/stores/imageStore'
import ImageCard from './ImageCard.vue'
import type { ImageObject } from '@/lib/core/types'

const imageStore = useImageStore()

const props = withDefaults(
  defineProps<{
    /** Im Bearbeiten-Modus nur die ausgewählten Bilder anzeigen. */
    onlySelected?: boolean
  }>(),
  {
    onlySelected: false,
  }
)

const emit = defineEmits<{
  'open-editor': [ImageObject]
  'open-preview': [ImageObject]
}>()

// Angezeigte Bilder: im Bearbeiten-Modus nur die Auswahl, sonst alle.
const displayedImages = computed(() =>
  props.onlySelected ? imageStore.selectedImages : imageStore.images
)

// Kachel-Mindestbreite je nach gewählter Anzeigegröße (klein/mittel/groß)
// Werte bewusst gestaffelt, damit sich die Spaltenzahl auch im schmalen
// Grid (geöffneter Sidebar, ~830px) zwischen mittel und groß unterscheidet.
const CARD_MIN_WIDTH: Record<string, string> = {
  small: '180px',
  medium: '260px',
  large: '400px',
}
const gridStyle = computed(() => ({
  '--card-min': CARD_MIN_WIDTH[imageStore.gridSize] || CARD_MIN_WIDTH.medium,
}))

// Maximal so viele Reihen sichtbar; weitere Reihen im Container scrollbar.
const MAX_VISIBLE_ROWS = 5
const scrollContainer = ref<HTMLElement | null>(null)
const gridEl = ref<HTMLElement | null>(null)
const maxHeight = ref<number | null>(null)

/**
 * Misst die Oberkante der ersten Kachel in Reihe MAX_VISIBLE_ROWS + 1 und
 * begrenzt den Container auf die Höhe davor. Funktioniert für jede
 * Spaltenzahl (klein/mittel/groß, responsive) und variable Kartenhöhen.
 */
function updateMaxHeight() {
  const container = scrollContainer.value
  const grid = gridEl.value
  if (!container || !grid) return
  const columns = getComputedStyle(grid).gridTemplateColumns.split(' ').filter(Boolean).length || 1
  const firstHidden = grid.children[columns * MAX_VISIBLE_ROWS] as HTMLElement | undefined
  if (!firstHidden) {
    maxHeight.value = null
    return
  }
  const style = getComputedStyle(grid)
  const rowGap = parseFloat(style.rowGap) || 0
  const paddingTop = parseFloat(getComputedStyle(container).paddingTop) || 0
  maxHeight.value = Math.max(0, firstHidden.offsetTop - paddingTop - rowGap)
}

const containerStyle = computed(() =>
  maxHeight.value === null ? undefined : { maxHeight: `${maxHeight.value}px` }
)

let resizeObserver: ResizeObserver | null = null
onMounted(() => {
  updateMaxHeight()
  if (typeof ResizeObserver !== 'undefined' && gridEl.value) {
    resizeObserver = new ResizeObserver(() => updateMaxHeight())
    resizeObserver.observe(gridEl.value)
  }
})
onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  resizeObserver = null
})
watch(
  () => [displayedImages.value.length, imageStore.gridSize],
  () => nextTick(updateMaxHeight)
)

// Drag & Drop State
const draggedIndex = ref<number | null>(null)
const dropTargetIndex = ref<number | null>(null)

function handleOpenEditor(image: ImageObject) {
  emit('open-editor', image)
}

function handleOpenPreview(image: ImageObject) {
  emit('open-preview', image)
}

function getImageKey(image: ImageObject): string {
  return `${image.id}-${image.version}`
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
    // Indizes beziehen sich auf die angezeigte Liste; für den Store auf die
    // tatsächlichen Positionen abbilden (relevant im gefilterten Modus).
    const fromStoreIndex = imageStore.images.indexOf(displayedImages.value[draggedIndex.value])
    const toStoreIndex = imageStore.images.indexOf(displayedImages.value[toIndex])
    if (fromStoreIndex !== -1 && toStoreIndex !== -1) {
      imageStore.moveImage(fromStoreIndex, toStoreIndex)
    }
  }
  draggedIndex.value = null
  dropTargetIndex.value = null
}
</script>

<template>
  <div
    ref="scrollContainer"
    class="images-scroll-container"
    :class="{ 'is-limited': maxHeight !== null }"
    :style="containerStyle"
  >
    <section ref="gridEl" class="image-container" :style="gridStyle">
      <div
        v-for="(image, index) in displayedImages"
        :key="getImageKey(image)"
        class="drag-wrapper"
        :class="{
          'drop-target': dropTargetIndex === index,
          'drop-before': dropTargetIndex === index && draggedIndex !== null && draggedIndex > index,
          'drop-after': dropTargetIndex === index && draggedIndex !== null && draggedIndex < index,
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
  box-sizing: content-box;
}

/* Ab mehr als 5 Reihen: interner Scrollbereich. Padding verhindert, dass
   Rahmen/Schatten/Hover-Effekte der Karten am Rand abgeschnitten werden. */
.images-scroll-container.is-limited {
  overflow-y: auto;
  padding: var(--space-2);
  margin: calc(-1 * var(--space-2));
  scrollbar-gutter: stable;
}

.image-container {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, var(--card-min, 280px)), 1fr));
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
    grid-template-columns: repeat(auto-fill, minmax(min(100%, 240px), 1fr));
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
