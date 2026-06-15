<template>
  <div class="text-overlay" @click.self="$emit('update:selectedId', null)">
    <div
      v-for="item in items"
      :key="item.id"
      class="text-item"
      :class="{ 'text-item--selected': item.id === selectedId }"
      :style="itemPositionStyle(item)"
      @mousedown.prevent.stop="startDrag($event, item.id)"
      @touchstart.prevent.stop="startDrag($event, item.id)"
      @click.stop="$emit('update:selectedId', item.id)"
    >
      <div class="text-body" :style="textBodyStyle(item)">{{ item.text || '…' }}</div>
      <button
        v-if="item.id === selectedId"
        class="text-delete-btn"
        @mousedown.stop
        @touchstart.stop
        @click.stop="$emit('deleteItem', item.id)"
      >×</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onUnmounted } from 'vue'
import type { TextItem } from '@/lib/core/types'

const props = defineProps<{
  items: TextItem[]
  selectedId: string | null
}>()

const emit = defineEmits<{
  'update:selectedId': [id: string | null]
  'update:items': [items: TextItem[]]
  'deleteItem': [id: string]
}>()

const overlayRef = ref<HTMLDivElement | null>(null)

let dragging = false
let dragItemId = ''
let dragStartClientX = 0
let dragStartClientY = 0
let itemStartX = 0
let itemStartY = 0

function getOverlaySize() {
  const el = document.querySelector('.canvas-crop-wrapper') as HTMLElement | null
  const rect = el?.getBoundingClientRect()
  return { w: rect?.width ?? 1, h: rect?.height ?? 1, left: rect?.left ?? 0, top: rect?.top ?? 0 }
}

function startDrag(event: MouseEvent | TouchEvent, id: string) {
  emit('update:selectedId', id)
  const item = props.items.find(i => i.id === id)
  if (!item) return

  const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX
  const clientY = 'touches' in event ? event.touches[0].clientY : event.clientY

  dragging = true
  dragItemId = id
  dragStartClientX = clientX
  dragStartClientY = clientY
  itemStartX = item.x
  itemStartY = item.y

  document.addEventListener('mousemove', onMove)
  document.addEventListener('mouseup', stopDrag)
  document.addEventListener('touchmove', onMove, { passive: false })
  document.addEventListener('touchend', stopDrag)
}

function onMove(event: MouseEvent | TouchEvent) {
  if (!dragging) return
  if ('touches' in event) event.preventDefault()

  const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX
  const clientY = 'touches' in event ? event.touches[0].clientY : event.clientY
  const { w, h } = getOverlaySize()

  const dx = ((clientX - dragStartClientX) / w) * 100
  const dy = ((clientY - dragStartClientY) / h) * 100

  const updated = props.items.map(i =>
    i.id === dragItemId
      ? { ...i, x: Math.max(0, Math.min(100, itemStartX + dx)), y: Math.max(0, Math.min(95, itemStartY + dy)) }
      : i
  )
  emit('update:items', updated)
}

function stopDrag() {
  dragging = false
  document.removeEventListener('mousemove', onMove)
  document.removeEventListener('mouseup', stopDrag)
  document.removeEventListener('touchmove', onMove)
  document.removeEventListener('touchend', stopDrag)
}

onUnmounted(stopDrag)

function itemPositionStyle(item: TextItem) {
  const transformX =
    item.align === 'center' ? 'translateX(-50%)' :
    item.align === 'right'  ? 'translateX(-100%)' : 'none'
  return {
    left: item.x + '%',
    top:  item.y + '%',
    transform: transformX,
  }
}

function textBodyStyle(item: TextItem) {
  return {
    fontSize:   item.fontSize + 'px',
    fontFamily: item.fontFamily,
    color:      item.color,
    fontWeight: item.bold ? 'bold' : 'normal',
    fontStyle:  item.italic ? 'italic' : 'normal',
    textAlign:  item.align,
    opacity:    item.opacity / 100,
    textShadow: '1px 1px 3px rgba(0,0,0,0.55)',
    lineHeight: 1.35,
  }
}
</script>

<style scoped>
.text-overlay {
  position: absolute;
  inset: 0;
  z-index: 8;
}

.text-item {
  position: absolute;
  cursor: move;
  padding: 3px 5px;
  border: 1.5px solid transparent;
  border-radius: 3px;
  user-select: none;
}

.text-item--selected {
  border-color: rgba(99, 102, 241, 0.75);
  background: rgba(99, 102, 241, 0.06);
}

.text-body {
  white-space: pre-wrap;
  word-break: break-word;
  pointer-events: none;
}

.text-delete-btn {
  position: absolute;
  top: -9px;
  right: -9px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: none;
  background: #ef4444;
  color: white;
  font-size: 13px;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
}
</style>
