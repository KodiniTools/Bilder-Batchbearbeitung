<script setup lang="ts">
import { ref } from 'vue'
import { useImageStore } from '@/stores/imageStore'
import { useI18n } from 'vue-i18n'
import { useToast } from '@/composables/useToast'

const imageStore = useImageStore()
const { t } = useI18n()
const toast = useToast()

// Dropdown für Seitenverhältnis
const isAspectRatioDropdownOpen = ref(false)

const emit = defineEmits<{
  'export-pdf': ['all' | 'selected']
  'export-zip': []
  'save-images': []
  'bulk-rename': []
}>()

const handleSelectAll = () => {
  imageStore.selectAllImages()
}

const handleDelete = () => {
  const count = imageStore.selectedCount
  if (!confirm(t('alerts.confirmDelete', { count }))) {
    return
  }
  imageStore.removeSelectedImages()
  if (count === 1) {
    toast.success(t('toast.imageRemoved'))
  } else {
    toast.success(t('toast.imagesRemoved', { count }))
  }
}

const handleExportPdf = (mode: 'all' | 'selected') => {
  emit('export-pdf', mode)
}

const handleExportZip = () => {
  emit('export-zip')
}

const handleSaveImages = () => {
  emit('save-images')
}

// Batch-Transformationen
const handleRotateLeft = () => {
  imageStore.rotateSelectedImages(-90)
  toast.success(t('toast.rotated', { count: imageStore.selectedCount }))
}

const handleRotateRight = () => {
  imageStore.rotateSelectedImages(90)
  toast.success(t('toast.rotated', { count: imageStore.selectedCount }))
}

const handleFlipH = () => {
  imageStore.flipSelectedImages('horizontal')
  toast.success(t('toast.flipped', { count: imageStore.selectedCount }))
}

const handleFlipV = () => {
  imageStore.flipSelectedImages('vertical')
  toast.success(t('toast.flipped', { count: imageStore.selectedCount }))
}

const handleBulkRename = () => {
  emit('bulk-rename')
}

// Seitenverhältnis-Funktionen
const toggleAspectRatioDropdown = () => {
  isAspectRatioDropdownOpen.value = !isAspectRatioDropdownOpen.value
}

const closeAspectRatioDropdown = () => {
  isAspectRatioDropdownOpen.value = false
}

const handleCropToAspectRatio = (ratio: number) => {
  imageStore.cropSelectedImagesToAspectRatio(ratio)
  toast.success(t('toast.cropped', { count: imageStore.selectedCount }))
  closeAspectRatioDropdown()
}
</script>

<template>
  <div class="status-bar">
    <span class="stat">
      <i class="fa-solid fa-images"></i>
      <strong>{{ imageStore.imageCount }}</strong>
      <span>{{ t('statusBar.images') }}</span>
    </span>
    <span class="stat">
      <i class="fa-solid fa-check-double"></i>
      <strong>{{ imageStore.selectedCount }}</strong>
      <span>{{ t('statusBar.selected') }}</span>
    </span>
    
    <div class="header-spacer"></div>
    
    <button
      class="btn"
      @click="handleSelectAll"
      :title="t('statusBar.tooltips.selectAll')"
    >
      <i class="fa-solid fa-border-all"></i>
      <span>{{ t('statusBar.buttons.selectAll') }}</span>
    </button>
    
    <button
      class="btn"
      @click="handleDelete"
      :disabled="!imageStore.hasSelection"
      :title="t('statusBar.tooltips.deleteSelected')"
    >
      <i class="fa-solid fa-trash-can"></i>
      <span>{{ t('statusBar.buttons.delete') }}</span>
    </button>

    <!-- Batch-Transformationen Gruppe -->
    <div class="btn-group" v-if="imageStore.hasSelection">
      <button
        class="btn btn-icon"
        @click="handleRotateLeft"
        :title="t('statusBar.tooltips.rotateLeft')"
      >
        <i class="fa-solid fa-rotate-left"></i>
      </button>
      <button
        class="btn btn-icon"
        @click="handleRotateRight"
        :title="t('statusBar.tooltips.rotateRight')"
      >
        <i class="fa-solid fa-rotate-right"></i>
      </button>
      <button
        class="btn btn-icon"
        @click="handleFlipH"
        :title="t('statusBar.tooltips.flipH')"
      >
        <i class="fa-solid fa-arrows-left-right"></i>
      </button>
      <button
        class="btn btn-icon"
        @click="handleFlipV"
        :title="t('statusBar.tooltips.flipV')"
      >
        <i class="fa-solid fa-arrows-up-down"></i>
      </button>
    </div>

    <!-- Seitenverhältnis Dropdown -->
    <div class="dropdown-wrapper" v-if="imageStore.hasSelection">
      <button
        class="btn"
        @click="toggleAspectRatioDropdown"
        :title="t('statusBar.tooltips.aspectRatio')"
      >
        <i class="fa-solid fa-crop"></i>
        <span>{{ t('statusBar.buttons.aspectRatio') }}</span>
        <i class="fa-solid fa-chevron-down dropdown-icon" :class="{ 'dropdown-open': isAspectRatioDropdownOpen }"></i>
      </button>
      <div class="dropdown-menu" v-if="isAspectRatioDropdownOpen" @mouseleave="closeAspectRatioDropdown">
        <button class="dropdown-item" @click="handleCropToAspectRatio(1)">
          <i class="fa-solid fa-square"></i>
          <span>1:1</span>
        </button>
        <button class="dropdown-item" @click="handleCropToAspectRatio(16/9)">
          <i class="fa-solid fa-rectangle-wide"></i>
          <span>16:9</span>
        </button>
        <button class="dropdown-item" @click="handleCropToAspectRatio(2/3)">
          <i class="fa-solid fa-rectangle-portrait"></i>
          <span>2:3</span>
        </button>
      </div>
    </div>

    <!-- Batch-Umbenennung Button -->
    <button
      class="btn"
      v-if="imageStore.hasSelection"
      @click="handleBulkRename"
      :title="t('statusBar.tooltips.bulkRename')"
    >
      <i class="fa-solid fa-pen"></i>
      <span>{{ t('statusBar.buttons.bulkRename') }}</span>
    </button>

    <button
      class="btn"
      @click="handleExportPdf('selected')"
      :disabled="!imageStore.hasSelection"
      :title="t('statusBar.tooltips.exportSelectedPdf')"
    >
      <i class="fa-solid fa-file-pdf"></i>
      <span>{{ t('statusBar.buttons.exportSelectedPdf') }}</span>
    </button>
    
    <button
      class="btn"
      @click="handleExportPdf('all')"
      :title="t('statusBar.tooltips.exportAllPdf')"
    >
      <i class="fa-solid fa-file-pdf"></i>
      <span>{{ t('statusBar.buttons.exportAllPdf') }}</span>
    </button>
    
    <button
      class="btn btn-primary"
      @click="handleSaveImages"
      :disabled="!imageStore.hasSelection"
      :title="t('statusBar.tooltips.saveSelected')"
    >
      <i class="fa-solid fa-floppy-disk"></i>
      <span>{{ t('statusBar.buttons.save') }}</span>
    </button>
    
    <button
      class="btn"
      @click="handleExportZip"
      :title="t('statusBar.tooltips.downloadZip')"
    >
      <i class="fa-solid fa-file-zipper"></i>
      <span>ZIP</span>
    </button>
  </div>
</template>

<style scoped>
.status-bar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--space-3);
  padding: var(--space-4);
  margin: var(--space-4) 0;
  background: var(--glass-bg);
  backdrop-filter: blur(20px);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-2xl);
  box-shadow: 
    var(--surface-elevation),
    inset 0 1px 0 color-mix(in oklab, white 15%, transparent);
  position: relative;
  overflow: hidden;
}

.status-bar::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, 
    color-mix(in oklab, var(--accent) 3%, transparent) 0%,
    transparent 50%,
    color-mix(in oklab, var(--green) 2%, transparent) 100%);
  pointer-events: none;
}

.stat {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  border-radius: var(--radius-lg);
  background: linear-gradient(135deg, 
    color-mix(in oklab, var(--accent) 12%, transparent) 0%,
    color-mix(in oklab, var(--accent) 8%, transparent) 100%);
  border: 1px solid color-mix(in oklab, var(--accent) 20%, transparent);
  color: var(--text);
  font-weight: 500;
  position: relative;
  overflow: hidden;
  transition: all 0.3s var(--ease-smooth);
}

.header-spacer {
  flex: 1;
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
  position: relative;
  overflow: hidden;
}

.btn:hover:not(:disabled) {
  transform: translateY(-2px);
  background: var(--btn-hover);
  box-shadow: var(--surface-elevation);
}

.btn:disabled {
  opacity: 0.5;
  pointer-events: none;
}

.btn-primary {
  background: linear-gradient(135deg, var(--accent) 0%, color-mix(in oklab, var(--accent) 90%, var(--purple)) 100%);
  color: var(--accent-text);
  border-color: transparent;
  box-shadow: 0 4px 16px color-mix(in oklab, var(--accent) 25%, transparent);
}

.btn-primary:hover:not(:disabled) {
  background: linear-gradient(135deg,
    color-mix(in oklab, var(--accent) 90%, black) 0%,
    color-mix(in oklab, var(--accent) 80%, var(--purple)) 100%);
  box-shadow: 0 8px 32px color-mix(in oklab, var(--accent) 35%, transparent);
  transform: translateY(-3px);
}

/* Button-Gruppe für Transformationen */
.btn-group {
  display: flex;
  gap: 4px;
  padding: 4px;
  background: color-mix(in oklab, var(--border-color) 20%, transparent);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border-color);
}

.btn-icon {
  width: 40px;
  height: 40px;
  padding: 0;
  border-radius: var(--radius-md);
}

.btn-icon i {
  font-size: 1rem;
}

/* Dropdown Styles */
.dropdown-wrapper {
  position: relative;
}

.dropdown-icon {
  font-size: 0.75rem;
  margin-left: 4px;
  transition: transform 0.2s var(--ease-smooth);
}

.dropdown-icon.dropdown-open {
  transform: rotate(180deg);
}

.dropdown-menu {
  position: absolute;
  top: 100%;
  left: 0;
  margin-top: 4px;
  min-width: 140px;
  background: var(--glass-bg);
  backdrop-filter: blur(20px);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--surface-elevation);
  z-index: 100;
  overflow: hidden;
  animation: dropdown-appear 0.2s var(--ease-smooth);
}

@keyframes dropdown-appear {
  from {
    opacity: 0;
    transform: translateY(-8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 12px 16px;
  border: none;
  background: transparent;
  color: var(--text);
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s var(--ease-smooth);
  text-align: left;
}

.dropdown-item:hover {
  background: color-mix(in oklab, var(--accent) 15%, transparent);
  color: var(--accent);
}

.dropdown-item i {
  font-size: 1rem;
  width: 20px;
  text-align: center;
  color: var(--muted);
  transition: color 0.2s var(--ease-smooth);
}

.dropdown-item:hover i {
  color: var(--accent);
}

@media (max-width: 768px) {
  .status-bar {
    flex-direction: column;
    align-items: stretch;
    gap: var(--space-3);
    padding: var(--space-3);
  }

  .header-spacer {
    display: none;
  }

  .stat {
    justify-content: center;
  }

  .btn {
    width: 100%;
  }

  .btn-group {
    justify-content: center;
  }

  .btn-group .btn-icon {
    flex: 1;
    max-width: 60px;
  }

  .dropdown-wrapper {
    width: 100%;
  }

  .dropdown-wrapper .btn {
    width: 100%;
    justify-content: center;
  }

  .dropdown-menu {
    width: 100%;
    left: 0;
    right: 0;
  }
}
</style>
