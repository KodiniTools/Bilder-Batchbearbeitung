<script setup lang="ts">
import { ref } from 'vue'
import { useImageStore } from '@/stores/imageStore'
import { useI18n } from 'vue-i18n'

const imageStore = useImageStore()
const { t } = useI18n()

const fileInput = ref<HTMLInputElement>()
const folderInput = ref<HTMLInputElement>()
const isHighlighted = ref(false)
const isLoading = ref(false)

const handleFiles = async (files: FileList | File[] | null) => {
  if (!files || files.length === 0) return

  isLoading.value = true
  try {
    const fileArray = Array.from(files).filter(f => f.type.startsWith('image/'))
    if (fileArray.length > 0) await imageStore.addImages(fileArray)
  } catch (error) {
    console.error('Fehler beim Laden der Dateien:', error)
  } finally {
    isLoading.value = false
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
      return new Promise(resolve => {
        (entry as FileSystemFileEntry).file(f => { files.push(f); resolve() })
      })
    }
    if (entry.isDirectory) {
      const reader = (entry as FileSystemDirectoryEntry).createReader()
      return new Promise(resolve => {
        const readAll = () => {
          reader.readEntries(async entries => {
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
      .map(item => item.webkitGetAsEntry())
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
      <button type="button" class="btn upload-btn icon-only" :title="t('upload.button')" :aria-label="t('upload.button')" @click.stop="fileInput?.click()">
        <i class="fa-solid fa-file-arrow-up"></i>
      </button>
      <button type="button" class="btn upload-btn icon-only folder-btn" :title="t('upload.folderButton')" :aria-label="t('upload.folderButton')" @click.stop="folderInput?.click()">
        <i class="fa-solid fa-folder-open"></i>
      </button>
    </div>
    <div class="paste-hint" :title="t('upload.pasteHintTooltip')">
      <kbd>Ctrl</kbd><span class="kbd-plus">+</span><kbd>V</kbd>
      <span class="paste-hint-label">{{ t('upload.pasteHint') }}</span>
    </div>
    <input
      ref="fileInput"
      type="file"
      accept="image/*"
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
  border: 2px dashed color-mix(in oklab, var(--border-color) 50%, transparent);
  border-radius: var(--radius-2xl);
  background:
    linear-gradient(135deg,
      color-mix(in oklab, var(--panel) 60%, transparent) 0%,
      color-mix(in oklab, var(--panel) 30%, transparent) 100%),
    radial-gradient(circle at center,
      color-mix(in oklab, var(--accent) 4%, transparent) 0%,
      transparent 70%);
  color: var(--muted);
  transition: all 0.4s var(--ease-spring);
  cursor: default;
  position: relative;
  z-index: 1;
  overflow: hidden;
  margin-bottom: var(--space-7);
}

.drop-area::before {
  content: '';
  position: absolute;
  inset: -3px;
  background: linear-gradient(45deg, 
    var(--accent), var(--green), var(--purple), var(--accent));
  border-radius: inherit;
  opacity: 0;
  transition: opacity 0.4s var(--ease-smooth);
  z-index: -1;
}

.drop-area.highlight {
  border-color: transparent;
  background: 
    linear-gradient(135deg, 
      color-mix(in oklab, var(--accent) 15%, transparent) 0%,
      color-mix(in oklab, var(--green) 10%, transparent) 100%);
  transform: translateY(-6px) scale(1.02);
  box-shadow: var(--surface-hover);
}

.drop-area.highlight::before {
  opacity: 0.1;
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
  gap: var(--space-3);
  margin-top: var(--space-2);
}

.upload-btn {
  margin-top: 0;
}

.upload-btn.icon-only {
  width: 56px;
  height: 56px;
  padding: 0;
  border-radius: 50%;
  font-size: 1.4rem;
  background: var(--accent);
  color: var(--accent-text);
  border: none;
  box-shadow: 0 4px 16px color-mix(in oklab, var(--accent) 35%, transparent);
}

.upload-btn.icon-only:hover {
  background: var(--accent-hover, var(--accent));
  transform: translateY(-3px) scale(1.05);
  box-shadow: 0 8px 24px color-mix(in oklab, var(--accent) 45%, transparent);
}

.folder-btn {
  background: var(--green, #22c55e);
  box-shadow: 0 4px 16px color-mix(in oklab, var(--green, #22c55e) 35%, transparent);
}

.folder-btn:hover {
  background: color-mix(in oklab, var(--green, #22c55e) 85%, white);
  box-shadow: 0 8px 24px color-mix(in oklab, var(--green, #22c55e) 45%, transparent);
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
  transform: translateY(-2px);
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

  .upload-btn.icon-only {
    width: 48px;
    height: 48px;
    font-size: 1.2rem;
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
