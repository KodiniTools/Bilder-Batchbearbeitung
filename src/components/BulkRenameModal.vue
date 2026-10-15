<template>
  <Teleport to="#modal-portal">
    <Transition name="modal">
      <div v-if="isOpen" class="modal-overlay" @click.self="$emit('close')">
        <div class="modal-content">
          <div class="modal-header">
            <div class="modal-title">
              <h2>{{ t('bulkRename.title') }}</h2>
              <span class="modal-title__meta">
                <i class="fa-solid fa-images"></i>
                {{ t('bulkRename.selectedCount', { count: selectedCount }) }}
              </span>
            </div>
            <button class="close-btn" :title="t('bulkRename.close')" @click="$emit('close')">
              ×
            </button>
          </div>

          <div class="modal-body">
            <!-- Basisname -->
            <div class="setting-group">
              <label for="baseName">{{ t('bulkRename.baseName.label') }}</label>
              <input
                id="baseName"
                ref="baseNameInput"
                v-model="baseName"
                type="text"
                :placeholder="t('bulkRename.baseName.placeholder')"
                :aria-invalid="unknownTokens.length > 0"
                aria-describedby="baseName-hint"
                autofocus
                @keydown.enter="handleConfirm"
              />
              <div class="tokens" role="group" :aria-label="t('bulkRename.tokens.label')">
                <button
                  v-for="token in RENAME_PLACEHOLDERS"
                  :key="token"
                  type="button"
                  class="token"
                  :title="t(`bulkRename.tokens.${tokenKey(token)}`)"
                  @click="insertToken(token)"
                >
                  {{ token }}
                </button>
              </div>
              <p v-if="unknownTokens.length" class="setting-hint setting-hint--error" role="alert">
                {{ t('bulkRename.tokens.unknown', { tokens: unknownTokens.join(', ') }) }}
              </p>
              <p id="baseName-hint" class="setting-hint">
                {{ t(templated ? 'bulkRename.tokens.hint' : 'bulkRename.baseName.hint') }}
              </p>
              <p v-if="templated && !usesNumber" class="setting-hint">
                {{ t('bulkRename.tokens.noNumber') }}
              </p>
            </div>

            <!-- Startnummer -->
            <div class="setting-group">
              <label for="startNumber">{{ t('bulkRename.startNumber.label') }}</label>
              <input
                id="startNumber"
                v-model.number="startNumber"
                type="number"
                min="0"
                :placeholder="t('bulkRename.startNumber.placeholder')"
                @keydown.enter="handleConfirm"
              />
              <p class="setting-hint">{{ t('bulkRename.startNumber.hint') }}</p>
            </div>

            <!-- SEO-Optionen -->
            <div class="setting-group">
              <label>{{ t('bulkRename.seo.label') }}</label>
              <div class="seo-options">
                <div class="option-row">
                  <label for="separator" class="option-label">
                    {{ t('bulkRename.seo.separator') }}
                  </label>
                  <select id="separator" v-model="separator" class="option-select">
                    <option value="-">{{ t('bulkRename.seo.hyphen') }} (-)</option>
                    <option value="_">{{ t('bulkRename.seo.underscore') }} (_)</option>
                  </select>
                </div>
                <div class="option-row">
                  <label for="lowercase" class="option-label">
                    {{ t('bulkRename.seo.lowercase') }}
                  </label>
                  <button
                    id="lowercase"
                    type="button"
                    class="toggle-btn"
                    :class="{ active: lowercaseEnabled }"
                    @click="lowercaseEnabled = !lowercaseEnabled"
                  >
                    <span class="toggle-track"><span class="toggle-thumb"></span></span>
                  </button>
                </div>
              </div>
              <p class="setting-hint seo-hint">
                <i class="fa-solid fa-circle-info"></i>
                {{ t('bulkRename.seo.hint') }}
              </p>
            </div>

            <!-- Live-Vorschau -->
            <div class="preview-section">
              <div class="preview-header">
                <i class="fa-solid fa-eye"></i>
                <span>{{ t('bulkRename.preview.title') }}</span>
              </div>
              <ul class="preview-list">
                <li v-for="(preview, index) in previewNames" :key="index">
                  <span class="old-name">{{ preview.old }}</span>
                  <i class="fa-solid fa-arrow-right"></i>
                  <span class="new-name">{{ preview.new }}</span>
                </li>
                <li v-if="selectedCount > maxPreviewItems" class="more-indicator">
                  <i class="fa-solid fa-ellipsis"></i>
                  {{ t('bulkRename.preview.more', { count: selectedCount - maxPreviewItems }) }}
                </li>
              </ul>
            </div>

            <!-- Info -->
            <div class="info-box">
              <i class="fa-solid fa-circle-info"></i>
              <span>{{ t('bulkRename.info', { count: selectedCount }) }}</span>
            </div>
          </div>

          <div class="modal-footer">
            <button class="btn-secondary" @click="$emit('close')">
              {{ t('bulkRename.buttons.cancel') }}
            </button>
            <button class="btn-primary" :disabled="!isValid" @click="handleConfirm">
              <i class="fa-solid fa-pen"></i>
              {{ t('bulkRename.buttons.rename') }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { useImageStore } from '@/stores/imageStore'
import { useRecipeStore } from '@/stores/recipes'
import { defaultRecipeRename } from '@/lib/core/recipes'
import {
  RENAME_PLACEHOLDERS,
  buildRenameNames,
  hasPlaceholders,
  toRenameItem,
  unknownPlaceholders,
} from '@/lib/core/rename-pattern'
import { readExifDate, readSourceExif } from '@/lib/core/exif'

const { t } = useI18n()
const imageStore = useImageStore()
const recipeStore = useRecipeStore()

interface Props {
  isOpen: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  close: []
  confirm: [
    baseName: string,
    startNumber: number,
    separator: string,
    lowercase: boolean,
    exifDates: ReadonlyMap<string, Date | null>,
  ]
}>()

// Form state
const baseName = ref('Bild')
const startNumber = ref(1)
const separator = ref('-')
const lowercaseEnabled = ref(true)
const maxPreviewItems = 5

// Computed
const selectedCount = computed(() => imageStore.selectedCount)

const templated = computed(() => hasPlaceholders(baseName.value))
const unknownTokens = computed(() => unknownPlaceholders(baseName.value))
const usesNumber = computed(() => /\{n(:0+)?\}/.test(baseName.value))

const isValid = computed(() => {
  return (
    baseName.value.trim().length > 0 && startNumber.value >= 0 && unknownTokens.value.length === 0
  )
})

// Aufnahmedaten (EXIF) für {date}; nur geladen, wenn das Muster sie braucht
const exifDates = ref(new Map<string, Date | null>())
let datesRequest = 0

async function loadExifDates() {
  const request = ++datesRequest
  const pending = imageStore.selectedImages.filter((img) => !exifDates.value.has(img.id))
  if (pending.length === 0) return
  const entries = await Promise.all(
    pending.map(async (img) => {
      const tiff = await readSourceExif(img.file)
      return [img.id, tiff ? readExifDate(tiff) : null] as const
    })
  )
  if (request !== datesRequest) return
  exifDates.value = new Map([...exifDates.value, ...entries])
}

watch(
  () => props.isOpen && baseName.value.includes('{date}'),
  (needed) => {
    if (needed) void loadExifDates()
  }
)

const previewNames = computed(() => {
  const selected = imageStore.images.filter((img) => img.selected)
  const names = buildRenameNames(
    baseName.value,
    selected.map((img) => toRenameItem(img, exifDates.value.get(img.id))),
    {
      startNumber: startNumber.value,
      separator: separator.value,
      lowercase: lowercaseEnabled.value,
    }
  )

  return selected.slice(0, maxPreviewItems).map((img, index) => {
    const extension = img.file.name.split('.').pop() || 'jpg'
    return {
      old: img.outputName || img.file.name.replace(/\.[^.]+$/, ''),
      new: `${names[index]}.${extension}`,
    }
  })
})

const baseNameInput = ref<HTMLInputElement | null>(null)

/** Platzhalter an der Cursorposition einfügen */
function insertToken(token: string) {
  const input = baseNameInput.value
  const value = baseName.value
  const start = input?.selectionStart ?? value.length
  const end = input?.selectionEnd ?? value.length
  baseName.value = value.slice(0, start) + token + value.slice(end)
  void nextTick(() => {
    input?.focus()
    input?.setSelectionRange(start + token.length, start + token.length)
  })
}

/** i18n-Schlüssel eines Platzhalters, z. B. „{n:000}“ → „nPadded“ */
function tokenKey(token: string): string {
  return token === '{n:000}' ? 'nPadded' : token.slice(1, -1)
}

// Reset form when modal opens
watch(
  () => props.isOpen,
  (isOpen) => {
    if (isOpen) {
      exifDates.value = new Map()
      // Werte des angewendeten Rezepts, sonst die Standardwerte
      const preset = recipeStore.activeRecipe?.rename ?? defaultRecipeRename
      baseName.value = preset.baseName
      startNumber.value = preset.startNumber
      separator.value = preset.separator
      lowercaseEnabled.value = preset.lowercase
    }
  }
)

function handleConfirm() {
  if (!isValid.value) return
  recipeStore.rememberRename({
    baseName: baseName.value.trim(),
    startNumber: startNumber.value,
    separator: separator.value,
    lowercase: lowercaseEnabled.value,
  })
  emit(
    'confirm',
    baseName.value.trim(),
    startNumber.value,
    separator.value,
    lowercaseEnabled.value,
    exifDates.value
  )
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.modal-content {
  background: var(--bg);
  border-radius: var(--radius-2xl);
  width: 100%;
  max-width: 480px;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: var(--ds-shadow-overlay);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-5);
  border-bottom: 1px solid var(--border-color);
}

.modal-header h2 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text);
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.modal-title {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  min-width: 0;
}

.modal-title__meta {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  font-size: 0.85rem;
  color: var(--muted);
}

.modal-title__meta i {
  color: var(--accent);
}

.close-btn {
  background: none;
  border: none;
  font-size: 2rem;
  line-height: 1;
  color: var(--muted);
  cursor: pointer;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-md);
  transition: all 0.2s;
}

.close-btn:hover {
  background: var(--panel);
  color: var(--text);
}

.modal-body {
  padding: var(--space-5);
  overflow-y: auto;
  flex: 1;
}

.setting-group {
  margin-bottom: var(--space-4);
}

.setting-group label {
  display: block;
  margin-bottom: var(--space-2);
  font-weight: 500;
  color: var(--text);
}

.setting-hint {
  margin: var(--space-2) 0 0 0;
  font-size: 0.8rem;
  color: var(--muted);
  line-height: 1.4;
}

.setting-group input[type='text'],
.setting-group input[type='number'] {
  width: 100%;
  padding: var(--space-3);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  background: var(--panel);
  color: var(--text);
  font-size: 0.95rem;
  transition:
    border-color 0.2s,
    box-shadow 0.2s;
}

.setting-group input[type='text']:focus,
.setting-group input[type='number']:focus {
  outline: none;
  border-color: var(--accent);
  box-shadow: 0 0 0 3px color-mix(in oklab, var(--accent) 20%, transparent);
}

/* SEO Options */
.seo-options {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding: var(--space-3);
  background: var(--panel);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
}

.option-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
}

.option-label {
  font-size: 0.9rem;
  color: var(--text);
  font-weight: 400;
}

.option-select {
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  background: var(--bg);
  color: var(--text);
  font-size: 0.9rem;
  cursor: pointer;
  min-width: 120px;
}

.option-select:focus {
  outline: none;
  border-color: var(--accent);
  box-shadow: 0 0 0 3px color-mix(in oklab, var(--accent) 20%, transparent);
}

.toggle-btn {
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
}

.toggle-track {
  display: block;
  width: 44px;
  height: 24px;
  background: var(--border-color);
  border-radius: 12px;
  position: relative;
  transition: background 0.2s;
}

.toggle-btn.active .toggle-track {
  background: var(--accent);
}

.toggle-thumb {
  display: block;
  width: 20px;
  height: 20px;
  background: white;
  border-radius: 50%;
  position: absolute;
  top: 2px;
  left: 2px;
  transition: transform 0.2s;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

.toggle-btn.active .toggle-thumb {
  transform: translateX(20px);
}

.seo-hint {
  display: flex;
  align-items: flex-start;
  gap: var(--space-2);
}

.seo-hint i {
  color: var(--accent);
  margin-top: 2px;
  flex-shrink: 0;
}

/* Preview Section */
.preview-section {
  margin-top: var(--space-4);
  padding: var(--space-4);
  background: var(--panel);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border-color);
}

.preview-header {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-bottom: var(--space-3);
  font-weight: 600;
  color: var(--text);
}

.preview-header i {
  color: var(--accent);
}

.preview-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.preview-list li {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) 0;
  font-size: 0.85rem;
  border-bottom: 1px solid var(--border-color);
}

.preview-list li:last-child {
  border-bottom: none;
}

.old-name {
  color: var(--muted);
  text-decoration: line-through;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.preview-list li i.fa-arrow-right {
  color: var(--accent);
  font-size: 0.7rem;
  flex-shrink: 0;
}

.new-name {
  color: var(--green);
  font-weight: 500;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.more-indicator {
  color: var(--muted);
  font-style: italic;
  justify-content: center;
  padding-top: var(--space-3) !important;
}

.more-indicator i {
  color: var(--muted) !important;
}

/* Info Box */
.info-box {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-3);
  background: color-mix(in oklab, var(--accent) 10%, transparent);
  border: 1px solid color-mix(in oklab, var(--accent) 25%, transparent);
  border-radius: var(--radius-md);
  color: var(--text);
  font-size: 0.9rem;
  margin-top: var(--space-4);
}

.info-box i {
  flex-shrink: 0;
  color: var(--accent);
}

/* Footer */
.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-3);
  padding: var(--space-5);
  border-top: 1px solid var(--border-color);
}

.btn-secondary,
.btn-primary {
  padding: var(--space-3) var(--space-5);
  border-radius: var(--radius-md);
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: var(--space-2);
  border: none;
}

.btn-secondary {
  background: var(--panel);
  color: var(--text);
  border: 1px solid var(--border-color);
}

.btn-secondary:hover {
  background: var(--bg);
}

.btn-primary {
  background: var(--accent);
  color: var(--accent-text);
  font-weight: 600;
}

.btn-primary:active:not(:disabled) {
  transform: translateY(0);
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Transition */
.modal-enter-active,
.modal-leave-active {
  transition:
    opacity 0.3s,
    transform 0.3s;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
  transform: scale(0.95);
}

@media (max-width: 640px) {
  .modal-content {
    max-width: 100%;
    max-height: 95vh;
  }

  .modal-body {
    padding: var(--space-4);
  }

  .preview-list li {
    flex-wrap: wrap;
  }

  .old-name,
  .new-name {
    flex: 0 0 100%;
  }

  .preview-list li i.fa-arrow-right {
    display: none;
  }
}

@media (max-width: 480px) {
  .modal-content {
    max-height: 100dvh;
    border-radius: 0;
  }

  .modal-body {
    padding: var(--space-3);
  }
}
.tokens {
  display: flex;
  flex-wrap: wrap;
  gap: var(--ds-space-1);
  margin-top: var(--ds-space-2);
}

.token {
  height: var(--ds-control-sm);
  padding: 0 var(--ds-space-2);
  border: var(--ds-border-width) solid var(--ds-border);
  border-radius: var(--ds-radius-sm);
  background: var(--ds-surface-0);
  color: var(--ds-text-2);
  font-family: var(--ds-font-mono);
  font-size: var(--ds-text-xs);
  cursor: pointer;
  transition:
    color var(--ds-duration) var(--ds-ease),
    border-color var(--ds-duration) var(--ds-ease);
}

.token:hover {
  border-color: var(--ds-accent);
  color: var(--ds-accent);
}

.token:focus-visible {
  outline: none;
  box-shadow: var(--ds-focus-ring);
}

.setting-hint--error {
  color: var(--ds-danger);
}
</style>
