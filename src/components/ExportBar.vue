<script setup lang="ts">
/**
 * Export-Leiste: zeigt die Exportoptionen als Buttons an.
 * Wird nur eingeblendet, solange mindestens ein Bild ausgewählt ist.
 * Die Export-Logik selbst liegt weiterhin in AppPage (Events).
 */
import { useI18n } from 'vue-i18n'
import { useImageStore } from '@/stores/imageStore'

const imageStore = useImageStore()
const { t } = useI18n()

const emit = defineEmits<{
  'export-pdf': ['all' | 'selected']
  'export-zip': []
  'export-svg': []
  'save-images': []
}>()
</script>

<template>
  <Transition name="export-bar">
    <section
      v-if="imageStore.hasSelection"
      class="export-bar"
      role="toolbar"
      :aria-label="t('exportBar.ariaLabel')"
    >
      <div class="export-bar__info">
        <span class="export-bar__title">{{ t('exportBar.title') }}</span>
        <span class="export-bar__count">
          <i class="fa-solid fa-check-double" aria-hidden="true"></i>
          {{ t('exportBar.selectedCount', imageStore.selectedCount) }}
        </span>
      </div>

      <div class="export-bar__actions">
        <button
          class="export-btn"
          type="button"
          :title="t('exportBar.tooltips.pdfSelected')"
          @click="emit('export-pdf', 'selected')"
        >
          <i class="fa-solid fa-file-pdf" aria-hidden="true"></i>
          <span>{{ t('exportBar.buttons.pdfSelected') }}</span>
        </button>
        <button
          class="export-btn"
          type="button"
          :title="t('exportBar.tooltips.pdfAll')"
          @click="emit('export-pdf', 'all')"
        >
          <i class="fa-solid fa-images" aria-hidden="true"></i>
          <span>{{ t('exportBar.buttons.pdfAll') }}</span>
        </button>
        <button
          class="export-btn"
          type="button"
          :title="t('exportBar.tooltips.zip')"
          @click="emit('export-zip')"
        >
          <i class="fa-solid fa-file-zipper" aria-hidden="true"></i>
          <span>{{ t('exportBar.buttons.zip') }}</span>
        </button>
        <button
          class="export-btn"
          type="button"
          :title="t('exportBar.tooltips.svg')"
          @click="emit('export-svg')"
        >
          <i class="fa-solid fa-bezier-curve" aria-hidden="true"></i>
          <span>{{ t('exportBar.buttons.svg') }}</span>
        </button>
        <button
          class="export-btn export-btn--primary"
          type="button"
          :title="t('exportBar.tooltips.save')"
          @click="emit('save-images')"
        >
          <i class="fa-solid fa-download" aria-hidden="true"></i>
          <span>{{ t('exportBar.buttons.save') }}</span>
        </button>
      </div>
    </section>
  </Transition>
</template>

<style scoped>
.export-bar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--ds-space-3) var(--ds-space-4);
  margin: var(--ds-space-4) 0;
  padding: var(--ds-space-3) var(--ds-space-4);
  background: var(--ds-surface-1);
  border: var(--ds-border-width) solid var(--ds-border);
  border-radius: var(--ds-radius-lg);
}

.export-bar__info {
  display: flex;
  flex-direction: column;
  gap: var(--ds-space-1);
  min-width: 0;
}

.export-bar__title {
  font-size: var(--ds-text-xs);
  font-weight: var(--ds-weight-bold);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--ds-text-3);
  line-height: var(--ds-leading-tight);
}

.export-bar__count {
  display: inline-flex;
  align-items: center;
  gap: var(--ds-space-2);
  font-size: var(--ds-text-sm);
  font-weight: var(--ds-weight-medium);
  color: var(--ds-text-2);
  white-space: nowrap;
}

.export-bar__count i {
  color: var(--ds-success);
}

.export-bar__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--ds-space-2);
  margin-left: auto;
}

.export-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--ds-space-2);
  min-height: var(--ds-control-md);
  padding: 0 var(--ds-space-4);
  border: var(--ds-border-width) solid var(--ds-border);
  border-radius: var(--ds-radius-md);
  background: var(--ds-surface-0);
  color: var(--ds-text);
  font-family: inherit;
  font-size: var(--ds-text-sm);
  font-weight: var(--ds-weight-semibold);
  white-space: nowrap;
  cursor: pointer;
  transition:
    color var(--ds-duration) var(--ds-ease),
    border-color var(--ds-duration) var(--ds-ease),
    background-color var(--ds-duration) var(--ds-ease);
}

.export-btn i {
  font-size: var(--ds-text-sm);
  color: var(--ds-accent);
  transition: color var(--ds-duration) var(--ds-ease);
}

.export-btn:hover {
  border-color: var(--ds-accent);
  color: var(--ds-accent);
}

.export-btn:focus-visible {
  outline: none;
  box-shadow: var(--ds-focus-ring);
}

.export-btn--primary {
  border-color: var(--ds-accent);
  background: var(--ds-accent);
  color: var(--ds-on-accent);
}

.export-btn--primary i {
  color: var(--ds-on-accent);
}

.export-btn--primary:hover {
  border-color: var(--ds-accent-hover);
  background: var(--ds-accent-hover);
  color: var(--ds-on-accent);
}

/* Ein-/Ausblenden */
.export-bar-enter-active,
.export-bar-leave-active {
  transition:
    opacity var(--ds-duration) var(--ds-ease),
    transform var(--ds-duration) var(--ds-ease);
}

.export-bar-enter-from,
.export-bar-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

@media (prefers-reduced-motion: reduce) {
  .export-bar-enter-active,
  .export-bar-leave-active {
    transition: none;
  }
}

@media (max-width: 768px) {
  .export-bar {
    padding: var(--ds-space-2) var(--ds-space-3);
  }

  .export-bar__actions {
    margin-left: 0;
    width: 100%;
  }

  .export-btn {
    flex: 1 1 auto;
  }
}
</style>
