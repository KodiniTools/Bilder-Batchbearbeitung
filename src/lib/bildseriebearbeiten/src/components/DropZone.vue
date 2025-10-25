<script setup lang="ts">
import { ref } from 'vue'
import { useImageStore } from '@/stores/imageStore'
import { useI18n } from 'vue-i18n'

const imageStore = useImageStore()
const { t } = useI18n()

const fileInput = ref<HTMLInputElement>()
const isHighlighted = ref(false)
const isLoading = ref(false)

const handleClick = () => {
  fileInput.value?.click()
}

const handleFiles = async (files: FileList | null) => {
  if (!files || files.length === 0) return
  
  isLoading.value = true
  try {
    const fileArray = Array.from(files)
    await imageStore.addImages(fileArray)
  } catch (error) {
    console.error('Fehler beim Laden der Dateien:', error)
  } finally {
    isLoading.value = false
  }
}

const handleFileInput = (event: Event) => {
  const target = event.target as HTMLInputElement
  handleFiles(target.files)
  // Reset input
  target.value = ''
}

const handleDragOver = (event: DragEvent) => {
  event.preventDefault()
  isHighlighted.value = true
}

const handleDragLeave = () => {
  isHighlighted.value = false
}

const handleDrop = (event: DragEvent) => {
  event.preventDefault()
  isHighlighted.value = false
  handleFiles(event.dataTransfer?.files || null)
}
</script>

<template>
  <section
    class="drop-area"
    :class="{ highlight: isHighlighted, loading: isLoading }"
    @click="handleClick"
    @dragover="handleDragOver"
    @dragleave="handleDragLeave"
    @drop="handleDrop"
    aria-label="Dateien hierher ziehen oder klicken um Bilder auszuwählen"
  >
    <div class="upload-icon" aria-hidden="true">
      <i class="fa-solid fa-cloud-arrow-up"></i>
    </div>
    <div class="upload-text">
      {{ t('upload.text') }}
    </div>
    <button type="button" class="btn upload-btn" @click.stop="handleClick">
      <i class="fa-solid fa-file-arrow-up"></i>
      <span>{{ t('upload.button') }}</span>
    </button>
    <input
      ref="fileInput"
      type="file"
      accept="image/*"
      multiple
      hidden
      @change="handleFileInput"
    />
  </section>
</template>

<style scoped>
.drop-area {
  display: grid;
  place-items: center;
  gap: var(--space-3);
  min-height: 240px;
  padding: var(--space-6);
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
  cursor: pointer;
  position: relative;
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

.upload-icon {
  font-size: 48px;
  color: var(--accent);
  transition: all 0.3s var(--ease-bounce);
}

.drop-area:hover .upload-icon {
  transform: scale(1.1) rotate(5deg);
}

.upload-text {
  font-size: 1.1rem;
  font-weight: 500;
  transition: color 0.3s var(--ease-smooth);
}

.drop-area:hover .upload-text {
  color: var(--accent);
}

.upload-btn {
  margin-top: var(--space-2);
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
    min-height: 200px;
    padding: var(--space-5);
  }
  
  .upload-icon {
    font-size: 40px;
  }
  
  .upload-text {
    font-size: 1rem;
  }
}
</style>
