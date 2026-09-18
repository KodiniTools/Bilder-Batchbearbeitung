<template>
  <div class="modal-header">
    <h2>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      >
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
      </svg>
      {{ t('commentPageDesigner.title') }}
    </h2>

    <!-- Orientation Badge -->
    <div class="orientation-badge" :class="orientation">
      {{ orientation === 'landscape' ? '⬛ Querformat' : '▯ Hochformat' }}
    </div>

    <!-- Page Counter Badge -->
    <div class="page-badge">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      >
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
      </svg>
      {{ pageCount }}
      {{
        pageCount === 1
          ? t('commentPageDesigner.page.singular')
          : t('commentPageDesigner.page.plural')
      }}
    </div>

    <button class="close-btn" :title="t('commentPageDesigner.close')" @click="emit('close')">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      >
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
      </svg>
    </button>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

defineProps<{
  orientation: 'portrait' | 'landscape'
  pageCount: number
}>()

const emit = defineEmits<{
  close: []
}>()
</script>

<style scoped>
.modal-header {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px 24px;
  border-bottom: 1px solid var(--border-color);
  background: linear-gradient(135deg, var(--accent) 0%, var(--accent-hover) 100%);
  color: var(--accent-text);
}

.modal-header h2 {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 20px;
  font-weight: 600;
  margin: 0;
  flex: 1;
}

.orientation-badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  background: var(--accent);
  color: white;
  white-space: nowrap;
}

.page-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: color-mix(in oklab, var(--accent-text) 15%, transparent);
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  backdrop-filter: blur(10px);
}

.close-btn {
  width: 36px;
  height: 36px;
  border: none;
  background: color-mix(in oklab, var(--accent-text) 15%, transparent);
  color: var(--accent-text);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn:hover {
  background: color-mix(in oklab, var(--accent-text) 25%, transparent);
  transform: scale(1.05);
}
</style>
