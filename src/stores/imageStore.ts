// src/stores/imageStore.ts
import { defineStore } from 'pinia'
import { ref, computed, reactive } from 'vue'
import type { ImageObject, ImageFilters, ImageTransforms, WatermarkSettings } from '@/lib/core/types'
import { defaultFilters, defaultTransforms, defaultWatermark } from '@/lib/core/types'
import { ImageProcessor } from '@/lib/core/image-processor'
import { useImageWorker } from '@/composables/useImageWorker'
import { createImageHistory } from './imageHistory'

const { processBatch, processCanvas, supported: workerSupported } = useImageWorker()

export type GridSize = 'small' | 'medium' | 'large'

export const useImageStore = defineStore('images', () => {
  // State
  const images = ref<ImageObject[]>([])
  const currentImageIndex = ref(0)
  const resizeProgress = reactive({ active: false, current: 0, total: 0 })
  const cropProgress = reactive({ active: false, current: 0, total: 0 })

  // Anzeigegröße der Bildkacheln im Grid (klein / mittel / groß), persistiert
  const savedGridSize = (typeof localStorage !== 'undefined'
    ? localStorage.getItem('gridSize')
    : null) as GridSize | null
  const gridSize = ref<GridSize>(
    savedGridSize === 'small' || savedGridSize === 'medium' || savedGridSize === 'large'
      ? savedGridSize
      : 'medium'
  )
  function setGridSize(size: GridSize) {
    gridSize.value = size
    try {
      localStorage.setItem('gridSize', size)
    } catch {
      /* localStorage nicht verfügbar – Auswahl gilt nur für die Sitzung */
    }
  }

  // Globale Undo/Redo-Historie
  const history = createImageHistory(images)

  // Getters
  const imageCount = computed(() => images.value.length)
  const selectedCount = computed(() => images.value.filter(img => img.selected).length)
  const selectedImages = computed(() => images.value.filter(img => img.selected))
  const hasImages = computed(() => images.value.length > 0)
  const hasSelection = computed(() => selectedCount.value > 0)

  // Actions
  async function addImage(file: File): Promise<ImageObject | null> {
    try {
      const imageObj = await ImageProcessor.processFile(file)
      if (imageObj) {
        images.value.push(imageObj)
        currentImageIndex.value++
      }
      return imageObj
    } catch (error) {
      console.error('Fehler beim Hinzufügen des Bildes:', error)
      throw error
    }
  }

  async function addImages(files: File[]): Promise<void> {
    const promises = files.map(file => addImage(file).catch(err => {
      console.error(`Fehler bei Datei ${file.name}:`, err)
      return null
    }))
    await Promise.all(promises)
    history.commit()
  }

  function removeImage(id: string): void {
    const index = images.value.findIndex(img => img.id === id)
    if (index !== -1) {
      images.value.splice(index, 1)
      history.commit()
    }
  }

  function removeSelectedImages(): void {
    if (!images.value.some(img => img.selected)) return
    images.value = images.value.filter(img => !img.selected)
    history.commit()
  }

  function toggleImageSelection(id: string): void {
    const image = images.value.find(img => img.id === id)
    if (image) {
      image.selected = !image.selected
    }
  }

  function selectAllImages(): void {
    const allSelected = images.value.every(img => img.selected)
    images.value.forEach(img => {
      img.selected = !allSelected
    })
  }

  function deselectAllImages(): void {
    images.value.forEach(img => {
      img.selected = false
    })
  }

  function getImageById(id: string): ImageObject | undefined {
    return images.value.find(img => img.id === id)
  }

  function updateImageName(id: string, newName: string): void {
    const image = images.value.find(img => img.id === id)
    if (image) {
      image.outputName = ImageProcessor.safeBaseName(newName)
      history.commit()
    }
  }

  function updateImage(updatedImage: ImageObject): void {
    const index = images.value.findIndex(img => img.id === updatedImage.id)
    if (index > -1) {
      // Version erhöhen, damit Canvas-Änderungen (z.B. aus dem Editor) für Vue
      // und für die Undo/Redo-Historie eindeutig als Änderung erkennbar sind.
      updatedImage.version = (updatedImage.version ?? 0) + 1
      // Trigger reactivity by replacing the array element
      // This ensures Vue detects the change
      images.value.splice(index, 1, updatedImage)
      history.commit()
    }
  }

  function clearAllImages(): void {
    if (images.value.length === 0) return
    images.value = []
    currentImageIndex.value = 0
    history.commit()
  }

  // Drag & Drop: Bild von einem Index zu einem anderen verschieben
  function moveImage(fromIndex: number, toIndex: number): void {
    if (fromIndex < 0 || fromIndex >= images.value.length) return
    if (toIndex < 0 || toIndex >= images.value.length) return
    if (fromIndex === toIndex) return

    const [movedImage] = images.value.splice(fromIndex, 1)
    images.value.splice(toIndex, 0, movedImage)
    history.commit()
  }

  // Triggert Vue-Reaktivität für betroffene Bilder nach Worker-Update.
  // Nötig weil HTMLCanvasElement kein reaktives Objekt ist — putImageData() ist
  // für Vue unsichtbar. Ein splice() mit demselben Objekt löst den Re-Render aus.
  function notifyImagesUpdated(ids: Set<string>): void {
    images.value.forEach((img, i) => {
      if (ids.has(img.id)) {
        img.version = (img.version ?? 0) + 1
        images.value.splice(i, 1, img)
      }
    })
  }

  // Batch-Rotation für alle ausgewählten Bilder
  async function rotateSelectedImages(degrees: number): Promise<void> {
    const selected = images.value.filter((img) => img.selected)
    const ids = new Set(selected.map((img) => img.id))
    const workerOk =
      workerSupported &&
      (await processBatch(selected.map((img) => img.canvas), 'rotate', {
        degrees: degrees as 90 | -90 | 180,
      }))
    if (!workerOk) {
      selected.forEach((img) => ImageProcessor.rotateImage(img, degrees))
    }
    notifyImagesUpdated(ids)
    history.commit()
  }

  // Batch-Flip für alle ausgewählten Bilder
  async function flipSelectedImages(direction: 'horizontal' | 'vertical'): Promise<void> {
    const selected = images.value.filter((img) => img.selected)
    const ids = new Set(selected.map((img) => img.id))
    const workerOk =
      workerSupported &&
      (await processBatch(selected.map((img) => img.canvas), 'flip', { direction }))
    if (!workerOk) {
      selected.forEach((img) => ImageProcessor.flipImage(img, direction))
    }
    notifyImagesUpdated(ids)
    history.commit()
  }

  // Batch-Zuschneiden auf Seitenverhältnis für alle ausgewählten Bilder
  async function cropSelectedImagesToAspectRatio(aspectRatio: number): Promise<void> {
    const selected = images.value.filter((img) => img.selected)
    const ids = new Set(selected.map((img) => img.id))
    let workerOk = false

    cropProgress.active = true
    cropProgress.current = 0
    cropProgress.total = selected.length

    if (workerSupported) {
      const results = await Promise.all(
        selected.map(async (img) => {
          const result = await processCanvas(img.canvas, 'crop', { aspectRatio })
          cropProgress.current++
          return result
        })
      )
      workerOk = results.every(Boolean)
    }

    if (!workerOk) {
      cropProgress.current = 0
      for (const img of selected) {
        ImageProcessor.cropToAspectRatio(img, aspectRatio)
        cropProgress.current++
        await new Promise(resolve => setTimeout(resolve, 0))
      }
    }

    notifyImagesUpdated(ids)
    cropProgress.active = false
    history.commit()
  }

  // Alle Bearbeitungen der ausgewählten Bilder rückgängig machen
  function resetSelectedImages(): void {
    const selected = images.value.filter(img => img.selected)
    if (selected.length === 0) return
    selected.forEach(img => {
      ImageProcessor.resetToOriginal(img)
    })
    // Canvas wurde destruktiv zurückgesetzt → version erhöhen, damit die
    // Historie die Pixel-Änderung erfasst und die Vorschau neu rendert.
    notifyImagesUpdated(new Set(selected.map(img => img.id)))
    history.commit()
  }

  // Batch-Filter für alle ausgewählten Bilder anwenden
  function applyFiltersToSelectedImages(filters: Partial<ImageFilters>): void {
    const selected = images.value.filter(img => img.selected)
    if (selected.length === 0) return
    selected.forEach(img => {
      if (!img.filters) {
        img.filters = { ...defaultFilters }
      }
      img.filters = { ...img.filters, ...filters }
    })
    // Slider-Bewegungen zu einem Undo-Schritt zusammenfassen.
    history.commit('filters')
  }

  // Filter für alle ausgewählten Bilder zurücksetzen
  function resetFiltersForSelectedImages(): void {
    const selected = images.value.filter(img => img.selected)
    if (selected.length === 0) return
    selected.forEach(img => {
      img.filters = { ...defaultFilters }
    })
    // Panel-„Zurücksetzen" ruft Filter/Transforms/Wasserzeichen nacheinander
    // auf → über gemeinsamen Key zu einem Undo-Schritt zusammenfassen.
    history.commit('panel-reset')
  }

  // Batch-Transforms für alle ausgewählten Bilder anwenden
  function applyTransformsToSelectedImages(transforms: Partial<ImageTransforms>): void {
    const selected = images.value.filter(img => img.selected)
    if (selected.length === 0) return
    selected.forEach(img => {
      if (!img.transforms) {
        img.transforms = { ...defaultTransforms }
      }
      img.transforms = { ...img.transforms, ...transforms }
    })
    history.commit('transforms')
  }

  // Transforms für alle ausgewählten Bilder zurücksetzen
  function resetTransformsForSelectedImages(): void {
    const selected = images.value.filter(img => img.selected)
    if (selected.length === 0) return
    selected.forEach(img => {
      img.transforms = { ...defaultTransforms }
    })
    history.commit('panel-reset')
  }

  // Batch-Umbenennung für alle ausgewählten Bilder
  function batchRenameSelectedImages(baseName: string, startNumber: number = 1, separator: string = '_', lowercase: boolean = false): number {
    // Hole ausgewählte Bilder in der Reihenfolge wie sie im Grid erscheinen
    const selectedInOrder = images.value.filter(img => img.selected)

    if (selectedInOrder.length === 0) return 0

    // Sanitize baseName
    const safeBaseName = ImageProcessor.safeBaseName(baseName)

    // SEO-freundliche Umbenennung mit konfigurierbarem Trennzeichen
    selectedInOrder.forEach((img, index) => {
      const number = startNumber + index
      let name = safeBaseName.replace(/\s+/g, separator).replace(/[^a-zA-Z0-9äöüÄÖÜß\-_]/g, '')
      if (lowercase) {
        name = name.toLowerCase()
      }
      img.outputName = `${name}${separator}${number}`
    })

    history.commit()
    return selectedInOrder.length
  }

  // Batch-Größenänderung für alle ausgewählten Bilder
  async function resizeSelectedImages(width: number, height: number, keepAspect: boolean): Promise<void> {
    const selected = images.value.filter((img) => img.selected)
    const ids = new Set(selected.map((img) => img.id))
    let workerOk = false

    resizeProgress.active = true
    resizeProgress.current = 0
    resizeProgress.total = selected.length

    if (workerSupported) {
      const results = await Promise.all(
        selected.map(async (img) => {
          let targetW = width
          let targetH = height
          if (keepAspect) {
            const aspect = img.originalWidth / img.originalHeight
            if (width / height > aspect) {
              targetW = Math.round(height * aspect)
            } else {
              targetH = Math.round(width / aspect)
            }
          }
          const result = await processCanvas(img.canvas, 'resize', { width: targetW, height: targetH })
          resizeProgress.current++
          return result
        })
      )
      workerOk = results.every(Boolean)
    }

    if (!workerOk) {
      resizeProgress.current = 0
      for (const img of selected) {
        ImageProcessor.resizeImage(img, width, height, keepAspect)
        resizeProgress.current++
        await new Promise(resolve => setTimeout(resolve, 0))
      }
    }

    notifyImagesUpdated(ids)
    resizeProgress.active = false
    history.commit()
  }

  // Batch-Wasserzeichen für alle ausgewählten Bilder anwenden
  function applyWatermarkToSelectedImages(watermark: Partial<WatermarkSettings>): void {
    const selected = images.value.filter(img => img.selected)
    if (selected.length === 0) return
    selected.forEach(img => {
      if (!img.watermark) {
        img.watermark = { ...defaultWatermark }
      }
      img.watermark = { ...img.watermark, ...watermark }
    })
    history.commit('watermark')
  }

  // Wasserzeichen für alle ausgewählten Bilder zurücksetzen
  function resetWatermarkForSelectedImages(): void {
    const selected = images.value.filter(img => img.selected)
    if (selected.length === 0) return
    selected.forEach(img => {
      img.watermark = { ...defaultWatermark }
    })
    history.commit('panel-reset')
  }

  // Reset store
  function $reset(): void {
    images.value = []
    currentImageIndex.value = 0
    history.reset()
  }

  // ── Undo/Redo ────────────────────────────────────────────────────────────
  function undo(): void {
    history.undo()
  }

  function redo(): void {
    history.redo()
  }

  return {
    // State
    images,
    currentImageIndex,
    resizeProgress,
    cropProgress,
    gridSize,

    // Getters
    imageCount,
    selectedCount,
    selectedImages,
    hasImages,
    hasSelection,
    canUndo: history.canUndo,
    canRedo: history.canRedo,

    // Actions
    addImage,
    addImages,
    removeImage,
    removeSelectedImages,
    toggleImageSelection,
    selectAllImages,
    deselectAllImages,
    getImageById,
    updateImageName,
    updateImage,
    clearAllImages,
    moveImage,
    setGridSize,
    rotateSelectedImages,
    flipSelectedImages,
    cropSelectedImagesToAspectRatio,
    resetSelectedImages,
    applyFiltersToSelectedImages,
    resetFiltersForSelectedImages,
    applyTransformsToSelectedImages,
    resetTransformsForSelectedImages,
    batchRenameSelectedImages,
    resizeSelectedImages,
    applyWatermarkToSelectedImages,
    resetWatermarkForSelectedImages,
    undo,
    redo,
    $reset
  }
})
