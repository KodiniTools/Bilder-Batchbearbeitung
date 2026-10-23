<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
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
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import WizardNavigator from '@/components/WizardNavigator.vue'
import HandoffReceiver from '@/components/HandoffReceiver.vue'
import ScrollToTopButton from '@/components/ScrollToTopButton.vue'
import { useImageStore } from '@/stores/imageStore'
import { usePdfDocumentStore } from '@/stores/pdfDocument'
import { useToast } from '@/composables/useToast'
import { useConfirm } from '@/composables/useConfirm'
import { useHandoffImport } from '@/composables/useHandoffImport'
import type { ImageObject } from '@/lib/core/types'
import { renderExportCanvas } from '@/lib/core/export-render'
import { readSourceExif } from '@/lib/core/exif'
import { encodeForExport, kbToBytes, type TargetSizeOptions } from '@/lib/features/target-size'

import { buildPdf, type ExportSettings, type ImageData } from '@/lib/features/export-pdf'
import { cancelPrint, preparePrint, printPdf, type PrintMode } from '@/lib/features/print-pdf'

import {
  exportImagesAsZip,
  resolveZipFileName,
  type ZipProgressCallback,
} from '@/lib/features/export-zip'
import {
  downloadSvgBatch,
  downloadSingleSvg,
  checkSvgServiceAvailable,
  svgFileName,
  type SvgProgressCallback,
} from '@/lib/features/export-svg'
import {
  imageFileType,
  pickSaveDirectory,
  pickSaveFile,
  saveToDirectory,
  saveToTarget,
  SAVE_FILE_TYPES,
} from '@/lib/features/save-file'
import { readStoredTheme, applyTheme } from '@/utils/theme'
import { commentFooterText, dateLocale } from '@/utils/i18nFormat'

const { t, locale } = useI18n()
const imageStore = useImageStore()
const pdfDocument = usePdfDocumentStore()
const toast = useToast()
const dialog = useConfirm()
const { importHandoffImages } = useHandoffImport()

const isEditorOpen = ref(false)
const editingImage = ref<ImageObject | null>(null)

const isPreviewOpen = ref(false)
const previewImage = ref<ImageObject | null>(null)

const isExportModalOpen = ref(false)
const exportMode = ref<'pdf-all' | 'pdf-selected' | 'zip' | 'svg' | 'save' | null>(null)

const isBulkRenameModalOpen = ref(false)
const isBatchEditPanelOpen = ref(false)

const loadingIndicator = ref<InstanceType<typeof LoadingIndicator> | null>(null)

// Höhe des (sticky) App-Headers, damit die Sidebar darunter andockt
const appHeader = ref<InstanceType<typeof AppHeader> | null>(null)
const appHeaderHeight = ref(0)
let headerObserver: ResizeObserver | null = null

function measureHeader() {
  const el = appHeader.value?.$el as HTMLElement | undefined
  appHeaderHeight.value = el && el.offsetParent !== null ? el.offsetHeight : 0
}

const isWizardOpen = ref(false)
const wizardExportType = ref<'pdf' | 'zip' | 'svg' | 'save' | null>(null)
const wizardExportCount = ref(0)

function showWizard(type: 'pdf' | 'zip' | 'svg' | 'save', count: number) {
  wizardExportType.value = type
  wizardExportCount.value = count
  isWizardOpen.value = true
}

function closeWizard() {
  isWizardOpen.value = false
  wizardExportType.value = null
  wizardExportCount.value = 0
}

function handleWizardNewProject() {
  imageStore.images.forEach((img) => (img.selected = true))
  imageStore.removeSelectedImages()
  closeWizard()
}

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

function navigatePreview(image: ImageObject) {
  previewImage.value = image
}

function saveEditorChanges(image: ImageObject) {
  imageStore.updateImage(image)
}

function handleExportPdf(mode: 'all' | 'selected') {
  const images =
    mode === 'all' ? imageStore.images : imageStore.images.filter((img) => img.selected)

  if (images.length === 0) {
    void dialog.alert(t('alerts.noImagesToExport'))
    return
  }

  exportMode.value = mode === 'all' ? 'pdf-all' : 'pdf-selected'
  isExportModalOpen.value = true
}

function handleExportZip() {
  if (imageStore.imageCount === 0) {
    void dialog.alert(t('alerts.noImagesAvailable'))
    return
  }

  exportMode.value = 'zip'
  isExportModalOpen.value = true
}

async function handleExportSvg() {
  if (imageStore.imageCount === 0) {
    void dialog.alert(t('alerts.noImagesAvailable'))
    return
  }

  const isAvailable = await checkSvgServiceAvailable()
  if (!isAvailable) {
    void dialog.alert(t('alerts.svgServiceUnavailable'))
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
      // Direktdruck: vor dem ersten await vorbereiten (Tab nur direkt nach dem Klick möglich)
      const printTarget = settings.output === 'print' ? preparePrint() : null
      // Speichern-Dialog ebenfalls direkt nach dem Klick öffnen, PDF erst danach erzeugen
      const saveTarget = printTarget
        ? null
        : await pickSaveFile('bilder-export.pdf', SAVE_FILE_TYPES.pdf)
      if (!printTarget && !saveTarget) return
      let printMode: PrintMode | null = null
      const images =
        currentMode === 'pdf-all'
          ? imageStore.images
          : imageStore.images.filter((img) => img.selected)

      // Canvas erst beim Export erzeugen; Skalierung/JPEG übernimmt der Worker
      const imageDataArray: ImageData[] = images.map((img) => ({
        getCanvas: () => renderExportCanvas(img, { backgroundColor: '#ffffff' }),
        originalName: img.outputName || img.file.name,
        comment: img.comment,
      }))

      const controller = new AbortController()
      loadingIndicator.value?.showWithProgress(t('loading.pdfMulti', { count: images.length }), 0, {
        onCancel: () => controller.abort(),
      })

      const failedImages: string[] = []
      try {
        const blob = await buildPdf(imageDataArray, {
          ...pdfDocument.buildOptions,
          // Gedruckt wird lokal; ein Passwort würde den Druck nur blockieren
          ...(printTarget ? { password: '' } : {}),
          title: t('pdfExport.defaultTitle'),
          labels: {
            locale: dateLocale(locale.value),
            imageCount: (count) => t('pdfExport.imageCount', { count }, count),
            author: (name) => t('pdfExport.author', { name }),
            createdWith: t('pdfExport.createdWith'),
            commentFooter: (page, total) => commentFooterText(t, locale.value, page, total),
            pageNumber: (page, total) => t('pdfExport.pageNumber', { page, total }),
            bookmarkCover: t('pdfExport.bookmarkCover'),
            bookmarkComment: (page) => t('pdfExport.bookmarkComment', { page }),
            bookmarkImage: (index) => t('pdfExport.bookmarkImage', { index }),
          },
          onProgress: (done, total) => {
            loadingIndicator.value?.updateTotal(total)
            loadingIndicator.value?.updateProgress(
              done,
              t('loading.pdfProgress', { current: done, total })
            )
          },
          signal: controller.signal,
          onImageError: (name) => failedImages.push(name),
        })
        if (printTarget) printMode = await printPdf(blob, printTarget, 'bilder-export.pdf')
        else if (saveTarget) await saveToTarget(saveTarget, blob)
      } catch (error) {
        if (printTarget) cancelPrint(printTarget)
        if (error instanceof DOMException && error.name === 'AbortError') {
          toast.info(t('toast.pdfCancelled'))
          return
        }
        throw error
      } finally {
        loadingIndicator.value?.hide()
      }

      const exportedCount = images.length - failedImages.length
      if (failedImages.length > 0) {
        toast.warning(
          t('toast.pdfPartial', {
            count: exportedCount,
            failed: failedImages.length,
            names: failedImages.join(', '),
          }),
          8000
        )
      } else if (!printMode) {
        toast.success(t('toast.pdfSuccess', { count: exportedCount }))
      }
      if (printMode) {
        const printMessages: Record<PrintMode, string> = {
          dialog: t('toast.pdfPrintDialog', { count: exportedCount }),
          electron: t('toast.pdfPrintWindow'),
          tab: t('toast.pdfPrintTab'),
          download: t('toast.pdfPrintDownload'),
        }
        toast.info(printMessages[printMode], 6000)
      }
      showWizard('pdf', exportedCount)
    } else if (currentMode === 'zip') {
      const imagesToExport = imageStore.hasSelection ? imageStore.selectedImages : imageStore.images
      const total = imagesToExport.length
      const zipFileName = resolveZipFileName(settings.zipName)
      const saveTarget = await pickSaveFile(zipFileName, SAVE_FILE_TYPES.zip)
      if (!saveTarget) return

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
        const { overTarget } = await exportImagesAsZip(
          imagesToExport,
          zipFileName,
          settings.format,
          settings.quality,
          onProgress,
          settings.pngTransparent ?? true,
          settings.pngBackgroundColor ?? '#ffffff',
          saveTarget,
          targetSizeOf(settings),
          !!settings.keepExif
        )
        toast.success(t('toast.zipSuccess', { count: total }))
        warnOverTarget(overTarget, settings)
        showWizard('zip', total)
      } finally {
        loadingIndicator.value?.hide()
      }
    } else if (currentMode === 'svg') {
      const imagesToExport = imageStore.hasSelection ? imageStore.selectedImages : imageStore.images
      const total = imagesToExport.length
      const svgZipName = settings.zipName || 'svg_export'
      const saveTarget =
        total === 1
          ? await pickSaveFile(svgFileName(imagesToExport[0]), SAVE_FILE_TYPES.svg)
          : await pickSaveFile(resolveZipFileName(svgZipName), SAVE_FILE_TYPES.zip)
      if (!saveTarget) return

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
        const svgSettings = {
          colormode: settings.svgColormode || 'color',
          filter_speckle: settings.svgFilterSpeckle || 4,
          quality: settings.svgQuality || 'high',
        }

        if (total === 1) {
          await downloadSingleSvg(imagesToExport[0], svgSettings, saveTarget)
        } else {
          await downloadSvgBatch(imagesToExport, svgSettings, svgZipName, onSvgProgress, saveTarget)
        }
        toast.success(t('toast.svgSuccess', { count: total }))
        showWizard('svg', total)
      } finally {
        loadingIndicator.value?.hide()
      }
    } else if (currentMode === 'save') {
      const images = imageStore.images.filter((img) => img.selected)

      const bgColor =
        settings.format === 'png' && !settings.pngTransparent
          ? (settings.pngBackgroundColor ?? '#ffffff')
          : undefined

      const quality = (settings.quality ?? 92) / 100
      const targetSize = targetSizeOf(settings)
      let overTarget = 0
      const render = async (image: ImageObject, format: string) => {
        const result = await renderImageBlob(
          image,
          format,
          quality,
          bgColor,
          targetSize,
          !!settings.keepExif
        )
        if (!result.reached) overTarget++
        return result.blob
      }
      if (images.length === 1) {
        // Ein Bild: Speichern-Dialog mit Dateinamen
        const [image] = images
        const format = imageExportFormat(image, settings.format)
        const target = await pickSaveFile(imageFileName(image, format), imageFileType(format))
        if (!target) return
        loadingIndicator.value?.show(t('loading.saveSingle'))
        try {
          await saveToTarget(target, await render(image, format))
        } finally {
          loadingIndicator.value?.hide()
        }
      } else {
        // Mehrere Bilder: Zielordner wählen, Dateinamen kommen aus der Umbenennung
        const target = await pickSaveDirectory()
        if (!target) return
        const total = images.length
        let cancelled = false
        let saved = 0
        loadingIndicator.value?.showWithProgress(
          t('loading.saveProgress', { current: 1, total }),
          total,
          { onCancel: () => (cancelled = true) }
        )
        try {
          for (const image of images) {
            // Abbruch greift zwischen zwei Bildern; bereits gespeicherte bleiben erhalten
            if (cancelled) break
            loadingIndicator.value?.updateProgress(
              saved,
              t('loading.saveProgress', { current: saved + 1, total })
            )
            const format = imageExportFormat(image, settings.format)
            const blob = await render(image, format)
            await saveToDirectory(target, blob, imageFileName(image, format))
            saved++
            // Browser blockieren schnell aufeinanderfolgende Downloads
            if (target.kind === 'download') await new Promise((resolve) => setTimeout(resolve, 200))
          }
        } finally {
          loadingIndicator.value?.hide()
        }
        if (cancelled && saved < total) {
          toast.info(t('toast.saveCancelled', { count: saved, total }))
          return
        }
      }

      toast.success(t('toast.saveSuccess', { count: images.length }))
      warnOverTarget(overTarget, settings)
      showWizard('save', images.length)
    }
  } catch (error) {
    console.error('Export fehlgeschlagen:', error)
    toast.error(t('toast.exportError'))
  }
}

function imageExportFormat(image: ImageObject, format?: string): string {
  return format || image.exportFormat || 'png'
}

function imageFileName(image: ImageObject, exportFormat: string): string {
  const fileName = image.outputName || `bild_${Date.now()}`
  return fileName.includes('.')
    ? fileName.replace(/\.[^.]+$/, `.${exportFormat}`)
    : `${fileName}.${exportFormat}`
}

/** Zielgröße aus den Export-Einstellungen; `null`, wenn nicht aktiviert */
function targetSizeOf(settings: ExportSettings): TargetSizeOptions | null {
  if (!settings.targetSizeEnabled || !settings.targetSizeKb) return null
  return {
    maxBytes: kbToBytes(settings.targetSizeKb),
    allowDownscale: !!settings.targetSizeDownscale,
  }
}

function warnOverTarget(count: number, settings: ExportSettings) {
  if (count > 0) {
    toast.warning(t('toast.targetSizeMissed', { count, kb: settings.targetSizeKb }), 8000)
  }
}

async function renderImageBlob(
  image: ImageObject,
  exportFormat: string,
  quality?: number,
  backgroundColor?: string,
  targetSize?: TargetSizeOptions | null,
  keepExif = false
) {
  const exportQuality = quality !== undefined ? quality : image.quality || 0.92
  const mimeType = `image/${exportFormat === 'jpg' ? 'jpeg' : exportFormat}`
  // Filter-Passage und Kodierung laufen im Worker (Fallback: Hauptthread)
  const [exportCanvas, exif] = await Promise.all([
    renderExportCanvas(image, { backgroundColor }),
    keepExif ? readSourceExif(image.file) : null,
  ])
  return encodeForExport(exportCanvas, mimeType, exportQuality, targetSize, exif)
}

async function handleSaveImages() {
  const images = imageStore.images.filter((img) => img.selected)

  if (images.length === 0) {
    void dialog.alert(t('alerts.noImagesToSave'))
    return
  }

  exportMode.value = 'save'
  isExportModalOpen.value = true
}

function handleBulkRename() {
  if (imageStore.selectedCount === 0) {
    void dialog.alert(t('alerts.noSelection'))
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

function handleBulkRenameConfirm(
  baseName: string,
  startNumber: number,
  separator: string,
  lowercase: boolean,
  exifDates: ReadonlyMap<string, Date | null>
) {
  const count = imageStore.batchRenameSelectedImages(
    baseName,
    startNumber,
    separator,
    lowercase,
    exifDates
  )
  closeBulkRenameModal()
  toast.success(t('toast.bulkRenamed', { count }))
}

function handleKeyboard(event: KeyboardEvent) {
  if (
    isEditorOpen.value ||
    isPreviewOpen.value ||
    isExportModalOpen.value ||
    isBulkRenameModalOpen.value ||
    isWizardOpen.value
  )
    return
  const target = event.target as HTMLElement
  if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
    return

  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0
  const ctrlOrCmd = isMac ? event.metaKey : event.ctrlKey

  // Undo: Ctrl/Cmd+Z | Redo: Ctrl/Cmd+Shift+Z oder Ctrl+Y
  if (ctrlOrCmd && event.key.toLowerCase() === 'z') {
    event.preventDefault()
    if (event.shiftKey) {
      imageStore.redo()
    } else {
      imageStore.undo()
    }
    return
  }

  if (ctrlOrCmd && event.key.toLowerCase() === 'y') {
    event.preventDefault()
    imageStore.redo()
    return
  }

  if (ctrlOrCmd && event.key.toLowerCase() === 'a' && imageStore.hasImages) {
    event.preventDefault()
    imageStore.selectAllImages()
    return
  }

  if ((event.key === 'Delete' || event.key === 'Backspace') && imageStore.hasSelection) {
    event.preventDefault()
    const count = imageStore.selectedCount
    void dialog
      .confirm({
        message: t('alerts.confirmDelete', { count }),
        confirmLabel: t('dialog.delete'),
        danger: true,
      })
      .then((ok) => {
        if (!ok) return
        imageStore.removeSelectedImages()
        if (count === 1) {
          toast.success(t('toast.imageRemoved'))
        } else {
          toast.success(t('toast.imagesRemoved', { count }))
        }
      })
    return
  }

  if (event.key === 'Escape' && imageStore.hasSelection) {
    event.preventDefault()
    imageStore.deselectAllImages()
    return
  }
}

async function handlePaste(event: ClipboardEvent) {
  if (
    isEditorOpen.value ||
    isPreviewOpen.value ||
    isExportModalOpen.value ||
    isBulkRenameModalOpen.value ||
    isWizardOpen.value
  )
    return
  const target = event.target as HTMLElement
  if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
    return

  const items = event.clipboardData?.items
  if (!items) return

  const imageFiles: File[] = []
  for (const item of Array.from(items)) {
    if (item.type.startsWith('image/')) {
      const file = item.getAsFile()
      if (file) {
        const ext = file.type.split('/')[1]?.replace('jpeg', 'jpg') || 'png'
        const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
        const namedFile = new File([file], `clipboard-${ts}.${ext}`, { type: file.type })
        imageFiles.push(namedFile)
      }
    }
  }

  if (imageFiles.length === 0) return
  event.preventDefault()

  await imageStore.addImages(imageFiles)
  toast.success(
    imageFiles.length === 1
      ? t('toast.pastedFromClipboard')
      : t('toast.pastedFromClipboardMultiple', { count: imageFiles.length })
  )
}

watch(
  () => imageStore.resizeProgress,
  (progress) => {
    if (!progress.active) {
      loadingIndicator.value?.hide()
      return
    }
    if (progress.total <= 1) return
    if (progress.current === 0) {
      loadingIndicator.value?.showWithProgress(
        t('loading.resizing', { current: 0, total: progress.total }),
        progress.total
      )
    } else {
      loadingIndicator.value?.updateProgress(
        progress.current,
        t('loading.resizing', { current: progress.current, total: progress.total })
      )
    }
  },
  { deep: true }
)

watch(
  () => imageStore.cropProgress,
  (progress) => {
    if (!progress.active) {
      loadingIndicator.value?.hide()
      return
    }
    if (progress.total <= 1) return
    if (progress.current === 0) {
      loadingIndicator.value?.showWithProgress(
        t('loading.cropping', { current: 0, total: progress.total }),
        progress.total
      )
    } else {
      loadingIndicator.value?.updateProgress(
        progress.current,
        t('loading.cropping', { current: progress.current, total: progress.total })
      )
    }
  },
  { deep: true }
)

// Gesicherte Serie aus IndexedDB wiederherstellen (Reload, Absturz)
async function restoreSession() {
  const { restored, failed } = await imageStore.restoreSession()
  if (restored > 0) toast.success(t('toast.sessionRestored', { count: restored }))
  if (failed > 0) toast.warning(t('toast.sessionRestorePartial', { failed }))
}

// Einmal pro Fehlerphase melden, nicht bei jedem Speicherversuch
watch(
  () => imageStore.sessionSaveFailed,
  (failed) => {
    if (failed) toast.warning(t('toast.sessionSaveFailed'), 8000)
  }
)

onMounted(() => {
  // Theme-Initialisierung als Fallback (SSI nav.html setzt Theme primär)
  if (!document.documentElement.getAttribute('data-theme')) {
    const theme = readStoredTheme()
    applyTheme(theme)
    localStorage.setItem('theme', theme)
  }

  window.addEventListener('keydown', handleKeyboard)
  window.addEventListener('paste', handlePaste)

  void restoreSession()

  measureHeader()
  const headerEl = appHeader.value?.$el as HTMLElement | undefined
  if (headerEl && typeof ResizeObserver !== 'undefined') {
    headerObserver = new ResizeObserver(measureHeader)
    headerObserver.observe(headerEl)
  }
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyboard)
  window.removeEventListener('paste', handlePaste)
  headerObserver?.disconnect()
  headerObserver = null
})
</script>

<template>
  <div class="app-page">
    <AppHeader ref="appHeader" />

    <div
      class="workspace"
      :class="{ 'panel-open': isBatchEditPanelOpen }"
      :style="{ '--app-header-height': `${appHeaderHeight}px` }"
    >
      <BatchEditPanel :is-open="isBatchEditPanelOpen" @close="closeBatchEditPanel" />

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

        <!-- Bilder aus anderen KodiniTools (z. B. Bildergalerie): annehmen oder verwerfen -->
        <HandoffReceiver @accept="importHandoffImages" />

        <DropZone />

        <ImageGrid
          v-if="imageStore.hasImages"
          :only-selected="isBatchEditPanelOpen"
          @open-editor="openEditor"
          @open-preview="openPreview"
        />
      </main>
    </div>

    <LoadingIndicator ref="loadingIndicator" />
    <ToastContainer />
    <ConfirmDialog />

    <ImageEditor
      :image="editingImage"
      :is-open="isEditorOpen"
      @close="closeEditor"
      @save="saveEditorChanges"
    />

    <ImagePreview
      :image="previewImage"
      :is-open="isPreviewOpen"
      :images="imageStore.filteredImages"
      @close="closePreview"
      @navigate="navigatePreview"
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

    <WizardNavigator
      :is-open="isWizardOpen"
      :export-type="wizardExportType"
      :export-count="wizardExportCount"
      @close="closeWizard"
      @new-project="handleWizardNewProject"
    />

    <ScrollToTopButton />
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

/* Workspace: optionale Sidebar-Spalte links, Inhalt nutzt den Rest der Breite */
.workspace {
  --batch-sidebar-width: 360px;
  flex: 1;
  width: 100%;
  display: flex;
  align-items: flex-start;
}

.container {
  flex: 1 1 auto;
  min-width: 0;
  width: 100%;
  max-width: 1200px;
  margin: var(--space-7) auto 0;
  padding: var(--space-6) var(--space-5);
  transition: max-width 0.3s var(--ease-smooth, ease);
}

/* Bei geöffneter Sidebar darf der Inhalt breiter werden und zentriert sich
   im verbleibenden Raum neben der Sidebar. */
.workspace.panel-open .container {
  max-width: 1400px;
}

@media (max-width: 768px) {
  .container {
    padding: var(--space-4) var(--space-3);
    margin-top: var(--space-5);
  }
}

@media (max-width: 480px) {
  .container {
    padding: var(--space-3) var(--space-2);
    margin-top: var(--space-4);
  }
}
</style>
