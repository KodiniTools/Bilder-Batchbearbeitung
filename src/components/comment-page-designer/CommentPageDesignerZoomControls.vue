<template>
  <div class="zoom-controls">
    <button
      :disabled="zoomLevel <= minZoom"
      :title="t('commentPageDesigner.zoom.zoomOut')"
      @click="emit('zoom-out')"
    >
      −
    </button>
    <span>{{ Math.round(zoomLevel * 100) }}%</span>
    <button
      :disabled="zoomLevel >= maxZoom"
      :title="t('commentPageDesigner.zoom.zoomIn')"
      @click="emit('zoom-in')"
    >
      +
    </button>
    <button :title="t('commentPageDesigner.zoom.reset')" @click="emit('reset')">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      >
        <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"></path>
        <path d="M21 3v5h-5"></path>
        <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"></path>
        <path d="M3 21v-5h5"></path>
      </svg>
    </button>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

withDefaults(
  defineProps<{
    zoomLevel: number
    minZoom?: number
    maxZoom?: number
  }>(),
  { minZoom: 0.25, maxZoom: 2 }
)

const emit = defineEmits<{
  'zoom-in': []
  'zoom-out': []
  reset: []
}>()
</script>

<style scoped>
.zoom-controls {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px;
  background: var(--panel);
  border-bottom: 1px solid var(--border-color);
}

.zoom-controls button {
  width: 32px;
  height: 32px;
  border: 1px solid var(--border-color);
  background: var(--bg);
  color: var(--text);
  border-radius: 6px;
  cursor: pointer;
  font-size: 18px;
  font-weight: 500;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.zoom-controls button:hover:not(:disabled) {
  background: var(--panel);
  border-color: var(--accent);
}

.zoom-controls button:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.zoom-controls span {
  font-size: 13px;
  font-weight: 500;
  color: var(--text);
  min-width: 50px;
  text-align: center;
}
</style>
