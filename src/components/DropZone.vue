<script setup lang="ts">
import { ref } from 'vue'
import { useImageStore } from '@/stores/imageStore'
import { useI18n } from 'vue-i18n'
import { useToast } from '@/composables/useToast'
import {
  extractImagesFromZip,
  isZipFile,
  ZipImportError,
  ZIP_ACCEPT,
  ZIP_MAX_IMAGES,
  ZIP_MAX_TOTAL_BYTES,
} from '@/lib/features/import-zip'

const imageStore = useImageStore()
const { t } = useI18n()
const toast = useToast()

const fileInput = ref<HTMLInputElement>()
const zipInput = ref<HTMLInputElement>()
const folderInput = ref<HTMLInputElement>()
const isHighlighted = ref(false)
const isLoading = ref(false)

const handleFiles = async (files: FileList | File[] | null) => {
  if (!files || files.length === 0) return

  isLoading.value = true
  try {
    const all = Array.from(files)
    const fileArray = all.filter((f) => f.type.startsWith('image/'))
    for (const zip of all.filter(isZipFile)) {
      fileArray.push(...(await extractZip(zip)))
    }
    if (fileArray.length > 0) await imageStore.addImages(fileArray)
  } catch (error) {
    console.error('Fehler beim Laden der Dateien:', error)
  } finally {
    isLoading.value = false
  }
}

/** Entpackt ein ZIP und meldet das Ergebnis; Fehler blockieren die übrigen Dateien nicht. */
const extractZip = async (zip: File): Promise<File[]> => {
  try {
    const { images } = await extractImagesFromZip(zip)
    if (images.length === 0) {
      toast.warning(t('toast.zipImportEmpty', { name: zip.name }))
    } else {
      toast.success(t('toast.zipImported', { count: images.length, name: zip.name }))
    }
    return images
  } catch (error) {
    console.error('Fehler beim Entpacken:', error)
    const key =
      error instanceof ZipImportError && error.code === 'tooLarge'
        ? 'toast.zipImportTooLarge'
        : 'toast.zipImportError'
    toast.error(
      t(key, {
        name: zip.name,
        maxImages: ZIP_MAX_IMAGES,
        maxMb: Math.round(ZIP_MAX_TOTAL_BYTES / 1024 / 1024),
      })
    )
    return []
  }
}

const handleFileInput = (event: Event) => {
  const target = event.target as HTMLInputElement
  handleFiles(target.files)
  target.value = ''
}

const handleDragOver = (event: DragEvent) => {
  event.preventDefault()
  isHighlighted.value = true
}

const handleDragLeave = () => {
  isHighlighted.value = false
}

const handleDrop = async (event: DragEvent) => {
  event.preventDefault()
  isHighlighted.value = false

  const items = event.dataTransfer?.items
  if (!items) return

  const files: File[] = []

  const readEntry = (entry: FileSystemEntry): Promise<void> => {
    if (entry.isFile) {
      return new Promise((resolve) => {
        ;(entry as FileSystemFileEntry).file((f) => {
          files.push(f)
          resolve()
        })
      })
    }
    if (entry.isDirectory) {
      const reader = (entry as FileSystemDirectoryEntry).createReader()
      return new Promise((resolve) => {
        const readAll = () => {
          reader.readEntries(async (entries) => {
            if (entries.length === 0) return resolve()
            await Promise.all(entries.map(readEntry))
            readAll()
          })
        }
        readAll()
      })
    }
    return Promise.resolve()
  }

  await Promise.all(
    Array.from(items)
      .map((item) => item.webkitGetAsEntry())
      .filter((e): e is FileSystemEntry => e !== null)
      .map(readEntry)
  )

  handleFiles(files)
}
</script>

<template>
  <section
    class="drop-area"
    :class="{ highlight: isHighlighted, loading: isLoading }"
    :aria-label="t('accessibility.dropzone')"
    @dragover="handleDragOver"
    @dragleave="handleDragLeave"
    @drop="handleDrop"
  >
    <div class="upload-text">
      {{ t('upload.text') }}
    </div>
    <div class="upload-buttons">
      <button
        type="button"
        class="btn upload-btn pill-btn"
        :title="t('upload.button')"
        :aria-label="t('upload.button')"
        @click.stop="fileInput?.click()"
      >
        <i class="fa-solid fa-arrow-up-from-bracket"></i>
        <span>{{ t('upload.button') }}</span>
      </button>
      <button
        type="button"
        class="btn upload-btn pill-btn folder-btn"
        :title="t('upload.folderButton')"
        :aria-label="t('upload.folderButton')"
        @click.stop="folderInput?.click()"
      >
        <i class="fa-solid fa-folder-open"></i>
        <span>{{ t('upload.folderButton') }}</span>
      </button>
      <button
        type="button"
        class="btn upload-btn pill-btn folder-btn"
        :title="t('upload.zipButtonTooltip')"
        :aria-label="t('upload.zipButtonTooltip')"
        @click.stop="zipInput?.click()"
      >
        <i class="fa-solid fa-file-zipper"></i>
        <span>{{ t('upload.zipButton') }}</span>
      </button>
    </div>
    <div class="paste-hint" :title="t('upload.pasteHintTooltip')">
      <kbd>Ctrl</kbd>
      <span class="kbd-plus">+</span>
      <kbd>V</kbd>
      <span class="paste-hint-label">{{ t('upload.pasteHint') }}</span>
    </div>
    <input ref="fileInput" type="file" accept="image/*" multiple hidden @change="handleFileInput" />
    <input
      ref="zipInput"
      type="file"
      :accept="ZIP_ACCEPT"
      multiple
      hidden
      @change="handleFileInput"
    />
    <input
      ref="folderInput"
      type="file"
      accept="image/*"
      webkitdirectory
      hidden
      @change="handleFileInput"
    />
  </section>
</template>

<style scoped>
.drop-area {
  display: grid;
  place-items: center;
  gap: var(--space-2);
  min-height: 120px;
  padding: var(--space-4);
  border: 2px dashed var(--ds-border-strong);
  border-radius: var(--ds-radius-lg);
  background: var(--ds-surface-2);
  color: var(--muted);
  transition: all 0.4s var(--ease-spring);
  cursor: default;
  position: relative;
  z-index: 1;
  overflow: hidden;
  margin-bottom: var(--space-7);
}

.drop-area.highlight {
  border-color: var(--ds-accent);
  background: var(--ds-accent-soft);
}

.drop-area.loading {
  pointer-events: none;
  opacity: 0.7;
}

.upload-text {
  font-size: 1.1rem;
  font-weight: 500;
  transition: color 0.3s var(--ease-smooth);
}

.drop-area:hover .upload-text {
  color: var(--accent);
}

.upload-buttons {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: var(--space-3);
  margin-top: var(--space-2);
}

.upload-btn {
  margin-top: 0;
}

.upload-btn.pill-btn {
  height: 44px;
  padding: 0 20px;
  border-radius: 999px;
  font-size: 0.9rem;
  font-weight: 600;
  gap: 8px;
  background: var(--accent);
  color: var(--accent-text);
  border: none;
  transition: all 0.25s var(--ease-smooth);
}

.upload-btn.pill-btn:hover {
  background: var(--accent-hover, var(--accent));
}

.folder-btn {
  background: color-mix(in oklab, var(--panel) 100%, transparent);
  color: var(--text);
  border: 1.5px solid var(--border-color) !important;
  box-shadow: 0 2px 8px color-mix(in oklab, var(--shadow-color) 10%, transparent);
}

.folder-btn:hover {
  background: var(--btn-hover);
  border-color: var(--accent) !important;
  color: var(--accent);
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 18px;
  border-radius: var(--radius-lg);
  border: 1px solid var(--border-color);
  background: var(--btn);
  color: var(--text);
  font-weight: 500;
  transition: all 0.2s var(--ease-smooth);
  cursor: pointer;
}

.btn:hover {
  background: var(--btn-hover);
  box-shadow: var(--surface-elevation);
}

@media (max-width: 768px) {
  .drop-area {
    min-height: 100px;
    padding: var(--space-3);
    margin-bottom: var(--space-5);
  }

  .upload-text {
    font-size: 1rem;
  }
}

@media (max-width: 480px) {
  .drop-area {
    min-height: 80px;
    padding: var(--space-3);
    margin-bottom: var(--space-4);
  }

  .upload-text {
    font-size: 0.9rem;
  }

  .upload-btn.pill-btn {
    height: 40px;
    padding: 0 14px;
    font-size: 0.82rem;
  }
}

.paste-hint {
  display: flex;
  align-items: center;
  gap: 4px;
  opacity: 0.55;
  transition: opacity 0.2s;
  font-size: 0.75rem;
  color: var(--muted);
  user-select: none;
}

.drop-area:hover .paste-hint {
  opacity: 0.85;
}

kbd {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 1px 5px;
  font-family: inherit;
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--text);
  background: var(--bg);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  box-shadow: 0 1px 0 var(--border-color);
  line-height: 1.4;
}

.kbd-plus {
  font-size: 0.65rem;
  color: var(--muted);
}

.paste-hint-label {
  margin-left: 2px;
}
</style>
