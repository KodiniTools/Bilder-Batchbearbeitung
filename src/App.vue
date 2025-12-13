<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
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
import { useImageStore } from '@/stores/imageStore'
import { useToast } from '@/composables/useToast'
import type { ImageObject } from '@/lib/core/types'
import { ImageProcessor } from '@/lib/core/image-processor'

// ✨ VEREINFACHT: Verwende nur noch export-pdf.ts als einziges Export-Modul!
import { 
  exportMultipleImagesAsPdf,
  exportImagesWithComments,
  type ExportSettings,
  type ImageData,
  type CanvasElement
} from '@/lib/features/export-pdf'

// ZIP-Export
import { exportImagesAsZip, type ZipProgressCallback } from '@/lib/features/export-zip'

// SVG-Export
import { downloadSvgBatch, checkSvgServiceAvailable, type SvgProgressCallback } from '@/lib/features/export-svg'

const { t } = useI18n()
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

// LoadingIndicator ref für Fortschrittsanzeige
const loadingIndicator = ref<InstanceType<typeof LoadingIndicator> | null>(null)

const exportImageCount = computed(() => {
  if (exportMode.value === 'pdf-all') {
    return imageStore.imageCount
  } else if (exportMode.value === 'zip' || exportMode.value === 'svg') {
    // ZIP/SVG: Ausgewählte Bilder wenn vorhanden, sonst alle
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
  // Update the image in store which triggers re-render
  imageStore.updateImage(image)
}

// Export-Funktionen
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

  // Prüfen ob der SVG-Service verfügbar ist
  const isAvailable = await checkSvgServiceAvailable()
  if (!isAvailable) {
    alert(t('alerts.svgServiceUnavailable') || 'Der SVG-Konvertierungsservice ist nicht verfügbar. Bitte stellen Sie sicher, dass der Server läuft.')
    return
  }

  exportMode.value = 'svg'
  isExportModalOpen.value = true
}

function closeExportModal() {
  isExportModalOpen.value = false
  exportMode.value = null
}

// ✨ VEREINFACHTE Export-Funktion - verwendet nur noch export-pdf.ts!
async function handleExportConfirm(settings: ExportSettings) {
  // Export-Modus speichern bevor Modal geschlossen wird
  const currentMode = exportMode.value
  
  closeExportModal()

  try {
    if (currentMode === 'pdf-all' || currentMode === 'pdf-selected') {
      // Bilder auswählen basierend auf Modus
      const images = currentMode === 'pdf-all'
        ? imageStore.images
        : imageStore.images.filter(img => img.selected)

      // Bilder in ImageData Format konvertieren (mit Filtern!)
      const imageDataArray: ImageData[] = await Promise.all(
        images.map(async (img) => {
          // Canvas zu Base64 konvertieren MIT angewendeten Filtern
          const dataUrl = ImageProcessor.getDataUrlWithFilters(img, 'image/png', 0.92)

          return {
            dataUrl: dataUrl,
            originalName: img.outputName || img.file.name
          }
        })
      )

      // 🎯 VEREINFACHT: Verwende exportMultipleImagesAsPdf (die Hauptfunktion)
      // Diese Funktion kann ALLES: Custom Front Page, Titelseite, Kommentarseiten, Bilder
      
      // ✨ Prüfe Custom Front Page (sicher mit allen Checks)
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
          // Custom Front Page nur wenn explizit aktiviert UND Elemente vorhanden
          includeCustomFrontPage: useCustomFrontPage,
          frontPageElements: useCustomFrontPage ? settings.frontPageElements : [],
          // Automatische Titelseite nur wenn KEINE Custom Front Page
          includeTitlePage: !useCustomFrontPage,
          includeCommentPages: settings.includeCommentPages || false,
          commentPageElements: settings.commentPageElements || [],
          includeFileName: true,
          includeImages: true,
          orientation: settings.orientation || 'portrait'
        },
        'bilder-export.pdf'
      )

      console.log(`✅ PDF-Export erfolgreich: ${images.length} Bilder`)
      toast.success(t('toast.pdfSuccess', { count: images.length }))
      console.log(`📄 Custom Front Page: ${useCustomFrontPage ? 'Ja' : 'Nein'}`)
      if (useCustomFrontPage && settings.frontPageElements) {
        console.log(`🎨 Front Page Elemente: ${settings.frontPageElements.length}`)
      }
      console.log(`📄 Kommentarseiten: ${settings.includeCommentPages ? 'Ja' : 'Nein'}`)
      if (settings.includeCommentPages) {
        console.log(`🎨 Kommentar-Elemente: ${settings.commentPageElements?.length || 0}`)

        // Zeige Seiten-Verteilung
        const pageCount = new Set(settings.commentPageElements?.map(el => el.page || 1)).size
        console.log(`📄 Anzahl Kommentarseiten: ${pageCount}`)
      }
      
    } else if (currentMode === 'zip') {
      // ZIP: Ausgewählte Bilder wenn vorhanden, sonst alle
      const imagesToExport = imageStore.hasSelection
        ? imageStore.selectedImages
        : imageStore.images
      const total = imagesToExport.length

      // Fortschrittsanzeige starten
      loadingIndicator.value?.showWithProgress(
        t('loading.zipProgress', { current: 0, total }),
        total
      )

      // Fortschritts-Callback
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
        console.log(`✅ ZIP-Export erfolgreich: ${total} Bilder`)
        toast.success(t('toast.zipSuccess', { count: total }))
      } finally {
        loadingIndicator.value?.hide()
      }

    } else if (currentMode === 'svg') {
      // SVG: Ausgewählte Bilder wenn vorhanden, sonst alle
      const imagesToExport = imageStore.hasSelection
        ? imageStore.selectedImages
        : imageStore.images
      const total = imagesToExport.length

      // Fortschrittsanzeige starten
      loadingIndicator.value?.showWithProgress(
        t('loading.svgProgress', { current: 0, total }) || `SVG-Konvertierung: 0/${total}`,
        total
      )

      // Fortschritts-Callback
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
        console.log(`✅ SVG-Export erfolgreich: ${total} Bilder`)
        toast.success(t('toast.svgSuccess', { count: total }) || `${total} Bilder erfolgreich als SVG exportiert`)
      } finally {
        loadingIndicator.value?.hide()
      }

    } else if (currentMode === 'save') {
      const images = imageStore.images.filter(img => img.selected)
      
      // Einzelne Bilder nacheinander downloaden mit Einstellungen
      for (const image of images) {
        await downloadSingleImage(image, settings.format, settings.quality / 100)
        // Kleine Verzögerung zwischen Downloads
        await new Promise(resolve => setTimeout(resolve, 200))
      }
      
      console.log(`✅ ${images.length} Bilder erfolgreich gespeichert`)
      toast.success(t('toast.saveSuccess', { count: images.length }))
    }
  } catch (error) {
    console.error('❌ Export fehlgeschlagen:', error)
    toast.error(t('toast.exportError'))
  }
}

function downloadSingleImage(image: ImageObject, format?: string, quality?: number): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const exportFormat = format || image.exportFormat || 'png'
      const exportQuality = quality !== undefined ? quality : (image.quality || 0.92)
      const mimeType = `image/${exportFormat === 'jpg' ? 'jpeg' : exportFormat}`

      // Canvas mit angewendeten Filtern holen
      const canvasWithFilters = ImageProcessor.getCanvasWithFilters(image)

      canvasWithFilters.toBlob((blob) => {
        if (!blob) {
          reject(new Error('Blob-Konvertierung fehlgeschlagen'))
          return
        }

        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url

        // Dateiname mit richtiger Endung
        let fileName = image.outputName || `bild_${Date.now()}`
        if (!fileName.includes('.')) {
          fileName += `.${exportFormat}`
        } else {
          // Endung ersetzen
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

// Bulk Rename Functions
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

// Batch Edit Panel Functions
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

// Tastaturkürzel Handler
function handleKeyboard(event: KeyboardEvent) {
  // Ignoriere wenn ein Modal offen ist oder Eingabefeld fokussiert
  if (isEditorOpen.value || isPreviewOpen.value || isExportModalOpen.value || isBulkRenameModalOpen.value) return
  const target = event.target as HTMLElement
  if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return

  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0
  const ctrlOrCmd = isMac ? event.metaKey : event.ctrlKey

  // Ctrl/Cmd + A: Alle auswählen
  if (ctrlOrCmd && event.key.toLowerCase() === 'a' && imageStore.hasImages) {
    event.preventDefault()
    imageStore.selectAllImages()
    return
  }

  // Delete/Backspace: Ausgewählte löschen
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

  // Escape: Auswahl aufheben
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

  // Tastaturkürzel registrieren
  window.addEventListener('keydown', handleKeyboard)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyboard)
})
</script>

<template>
  <div class="app">
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
      
      <div v-if="!imageStore.hasImages" class="empty-state">
        <div style="font-size:34px">
          <i class="fa-regular fa-image"></i>
        </div>
        <div>
          <strong>{{ t('emptyState.title') }}</strong>
          <span>{{ t('emptyState.text') }}</span>
        </div>
      </div>
      
      <ImageGrid v-else @open-editor="openEditor" @open-preview="openPreview" />

      <section class="donate-section">
        <h2>{{ $t('donate.title') }}</h2>
        <p class="donate-text">{{ $t('donate.text') }}</p>
        <form action="https://www.paypal.com/donate" method="post" target="_top" class="paypal-form">
          <input type="hidden" name="hosted_button_id" value="8RGLGQ2BFMHU6" />
          <button type="submit" class="paypal-button">
            <i class="fa-brands fa-paypal"></i>
            {{ $t('donate.button') }}
          </button>
        </form>
      </section>

      <section class="faq-section">
        <h2>{{ $t('faq.title') }}</h2>
        
        <div class="privacy-notice">
          <i class="fa-solid fa-shield-halved"></i>
          <div>
            <strong>{{ $t('faq.privacy.title') }}</strong>
            <p>{{ $t('faq.privacy.text') }}</p>
          </div>
        </div>
        
        <div class="faq-list">
          <details v-for="i in 8" :key="i">
            <summary>{{ $t(`faq.q${i}.question`) }}</summary>
            <p v-html="$t(`faq.q${i}.answer`)"></p>
          </details>
        </div>
      </section>
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

    <!-- ✨ ExportSettingsModal mit Comment Page Designer Support -->
    <ExportSettingsModal
      :is-open="isExportModalOpen"
      :mode="exportMode"
      :image-count="exportImageCount"
      :has-selection="imageStore.hasSelection"
      @close="closeExportModal"
      @confirm="handleExportConfirm"
    />

    <!-- Bulk Rename Modal -->
    <BulkRenameModal
      :is-open="isBulkRenameModalOpen"
      @close="closeBulkRenameModal"
      @confirm="handleBulkRenameConfirm"
    />

    <!-- Batch Edit Panel -->
    <BatchEditPanel
      :is-open="isBatchEditPanelOpen"
      @close="closeBatchEditPanel"
    />
  </div>
</template>

<style scoped>
.app {
  min-height: auto;
  display: flex;
  flex-direction: column;
  padding-bottom: var(--space-6);
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: var(--space-6) var(--space-5);
  margin-top: var(--space-7);
  flex: 1;
  width: 100%;
}

.empty-state {
  display: grid;
  place-items: center;
  gap: var(--space-4);
  text-align: center;
  color: var(--muted);
  padding: var(--space-6);
  border: 2px dashed color-mix(in oklab, var(--border-color) 40%, transparent);
  border-radius: var(--radius-2xl);
  background: linear-gradient(135deg, 
    color-mix(in oklab, var(--panel) 30%, transparent) 0%,
    color-mix(in oklab, var(--panel) 10%, transparent) 100%);
  margin-bottom: var(--space-7);
}

.donate-section {
  margin-top: var(--space-6);
  padding: var(--space-6);
  background: linear-gradient(135deg,
    color-mix(in oklab, var(--accent) 8%, transparent) 0%,
    color-mix(in oklab, var(--accent) 3%, transparent) 100%);
  border: 1px solid color-mix(in oklab, var(--accent) 25%, transparent);
  border-radius: var(--radius-2xl);
  text-align: center;
  position: relative;
  overflow: hidden;
}

.donate-section h2 {
  margin-top: 0;
  margin-bottom: var(--space-4);
  font-size: 1.8rem;
  font-weight: 700;
  background: linear-gradient(135deg, var(--text), var(--accent));
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.donate-text {
  margin-bottom: var(--space-5);
  color: var(--muted);
  font-size: 1.05rem;
  line-height: 1.6;
}

.paypal-form {
  display: inline-block;
}

.paypal-button {
  display: inline-flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-4) var(--space-6);
  font-size: 1.1rem;
  font-weight: 600;
  color: white;
  background: linear-gradient(135deg, #0070ba, #1f8dd6);
  border: none;
  border-radius: var(--radius-xl);
  cursor: pointer;
  transition: all 0.3s var(--ease-smooth);
  box-shadow: 0 4px 12px rgba(0, 112, 186, 0.3);
}

.paypal-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0, 112, 186, 0.4);
  background: linear-gradient(135deg, #005a94, #1a7ab8);
}

.paypal-button:active {
  transform: translateY(0);
}

.paypal-button i {
  font-size: 1.4rem;
}

.faq-section {
  margin-top: var(--space-6);
  padding: var(--space-6);
  background: var(--glass-bg);
  backdrop-filter: blur(16px);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-2xl);
  position: relative;
  overflow: hidden;
}

.faq-section h2 {
  text-align: center;
  margin-top: 0;
  margin-bottom: var(--space-5);
  font-size: 1.8rem;
  font-weight: 700;
  background: linear-gradient(135deg, var(--text), var(--accent));
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.privacy-notice {
  display: flex;
  align-items: flex-start;
  gap: var(--space-4);
  padding: var(--space-5);
  background: linear-gradient(135deg, 
    color-mix(in oklab, var(--accent) 8%, transparent) 0%,
    color-mix(in oklab, var(--green) 6%, transparent) 100%);
  border-radius: var(--radius-2xl);
  border: 1px solid color-mix(in oklab, var(--accent) 25%, transparent);
  margin-bottom: var(--space-5);
}

.privacy-notice i {
  font-size: 2rem;
  color: var(--accent);
  margin-top: 4px;
}

.privacy-notice strong {
  display: block;
  margin-bottom: var(--space-2);
  color: var(--text);
  font-size: 1.1rem;
}

.privacy-notice p {
  margin: 0;
  color: var(--muted);
  font-size: 0.95rem;
  line-height: 1.6;
}

.faq-list details {
  border-bottom: 1px solid var(--glass-border);
  padding: var(--space-4) 0;
  transition: all 0.3s var(--ease-smooth);
}

.faq-list details:first-of-type {
  border-top: 1px solid var(--glass-border);
}

.faq-list summary {
  font-weight: 600;
  cursor: pointer;
  list-style: none;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-2);
  border-radius: var(--radius-md);
  transition: all 0.3s var(--ease-smooth);
}

.faq-list summary::after {
  content: '+';
  font-size: 1.5rem;
  font-weight: 300;
  color: var(--accent);
  transition: all 0.3s var(--ease-spring);
  width: 24px;
  height: 24px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: color-mix(in oklab, var(--accent) 10%, transparent);
}

.faq-list details[open] summary::after {
  transform: rotate(45deg);
  background: var(--accent);
  color: white;
}

.faq-list p {
  margin-top: var(--space-4);
  color: var(--muted);
  line-height: 1.7;
  padding-left: var(--space-4);
  border-left: 3px solid color-mix(in oklab, var(--accent) 20%, transparent);
}

@media (max-width: 768px) {
  .container {
    padding: var(--space-4) var(--space-3);
  }

  .donate-section {
    padding: var(--space-4);
  }

  .donate-section h2 {
    font-size: 1.5rem;
  }

  .donate-text {
    font-size: 0.95rem;
  }

  .paypal-button {
    padding: var(--space-3) var(--space-5);
    font-size: 1rem;
  }

  .faq-section {
    padding: var(--space-4);
  }

  .privacy-notice {
    flex-direction: column;
    text-align: center;
  }
}
</style>
