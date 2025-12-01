<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="isOpen" class="modal-overlay" @click.self="$emit('close')">
        <div class="modal-content">
          <div class="modal-header">
            <h2>{{ t('bulkRename.title') }}</h2>
            <button class="close-btn" @click="$emit('close')" :title="t('bulkRename.close')">×</button>
          </div>

          <div class="modal-body">
            <!-- Basisname -->
            <div class="setting-group">
              <label for="baseName">{{ t('bulkRename.baseName.label') }}</label>
              <input
                id="baseName"
                type="text"
                v-model="baseName"
                :placeholder="t('bulkRename.baseName.placeholder')"
                @keydown.enter="handleConfirm"
                autofocus
              >
              <p class="setting-hint">{{ t('bulkRename.baseName.hint') }}</p>
            </div>

            <!-- Startnummer -->
            <div class="setting-group">
              <label for="startNumber">{{ t('bulkRename.startNumber.label') }}</label>
              <input
                id="startNumber"
                type="number"
                v-model.number="startNumber"
                min="0"
                :placeholder="t('bulkRename.startNumber.placeholder')"
                @keydown.enter="handleConfirm"
              >
              <p class="setting-hint">{{ t('bulkRename.startNumber.hint') }}</p>
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
            <button
              class="btn-primary"
              @click="handleConfirm"
              :disabled="!isValid"
            >
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
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useImageStore } from '@/stores/imageStore'
import { ImageProcessor } from '@/lib/core/image-processor'

const { t } = useI18n()
const imageStore = useImageStore()

interface Props {
  isOpen: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  close: []
  confirm: [baseName: string, startNumber: number]
}>()

// Form state
const baseName = ref('Bild')
const startNumber = ref(1)
const maxPreviewItems = 5

// Computed
const selectedCount = computed(() => imageStore.selectedCount)

const isValid = computed(() => {
  return baseName.value.trim().length > 0 && startNumber.value >= 0
})

const previewNames = computed(() => {
  const selected = imageStore.images.filter(img => img.selected)
  const safeBase = ImageProcessor.safeBaseName(baseName.value) || 'Bild'

  return selected.slice(0, maxPreviewItems).map((img, index) => {
    const number = startNumber.value + index
    const extension = img.file.name.split('.').pop() || 'jpg'
    return {
      old: img.outputName || img.file.name.replace(/\.[^.]+$/, ''),
      new: `${safeBase}_${number}.${extension}`
    }
  })
})

// Reset form when modal opens
watch(() => props.isOpen, (isOpen) => {
  if (isOpen) {
    baseName.value = 'Bild'
    startNumber.value = 1
  }
})

function handleConfirm() {
  if (!isValid.value) return
  emit('confirm', baseName.value.trim(), startNumber.value)
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
  backdrop-filter: blur(4px);
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
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
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

.setting-group input[type="text"],
.setting-group input[type="number"] {
  width: 100%;
  padding: var(--space-3);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  background: var(--panel);
  color: var(--text);
  font-size: 0.95rem;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.setting-group input[type="text"]:focus,
.setting-group input[type="number"]:focus {
  outline: none;
  border-color: var(--accent);
  box-shadow: 0 0 0 3px color-mix(in oklab, var(--accent) 20%, transparent);
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
  background: linear-gradient(135deg, var(--accent), var(--accent-hover));
  color: var(--accent-text);
  font-weight: 600;
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px color-mix(in oklab, var(--accent) 40%, transparent);
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
  transition: opacity 0.3s, transform 0.3s;
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

  .old-name, .new-name {
    flex: 0 0 100%;
  }

  .preview-list li i.fa-arrow-right {
    display: none;
  }
}
</style>
