<template>
  <div class="arrange-section">
    <h3>
      {{ t('commentPageDesigner.arrange.title') }}
      <span v-if="count > 1" class="arrange-count">
        {{ t('commentPageDesigner.arrange.selected', { count }, count) }}
      </span>
    </h3>

    <p class="arrange-hint">
      {{
        count > 1
          ? t('commentPageDesigner.arrange.relativeToSelection')
          : t('commentPageDesigner.arrange.relativeToPage')
      }}
    </p>

    <div class="arrange-grid">
      <button
        v-for="a in ALIGN_ACTIONS"
        :key="a.mode"
        type="button"
        class="arrange-btn"
        :title="t(`commentPageDesigner.arrange.${a.mode}`)"
        :aria-label="t(`commentPageDesigner.arrange.${a.mode}`)"
        @click="emit('align', a.mode)"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path v-for="(d, i) in a.paths" :key="i" :d="d" />
        </svg>
      </button>
    </div>

    <div class="arrange-row">
      <button
        type="button"
        class="arrange-btn arrange-btn--wide"
        :disabled="count < 3"
        :title="t('commentPageDesigner.arrange.distributeHint')"
        @click="emit('distribute', 'horizontal')"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 4v16M20 4v16" />
          <rect x="9" y="8" width="6" height="8" rx="1" />
        </svg>
        {{ t('commentPageDesigner.arrange.distributeH') }}
      </button>
      <button
        type="button"
        class="arrange-btn arrange-btn--wide"
        :disabled="count < 3"
        :title="t('commentPageDesigner.arrange.distributeHint')"
        @click="emit('distribute', 'vertical')"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 4h16M4 20h16" />
          <rect x="8" y="9" width="8" height="6" rx="1" />
        </svg>
        {{ t('commentPageDesigner.arrange.distributeV') }}
      </button>
    </div>

    <div class="arrange-row">
      <button
        type="button"
        class="arrange-btn arrange-btn--wide"
        :title="t('commentPageDesigner.arrange.duplicateTooltip')"
        @click="emit('duplicate')"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect x="9" y="9" width="11" height="11" rx="2" />
          <path d="M5 15V5a2 2 0 0 1 2-2h8" />
        </svg>
        {{ t('commentPageDesigner.arrange.duplicate') }}
      </button>
      <button
        v-if="count > 1"
        type="button"
        class="arrange-btn arrange-btn--wide arrange-btn--danger"
        @click="emit('delete')"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
        </svg>
        {{ t('commentPageDesigner.arrange.deleteSelected') }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { AlignMode } from '@/lib/designer/arrange'

const { t } = useI18n()

defineProps<{
  /** Anzahl ausgewählter Elemente */
  count: number
}>()

const emit = defineEmits<{
  align: [mode: AlignMode]
  distribute: [axis: 'horizontal' | 'vertical']
  duplicate: []
  delete: []
}>()

const ALIGN_ACTIONS: { mode: AlignMode; paths: string[] }[] = [
  { mode: 'left', paths: ['M4 3v18', 'M8 7h10v4H8z', 'M8 13h6v4H8z'] },
  { mode: 'centerH', paths: ['M12 3v18', 'M6 7h12v4H6z', 'M8 13h8v4H8z'] },
  { mode: 'right', paths: ['M20 3v18', 'M6 7h10v4H6z', 'M10 13h6v4h-6z'] },
  { mode: 'top', paths: ['M3 4h18', 'M7 8h4v10H7z', 'M13 8h4v6h-4z'] },
  { mode: 'middle', paths: ['M3 12h18', 'M7 6h4v12H7z', 'M13 8h4v8h-4z'] },
  { mode: 'bottom', paths: ['M3 20h18', 'M7 6h4v10H7z', 'M13 10h4v6h-4z'] },
]
</script>

<style scoped>
.arrange-section {
  background: var(--bg);
  border-radius: var(--radius-lg);
  padding: var(--space-4);
  box-shadow: 0 1px 3px var(--shadow-color);
  border: 1px solid var(--border-color);
}

.arrange-section h3 {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-2);
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
  margin: 0 0 var(--space-2) 0;
  padding-bottom: var(--space-2);
  border-bottom: 1px solid var(--border-color);
}

.arrange-count {
  font-size: 12px;
  font-weight: 500;
  color: var(--accent);
}

.arrange-hint {
  margin: 0 0 var(--space-2) 0;
  font-size: 11px;
  color: var(--muted);
}

.arrange-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: var(--space-1);
  margin-bottom: var(--space-2);
}

.arrange-row {
  display: flex;
  gap: var(--space-1);
  margin-top: var(--space-1);
}

.arrange-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-1);
  min-height: 32px;
  padding: var(--space-1);
  border: 1px solid var(--border-color);
  background: var(--panel);
  color: var(--text);
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: 12px;
  transition:
    border-color 0.2s,
    color 0.2s;
}

.arrange-btn svg {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.arrange-btn--wide {
  flex: 1;
  padding: var(--space-1) var(--space-2);
}

.arrange-btn:hover:not(:disabled) {
  border-color: var(--accent);
  color: var(--accent);
}

.arrange-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.arrange-btn--danger {
  color: var(--red);
  border-color: color-mix(in oklab, var(--red) 40%, var(--border-color));
}

.arrange-btn--danger:hover:not(:disabled) {
  color: var(--red);
  border-color: var(--red);
}
</style>
