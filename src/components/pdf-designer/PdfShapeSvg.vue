<template>
  <!-- Form in Box-Größe; Rand innen wie im PDF-Export (renderShape) -->
  <svg
    class="pdf-shape"
    :width="w"
    :height="h"
    :viewBox="`0 0 ${w} ${h}`"
    :style="{ opacity: element.opacity ?? 1 }"
    aria-hidden="true"
  >
    <line
      v-if="element.shape === 'line'"
      v-bind="lineCoords"
      :stroke="stroke || 'none'"
      :stroke-width="strokeWidth"
    />
    <ellipse
      v-else-if="element.shape === 'ellipse'"
      :cx="w / 2"
      :cy="h / 2"
      :rx="Math.max(0, w / 2 - inset)"
      :ry="Math.max(0, h / 2 - inset)"
      :fill="fill || 'none'"
      :stroke="stroke || 'none'"
      :stroke-width="strokeWidth"
    />
    <rect
      v-else
      :x="inset"
      :y="inset"
      :width="Math.max(0, w - 2 * inset)"
      :height="Math.max(0, h - 2 * inset)"
      :rx="radius"
      :ry="radius"
      :fill="fill || 'none'"
      :stroke="stroke || 'none'"
      :stroke-width="strokeWidth"
    />
  </svg>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { PdfElement } from '@/lib/features/export-pdf'

const props = defineProps<{ element: PdfElement }>()

const w = computed(() => Math.max(1, props.element.width ?? 100))
const h = computed(() => Math.max(1, props.element.height ?? 100))
const isLine = computed(() => props.element.shape === 'line')
const fill = computed(() => (isLine.value ? '' : props.element.fillColor || ''))
const stroke = computed(() =>
  (props.element.strokeWidth ?? 0) > 0 ? props.element.strokeColor || '' : ''
)
const strokeWidth = computed(() => (stroke.value ? (props.element.strokeWidth ?? 0) : 0))
const inset = computed(() => (isLine.value ? 0 : strokeWidth.value / 2))
const radius = computed(() =>
  Math.max(
    0,
    Math.min(
      props.element.cornerRadius ?? 0,
      (w.value - 2 * inset.value) / 2,
      (h.value - 2 * inset.value) / 2
    )
  )
)
const lineCoords = computed(() =>
  w.value >= h.value
    ? { x1: 0, y1: h.value / 2, x2: w.value, y2: h.value / 2 }
    : { x1: w.value / 2, y1: 0, x2: w.value / 2, y2: h.value }
)
</script>

<style scoped>
.pdf-shape {
  display: block;
  overflow: visible;
}
</style>
