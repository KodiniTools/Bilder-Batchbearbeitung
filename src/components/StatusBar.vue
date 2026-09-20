<script setup lang="ts">
import { ref, computed } from 'vue'
import { useImageStore } from '@/stores/imageStore'
import { useI18n } from 'vue-i18n'
import { useToast } from '@/composables/useToast'

const imageStore = useImageStore()
const { t } = useI18n()
const toast = useToast()

const hasSelection = computed(() => imageStore.hasSelection)

// Dropdown für Seitenverhältnis
const isAspectRatioDropdownOpen = ref(false)

// Dropdown für PDF-Export
const isPdfDropdownOpen = ref(false)

const togglePdfDropdown = () => {
  isPdfDropdownOpen.value = !isPdfDropdownOpen.value
}

const closePdfDropdown = () => {
  isPdfDropdownOpen.value = false
}

const emit = defineEmits<{
  'export-pdf': ['all' | 'selected']
  'export-zip': []
  'export-svg': []
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

/** Dropdown-Eintrag: Export auslösen und Menü schließen */
const selectPdfExport = (mode: 'all' | 'selected') => {
  handleExportPdf(mode)
  closePdfDropdown()
}

const handleExportZip = () => {
  emit('export-zip')
}

const handleExportSvg = () => {
  emit('export-svg')
}

const handleSaveImages = () => {
  emit('save-images')
}

// Batch-Transformationen
const handleRotateLeft = async () => {
  await imageStore.rotateSelectedImages(-90)
  toast.success(t('toast.rotated', { count: imageStore.selectedCount }))
}

const handleRotateRight = async () => {
  await imageStore.rotateSelectedImages(90)
  toast.success(t('toast.rotated', { count: imageStore.selectedCount }))
}

const handleFlipH = async () => {
  await imageStore.flipSelectedImages('horizontal')
  toast.success(t('toast.flipped', { count: imageStore.selectedCount }))
}

const handleFlipV = async () => {
  await imageStore.flipSelectedImages('vertical')
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

const handleCropToAspectRatio = async (ratio: number) => {
  await imageStore.cropSelectedImagesToAspectRatio(ratio)
  toast.success(t('toast.cropped', { count: imageStore.selectedCount }))
  closeAspectRatioDropdown()
}

// Rückgängig-Funktion
const handleReset = () => {
  imageStore.resetSelectedImages()
  toast.success(t('toast.reset', { count: imageStore.selectedCount }))
}

// Globale Undo/Redo-Funktion
const handleUndo = () => {
  imageStore.undo()
}

const handleRedo = () => {
  imageStore.redo()
}
</script>

<template>
  <div class="status-bar">
    <div class="status-bar__row" role="toolbar" :aria-label="t('statusBar.ariaLabel')">
      <!-- Status: Anzahl Bilder / Auswahl -->
      <div class="status-pill" :class="{ 'has-selection': hasSelection }">
        <span class="status-pill__item">
          <i class="fa-solid fa-images"></i>
          <strong>{{ imageStore.imageCount }}</strong>
          <span class="status-pill__text">{{ t('statusBar.images') }}</span>
        </span>
        <span class="status-pill__sep"></span>
        <span class="status-pill__item status-pill__item--selected">
          <i class="fa-solid fa-check-double"></i>
          <strong>{{ imageStore.selectedCount }}</strong>
          <span class="status-pill__text">{{ t('statusBar.selected') }}</span>
        </span>
      </div>

      <!-- Auswahl -->
      <div class="tool-group">
        <span class="tool-group__label">{{ t('statusBar.groups.selection') }}</span>
        <div class="tool-group__buttons">
          <button
            class="tool-btn"
            type="button"
            :title="t('statusBar.tooltips.selectAll')"
            @click="handleSelectAll"
          >
            <i class="fa-solid fa-border-all"></i>
          </button>
          <button
            class="tool-btn tool-btn--accent"
            type="button"
            :class="{ 'is-ready': hasSelection }"
            :disabled="!hasSelection"
            :title="t('statusBar.tooltips.batchEdit')"
            @click="emit('batch-edit')"
          >
            <i class="fa-solid fa-sliders"></i>
          </button>
          <button
            class="tool-btn tool-btn--danger"
            type="button"
            :disabled="!hasSelection"
            :title="t('statusBar.tooltips.deleteSelected')"
            @click="handleDelete"
          >
            <i class="fa-solid fa-trash-can"></i>
          </button>
        </div>
      </div>

      <!-- Verlauf -->
      <div class="tool-group">
        <span class="tool-group__label">{{ t('statusBar.groups.history') }}</span>
        <div class="tool-group__buttons">
          <button
            class="tool-btn"
            type="button"
            :disabled="!imageStore.canUndo"
            :title="t('statusBar.tooltips.undo')"
            @click="handleUndo"
          >
            <i class="fa-solid fa-arrow-rotate-left"></i>
          </button>
          <button
            class="tool-btn"
            type="button"
            :disabled="!imageStore.canRedo"
            :title="t('statusBar.tooltips.redo')"
            @click="handleRedo"
          >
            <i class="fa-solid fa-arrow-rotate-right"></i>
          </button>
        </div>
      </div>

      <!-- Ansicht -->
      <div class="tool-group">
        <span class="tool-group__label">{{ t('statusBar.groups.view') }}</span>
        <div class="tool-group__buttons" role="group" :aria-label="t('statusBar.gridSize.label')">
          <button
            class="tool-btn"
            type="button"
            :class="{ active: imageStore.gridSize === 'small' }"
            :title="t('statusBar.gridSize.small')"
            :aria-pressed="imageStore.gridSize === 'small'"
            @click="imageStore.setGridSize('small')"
          >
            <i class="fa-solid fa-table-cells"></i>
          </button>
          <button
            class="tool-btn"
            type="button"
            :class="{ active: imageStore.gridSize === 'medium' }"
            :title="t('statusBar.gridSize.medium')"
            :aria-pressed="imageStore.gridSize === 'medium'"
            @click="imageStore.setGridSize('medium')"
          >
            <i class="fa-solid fa-table-cells-large"></i>
          </button>
          <button
            class="tool-btn"
            type="button"
            :class="{ active: imageStore.gridSize === 'large' }"
            :title="t('statusBar.gridSize.large')"
            :aria-pressed="imageStore.gridSize === 'large'"
            @click="imageStore.setGridSize('large')"
          >
            <i class="fa-solid fa-square"></i>
          </button>
        </div>
      </div>

      <!-- Bearbeiten (nur mit Auswahl aktiv; bleibt sichtbar, damit das Layout nicht springt) -->
      <div class="tool-group" :class="{ 'is-inactive': !hasSelection }">
        <span class="tool-group__label">{{ t('statusBar.groups.edit') }}</span>
        <div class="tool-group__buttons">
          <button
            class="tool-btn"
            type="button"
            :disabled="!hasSelection"
            :title="t('statusBar.tooltips.rotateLeft')"
            @click="handleRotateLeft"
          >
            <i class="fa-solid fa-rotate-left"></i>
          </button>
          <button
            class="tool-btn"
            type="button"
            :disabled="!hasSelection"
            :title="t('statusBar.tooltips.rotateRight')"
            @click="handleRotateRight"
          >
            <i class="fa-solid fa-rotate-right"></i>
          </button>
          <span class="tool-group__sep"></span>
          <button
            class="tool-btn"
            type="button"
            :disabled="!hasSelection"
            :title="t('statusBar.tooltips.flipH')"
            @click="handleFlipH"
          >
            <i class="fa-solid fa-arrows-left-right"></i>
          </button>
          <button
            class="tool-btn"
            type="button"
            :disabled="!hasSelection"
            :title="t('statusBar.tooltips.flipV')"
            @click="handleFlipV"
          >
            <i class="fa-solid fa-arrows-up-down"></i>
          </button>
          <span class="tool-group__sep"></span>

          <!-- Seitenverhältnis -->
          <div class="dropdown-wrapper">
            <button
              class="tool-btn tool-btn--menu"
              type="button"
              :class="{ active: isAspectRatioDropdownOpen }"
              :disabled="!hasSelection"
              :title="t('statusBar.tooltips.aspectRatio')"
              :aria-expanded="isAspectRatioDropdownOpen"
              @click="toggleAspectRatioDropdown"
            >
              <i class="fa-solid fa-crop"></i>
              <i class="fa-solid fa-chevron-down tool-btn__chevron"></i>
            </button>
            <div
              v-if="isAspectRatioDropdownOpen"
              class="dropdown-menu"
              @mouseleave="closeAspectRatioDropdown"
            >
              <button class="dropdown-item" type="button" @click="handleCropToAspectRatio(1)">
                <i class="fa-solid fa-square"></i>
                <span>1:1</span>
              </button>
              <button class="dropdown-item" type="button" @click="handleCropToAspectRatio(16 / 9)">
                <i class="fa-solid fa-tv"></i>
                <span>16:9</span>
              </button>
              <button class="dropdown-item" type="button" @click="handleCropToAspectRatio(2 / 3)">
                <i class="fa-solid fa-mobile-screen"></i>
                <span>2:3</span>
              </button>
            </div>
          </div>

          <button
            class="tool-btn"
            type="button"
            :disabled="!hasSelection"
            :title="t('statusBar.tooltips.bulkRename')"
            @click="handleBulkRename"
          >
            <i class="fa-solid fa-pen"></i>
          </button>
          <span class="tool-group__sep"></span>
          <button
            class="tool-btn tool-btn--danger"
            type="button"
            :disabled="!hasSelection"
            :title="t('statusBar.tooltips.reset')"
            @click="handleReset"
          >
            <i class="fa-solid fa-eraser"></i>
          </button>
        </div>
      </div>

      <!-- Export -->
      <div class="tool-group tool-group--export">
        <span class="tool-group__label">{{ t('statusBar.groups.export') }}</span>
        <div class="tool-group__buttons">
          <!-- PDF mit Auswahlmenü -->
          <div class="dropdown-wrapper">
            <button
              class="tool-btn tool-btn--menu"
              type="button"
              :class="{ active: isPdfDropdownOpen }"
              :title="t('statusBar.tooltips.exportAllPdf')"
              :aria-expanded="isPdfDropdownOpen"
              @click="togglePdfDropdown"
            >
              <i class="fa-solid fa-file-pdf"></i>
              <i class="fa-solid fa-chevron-down tool-btn__chevron"></i>
            </button>
            <div
              v-if="isPdfDropdownOpen"
              class="dropdown-menu dropdown-menu--right"
              @mouseleave="closePdfDropdown"
            >
              <button class="dropdown-item" type="button" @click="selectPdfExport('all')">
                <i class="fa-solid fa-images"></i>
                <span>{{ t('statusBar.tooltips.exportAllPdf') }}</span>
              </button>
              <button
                class="dropdown-item"
                type="button"
                :disabled="!hasSelection"
                @click="selectPdfExport('selected')"
              >
                <i class="fa-solid fa-check-double"></i>
                <span>{{ t('statusBar.tooltips.exportSelectedPdf') }}</span>
              </button>
            </div>
          </div>

          <button
            class="tool-btn"
            type="button"
            :title="t('statusBar.tooltips.downloadZip')"
            @click="handleExportZip"
          >
            <i class="fa-solid fa-file-zipper"></i>
          </button>

          <button
            class="tool-btn"
            type="button"
            :title="t('statusBar.tooltips.exportSvg')"
            @click="handleExportSvg"
          >
            <i class="fa-solid fa-bezier-curve"></i>
          </button>

          <button
            class="tool-btn tool-btn--primary"
            type="button"
            :disabled="!hasSelection"
            :title="t('statusBar.tooltips.saveSelected')"
            @click="handleSaveImages"
          >
            <i class="fa-solid fa-download"></i>
            <span class="tool-btn__text">{{ t('statusBar.buttons.save') }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.status-bar {
  padding: var(--space-3) var(--space-4);
  margin: var(--space-4) 0;
  background: var(--glass-bg);
  backdrop-filter: blur(20px);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-xl);
  box-shadow: var(--surface-elevation);
  position: relative;
  z-index: 10;
  container-type: inline-size;
}

.status-bar__row {
  display: flex;
  align-items: flex-end;
  flex-wrap: wrap;
  gap: var(--space-3) var(--space-4);
}

.tool-group--export {
  margin-left: auto;
}

/* Status-Pill */
.status-pill {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  height: 38px;
  padding: 0 var(--space-3);
  border-radius: 999px;
  background: color-mix(in oklab, var(--accent) 8%, transparent);
  border: 1px solid color-mix(in oklab, var(--accent) 18%, transparent);
  font-size: 0.82rem;
  color: var(--text);
  white-space: nowrap;
  transition: all 0.2s var(--ease-smooth);
}

.status-pill__item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.status-pill__item i {
  font-size: 0.8rem;
  color: var(--accent);
}

.status-pill__item strong {
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.status-pill__text {
  color: var(--muted);
  font-weight: 500;
}

.status-pill__sep {
  width: 1px;
  height: 16px;
  background: color-mix(in oklab, var(--accent) 25%, transparent);
}

.status-pill__item--selected {
  opacity: 0.6;
}

.status-pill.has-selection .status-pill__item--selected {
  opacity: 1;
}

.status-pill.has-selection .status-pill__item--selected i {
  color: var(--green);
}

/* Werkzeuggruppe: Label + segmentierte Buttonleiste */
.tool-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
  transition: opacity 0.2s var(--ease-smooth);
}

.tool-group.is-inactive {
  opacity: 0.55;
}

.tool-group__label {
  padding-left: 2px;
  font-size: 0.62rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--muted);
  line-height: 1;
  user-select: none;
}

.tool-group__buttons {
  display: flex;
  align-items: center;
  gap: 2px;
  height: 38px;
  padding: 3px;
  border-radius: var(--radius-md);
  background: color-mix(in oklab, var(--bg) 70%, var(--panel));
  border: 1px solid var(--border-color);
}

.tool-group__sep {
  width: 1px;
  height: 18px;
  margin: 0 2px;
  background: var(--border-color);
}

/* Einheitlicher Werkzeug-Button */
.tool-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 30px;
  min-width: 32px;
  padding: 0 7px;
  border: none;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--text);
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s var(--ease-smooth);
}

.tool-btn i {
  font-size: 0.85rem;
}

.tool-btn:hover:not(:disabled) {
  background: var(--panel);
  color: var(--accent);
  box-shadow: 0 1px 4px color-mix(in oklab, var(--shadow-color) 40%, transparent);
}

.tool-btn:active:not(:disabled) {
  transform: translateY(1px);
}

.tool-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.tool-btn.active {
  background: var(--panel);
  color: var(--accent);
  box-shadow: 0 1px 4px color-mix(in oklab, var(--shadow-color) 40%, transparent);
}

.tool-btn--menu {
  padding-right: 5px;
}

.tool-btn__chevron {
  font-size: 0.55rem !important;
  opacity: 0.7;
  transition: transform 0.2s var(--ease-smooth);
}

.tool-btn.active .tool-btn__chevron {
  transform: rotate(180deg);
}

.tool-btn--danger:hover:not(:disabled) {
  color: var(--red);
}

/* Stapelbearbeitung: hervorgehoben, sobald eine Auswahl vorliegt */
.tool-btn--accent.is-ready {
  background: color-mix(in oklab, var(--green) 14%, transparent);
  color: var(--green);
}

.tool-btn--accent.is-ready:hover:not(:disabled) {
  background: color-mix(in oklab, var(--green) 22%, transparent);
  color: var(--green);
}

/* Primäre Aktion mit Text */
.tool-btn--primary {
  padding: 0 12px;
  margin-left: 2px;
  background: linear-gradient(135deg, var(--accent), var(--accent-hover));
  color: var(--accent-text);
  box-shadow: 0 2px 8px color-mix(in oklab, var(--accent) 30%, transparent);
}

.tool-btn--primary:hover:not(:disabled) {
  background: linear-gradient(135deg, var(--accent-hover), var(--accent));
  color: var(--accent-text);
  box-shadow: 0 4px 14px color-mix(in oklab, var(--accent) 40%, transparent);
}

.tool-btn__text {
  font-size: 0.8rem;
  font-weight: 600;
  white-space: nowrap;
}

/* Dropdown */
.dropdown-wrapper {
  position: relative;
}

.dropdown-menu {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  min-width: 160px;
  padding: 4px;
  background: var(--panel);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  box-shadow: var(--surface-elevation);
  z-index: 100;
  animation: dropdown-appear 0.18s var(--ease-smooth);
}

.dropdown-menu--right {
  left: auto;
  right: 0;
}

@keyframes dropdown-appear {
  from {
    opacity: 0;
    transform: translateY(-6px);
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
  padding: 9px 12px;
  border: none;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--text);
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  text-align: left;
  white-space: nowrap;
  transition: all 0.15s var(--ease-smooth);
}

.dropdown-item:hover:not(:disabled) {
  background: color-mix(in oklab, var(--accent) 12%, transparent);
  color: var(--accent);
}

.dropdown-item:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.dropdown-item i {
  width: 18px;
  font-size: 0.9rem;
  text-align: center;
  color: var(--muted);
}

.dropdown-item:hover:not(:disabled) i {
  color: var(--accent);
}

/* Responsive: Beschriftungen stufenweise einklappen, bevor umgebrochen wird */
@container (max-width: 1180px) {
  .status-pill__text {
    display: none;
  }
}

@container (max-width: 1000px) {
  .status-bar__row {
    column-gap: var(--space-2);
  }

  .tool-btn__text {
    display: none;
  }

  .tool-btn--primary {
    padding: 0 8px;
  }
}

@media (max-width: 768px) {
  .status-bar {
    padding: var(--space-2) var(--space-3);
  }

  .status-bar__row {
    gap: var(--space-2) var(--space-3);
  }

  .tool-group__label {
    display: none;
  }

  .tool-group--export {
    margin-left: 0;
  }
}
</style>
