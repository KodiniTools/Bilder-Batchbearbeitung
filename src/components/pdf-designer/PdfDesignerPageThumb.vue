<template>
  <div class="thumb-page" :style="{ width: thumbWidth + 'px', height: height + 'px' }">
    <div
      class="thumb-canvas"
      :style="{
        width: pageWidth + 'px',
        height: pageHeight + 'px',
        transform: `scale(${scale})`,
      }"
    >
      <template v-for="el in sortedElements" :key="el.id">
        <div
          v-if="el.type === 'text'"
          class="thumb-text"
          :style="{
            left: el.x + 'px',
            top: el.y + 'px',
            width: (el.width ?? 300) + 'px',
            height: (el.height ?? 60) + 'px',
            fontSize: (el.fontSize ?? 24) + 'px',
            fontFamily: (el.fontFamily || 'Helvetica') + ', Arial, sans-serif',
            color: el.color,
            textAlign: el.align,
            fontWeight: el.bold ? 'bold' : 'normal',
            fontStyle: el.italic ? 'italic' : 'normal',
          }"
        >
          {{ el.content }}
        </div>
        <div
          v-else-if="el.type === 'shape'"
          class="thumb-shape"
          :style="{ left: el.x + 'px', top: el.y + 'px' }"
        >
          <PdfShapeSvg :element="el" />
        </div>
        <img
          v-else-if="el.src && el.background"
          class="thumb-image thumb-image--background"
          :src="el.src"
          alt=""
          draggable="false"
          :style="{ opacity: el.opacity ?? 1 }"
        />
        <img
          v-else-if="el.src"
          class="thumb-image"
          :src="el.src"
          alt=""
          draggable="false"
          :style="{
            left: el.x + 'px',
            top: el.y + 'px',
            width: (el.width ?? 200) + 'px',
            opacity: el.opacity ?? 1,
          }"
        />
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { PdfPage } from '@/composables/usePdfPages'
import { sortForRender } from '@/lib/designer/shapes'
import PdfShapeSvg from './PdfShapeSvg.vue'

/** Verkleinerte, nicht interaktive Darstellung einer Designer-Seite. */
const props = withDefaults(
  defineProps<{
    page: PdfPage
    pageWidth: number
    pageHeight: number
    /** Höhe des Thumbnails in px */
    height?: number
  }>(),
  { height: 44 }
)

const scale = computed(() => props.height / props.pageHeight)
const thumbWidth = computed(() => Math.round(props.pageWidth * scale.value))
const sortedElements = computed(() => sortForRender(props.page.elements))
</script>

<style scoped>
.thumb-page {
  position: relative;
  overflow: hidden;
  background: white;
  border-radius: 2px;
  pointer-events: none;
}

.thumb-canvas {
  position: absolute;
  top: 0;
  left: 0;
  transform-origin: top left;
}

/* Wie PdfDesignerElement: padding 8px, line-height 1.5 */
.thumb-text {
  position: absolute;
  padding: 8px;
  line-height: 1.5;
  overflow: hidden;
  white-space: pre-wrap;
  word-break: break-word;
}

.thumb-image {
  position: absolute;
  height: auto;
}

.thumb-image--background {
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.thumb-shape {
  position: absolute;
}
</style>
