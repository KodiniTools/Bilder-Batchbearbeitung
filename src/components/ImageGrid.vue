<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { useImageStore } from '@/stores/imageStore'
import ImageCard from './ImageCard.vue'
import ImageSearch from './ImageSearch.vue'
import type { ImageObject } from '@/lib/core/types'
import { getTopOverlayBottom } from '@/utils/viewport'
import { useI18n } from 'vue-i18n'

const imageStore = useImageStore()
const { t } = useI18n()

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

// Basis: im Bearbeiten-Modus nur die Auswahl, sonst alle.
const baseImages = computed(() =>
  props.onlySelected ? imageStore.selectedImages : imageStore.images
)
// Angezeigte Bilder: Basis eingeschränkt auf die Suchtreffer
const displayedImages = computed(() => {
  if (!imageStore.isSearchActive) return baseImages.value
  const matches = new Set(imageStore.filteredImages)
  return baseImages.value.filter((img) => matches.has(img))
})

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
// Zusätzlich wird der Container auf die sichtbare Fensterhöhe begrenzt.
const MAX_VISIBLE_ROWS = 5
// Abstand zu Fensterrand bzw. fixiertem Seiten-Header
const VIEWPORT_MARGIN = 16
// Untergrenze, damit das Grid auf sehr niedrigen Fenstern nutzbar bleibt
const MIN_CONTAINER_HEIGHT = 240
const scrollContainer = ref<HTMLElement | null>(null)
const gridEl = ref<HTMLElement | null>(null)
const maxHeight = ref<number | null>(null)

/**
 * Begrenzt den Container auf das Minimum aus
 * - Höhe der ersten MAX_VISIBLE_ROWS Reihen (gemessen an der ersten Kachel
 *   der Folgereihe; gilt für jede Spaltenzahl und variable Kartenhöhen) und
 * - verfügbarer Fensterhöhe unterhalb fixierter Header.
 */
function updateMaxHeight() {
  const container = scrollContainer.value
  const grid = gridEl.value
  if (!container || !grid) return

  const columns = getComputedStyle(grid).gridTemplateColumns.split(' ').filter(Boolean).length || 1
  const firstHidden = grid.children[columns * MAX_VISIBLE_ROWS] as HTMLElement | undefined
  const containerStyles = getComputedStyle(container)
  const paddingTop = parseFloat(containerStyles.paddingTop) || 0
  const paddingY = paddingTop + (parseFloat(containerStyles.paddingBottom) || 0)
  let rowsLimit = Infinity
  if (firstHidden) {
    const rowGap = parseFloat(getComputedStyle(grid).rowGap) || 0
    rowsLimit = Math.max(0, firstHidden.offsetTop - paddingTop - rowGap)
  }

  const viewportLimit = Math.max(
    MIN_CONTAINER_HEIGHT,
    window.innerHeight - getTopOverlayBottom() - 2 * VIEWPORT_MARGIN - paddingY
  )
  const limit = Math.min(rowsLimit, viewportLimit)
  maxHeight.value = grid.offsetHeight > limit ? Math.floor(limit) : null
}

const containerStyle = computed(() =>
  maxHeight.value === null ? undefined : { maxHeight: `${maxHeight.value}px` }
)

/**
 * Seite mitziehen, sobald im Grid gescrollt wird: Liegt der Container
 * teilweise außerhalb des sichtbaren Bereichs (oben unter dem Header oder
 * unten außerhalb des Fensters), wird die Seite so weit gescrollt, dass er
 * vollständig sichtbar ist. Gilt in beide Richtungen.
 */
let followLocked = false
// Nur auf Nutzereingaben reagieren – nicht auf programmatisches Scrollen
// (z. B. „Nach oben“-Button), sonst würde die Seite gegengesteuert.
const USER_INTENT_WINDOW_MS = 250
let lastUserIntent = 0
let pointerActive = false
function markUserIntent() {
  lastUserIntent = performance.now()
}
function handlePointerDown() {
  pointerActive = true
  window.addEventListener('pointerup', handlePointerUp, { once: true })
  window.addEventListener('pointercancel', handlePointerUp, { once: true })
}
function handlePointerUp() {
  pointerActive = false
  markUserIntent()
  window.removeEventListener('pointerup', handlePointerUp)
  window.removeEventListener('pointercancel', handlePointerUp)
}
function isUserScroll(): boolean {
  return pointerActive || performance.now() - lastUserIntent < USER_INTENT_WINDOW_MS
}

function handleContainerScroll() {
  const container = scrollContainer.value
  if (!container || maxHeight.value === null || followLocked || !isUserScroll()) return

  const rect = container.getBoundingClientRect()
  const topLimit = getTopOverlayBottom() + VIEWPORT_MARGIN
  const bottomLimit = window.innerHeight - VIEWPORT_MARGIN
  let delta = 0
  if (rect.top < topLimit) delta = rect.top - topLimit
  else if (rect.bottom > bottomLimit) delta = rect.bottom - bottomLimit
  if (Math.abs(delta) < 1) return

  // Während der Seiten-Animation nicht erneut auslösen (verhindert Ruckeln)
  followLocked = true
  let fallbackTimer: ReturnType<typeof setTimeout> | undefined
  const unlock = () => {
    followLocked = false
    clearTimeout(fallbackTimer)
    window.removeEventListener('scrollend', unlock)
  }
  window.addEventListener('scrollend', unlock)
  fallbackTimer = setTimeout(unlock, 600) // Fallback für Browser ohne 'scrollend'
  window.scrollBy({ top: delta, behavior: 'smooth' })
}

let resizeObserver: ResizeObserver | null = null
function handleWindowResize() {
  updateMaxHeight()
}
onMounted(() => {
  updateMaxHeight()
  if (typeof ResizeObserver !== 'undefined' && gridEl.value) {
    resizeObserver = new ResizeObserver(() => updateMaxHeight())
    resizeObserver.observe(gridEl.value)
  }
  window.addEventListener('resize', handleWindowResize)
})
onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  resizeObserver = null
  window.removeEventListener('resize', handleWindowResize)
  handlePointerUp()
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
  <ImageSearch :match-count="displayedImages.length" :total-count="baseImages.length" />

  <p v-if="imageStore.isSearchActive && displayedImages.length === 0" class="search-empty">
    <i class="fa-solid fa-magnifying-glass"></i>
    {{ t('imageSearch.noResults') }}
  </p>

  <div
    v-show="displayedImages.length > 0"
    ref="scrollContainer"
    class="images-scroll-container"
    :class="{ 'is-limited': maxHeight !== null }"
    :style="containerStyle"
    data-scroll-top-target
    @scroll.passive="handleContainerScroll"
    @wheel.passive="markUserIntent"
    @touchmove.passive="markUserIntent"
    @keydown="markUserIntent"
    @pointerdown="handlePointerDown"
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
.search-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  padding: var(--space-6) var(--space-4);
  border: 1px dashed var(--border-color);
  border-radius: var(--radius-lg);
  color: var(--muted);
}

.images-scroll-container {
  position: relative;
  box-sizing: content-box;
  /* Padding (per negativer Margin ausgeglichen) verhindert, dass Rahmen,
     Schatten und Hover-Effekte der Karten im Scrollbereich abgeschnitten
     werden. Dauerhaft gesetzt, damit die Höhenmessung stabil bleibt. */
  padding: var(--space-2);
  margin: calc(-1 * var(--space-2));
}

/* Ab mehr als 5 Reihen bzw. mehr als Fensterhöhe: interner Scrollbereich */
.images-scroll-container.is-limited {
  overflow-y: auto;
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
