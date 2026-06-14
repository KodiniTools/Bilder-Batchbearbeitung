<template>
  <div
    class="element"
    :class="{
      selected: isSelected,
      'element-text': element.type === 'text',
      'element-image': element.type === 'image'
    }"
    :style="{
      left: element.x + 'px',
      top: element.y + 'px',
      width: element.width + 'px',
      height: element.height + 'px',
      fontSize: element.fontSize + 'px',
      fontFamily: element.fontFamily || 'Helvetica, Arial, sans-serif',
      fontWeight: element.fontWeight,
      textAlign: element.textAlign,
      color: element.color
    }"
    @click.stop="emit('select', element.id)"
    @mousedown="emit('dragStart', $event, element.id)"
  >
    <template v-if="element.type === 'text'">
      <div
        v-if="!isEditing"
        class="text-content"
        @click.stop
        @dblclick.stop="emit('editStart', element.id)"
      >
        {{ element.content || t('frontPageDesigner.canvas.emptyText') }}
      </div>
      <textarea
        v-else
        ref="textareaRef"
        :value="element.content"
        class="text-editor"
        @input="emit('updateContent', element.id, ($event.target as HTMLTextAreaElement).value)"
        @click.stop
        @blur="emit('editStop')"
        @keydown.esc="emit('editStop')"
        @mousedown.stop
      />
    </template>

    <template v-if="element.type === 'image'">
      <img
        :src="element.src"
        :alt="element.alt || t('frontPageDesigner.properties.typeImage')"
        class="image-content"
        draggable="false"
      >
    </template>

    <div v-if="isSelected" class="resize-handles">
      <div class="resize-handle nw" @mousedown.stop="emit('resizeStart', $event, element.id, 'nw')"></div>
      <div class="resize-handle ne" @mousedown.stop="emit('resizeStart', $event, element.id, 'ne')"></div>
      <div class="resize-handle sw" @mousedown.stop="emit('resizeStart', $event, element.id, 'sw')"></div>
      <div class="resize-handle se" @mousedown.stop="emit('resizeStart', $event, element.id, 'se')"></div>
    </div>

    <button
      v-if="isSelected"
      class="delete-element-btn"
      :title="t('frontPageDesigner.properties.deleteElement')"
      @click.stop="emit('delete', element.id)"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
      </svg>
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import type { FrontPageElement } from './FrontPageDesigner.vue'

const { t } = useI18n()

const props = defineProps<{
  element: FrontPageElement
  isSelected: boolean
  isEditing: boolean
}>()

const emit = defineEmits<{
  select: [id: string]
  editStart: [id: string]
  editStop: []
  dragStart: [event: MouseEvent, id: string]
  resizeStart: [event: MouseEvent, id: string, direction: string]
  delete: [id: string]
  updateContent: [id: string, content: string]
}>()

const textareaRef = ref<HTMLTextAreaElement | null>(null)

watch(() => props.isEditing, (val) => {
  if (val) {
    nextTick(() => {
      if (textareaRef.value) {
        textareaRef.value.focus()
        textareaRef.value.select()
      }
    })
  }
})
</script>

<style scoped>
.element {
  position: absolute;
  cursor: move;
  user-select: none;
  border: 2px solid transparent;
  transition: border-color 0.2s;
}

.element.selected {
  border-color: var(--accent);
  box-shadow: 0 0 0 1px var(--accent);
}

.element-text .text-content {
  width: 100%;
  height: 100%;
  padding: var(--space-2);
  margin: 0;
  box-sizing: border-box;
  overflow: hidden;
  word-wrap: break-word;
  white-space: pre-wrap;
  line-height: 1.4;
  font-family: inherit;
  cursor: text;
}

.text-editor {
  width: 100%;
  height: 100%;
  padding: var(--space-2);
  margin: 0;
  border: none;
  outline: none;
  resize: none;
  font-family: inherit;
  font-size: inherit;
  font-weight: inherit;
  text-align: inherit;
  color: inherit;
  background: rgba(102, 126, 234, 0.05);
  box-sizing: border-box;
  line-height: inherit;
  overflow: hidden;
  word-wrap: break-word;
  white-space: pre-wrap;
}

.element-image {
  overflow: hidden;
}

.image-content {
  width: 100%;
  height: 100%;
  object-fit: contain;
  pointer-events: none;
}

.resize-handles {
  position: absolute;
  inset: -6px;
  pointer-events: none;
}

.resize-handle {
  position: absolute;
  width: 12px;
  height: 12px;
  background: white;
  border: 2px solid var(--accent);
  border-radius: 50%;
  pointer-events: all;
  cursor: pointer;
}

.resize-handle.nw {
  top: 0;
  left: 0;
  cursor: nw-resize;
}

.resize-handle.ne {
  top: 0;
  right: 0;
  cursor: ne-resize;
}

.resize-handle.sw {
  bottom: 0;
  left: 0;
  cursor: sw-resize;
}

.resize-handle.se {
  bottom: 0;
  right: 0;
  cursor: se-resize;
}

.delete-element-btn {
  position: absolute;
  top: -12px;
  right: -12px;
  width: 24px;
  height: 24px;
  background: var(--red);
  color: white;
  border: 2px solid white;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.2s;
}

.delete-element-btn:hover {
  transform: scale(1.1);
}
</style>
