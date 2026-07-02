import { ref, computed, onMounted, onUnmounted, type Ref } from 'vue'
import type { CanvasElement } from '@/lib/features/export-pdf'

interface UseCanvasInteractionOptions {
  /** Currently selected element (owned by useCommentPages). */
  selectedElement: Ref<CanvasElement | null>
  /** Id of the element currently being edited inline, if any. */
  editingTextId: Ref<string | null>
  /** Current page width in px. */
  pageWidth: Ref<number>
  /** Current page height in px. */
  pageHeight: Ref<number>
  /** Scrollable wrapper around the canvas (used for fit-to-screen). */
  canvasWrapperRef: Ref<HTMLElement | null>
}

/**
 * Handles direct-manipulation of canvas elements: dragging, resizing
 * (free for text, aspect-locked for images) and zoom / fit-to-screen.
 */
export function useCanvasInteraction(options: UseCanvasInteractionOptions) {
  const { selectedElement, editingTextId, pageWidth, pageHeight, canvasWrapperRef } = options

  const zoomLevel = ref(0.7)

  // Dragging / resizing state (non-reactive)
  let isDragging = false
  let isResizing = false
  let isTextResizing = false
  let resizeDirection = ''
  let dragStartX = 0
  let dragStartY = 0
  let elementStartX = 0
  let elementStartY = 0
  let elementStartWidth = 0
  let elementStartHeight = 0

  /** Vertical padding used to center the canvas when it fits the viewport. */
  const canvasVerticalPadding = computed(() => {
    if (!canvasWrapperRef.value) return 40
    const wrapperH = canvasWrapperRef.value.clientHeight
    const scaledH = pageHeight.value * zoomLevel.value
    return Math.max(40, (wrapperH - scaledH) / 2)
  })

  function selectElement(element: CanvasElement, event: MouseEvent) {
    if (editingTextId.value) return
    selectedElement.value = element
    isDragging = true
    dragStartX = event.clientX / zoomLevel.value
    dragStartY = event.clientY / zoomLevel.value
    elementStartX = element.x
    elementStartY = element.y
  }

  function startTextResize(event: MouseEvent, direction: string) {
    if (!selectedElement.value) return
    isTextResizing = true
    resizeDirection = direction
    dragStartX = event.clientX / zoomLevel.value
    dragStartY = event.clientY / zoomLevel.value
    elementStartX = selectedElement.value.x
    elementStartY = selectedElement.value.y
    elementStartWidth = selectedElement.value.width || 300
    elementStartHeight = selectedElement.value.height || selectedElement.value.width || 60
    event.stopPropagation()
  }

  function handleMouseMove(event: MouseEvent) {
    if (isTextResizing && selectedElement.value) {
      const dx = event.clientX / zoomLevel.value - dragStartX
      const dy = event.clientY / zoomLevel.value - dragStartY
      const dir = resizeDirection
      const el = selectedElement.value

      const isImage = el.type === 'image' && elementStartHeight > 0
      const ratio = isImage ? elementStartWidth / elementStartHeight : null

      if (ratio) {
        // Aspect-ratio-locked resize for images
        const hasHorizontal = dir.includes('e') || dir.includes('w')
        let newW: number
        let newH: number

        if (hasHorizontal) {
          const rawW = dir.includes('e') ? elementStartWidth + dx : elementStartWidth - dx
          newW = Math.max(50, rawW)
          newH = Math.round(newW / ratio)
        } else {
          const rawH = dir.includes('s') ? elementStartHeight + dy : elementStartHeight - dy
          newH = Math.max(30, rawH)
          newW = Math.round(newH * ratio)
        }

        if (dir.includes('w')) {
          el.x = elementStartX + (elementStartWidth - newW)
        }
        if (dir.includes('n')) {
          el.y = elementStartY + (elementStartHeight - newH)
        }
        el.width = newW
        el.height = newH
      } else {
        // Free resize for text elements
        if (dir.includes('e')) {
          el.width = Math.max(80, elementStartWidth + dx)
        }
        if (dir.includes('w')) {
          const newWidth = Math.max(80, elementStartWidth - dx)
          el.x = elementStartX + (elementStartWidth - newWidth)
          el.width = newWidth
        }
        if (dir.includes('s')) {
          el.height = Math.max(30, elementStartHeight + dy)
        }
        if (dir.includes('n')) {
          const newHeight = Math.max(30, elementStartHeight - dy)
          el.y = elementStartY + (elementStartHeight - newHeight)
          el.height = newHeight
        }
      }
    } else if (isDragging && selectedElement.value && !isResizing && !editingTextId.value) {
      const deltaX = event.clientX / zoomLevel.value - dragStartX
      const deltaY = event.clientY / zoomLevel.value - dragStartY

      selectedElement.value.x = Math.max(0, Math.min(pageWidth.value - 50, elementStartX + deltaX))
      selectedElement.value.y = Math.max(0, Math.min(pageHeight.value - 50, elementStartY + deltaY))
    }
  }

  function handleMouseUp() {
    isDragging = false
    isResizing = false
    isTextResizing = false
    resizeDirection = ''
  }

  // ── Zoom controls ───────────────────────────────────────────────
  function zoomIn() {
    zoomLevel.value = Math.min(2, Math.round((zoomLevel.value + 0.1) * 10) / 10)
  }

  function zoomOut() {
    zoomLevel.value = Math.max(0.25, Math.round((zoomLevel.value - 0.1) * 10) / 10)
  }

  function fitToScreen() {
    if (!canvasWrapperRef.value) return
    const wrapper = canvasWrapperRef.value
    const availW = wrapper.clientWidth - 80
    const availH = wrapper.clientHeight - 80
    zoomLevel.value =
      Math.round(Math.min(availW / pageWidth.value, availH / pageHeight.value, 1) * 100) / 100
  }

  function resetZoom() {
    fitToScreen()
  }

  onMounted(() => {
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  })

  onUnmounted(() => {
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', handleMouseUp)
  })

  return {
    zoomLevel,
    canvasVerticalPadding,
    selectElement,
    startTextResize,
    zoomIn,
    zoomOut,
    fitToScreen,
    resetZoom,
  }
}
