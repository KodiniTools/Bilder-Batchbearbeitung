<template>
  <div
      :class="['canvas-element', { selected, editing }]"
      :style="{
        position: 'absolute',
        left: element.x + 'px',
        top: element.y + 'px',
        width: element.width ? element.width + 'px' : undefined,
        height: element.height ? element.height + 'px' : undefined,
        zIndex: element.zIndex,
        cursor: 'move'
      }"
      @mousedown.stop="emit('select', element, $event)"
  >
    <!-- Text Element -->
    <div
        v-if="element.type === 'text'"
        class="element-text"
        :style="{
          fontSize: element.fontSize + 'px',
          fontFamily: (element.fontFamily || 'Helvetica') + ', Arial, Helvetica Neue, sans-serif',
          color: element.color,
          textAlign: element.align,
          fontWeight: element.bold ? 'bold' : 'normal',
          fontStyle: element.italic ? 'italic' : 'normal'
        }"
    >
      <div
          v-if="!editing"
          class="text-content"
          @click.stop
          @dblclick.stop="emit('editStart', element)"
      >{{ element.content || t('commentPageDesigner.properties.textPlaceholder') }}</div>
      <textarea
          v-else
          ref="inlineTextareaRef"
          v-model="element.content"
          class="inline-text-editor"
          :style="{
            fontSize: element.fontSize + 'px',
            fontFamily: (element.fontFamily || 'Helvetica') + ', Arial, Helvetica Neue, sans-serif',
            color: element.color,
            textAlign: element.align,
            fontWeight: element.bold ? 'bold' : 'normal',
            fontStyle: element.italic ? 'italic' : 'normal'
          }"
          @click.stop
          @mousedown.stop
          @blur="emit('editStop')"
          @keydown.esc="emit('editStop')"
      ></textarea>
    </div>

    <!-- Image Element -->
    <div
        v-if="element.type === 'image'"
        class="element-image"
        :style="{
          width: element.width + 'px',
          height: element.height ? element.height + 'px' : 'auto',
          opacity: element.opacity
        }"
    >
      <img :src="element.src" alt="Uploaded image" draggable="false">
    </div>

    <!-- 8 Resize-Handles (Ecken + Kanten) für alle Elemente -->
    <div v-if="selected" class="resize-handles">
      <!-- Ecken -->
      <div class="resize-handle nw" @mousedown.stop="emit('resizeStart', $event, 'nw')"></div>
      <div class="resize-handle ne" @mousedown.stop="emit('resizeStart', $event, 'ne')"></div>
      <div class="resize-handle sw" @mousedown.stop="emit('resizeStart', $event, 'sw')"></div>
      <div class="resize-handle se" @mousedown.stop="emit('resizeStart', $event, 'se')"></div>
      <!-- Kanten -->
      <div class="resize-handle n"  @mousedown.stop="emit('resizeStart', $event, 'n')"></div>
      <div class="resize-handle s"  @mousedown.stop="emit('resizeStart', $event, 's')"></div>
      <div class="resize-handle e"  @mousedown.stop="emit('resizeStart', $event, 'e')"></div>
      <div class="resize-handle w"  @mousedown.stop="emit('resizeStart', $event, 'w')"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import type { CanvasElement } from '@/lib/features/export-pdf'

const { t } = useI18n()

const props = defineProps<{
  element: CanvasElement
  selected: boolean
  editing: boolean
}>()

const emit = defineEmits<{
  select: [element: CanvasElement, event: MouseEvent]
  editStart: [element: CanvasElement]
  editStop: []
  resizeStart: [event: MouseEvent, direction: string]
}>()

const inlineTextareaRef = ref<HTMLTextAreaElement | null>(null)

// Focus + select the inline editor whenever this element enters edit mode
watch(
    () => props.editing,
    (isEditing) => {
      if (isEditing) {
        nextTick(() => {
          inlineTextareaRef.value?.focus()
          inlineTextareaRef.value?.select()
        })
      }
    },
)
</script>

<style scoped>
/* Canvas Elements */
.canvas-element {
  transition: box-shadow 0.2s;
  user-select: none;
}

.canvas-element.selected {
  box-shadow: 0 0 0 2px var(--accent);
  border-radius: 4px;
}

.canvas-element.selected::before {
  content: '';
  position: absolute;
  inset: -8px;
  border: 1px dashed var(--accent);
  border-radius: 4px;
  pointer-events: none;
}

.element-text {
  width: 100%;
  height: 100%;
  padding: 8px;
  box-sizing: border-box;
  overflow: hidden;
}

.element-image {
  border-radius: 4px;
  overflow: hidden;
}

.element-image img {
  display: block;
  width: 100%;
  height: auto;
}

.text-content {
  width: 100%;
  height: 100%;
  white-space: pre-wrap;
  word-break: break-word;
  overflow: hidden;
  line-height: 1.5;
  cursor: text;
}

.inline-text-editor {
  width: 100%;
  height: 100%;
  padding: 0;
  margin: 0;
  border: none;
  outline: none;
  resize: none;
  font-family: inherit;
  font-size: inherit;
  font-weight: inherit;
  text-align: inherit;
  color: inherit;
  background: rgba(102, 126, 234, 0.06);
  box-sizing: border-box;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
  overflow: hidden;
}

.canvas-element.editing {
  box-shadow: 0 0 0 2px var(--accent), 0 0 12px color-mix(in oklab, var(--accent) 25%, transparent);
  border-radius: 4px;
}

.canvas-element.editing::before {
  border-style: solid;
  border-color: var(--accent);
}

/* Resize handles (4 corners + 4 edges) */
.resize-handles {
  position: absolute;
  inset: -10px;
  pointer-events: none;
}

.resize-handle {
  position: absolute;
  width: 16px;
  height: 16px;
  background: var(--accent);
  border: 2.5px solid white;
  border-radius: 50%;
  pointer-events: all;
  box-shadow: 0 0 0 1.5px var(--accent), 0 2px 6px rgba(0,0,0,0.5);
  transform: translate(-50%, -50%);
  transition: transform 0.15s, box-shadow 0.15s;
}

.resize-handle::after {
  content: '';
  position: absolute;
  inset: -8px;
  border-radius: 50%;
}

.resize-handle:hover {
  box-shadow: 0 0 0 1.5px var(--accent), 0 0 0 5px rgba(102, 126, 234, 0.35), 0 2px 8px rgba(0,0,0,0.5);
  transform: translate(-50%, -50%) scale(1.3);
}

/* Ecken */
.resize-handle.nw { top: 0;    left: 0;    cursor: nw-resize; }
.resize-handle.ne { top: 0;    left: 100%; cursor: ne-resize; }
.resize-handle.sw { top: 100%; left: 0;    cursor: sw-resize; }
.resize-handle.se { top: 100%; left: 100%; cursor: se-resize; }

/* Kanten */
.resize-handle.n  { top: 0;    left: 50%;  cursor: n-resize; }
.resize-handle.s  { top: 100%; left: 50%;  cursor: s-resize; }
.resize-handle.e  { top: 50%;  left: 100%; cursor: e-resize; }
.resize-handle.w  { top: 50%;  left: 0;    cursor: w-resize; }

.resize-handle svg {
  display: none;
}
</style>
