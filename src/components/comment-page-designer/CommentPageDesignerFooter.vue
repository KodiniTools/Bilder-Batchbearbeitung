<template>
  <div class="modal-footer">
    <div class="footer-info">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      >
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="16" x2="12" y2="12"></line>
        <line x1="12" y1="8" x2="12.01" y2="8"></line>
      </svg>
      <span>
        {{
          t('commentPageDesigner.footer.info', {
            current: currentPageIndex + 1,
            total: pageCount,
            count: totalElementCount,
          })
        }}
      </span>
    </div>
    <div class="footer-actions">
      <button class="btn-secondary" @click="emit('cancel')">
        {{ t('commentPageDesigner.footer.cancel') }}
      </button>
      <button class="btn-preview" :disabled="totalElementCount === 0" @click="emit('preview')">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
          <circle cx="12" cy="12" r="3"></circle>
        </svg>
        Vorschau
      </button>
      <button class="btn-primary" @click="emit('save')">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
        {{
          t('commentPageDesigner.footer.save', {
            count: totalElementCount,
            elements:
              totalElementCount === 1
                ? t('commentPageDesigner.element.singular')
                : t('commentPageDesigner.element.plural'),
          })
        }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

defineProps<{
  currentPageIndex: number
  pageCount: number
  /** Elemente über alle Seiten */
  totalElementCount: number
}>()

const emit = defineEmits<{
  cancel: []
  preview: []
  save: []
}>()
</script>

<style scoped>
.modal-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  border-top: 1px solid var(--border-color);
  background: var(--panel);
}

.footer-info {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--muted);
}

.footer-info svg {
  color: var(--muted);
}

.footer-actions {
  display: flex;
  gap: 12px;
}

.btn-secondary,
.btn-primary {
  padding: 10px 24px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn-secondary {
  background: var(--bg);
  border: 1px solid var(--border-color);
  color: var(--text);
}

.btn-secondary:hover {
  background: var(--panel);
  border-color: var(--muted);
}

.btn-primary {
  background: linear-gradient(135deg, var(--accent) 0%, var(--accent-hover) 100%);
  border: none;
  color: var(--accent-text);
  font-weight: 600;
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px color-mix(in oklab, var(--accent) 40%, transparent);
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-preview {
  padding: 8px 16px;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 6px;
  border: 1px solid var(--accent);
  background: transparent;
  color: var(--accent);
  font-size: 0.9rem;
}

.btn-preview:hover:not(:disabled) {
  background: color-mix(in oklab, var(--accent) 10%, transparent);
}

.btn-preview:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
</style>
