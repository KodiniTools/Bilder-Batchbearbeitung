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
  'batch-edit': []
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

// Rückgängig-Funktion
const handleReset = () => {
  imageStore.resetSelectedImages()
  toast.success(t('toast.reset', { count: imageStore.selectedCount }))
}
</script>

<template>
  <div class="status-bar">
    <!-- Stats Section -->
    <div class="toolbar-section stats-section">
      <span class="stat">
        <i class="fa-solid fa-images"></i>
        <strong>{{ imageStore.imageCount }}</strong>
      </span>
      <span class="stat stat-selected" :class="{ 'has-selection': imageStore.hasSelection }">
        <i class="fa-solid fa-check-double"></i>
        <strong>{{ imageStore.selectedCount }}</strong>
      </span>
    </div>

    <div class="toolbar-divider"></div>

    <!-- Selection Actions -->
    <div class="toolbar-section">
      <button
        class="btn btn-icon"
        @click="handleSelectAll"
        :title="t('statusBar.tooltips.selectAll')"
      >
        <i class="fa-solid fa-border-all"></i>
      </button>

      <button
        class="btn btn-icon btn-danger"
        @click="handleDelete"
        :disabled="!imageStore.hasSelection"
        :title="t('statusBar.tooltips.deleteSelected')"
      >
        <i class="fa-solid fa-trash-can"></i>
      </button>
    </div>

    <!-- Transformations Section -->
    <template v-if="imageStore.hasSelection">
      <div class="toolbar-divider"></div>

      <div class="toolbar-section">
        <div class="btn-group">
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
        </div>

        <div class="btn-group">
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

        <!-- Aspect Ratio Dropdown -->
        <div class="dropdown-wrapper">
          <button
            class="btn btn-icon"
            @click="toggleAspectRatioDropdown"
            :title="t('statusBar.tooltips.aspectRatio')"
          >
            <i class="fa-solid fa-crop"></i>
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

        <button
          class="btn btn-icon btn-accent"
          @click="emit('batch-edit')"
          :title="t('statusBar.tooltips.batchEdit')"
        >
          <i class="fa-solid fa-sliders"></i>
        </button>

        <button
          class="btn btn-icon"
          @click="handleReset"
          :title="t('statusBar.tooltips.reset')"
        >
          <i class="fa-solid fa-arrow-rotate-left"></i>
        </button>

        <button
          class="btn btn-icon"
          @click="handleBulkRename"
          :title="t('statusBar.tooltips.bulkRename')"
        >
          <i class="fa-solid fa-pen"></i>
        </button>
      </div>
    </template>

    <div class="header-spacer"></div>

    <!-- Export Section -->
    <div class="toolbar-section export-section">
      <div class="btn-group">
        <button
          class="btn btn-icon"
          @click="handleExportPdf('selected')"
          :disabled="!imageStore.hasSelection"
          :title="t('statusBar.tooltips.exportSelectedPdf')"
        >
          <i class="fa-solid fa-file-pdf"></i>
        </button>
        <button
          class="btn btn-icon"
          @click="handleExportPdf('all')"
          :title="t('statusBar.tooltips.exportAllPdf')"
        >
          <i class="fa-solid fa-file-pdf"></i>
          <i class="fa-solid fa-asterisk btn-badge"></i>
        </button>
      </div>

      <button
        class="btn btn-icon"
        @click="handleExportZip"
        :title="t('statusBar.tooltips.downloadZip')"
      >
        <i class="fa-solid fa-file-zipper"></i>
      </button>

      <button
        class="btn btn-icon btn-primary"
        @click="handleSaveImages"
        :disabled="!imageStore.hasSelection"
        :title="t('statusBar.tooltips.saveSelected')"
      >
        <i class="fa-solid fa-download"></i>
      </button>
    </div>
  </div>
</template>

<style scoped>
.status-bar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  margin: var(--space-4) 0;
  background: var(--glass-bg);
  backdrop-filter: blur(20px);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-xl);
  box-shadow: var(--surface-elevation);
  position: relative;
  z-index: 10;
  overflow: visible;
}

/* Toolbar Sections */
.toolbar-section {
  display: flex;
  align-items: center;
  gap: var(--space-1);
}

.toolbar-divider {
  width: 1px;
  height: 28px;
  background: var(--border-color);
  margin: 0 var(--space-1);
  opacity: 0.5;
}

.header-spacer {
  flex: 1;
  min-width: var(--space-2);
}

/* Stats Section */
.stats-section {
  gap: var(--space-2);
}

.stat {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: var(--radius-md);
  background: color-mix(in oklab, var(--accent) 8%, transparent);
  border: 1px solid color-mix(in oklab, var(--accent) 15%, transparent);
  color: var(--text);
  font-weight: 600;
  font-size: 0.875rem;
  transition: all 0.2s var(--ease-smooth);
}

.stat i {
  font-size: 0.875rem;
  color: var(--accent);
  opacity: 0.8;
}

.stat-selected.has-selection {
  background: color-mix(in oklab, var(--green) 12%, transparent);
  border-color: color-mix(in oklab, var(--green) 25%, transparent);
}

.stat-selected.has-selection i {
  color: var(--green);
}

/* Base Button Styles */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border-radius: var(--radius-md);
  border: 1px solid transparent;
  background: transparent;
  color: var(--text);
  font-weight: 500;
  transition: all 0.15s var(--ease-smooth);
  cursor: pointer;
  position: relative;
}

.btn:hover:not(:disabled) {
  background: var(--btn-hover);
  transform: translateY(-1px);
}

.btn:active:not(:disabled) {
  transform: translateY(0);
}

.btn:disabled {
  opacity: 0.35;
  pointer-events: none;
}

/* Icon Button */
.btn-icon {
  width: 36px;
  height: 36px;
  padding: 0;
  border-radius: var(--radius-md);
  background: var(--btn);
  border: 1px solid var(--border-color);
}

.btn-icon i {
  font-size: 0.9rem;
}

.btn-icon:hover:not(:disabled) {
  background: var(--btn-hover);
  border-color: var(--accent);
  color: var(--accent);
  box-shadow: 0 2px 8px color-mix(in oklab, var(--accent) 15%, transparent);
}

/* Danger Button */
.btn-danger:hover:not(:disabled) {
  background: color-mix(in oklab, var(--red) 15%, transparent);
  border-color: var(--red);
  color: var(--red);
  box-shadow: 0 2px 8px color-mix(in oklab, var(--red) 15%, transparent);
}

/* Accent Button (Batch Edit) */
.btn-accent {
  background: color-mix(in oklab, var(--accent) 12%, transparent);
  border-color: color-mix(in oklab, var(--accent) 30%, transparent);
  color: var(--accent);
}

.btn-accent:hover:not(:disabled) {
  background: color-mix(in oklab, var(--accent) 20%, transparent);
  border-color: var(--accent);
  box-shadow: 0 2px 10px color-mix(in oklab, var(--accent) 25%, transparent);
}

/* Primary Button */
.btn-primary {
  background: linear-gradient(135deg, var(--accent) 0%, color-mix(in oklab, var(--accent) 85%, var(--purple)) 100%);
  color: var(--accent-text);
  border-color: transparent;
  box-shadow: 0 2px 8px color-mix(in oklab, var(--accent) 25%, transparent);
}

.btn-primary:hover:not(:disabled) {
  background: linear-gradient(135deg,
    color-mix(in oklab, var(--accent) 90%, black) 0%,
    color-mix(in oklab, var(--accent) 75%, var(--purple)) 100%);
  box-shadow: 0 4px 16px color-mix(in oklab, var(--accent) 35%, transparent);
  transform: translateY(-2px);
}

/* Button Group */
.btn-group {
  display: flex;
  gap: 2px;
  padding: 3px;
  background: color-mix(in oklab, var(--border-color) 30%, transparent);
  border-radius: var(--radius-md);
  border: 1px solid var(--border-color);
}

.btn-group .btn-icon {
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  border-radius: var(--radius-sm);
}

.btn-group .btn-icon:hover:not(:disabled) {
  background: var(--btn);
  box-shadow: none;
}

/* Badge for "All" PDF button */
.btn-badge {
  position: absolute;
  top: 2px;
  right: 2px;
  font-size: 0.5rem;
  color: var(--accent);
  opacity: 0.8;
}

/* Export Section */
.export-section {
  gap: var(--space-2);
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

/* Mobile Responsive */
@media (max-width: 768px) {
  .status-bar {
    gap: var(--space-2);
    padding: var(--space-2);
  }

  .toolbar-section {
    flex-wrap: wrap;
    justify-content: center;
  }

  .toolbar-divider {
    display: none;
  }

  .header-spacer {
    width: 100%;
    min-height: 0;
    flex-basis: 100%;
  }

  .stats-section {
    width: 100%;
    justify-content: center;
  }

  .export-section {
    width: 100%;
    justify-content: center;
  }

  .btn-icon {
    width: 40px;
    height: 40px;
  }

  .btn-group .btn-icon {
    width: 36px;
    height: 36px;
  }

  .dropdown-menu {
    left: 50%;
    transform: translateX(-50%);
  }
}

@media (max-width: 480px) {
  .status-bar {
    padding: var(--space-2);
    gap: var(--space-2);
  }

  .stat {
    padding: 4px 8px;
    font-size: 0.8rem;
  }

  .btn-icon {
    width: 36px;
    height: 36px;
  }

  .btn-group .btn-icon {
    width: 32px;
    height: 32px;
  }
}
</style>
