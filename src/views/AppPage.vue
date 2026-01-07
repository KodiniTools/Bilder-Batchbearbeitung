<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import AppHeader from '@/components/AppHeader.vue'
import StatusBar from '@/components/StatusBar.vue'
import DropZone from '@/components/DropZone.vue'
import ImageGrid from '@/components/ImageGrid.vue'
import LoadingIndicator from '@/components/LoadingIndicator.vue'
import ImageEditor from '@/components/ImageEditor.vue'
import ImagePreview from '@/components/ImagePreview.vue'
import ExportSettingsModal from '@/components/ExportSettingsModal.vue'
import BulkRenameModal from '@/components/BulkRenameModal.vue'
import BatchEditPanel from '@/components/BatchEditPanel.vue'
import ToastContainer from '@/components/ToastContainer.vue'
import { useImageStore } from '@/stores/imageStore'
import { useToast } from '@/composables/useToast'
import type { ImageObject } from '@/lib/core/types'
import { ImageProcessor } from '@/lib/core/image-processor'

import {
  exportMultipleImagesAsPdf,
  type ExportSettings,
  type ImageData
} from '@/lib/features/export-pdf'

import { exportImagesAsZip, type ZipProgressCallback } from '@/lib/features/export-zip'
import { downloadSvgBatch, checkSvgServiceAvailable, type SvgProgressCallback } from '@/lib/features/export-svg'

const { t } = useI18n()
const router = useRouter()
const imageStore = useImageStore()
const toast = useToast()
const theme = ref<'light' | 'dark'>('light')

const isEditorOpen = ref(false)
const editingImage = ref<ImageObject | null>(null)

const isPreviewOpen = ref(false)
const previewImage = ref<ImageObject | null>(null)

const isExportModalOpen = ref(false)
const exportMode = ref<'pdf-all' | 'pdf-selected' | 'zip' | 'svg' | 'save' | null>(null)

const isBulkRenameModalOpen = ref(false)
const isBatchEditPanelOpen = ref(false)

const loadingIndicator = ref<InstanceType<typeof LoadingIndicator> | null>(null)

const exportImageCount = computed(() => {
  if (exportMode.value === 'pdf-all') {
    return imageStore.imageCount
  } else if (exportMode.value === 'zip' || exportMode.value === 'svg') {
    return imageStore.hasSelection ? imageStore.selectedCount : imageStore.imageCount
  } else if (exportMode.value === 'pdf-selected' || exportMode.value === 'save') {
    return imageStore.selectedCount
  }
  return 0
})

function openEditor(image: ImageObject) {
  editingImage.value = image
  isEditorOpen.value = true
}

function closeEditor() {
  isEditorOpen.value = false
  editingImage.value = null
}

function openPreview(image: ImageObject) {
  previewImage.value = image
  isPreviewOpen.value = true
}

function closePreview() {
  isPreviewOpen.value = false
  previewImage.value = null
}

function saveEditorChanges(image: ImageObject) {
  imageStore.updateImage(image)
}

function handleExportPdf(mode: 'all' | 'selected') {
  const images = mode === 'all'
    ? imageStore.images
    : imageStore.images.filter(img => img.selected)

  if (images.length === 0) {
    alert(t('alerts.noImagesToExport'))
    return
  }

  exportMode.value = mode === 'all' ? 'pdf-all' : 'pdf-selected'
  isExportModalOpen.value = true
}

function handleExportZip() {
  if (imageStore.imageCount === 0) {
    alert(t('alerts.noImagesAvailable'))
    return
  }

  exportMode.value = 'zip'
  isExportModalOpen.value = true
}

async function handleExportSvg() {
  if (imageStore.imageCount === 0) {
    alert(t('alerts.noImagesAvailable'))
    return
  }

  const isAvailable = await checkSvgServiceAvailable()
  if (!isAvailable) {
    alert(t('alerts.svgServiceUnavailable') || 'Der SVG-Konvertierungsservice ist nicht verfügbar.')
    return
  }

  exportMode.value = 'svg'
  isExportModalOpen.value = true
}

function closeExportModal() {
  isExportModalOpen.value = false
  exportMode.value = null
}

async function handleExportConfirm(settings: ExportSettings) {
  const currentMode = exportMode.value
  closeExportModal()

  try {
    if (currentMode === 'pdf-all' || currentMode === 'pdf-selected') {
      const images = currentMode === 'pdf-all'
        ? imageStore.images
        : imageStore.images.filter(img => img.selected)

      const imageDataArray: ImageData[] = await Promise.all(
        images.map(async (img) => {
          const dataUrl = ImageProcessor.getDataUrlWithFilters(img, 'image/png', 0.92)
          return {
            dataUrl: dataUrl,
            originalName: img.outputName || img.file.name
          }
        })
      )

      const useCustomFrontPage = Boolean(
        settings.includeCustomFrontPage === true &&
        settings.frontPageElements &&
        Array.isArray(settings.frontPageElements) &&
        settings.frontPageElements.length > 0
      )

      await exportMultipleImagesAsPdf(
        imageDataArray,
        {
          title: 'Bildersammlung',
          author: settings.author || '',
          includeCustomFrontPage: useCustomFrontPage,
          frontPageElements: useCustomFrontPage ? settings.frontPageElements : [],
          includeTitlePage: !useCustomFrontPage,
          includeCommentPages: settings.includeCommentPages || false,
          commentPageElements: settings.commentPageElements || [],
          includeFileName: true,
          includeImages: true,
          orientation: settings.orientation || 'portrait'
        },
        'bilder-export.pdf'
      )

      toast.success(t('toast.pdfSuccess', { count: images.length }))

    } else if (currentMode === 'zip') {
      const imagesToExport = imageStore.hasSelection
        ? imageStore.selectedImages
        : imageStore.images
      const total = imagesToExport.length

      loadingIndicator.value?.showWithProgress(
        t('loading.zipProgress', { current: 0, total }),
        total
      )

      const onProgress: ZipProgressCallback = (current, total) => {
        loadingIndicator.value?.updateProgress(
          current,
          t('loading.zipProgress', { current, total })
        )
      }

      try {
        await exportImagesAsZip(
          imagesToExport,
          settings.zipName,
          settings.format,
          settings.quality,
          onProgress
        )
        toast.success(t('toast.zipSuccess', { count: total }))
      } finally {
        loadingIndicator.value?.hide()
      }

    } else if (currentMode === 'svg') {
      const imagesToExport = imageStore.hasSelection
        ? imageStore.selectedImages
        : imageStore.images
      const total = imagesToExport.length

      loadingIndicator.value?.showWithProgress(
        t('loading.svgProgress', { current: 0, total }) || `SVG-Konvertierung: 0/${total}`,
        total
      )

      const onSvgProgress: SvgProgressCallback = (current, total) => {
        loadingIndicator.value?.updateProgress(
          current,
          t('loading.svgProgress', { current, total }) || `SVG-Konvertierung: ${current}/${total}`
        )
      }

      try {
        await downloadSvgBatch(
          imagesToExport,
          {
            colormode: settings.svgColormode || 'color',
            filter_speckle: settings.svgFilterSpeckle || 4
          },
          settings.zipName || 'svg_export',
          onSvgProgress
        )
        toast.success(t('toast.svgSuccess', { count: total }) || `${total} Bilder erfolgreich als SVG exportiert`)
      } finally {
        loadingIndicator.value?.hide()
      }

    } else if (currentMode === 'save') {
      const images = imageStore.images.filter(img => img.selected)

      for (const image of images) {
        await downloadSingleImage(image, settings.format, settings.quality / 100)
        await new Promise(resolve => setTimeout(resolve, 200))
      }

      toast.success(t('toast.saveSuccess', { count: images.length }))
    }
  } catch (error) {
    console.error('Export fehlgeschlagen:', error)
    toast.error(t('toast.exportError'))
  }
}

function downloadSingleImage(image: ImageObject, format?: string, quality?: number): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const exportFormat = format || image.exportFormat || 'png'
      const exportQuality = quality !== undefined ? quality : (image.quality || 0.92)
      const mimeType = `image/${exportFormat === 'jpg' ? 'jpeg' : exportFormat}`

      const canvasWithFilters = ImageProcessor.getCanvasWithFilters(image)

      canvasWithFilters.toBlob((blob) => {
        if (!blob) {
          reject(new Error('Blob-Konvertierung fehlgeschlagen'))
          return
        }

        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url

        let fileName = image.outputName || `bild_${Date.now()}`
        if (!fileName.includes('.')) {
          fileName += `.${exportFormat}`
        } else {
          fileName = fileName.replace(/\.[^.]+$/, `.${exportFormat}`)
        }

        link.download = fileName
        link.style.display = 'none'

        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)

        setTimeout(() => {
          URL.revokeObjectURL(url)
          resolve()
        }, 100)
      }, mimeType, exportQuality)
    } catch (error) {
      reject(error)
    }
  })
}

async function handleSaveImages() {
  const images = imageStore.images.filter(img => img.selected)

  if (images.length === 0) {
    alert(t('alerts.noImagesToSave'))
    return
  }

  exportMode.value = 'save'
  isExportModalOpen.value = true
}

function handleBulkRename() {
  if (imageStore.selectedCount === 0) {
    alert(t('alerts.noSelection'))
    return
  }
  isBulkRenameModalOpen.value = true
}

function closeBulkRenameModal() {
  isBulkRenameModalOpen.value = false
}

function handleBatchEdit() {
  isBatchEditPanelOpen.value = true
}

function closeBatchEditPanel() {
  isBatchEditPanelOpen.value = false
}

function handleBulkRenameConfirm(baseName: string, startNumber: number) {
  const count = imageStore.batchRenameSelectedImages(baseName, startNumber)
  closeBulkRenameModal()
  toast.success(t('toast.bulkRenamed', { count }))
}

const applyTheme = (newTheme: 'light' | 'dark') => {
  theme.value = newTheme
  document.documentElement.dataset.theme = newTheme
  localStorage.setItem('theme', newTheme)
}

const toggleTheme = () => {
  applyTheme(theme.value === 'dark' ? 'light' : 'dark')
}

function handleKeyboard(event: KeyboardEvent) {
  if (isEditorOpen.value || isPreviewOpen.value || isExportModalOpen.value || isBulkRenameModalOpen.value) return
  const target = event.target as HTMLElement
  if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return

  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0
  const ctrlOrCmd = isMac ? event.metaKey : event.ctrlKey

  if (ctrlOrCmd && event.key.toLowerCase() === 'a' && imageStore.hasImages) {
    event.preventDefault()
    imageStore.selectAllImages()
    return
  }

  if ((event.key === 'Delete' || event.key === 'Backspace') && imageStore.hasSelection) {
    event.preventDefault()
    const count = imageStore.selectedCount
    if (confirm(t('alerts.confirmDelete', { count }))) {
      imageStore.removeSelectedImages()
      if (count === 1) {
        toast.success(t('toast.imageRemoved'))
      } else {
        toast.success(t('toast.imagesRemoved', { count }))
      }
    }
    return
  }

  if (event.key === 'Escape' && imageStore.hasSelection) {
    event.preventDefault()
    imageStore.deselectAllImages()
    return
  }
}

onMounted(() => {
  const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  applyTheme(savedTheme || (prefersDark ? 'dark' : 'light'))

  window.addEventListener('keydown', handleKeyboard)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyboard)
})
</script>

<template>
  <div class="app-page">
    <AppHeader :theme="theme" @toggle-theme="toggleTheme" />

    <main class="container">
      <StatusBar
        v-if="imageStore.hasImages"
        @export-pdf="handleExportPdf"
        @export-zip="handleExportZip"
        @export-svg="handleExportSvg"
        @save-images="handleSaveImages"
        @bulk-rename="handleBulkRename"
        @batch-edit="handleBatchEdit"
      />

      <DropZone />

      <ImageGrid v-if="imageStore.hasImages" @open-editor="openEditor" @open-preview="openPreview" />
    </main>

    <LoadingIndicator ref="loadingIndicator" />
    <ToastContainer />

    <ImageEditor
      :image="editingImage"
      :is-open="isEditorOpen"
      @close="closeEditor"
      @save="saveEditorChanges"
    />

    <ImagePreview
      :image="previewImage"
      :is-open="isPreviewOpen"
      @close="closePreview"
    />

    <ExportSettingsModal
      :is-open="isExportModalOpen"
      :mode="exportMode"
      :image-count="exportImageCount"
      :has-selection="imageStore.hasSelection"
      @close="closeExportModal"
      @confirm="handleExportConfirm"
    />

    <BulkRenameModal
      :is-open="isBulkRenameModalOpen"
      @close="closeBulkRenameModal"
      @confirm="handleBulkRenameConfirm"
    />

    <BatchEditPanel
      :is-open="isBatchEditPanelOpen"
      @close="closeBatchEditPanel"
    />
  </div>
</template>

<style scoped>
.app-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--body-gradient);
  background-attachment: fixed;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: var(--space-6) var(--space-5);
  margin-top: var(--space-7);
  flex: 1;
  width: 100%;
}

@media (max-width: 768px) {
  .container {
    padding: var(--space-4) var(--space-3);
  }
}
</style>
