<script setup lang="ts">
import { useI18n } from 'vue-i18n'

/**
 * Zeile aus beschrifteten Rückgängig-/Wiederholen-Buttons (Muster aus dem
 * Visualizer). Weitere Buttons im gleichen Stil (.btn-history) können über
 * den Default-Slot angehängt werden.
 */
withDefaults(
  defineProps<{
    canUndo?: boolean
    canRedo?: boolean
    /** Tooltip, z. B. mit Tastenkürzel; sonst die Beschriftung */
    undoTitle?: string
    redoTitle?: string
    /** Inhaltsbreite statt gleich breiter Buttons (für Werkzeugleisten) */
    compact?: boolean
  }>(),
  { canUndo: false, canRedo: false, undoTitle: '', redoTitle: '', compact: false }
)

const emit = defineEmits<{
  undo: []
  redo: []
}>()

const { t } = useI18n()
</script>

<template>
  <div class="history-actions" :class="{ 'history-actions--compact': compact }">
    <button
      type="button"
      class="btn-history btn-undo"
      :disabled="!canUndo"
      :title="undoTitle || t('imageEditor.undoRedo.undo')"
      @click="emit('undo')"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M3 7v6h6" />
        <path d="M3 13C5.33 7.5 10 4 16 4a9 9 0 0 1 0 18H8" />
      </svg>
      <span class="btn-history__label">{{ t('imageEditor.undoRedo.undo') }}</span>
    </button>
    <button
      type="button"
      class="btn-history btn-redo"
      :disabled="!canRedo"
      :title="redoTitle || t('imageEditor.undoRedo.redo')"
      @click="emit('redo')"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M21 7v6h-6" />
        <path d="M21 13C18.67 7.5 14 4 8 4a9 9 0 0 0 0 18h8" />
      </svg>
      <span class="btn-history__label">{{ t('imageEditor.undoRedo.redo') }}</span>
    </button>
    <slot />
  </div>
</template>
