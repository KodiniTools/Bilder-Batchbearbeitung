<template>
  <div
    ref="overlayRef"
    class="crop-overlay"
    @mousedown.prevent="onOverlayMouseDown"
  >
    <!-- Dark mask outside crop rect (4-piece approach) -->
    <div class="mask mask-top" :style="{ height: crop.y + 'px' }"></div>
    <div class="mask mask-mid" :style="{ top: crop.y + 'px', height: crop.h + 'px' }">
      <div class="mask mask-side mask-left" :style="{ width: crop.x + 'px' }"></div>
      <div class="mask mask-side mask-right" :style="{ left: (crop.x + crop.w) + 'px' }"></div>
    </div>
    <div class="mask mask-bottom" :style="{ top: (crop.y + crop.h) + 'px' }"></div>

    <!-- Crop rectangle -->
    <div
      class="crop-rect"
      :style="{
        left: crop.x + 'px',
        top: crop.y + 'px',
        width: crop.w + 'px',
        height: crop.h + 'px'
      }"
      @mousedown.stop.prevent="onRectMouseDown"
    >
      <!-- Rule-of-thirds grid -->
      <div class="thirds-line v1"></div>
      <div class="thirds-line v2"></div>
      <div class="thirds-line h1"></div>
      <div class="thirds-line h2"></div>

      <!-- Resize handles -->
      <div
        v-for="h in HANDLES"
        :key="h"
        :class="`handle ${h}`"
        @mousedown.stop.prevent="onHandleMouseDown($event, h)"
      ></div>

      <!-- Pixel dimensions badge -->
      <div v-if="crop.w > 80 && crop.h > 40" class="crop-dims">
        {{ displayW }} × {{ displayH }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'

const props = defineProps<{
  imagePixelWidth: number
  imagePixelHeight: number
  lockedRatio: number | null
}>()

const emit = defineEmits<{
  'update:crop': [rect: { x: number; y: number; w: number; h: number }]
}>()

const HANDLES = ['nw', 'n', 'ne', 'w', 'e', 'sw', 's', 'se'] as const
type Handle = typeof HANDLES[number]

const HANDLE_SIDES: Record<Handle, { n: boolean; s: boolean; w: boolean; e: boolean }> = {
  nw: { n: true,  s: false, w: true,  e: false },
  n:  { n: true,  s: false, w: false, e: false },
  ne: { n: true,  s: false, w: false, e: true  },
  w:  { n: false, s: false, w: true,  e: false },
  e:  { n: false, s: false, w: false, e: true  },
  sw: { n: false, s: true,  w: true,  e: false },
  s:  { n: false, s: true,  w: false, e: false },
  se: { n: false, s: true,  w: false, e: true  },
}

const MIN_SIZE = 20

const overlayRef = ref<HTMLDivElement | null>(null)

// Crop rect in display (overlay) pixels
const crop = ref({ x: 0, y: 0, w: 0, h: 0 })

type Action = 'drawing' | 'moving' | 'resizing' | null
let action: Action = null
let dragStart = { x: 0, y: 0 }
let initCrop = { x: 0, y: 0, w: 0, h: 0 }
let activeHandle: Handle = 'se'

const overlaySize = () => ({
  w: overlayRef.value?.clientWidth ?? 1,
  h: overlayRef.value?.clientHeight ?? 1,
})

/**
 * The crop rectangle geometry is expressed in overlay (display) pixels, but the
 * emitted crop is converted to image pixels via the overlay size. If the overlay
 * aspect ratio does not exactly match the image aspect ratio (e.g. due to layout
 * rounding), a "square" in display space would not be square in image space.
 *
 * This converts the desired pixel-space ratio (w/h) into the equivalent
 * display-space ratio so the resulting crop has the correct ratio in real pixels.
 */
function getDisplayRatio(): number | null {
  if (props.lockedRatio === null) return null
  const { w, h } = overlaySize()
  if (w <= 0 || h <= 0 || props.imagePixelWidth <= 0 || props.imagePixelHeight <= 0) {
    return props.lockedRatio
  }
  return (props.lockedRatio * props.imagePixelHeight * w) / (props.imagePixelWidth * h)
}

const displayW = computed(() => {
  const { w } = overlaySize()
  return Math.max(1, Math.round((crop.value.w / w) * props.imagePixelWidth))
})

const displayH = computed(() => {
  const { h } = overlaySize()
  return Math.max(1, Math.round((crop.value.h / h) * props.imagePixelHeight))
})

function emitCrop() {
  const { w, h } = overlaySize()
  emit('update:crop', {
    x: crop.value.x / w,
    y: crop.value.y / h,
    w: crop.value.w / w,
    h: crop.value.h / h,
  })
}

function clientToOverlay(clientX: number, clientY: number) {
  const rect = overlayRef.value!.getBoundingClientRect()
  const { w, h } = overlaySize()
  return {
    x: Math.max(0, Math.min(clientX - rect.left, w)),
    y: Math.max(0, Math.min(clientY - rect.top, h)),
  }
}

function applyLockedRatio(left: number, top: number, right: number, bottom: number, sides: typeof HANDLE_SIDES[Handle]) {
  const ratio = getDisplayRatio()
  if (ratio === null) return { left, top, right, bottom }
  const hasW = sides.w || sides.e
  const hasH = sides.n || sides.s

  if (hasW) {
    const newW = right - left
    const newH = newW / ratio
    if (sides.n) top = bottom - newH
    else bottom = top + newH
  } else if (hasH) {
    const newH = bottom - top
    const newW = newH * ratio
    right = left + newW
  }
  return { left, top, right, bottom }
}

function initFullCrop() {
  const { w, h } = overlaySize()
  const ratio = getDisplayRatio()
  if (ratio !== null) {
    if (w / h > ratio) {
      const cw = h * ratio
      crop.value = { x: (w - cw) / 2, y: 0, w: cw, h }
    } else {
      const ch = w / ratio
      crop.value = { x: 0, y: (h - ch) / 2, w, h: ch }
    }
  } else {
    crop.value = { x: 0, y: 0, w, h }
  }
  emitCrop()
}

watch(() => props.lockedRatio, () => {
  // Adjust existing crop rect to new ratio
  const { w: ow, h: oh } = overlaySize()
  const ratio = getDisplayRatio()
  if (ratio === null) return

  const cw = crop.value.w
  const ch = cw / ratio

  let newH = ch
  if (crop.value.y + newH > oh) {
    newH = oh - crop.value.y
    const newW = newH * ratio
    crop.value = { ...crop.value, w: Math.min(newW, ow - crop.value.x), h: newH }
  } else {
    crop.value = { ...crop.value, h: newH }
  }
  emitCrop()
})

onMounted(() => {
  document.addEventListener('mousemove', onDocMouseMove)
  document.addEventListener('mouseup', onDocMouseUp)
  // Wait for layout before reading overlay size
  requestAnimationFrame(() => initFullCrop())
})

onUnmounted(() => {
  document.removeEventListener('mousemove', onDocMouseMove)
  document.removeEventListener('mouseup', onDocMouseUp)
})

function onOverlayMouseDown(event: MouseEvent) {
  // Only react to direct clicks on the overlay (not on crop rect / handles)
  if (event.target !== overlayRef.value) return
  const { x, y } = clientToOverlay(event.clientX, event.clientY)
  dragStart = { x, y }
  initCrop = { x, y, w: 0, h: 0 }
  crop.value = { x, y, w: 0, h: 0 }
  action = 'drawing'
}

function onRectMouseDown(event: MouseEvent) {
  const { x, y } = clientToOverlay(event.clientX, event.clientY)
  dragStart = { x, y }
  initCrop = { ...crop.value }
  action = 'moving'
}

function onHandleMouseDown(event: MouseEvent, handle: Handle) {
  const { x, y } = clientToOverlay(event.clientX, event.clientY)
  dragStart = { x, y }
  initCrop = { ...crop.value }
  activeHandle = handle
  action = 'resizing'
}

function onDocMouseMove(event: MouseEvent) {
  if (!action || !overlayRef.value) return

  const { w: ow, h: oh } = overlaySize()
  const { x: cx, y: cy } = clientToOverlay(event.clientX, event.clientY)
  const dx = cx - dragStart.x
  const dy = cy - dragStart.y

  if (action === 'drawing') {
    let x = dragStart.x
    let y = dragStart.y
    let w = cx - dragStart.x
    let h = cy - dragStart.y

    const ratio = getDisplayRatio()
    if (ratio !== null) {
      const signX = w >= 0 ? 1 : -1
      const signY = h >= 0 ? 1 : -1
      const aw = Math.abs(w)
      const ah = Math.abs(h)
      if (aw / ratio > ah) {
        h = signY * (aw / ratio)
      } else {
        w = signX * (ah * ratio)
      }
    }

    if (w < 0) { x += w; w = -w }
    if (h < 0) { y += h; h = -h }
    x = Math.max(0, Math.min(x, ow - MIN_SIZE))
    y = Math.max(0, Math.min(y, oh - MIN_SIZE))
    w = Math.max(MIN_SIZE, Math.min(w, ow - x))
    h = Math.max(MIN_SIZE, Math.min(h, oh - y))
    crop.value = { x, y, w, h }

  } else if (action === 'moving') {
    crop.value = {
      ...crop.value,
      x: Math.max(0, Math.min(initCrop.x + dx, ow - initCrop.w)),
      y: Math.max(0, Math.min(initCrop.y + dy, oh - initCrop.h)),
    }

  } else if (action === 'resizing') {
    const sides = HANDLE_SIDES[activeHandle]
    let left   = sides.w ? cx : initCrop.x
    let right  = sides.e ? cx : initCrop.x + initCrop.w
    let top    = sides.n ? cy : initCrop.y
    let bottom = sides.s ? cy : initCrop.y + initCrop.h

    // Clamp to overlay
    left   = Math.max(0, left)
    right  = Math.min(ow, right)
    top    = Math.max(0, top)
    bottom = Math.min(oh, bottom)

    // Ensure min size before ratio
    if (sides.w && right - left < MIN_SIZE) left = right - MIN_SIZE
    if (sides.e && right - left < MIN_SIZE) right = left + MIN_SIZE
    if (sides.n && bottom - top < MIN_SIZE) top = bottom - MIN_SIZE
    if (sides.s && bottom - top < MIN_SIZE) bottom = top + MIN_SIZE

    const locked = applyLockedRatio(left, top, right, bottom, sides)
    left = Math.max(0, locked.left)
    top  = Math.max(0, locked.top)
    right  = Math.min(ow, locked.right)
    bottom = Math.min(oh, locked.bottom)

    crop.value = { x: left, y: top, w: Math.max(MIN_SIZE, right - left), h: Math.max(MIN_SIZE, bottom - top) }
  }

  emitCrop()
}

function onDocMouseUp() {
  action = null
}
</script>

<style scoped>
.crop-overlay {
  position: absolute;
  inset: 0;
  cursor: crosshair;
  overflow: hidden;
  z-index: 10;
}

/* Dark masks */
.mask {
  position: absolute;
  background: rgba(0, 0, 0, 0.55);
  pointer-events: none;
}

.mask-top {
  top: 0;
  left: 0;
  right: 0;
}

.mask-mid {
  left: 0;
  right: 0;
  position: absolute;
}

.mask-side {
  position: absolute;
  top: 0;
  bottom: 0;
}

.mask-left {
  left: 0;
}

.mask-right {
  right: 0;
}

.mask-bottom {
  left: 0;
  right: 0;
  bottom: 0;
}

/* Crop rectangle */
.crop-rect {
  position: absolute;
  border: 1.5px solid rgba(255, 255, 255, 0.9);
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.4);
  cursor: move;
  box-sizing: border-box;
  overflow: visible;
}

/* Rule-of-thirds grid */
.thirds-line {
  position: absolute;
  background: rgba(255, 255, 255, 0.25);
  pointer-events: none;
}

.thirds-line.v1 { left: 33.333%; top: 0; bottom: 0; width: 1px; }
.thirds-line.v2 { left: 66.666%; top: 0; bottom: 0; width: 1px; }
.thirds-line.h1 { top: 33.333%; left: 0; right: 0; height: 1px; }
.thirds-line.h2 { top: 66.666%; left: 0; right: 0; height: 1px; }

/* Resize handles */
.handle {
  position: absolute;
  width: 10px;
  height: 10px;
  background: white;
  border: 1.5px solid rgba(0, 0, 0, 0.5);
  border-radius: 2px;
}

.handle.nw { top: -5px; left: -5px; cursor: nw-resize; }
.handle.n  { top: -5px; left: calc(50% - 5px); cursor: n-resize; }
.handle.ne { top: -5px; right: -5px; cursor: ne-resize; }
.handle.w  { top: calc(50% - 5px); left: -5px; cursor: w-resize; }
.handle.e  { top: calc(50% - 5px); right: -5px; cursor: e-resize; }
.handle.sw { bottom: -5px; left: -5px; cursor: sw-resize; }
.handle.s  { bottom: -5px; left: calc(50% - 5px); cursor: s-resize; }
.handle.se { bottom: -5px; right: -5px; cursor: se-resize; }

/* Dimensions badge */
.crop-dims {
  position: absolute;
  bottom: 6px;
  right: 6px;
  background: rgba(0, 0, 0, 0.65);
  color: white;
  font-size: 11px;
  font-weight: 500;
  padding: 2px 6px;
  border-radius: 4px;
  pointer-events: none;
  white-space: nowrap;
}
</style>
