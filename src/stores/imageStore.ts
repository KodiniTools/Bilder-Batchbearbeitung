// src/stores/imageStore.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { ImageObject } from '@/lib/core/types'
import { ImageProcessor } from '@/lib/core/image-processor'

export const useImageStore = defineStore('images', () => {
  // State
  const images = ref<ImageObject[]>([])
  const currentImageIndex = ref(0)

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
  }

  function removeImage(id: string): void {
    const index = images.value.findIndex(img => img.id === id)
    if (index !== -1) {
      images.value.splice(index, 1)
    }
  }

  function removeSelectedImages(): void {
    images.value = images.value.filter(img => !img.selected)
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
    }
  }

  function updateImage(updatedImage: ImageObject): void {
    const index = images.value.findIndex(img => img.id === updatedImage.id)
    if (index > -1) {
      // Trigger reactivity by replacing the array element
      // This ensures Vue detects the change
      images.value.splice(index, 1, updatedImage)
    }
  }

  function clearAllImages(): void {
    images.value = []
    currentImageIndex.value = 0
  }

  // Drag & Drop: Bild von einem Index zu einem anderen verschieben
  function moveImage(fromIndex: number, toIndex: number): void {
    if (fromIndex < 0 || fromIndex >= images.value.length) return
    if (toIndex < 0 || toIndex >= images.value.length) return
    if (fromIndex === toIndex) return

    const [movedImage] = images.value.splice(fromIndex, 1)
    images.value.splice(toIndex, 0, movedImage)
  }

  // Batch-Rotation für alle ausgewählten Bilder
  function rotateSelectedImages(degrees: number): void {
    const selected = images.value.filter(img => img.selected)
    selected.forEach(img => {
      ImageProcessor.rotateImage(img, degrees)
    })
  }

  // Batch-Flip für alle ausgewählten Bilder
  function flipSelectedImages(direction: 'horizontal' | 'vertical'): void {
    const selected = images.value.filter(img => img.selected)
    selected.forEach(img => {
      ImageProcessor.flipImage(img, direction)
    })
  }

  // Batch-Umbenennung für alle ausgewählten Bilder
  function batchRenameSelectedImages(baseName: string, startNumber: number = 1): number {
    // Hole ausgewählte Bilder in der Reihenfolge wie sie im Grid erscheinen
    const selectedInOrder = images.value.filter(img => img.selected)

    if (selectedInOrder.length === 0) return 0

    // Sanitize baseName
    const safeBaseName = ImageProcessor.safeBaseName(baseName)

    // Umbenennen mit fortlaufender Nummerierung
    selectedInOrder.forEach((img, index) => {
      const number = startNumber + index
      img.outputName = `${safeBaseName}_${number}`
    })

    return selectedInOrder.length
  }

  // Reset store
  function $reset(): void {
    images.value = []
    currentImageIndex.value = 0
  }

  return {
    // State
    images,
    currentImageIndex,
    
    // Getters
    imageCount,
    selectedCount,
    selectedImages,
    hasImages,
    hasSelection,
    
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
    rotateSelectedImages,
    flipSelectedImages,
    batchRenameSelectedImages,
    $reset
  }
})
