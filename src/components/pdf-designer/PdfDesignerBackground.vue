<template>
  <div class="tool-section">
    <h3>{{ t('commentPageDesigner.background.title') }}</h3>

    <div class="bg-row">
      <label class="bg-color" :title="t('commentPageDesigner.background.color')">
        <input
          type="color"
          :value="colorValue"
          :aria-label="t('commentPageDesigner.background.color')"
          @input="emit('set-color', ($event.target as HTMLInputElement).value)"
        />
        <span>{{ t('commentPageDesigner.background.color') }}</span>
      </label>
      <button type="button" class="bg-btn" @click="fileInput?.click()">
        {{
          background?.type === 'image'
            ? t('commentPageDesigner.background.replaceImage')
            : t('commentPageDesigner.background.image')
        }}
      </button>
    </div>

    <button v-if="background" type="button" class="bg-btn bg-btn--remove" @click="emit('remove')">
      {{ t('commentPageDesigner.background.remove') }}
    </button>

    <input
      ref="fileInput"
      type="file"
      accept="image/*"
      class="visually-hidden"
      tabindex="-1"
      @change="onFile"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { PdfElement } from '@/lib/features/export-pdf'

const { t } = useI18n()

const props = defineProps<{
  /** Aktueller Seitenhintergrund oder null */
  background: PdfElement | null
}>()

const emit = defineEmits<{
  'set-color': [color: string]
  'set-image': [src: string]
  remove: []
}>()

const fileInput = ref<HTMLInputElement | null>(null)

const colorValue = computed(() =>
  props.background?.type === 'shape' && props.background.fillColor
    ? props.background.fillColor
    : '#ffffff'
)

function onFile(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file || !file.type.startsWith('image/')) return
  const reader = new FileReader()
  reader.onload = () => {
    if (typeof reader.result === 'string') emit('set-image', reader.result)
  }
  reader.readAsDataURL(file)
}
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
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
  margin: 0 0 12px 0;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--border-color);
}

.bg-row {
  display: flex;
  gap: 8px;
  align-items: stretch;
}

.bg-color {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
  padding: 6px 8px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  font-size: 13px;
  color: var(--text);
  cursor: pointer;
}

.bg-color input {
  width: 28px;
  height: 24px;
  padding: 0;
  border: none;
  background: none;
  cursor: pointer;
}

.bg-btn {
  flex: 1;
  padding: 8px 10px;
  border: 1px solid var(--border-color);
  background: var(--bg);
  border-radius: 8px;
  font-size: 13px;
  color: var(--text);
  cursor: pointer;
  transition: all 0.2s;
}

.bg-btn:hover {
  background: var(--panel);
  border-color: var(--accent);
  color: var(--accent);
}

.bg-btn--remove {
  width: 100%;
  margin-top: 8px;
  color: var(--red);
}

.bg-btn--remove:hover {
  border-color: var(--red);
  color: var(--red);
}

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
}
</style>
