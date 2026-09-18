<template>
  <div class="page-toolbar">
    <div class="page-toolbar-left">
      <button
        :disabled="currentPageIndex === 0"
        class="ptb-btn"
        :title="t('commentPageDesigner.pageManagement.previousPage')"
        @click="emit('previous')"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <polyline points="15 18 9 12 15 6"></polyline>
        </svg>
      </button>

      <div class="ptb-thumbs">
        <button
          v-for="(page, index) in pages"
          :key="page.id"
          :class="['ptb-thumb', { active: index === currentPageIndex }]"
          :title="t('commentPageDesigner.pageManagement.pageTitle', { number: index + 1 })"
          @click="emit('go-to-page', index)"
        >
          {{ index + 1 }}
        </button>
      </div>

      <button
        :disabled="currentPageIndex === pages.length - 1"
        class="ptb-btn"
        :title="t('commentPageDesigner.pageManagement.nextPage')"
        @click="emit('next')"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <polyline points="9 18 15 12 9 6"></polyline>
        </svg>
      </button>

      <span class="ptb-info">
        {{
          t('commentPageDesigner.pageManagement.pageOf', {
            current: currentPageIndex + 1,
            total: pages.length,
          })
        }}
        <span class="ptb-elem-count">
          ·
          {{
            t(
              'commentPageDesigner.pageManagement.elementCount',
              { count: elementCount },
              elementCount
            )
          }}
        </span>
      </span>
    </div>

    <div class="page-toolbar-right">
      <button
        class="ptb-action primary"
        :title="t('commentPageDesigner.pageManagement.addPageTooltip')"
        @click="emit('add-page')"
      >
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
          <line x1="12" y1="18" x2="12" y2="12"></line>
          <line x1="9" y1="15" x2="15" y2="15"></line>
        </svg>
        {{ t('commentPageDesigner.pageManagement.addPageButton') }}
      </button>

      <button
        class="ptb-action danger"
        :disabled="pages.length === 1"
        :title="t('commentPageDesigner.pageManagement.deletePageTooltip')"
        @click="emit('delete-page')"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <polyline points="3 6 5 6 21 6"></polyline>
          <path
            d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
          ></path>
        </svg>
        {{ t('commentPageDesigner.pageManagement.deletePageButton') }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { CommentPage } from '@/composables/useCommentPages'

const { t } = useI18n()

defineProps<{
  pages: CommentPage[]
  currentPageIndex: number
  /** Anzahl Elemente auf der aktuellen Seite */
  elementCount: number
}>()

const emit = defineEmits<{
  previous: []
  next: []
  'go-to-page': [index: number]
  'add-page': []
  'delete-page': []
}>()
</script>

<style scoped>
.page-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 14px;
  background: var(--panel);
  border-bottom: 1px solid var(--border-color);
  flex-shrink: 0;
}

.page-toolbar-left {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
  min-width: 0;
}

.page-toolbar-right {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.ptb-btn {
  width: 30px;
  height: 30px;
  border: 1px solid var(--border-color);
  background: var(--bg);
  color: var(--text);
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  flex-shrink: 0;
}

.ptb-btn:hover:not(:disabled) {
  background: var(--accent);
  color: var(--accent-text);
  border-color: var(--accent);
}

.ptb-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.ptb-thumbs {
  display: flex;
  gap: 4px;
  overflow-x: auto;
  padding: 2px;
  flex-shrink: 1;
  min-width: 0;
}

.ptb-thumb {
  min-width: 28px;
  height: 28px;
  padding: 0 6px;
  border: 1px solid var(--border-color);
  background: var(--bg);
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 500;
  color: var(--muted);
  transition: all 0.2s;
  flex-shrink: 0;
}

.ptb-thumb:hover {
  border-color: var(--accent);
  color: var(--accent);
}

.ptb-thumb.active {
  background: linear-gradient(135deg, var(--accent) 0%, var(--accent-hover) 100%);
  color: var(--accent-text);
  border-color: transparent;
  font-weight: 600;
}

.ptb-info {
  font-size: 12px;
  font-weight: 600;
  color: var(--text);
  white-space: nowrap;
  padding-left: 4px;
}

.ptb-elem-count {
  font-weight: 400;
  color: var(--muted);
}

.ptb-action {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  height: 30px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  border: 1px solid var(--border-color);
  background: var(--bg);
  color: var(--text);
  transition: all 0.2s;
  white-space: nowrap;
}

.ptb-action:hover:not(:disabled) {
  border-color: var(--accent);
  color: var(--accent);
}

.ptb-action.primary {
  background: linear-gradient(135deg, var(--accent) 0%, var(--accent-hover) 100%);
  color: var(--accent-text);
  border-color: transparent;
}

.ptb-action.primary:hover:not(:disabled) {
  opacity: 0.9;
  color: var(--accent-text);
}

.ptb-action.danger {
  border-color: var(--red, #e53e3e);
  color: var(--red, #e53e3e);
}

.ptb-action.danger:hover:not(:disabled) {
  background: var(--red, #e53e3e);
  color: white;
}

.ptb-action:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

@media (max-width: 768px) {
  .ptb-thumbs {
    max-width: 150px;
  }
}

@media (max-width: 480px) {
  .ptb-thumbs {
    max-width: 100px;
  }
}
</style>
