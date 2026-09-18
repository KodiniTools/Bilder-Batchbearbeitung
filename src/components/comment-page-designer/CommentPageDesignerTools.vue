<template>
  <div class="tool-section">
    <h3>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      >
        <path d="M12 19l7-7 3 3-7 7-3-3z"></path>
        <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"></path>
        <path d="M2 2l7.586 7.586"></path>
      </svg>
      {{ t('commentPageDesigner.tools.title') }}
    </h3>

    <!-- Add Text Button -->
    <button class="tool-btn" :disabled="limitReached" @click="emit('add-text')">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      >
        <polyline points="4 7 4 4 20 4 20 7"></polyline>
        <line x1="9" y1="20" x2="15" y2="20"></line>
        <line x1="12" y1="4" x2="12" y2="20"></line>
      </svg>
      {{ t('commentPageDesigner.tools.addText') }}
    </button>

    <!-- Add Image Button -->
    <button class="tool-btn" :disabled="limitReached" @click="emit('add-image')">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      >
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
        <circle cx="8.5" cy="8.5" r="1.5"></circle>
        <polyline points="21 15 16 10 5 21"></polyline>
      </svg>
      {{ t('commentPageDesigner.tools.addImage') }}
    </button>

    <!-- Clear Current Page Button -->
    <button v-if="elementCount > 0" class="tool-btn danger" @click="emit('clear-page')">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
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
      {{ t('commentPageDesigner.tools.clearPage') }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const props = withDefaults(
  defineProps<{
    /** Anzahl Elemente auf der aktuellen Seite */
    elementCount: number
    /** Ab dieser Anzahl sind "Text/Bild hinzufügen" gesperrt */
    maxElements?: number
  }>(),
  { maxElements: 20 }
)

const emit = defineEmits<{
  'add-text': []
  'add-image': []
  'clear-page': []
}>()

const limitReached = computed(() => props.elementCount >= props.maxElements)
</script>

<style scoped>
.tool-section {
  background: var(--bg);
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 1px 3px var(--shadow-color);
  border: 1px solid var(--border-color);
}

.tool-section h3 {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
  margin: 0 0 12px 0;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--border-color);
}

.tool-btn {
  width: 100%;
  padding: 10px 16px;
  border: 1px solid var(--border-color);
  background: var(--bg);
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  color: var(--text);
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.tool-btn:hover:not(:disabled) {
  background: var(--panel);
  border-color: var(--accent);
  color: var(--accent);
}

.tool-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.tool-btn.danger {
  background: color-mix(in oklab, var(--red) 15%, var(--bg));
  border-color: color-mix(in oklab, var(--red) 40%, var(--border-color));
  color: var(--red);
}

.tool-btn.danger:hover:not(:disabled) {
  background: color-mix(in oklab, var(--red) 25%, var(--bg));
  border-color: var(--red);
}
</style>
