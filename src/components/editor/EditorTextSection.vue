<template>
  <div class="ctrl-section">
    <div class="ctrl-header">
      <i class="fa-solid fa-font"></i>
      {{ t('imageEditor.sections.text') }}
      <button type="button" class="btn btn-xs btn-primary text-add-btn" @click="emit('add')">
        <i class="fa-solid fa-plus"></i>
        {{ t('imageEditor.text.add') }}
      </button>
    </div>

    <!-- Selected text properties -->
    <template v-if="selectedText">
      <textarea
        class="ctrl-textarea"
        :placeholder="t('imageEditor.text.contentPlaceholder')"
        :value="selectedText.text"
        rows="3"
        @input="emit('update-text', { text: ($event.target as HTMLTextAreaElement).value })"
      ></textarea>

      <div class="ctrl-row">
        <span class="ctrl-sublabel">{{ t('imageEditor.text.fontSize') }}</span>
        <input
          type="number"
          class="size-input"
          min="6"
          max="300"
          :value="selectedText.fontSize"
          @input="emit('update-text', { fontSize: +($event.target as HTMLInputElement).value })"
        />
        <span class="size-unit">px</span>
      </div>

      <div class="ctrl-row">
        <span class="ctrl-sublabel">{{ t('imageEditor.text.fontFamily') }}</span>
        <select
          class="ctrl-select ctrl-select-sm"
          :value="selectedText.fontFamily"
          @change="emit('update-text', { fontFamily: ($event.target as HTMLSelectElement).value })"
        >
          <optgroup v-for="group in fontGroups" :key="group.label" :label="group.label">
            <option
              v-for="f in group.fonts"
              :key="f.value"
              :value="f.value"
              :style="{ fontFamily: f.value }"
            >
              {{ f.label }}
            </option>
          </optgroup>
        </select>
      </div>

      <div class="ctrl-row">
        <span class="ctrl-sublabel">{{ t('imageEditor.text.color') }}</span>
        <input
          type="color"
          class="color-input"
          :value="selectedText.color"
          @input="emit('update-text', { color: ($event.target as HTMLInputElement).value })"
        />
      </div>

      <div class="ctrl-row">
        <span class="ctrl-sublabel">{{ t('imageEditor.text.style') }}</span>
        <div class="btn-cluster">
          <button
            type="button"
            class="btn btn-xs"
            :class="{ 'btn-active': selectedText.bold }"
            :title="t('imageEditor.text.bold')"
            @click="emit('update-text', { bold: !selectedText.bold })"
          >
            <b>B</b>
          </button>
          <button
            type="button"
            class="btn btn-xs"
            :class="{ 'btn-active': selectedText.italic }"
            :title="t('imageEditor.text.italic')"
            @click="emit('update-text', { italic: !selectedText.italic })"
          >
            <i>I</i>
          </button>
          <button
            type="button"
            class="btn btn-xs"
            :class="{ 'btn-active': selectedText.align === 'left' }"
            :title="t('imageEditor.text.alignLeft')"
            @click="emit('update-text', { align: 'left' })"
          >
            <i class="fa-solid fa-align-left"></i>
          </button>
          <button
            type="button"
            class="btn btn-xs"
            :class="{ 'btn-active': selectedText.align === 'center' }"
            :title="t('imageEditor.text.alignCenter')"
            @click="emit('update-text', { align: 'center' })"
          >
            <i class="fa-solid fa-align-center"></i>
          </button>
          <button
            type="button"
            class="btn btn-xs"
            :class="{ 'btn-active': selectedText.align === 'right' }"
            :title="t('imageEditor.text.alignRight')"
            @click="emit('update-text', { align: 'right' })"
          >
            <i class="fa-solid fa-align-right"></i>
          </button>
        </div>
      </div>

      <SliderRow
        :model-value="selectedText.opacity"
        :label="t('imageEditor.text.opacity')"
        :min="0"
        :max="100"
        :default="defaultTextStyle.opacity"
        unit="%"
        :reset-title="t('imageEditor.filters.reset')"
        @update:model-value="emit('update-text', { opacity: $event })"
      />

      <!-- Stroke (Umrandung) -->
      <div class="ctrl-subheader">{{ t('imageEditor.text.stroke') }}</div>
      <div class="ctrl-row">
        <span class="ctrl-sublabel">{{ t('imageEditor.text.strokeColor') }}</span>
        <input
          type="color"
          class="color-input"
          :value="selectedText.strokeColor"
          @input="emit('update-text', { strokeColor: ($event.target as HTMLInputElement).value })"
        />
      </div>
      <SliderRow
        :model-value="selectedText.strokeWidth"
        :label="t('imageEditor.text.strokeWidth')"
        :min="0"
        :max="20"
        :step="0.5"
        :default="defaultTextStyle.strokeWidth"
        unit="px"
        :reset-title="t('imageEditor.filters.reset')"
        @update:model-value="emit('update-text', { strokeWidth: $event })"
      />

      <!-- Shadow (Schatten) -->
      <div class="ctrl-subheader">{{ t('imageEditor.text.shadow') }}</div>
      <div class="ctrl-row">
        <span class="ctrl-sublabel">{{ t('imageEditor.text.shadowColor') }}</span>
        <input
          type="color"
          class="color-input"
          :value="selectedText.shadowColor"
          @input="emit('update-text', { shadowColor: ($event.target as HTMLInputElement).value })"
        />
      </div>
      <SliderRow
        :model-value="selectedText.shadowOpacity"
        :label="t('imageEditor.text.shadowOpacity')"
        :min="0"
        :max="100"
        :default="defaultTextStyle.shadowOpacity"
        unit="%"
        :reset-title="t('imageEditor.filters.reset')"
        @update:model-value="emit('update-text', { shadowOpacity: $event })"
      />
      <SliderRow
        :model-value="selectedText.shadowBlur"
        :label="t('imageEditor.text.shadowBlur')"
        :min="0"
        :max="30"
        :default="defaultTextStyle.shadowBlur"
        unit="px"
        :reset-title="t('imageEditor.filters.reset')"
        @update:model-value="emit('update-text', { shadowBlur: $event })"
      />
      <SliderRow
        :model-value="selectedText.shadowOffsetX"
        :label="t('imageEditor.text.shadowOffsetX')"
        :min="-20"
        :max="20"
        :default="defaultTextStyle.shadowOffsetX"
        unit="px"
        :reset-title="t('imageEditor.filters.reset')"
        @update:model-value="emit('update-text', { shadowOffsetX: $event })"
      />
      <SliderRow
        :model-value="selectedText.shadowOffsetY"
        :label="t('imageEditor.text.shadowOffsetY')"
        :min="-20"
        :max="20"
        :default="defaultTextStyle.shadowOffsetY"
        unit="px"
        :reset-title="t('imageEditor.filters.reset')"
        @update:model-value="emit('update-text', { shadowOffsetY: $event })"
      />

      <button
        type="button"
        class="btn btn-xs btn-ghost"
        style="color: #ef4444; align-self: flex-start"
        @click="emit('delete', selectedText.id)"
      >
        <i class="fa-solid fa-trash"></i>
        {{ t('imageEditor.text.delete') }}
      </button>
    </template>

    <!-- Text items list -->
    <div v-if="textItems.length > 0 && !selectedText" class="text-list">
      <button
        v-for="item in textItems"
        :key="item.id"
        type="button"
        class="text-list-item"
        @click="emit('update:selectedTextId', item.id)"
      >
        <i class="fa-solid fa-font"></i>
        <span class="text-list-preview">{{ item.text || '…' }}</span>
      </button>
    </div>

    <p v-if="textItems.length === 0" class="text-hint">
      <i class="fa-solid fa-circle-info"></i>
      {{ t('imageEditor.text.hint') }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { TextItem } from '@/lib/core/types'
import { defaultTextStyle } from '@/lib/core/types'
import SliderRow from '../SliderRow.vue'

const { t } = useI18n()

interface FontFamily {
  label: string
  value: string
  /** Gruppe in der Auswahl (z. B. System / Eigene Schriften) */
  group?: string
}

const props = defineProps<{
  textItems: TextItem[]
  selectedTextId: string | null
  selectedText: TextItem | null
  fontFamilies: FontFamily[]
}>()

const emit = defineEmits<{
  add: []
  delete: [id: string]
  'update-text': [patch: Partial<TextItem>]
  'update:selectedTextId': [id: string | null]
}>()

// Schriften nach Gruppe bündeln; Reihenfolge der ersten Nennung bleibt erhalten
const fontGroups = computed(() => {
  const groups: { label: string; fonts: FontFamily[] }[] = []
  for (const f of props.fontFamilies) {
    const label = f.group ?? ''
    let g = groups.find((x) => x.label === label)
    if (!g) {
      g = { label, fonts: [] }
      groups.push(g)
    }
    g.fonts.push(f)
  }
  return groups
})
</script>

<style scoped>
@import './editor-shared.css';
</style>
