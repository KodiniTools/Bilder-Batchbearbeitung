import { ref, computed, onMounted, onUnmounted, type Ref } from 'vue'
import type { PdfElement } from '@/lib/features/export-pdf'
import { boundsOf, elementBox, snapBox } from '@/lib/designer/arrange'

interface UseCanvasInteractionOptions {
  /** Currently selected (primary) element (owned by usePdfPages). */
  selectedElement: Ref<PdfElement | null>
  /** All selected elements on the current page. */
  selectedElements: Ref<PdfElement[]>
  /** All elements on the current page (snap targets). */
  currentElements: Ref<PdfElement[]>
  /** Id of the element currently being edited inline, if any. */
  editingTextId: Ref<string | null>
  /** Current page width in px. */
  pageWidth: Ref<number>
  /** Current page height in px. */
  pageHeight: Ref<number>
  /** Scrollable wrapper around the canvas (used for fit-to-screen). */
  canvasWrapperRef: Ref<HTMLElement | null>
  /** Selects an element; additive toggles it in a multi-selection. */
  onSelect: (element: PdfElement, additive: boolean) => void
  /** Called once per drag/resize gesture before the first change (undo checkpoint). */
  onBeforeChange?: () => void
}

/** Einrastabstand in Bildschirm-px (unabhängig vom Zoom) */
const SNAP_THRESHOLD_SCREEN_PX = 6

/**
 * Handles direct-manipulation of canvas elements: dragging (also groups, with
 * snapping and guide lines), resizing (free for text, aspect-locked for images)
 * and zoom / fit-to-screen. Alt while dragging disables snapping.
 */
export function useCanvasInteraction(options: UseCanvasInteractionOptions) {
  const {
    selectedElement,
    selectedElements,
    currentElements,
    editingTextId,
    pageWidth,
    pageHeight,
    canvasWrapperRef,
    onSelect,
    onBeforeChange,
  } = options

  const zoomLevel = ref(0.7)
  /** Sichtbare Hilfslinien während des Ziehens (Designer-px) */
  const guides = ref<{ x: number[]; y: number[] }>({ x: [], y: [] })

  // Dragging / resizing state (non-reactive)
  let isDragging = false
  let isTextResizing = false
  let gestureChanged = false
  let resizeDirection = ''
  let dragStartX = 0
  let dragStartY = 0
  let elementStartX = 0
  let elementStartY = 0
  let elementStartWidth = 0
  let elementStartHeight = 0
  /** Startpositionen aller gezogenen Elemente */
  let dragGroup: { el: PdfElement; x: number; y: number }[] = []

  /** Vertical padding used to center the canvas when it fits the viewport. */
  const canvasVerticalPadding = computed(() => {
    if (!canvasWrapperRef.value) return 40
    const wrapperH = canvasWrapperRef.value.clientHeight
    const scaledH = pageHeight.value * zoomLevel.value
    return Math.max(40, (wrapperH - scaledH) / 2)
  })

  function beforeFirstChange() {
    if (gestureChanged) return
    gestureChanged = true
    onBeforeChange?.()
  }

  function selectElement(element: PdfElement, event: MouseEvent) {
    if (editingTextId.value) return
    const additive = event.shiftKey || event.ctrlKey || event.metaKey
    const alreadySelected = selectedElements.value.some((el) => el.id === element.id)

    if (additive) {
      onSelect(element, true)
      // Abgewählt: nicht ziehen
      if (alreadySelected) return
    } else if (!alreadySelected) {
      onSelect(element, false)
    } else {
      // Klick in eine bestehende Mehrfachauswahl: Gruppe bleibt, Element wird primär
      selectedElement.value = element
    }

    isDragging = true
    gestureChanged = false
    dragStartX = event.clientX / zoomLevel.value
    dragStartY = event.clientY / zoomLevel.value
    dragGroup = selectedElements.value.map((el) => ({ el, x: el.x, y: el.y }))
  }

  function startTextResize(event: MouseEvent, direction: string) {
    if (!selectedElement.value) return
    isTextResizing = true
    gestureChanged = false
    resizeDirection = direction
    dragStartX = event.clientX / zoomLevel.value
    dragStartY = event.clientY / zoomLevel.value
    elementStartX = selectedElement.value.x
    elementStartY = selectedElement.value.y
    elementStartWidth = selectedElement.value.width || 300
    elementStartHeight = selectedElement.value.height || selectedElement.value.width || 60
    event.stopPropagation()
  }

  function handleResize(event: MouseEvent, el: PdfElement) {
    const dx = event.clientX / zoomLevel.value - dragStartX
    const dy = event.clientY / zoomLevel.value - dragStartY
    if (dx === 0 && dy === 0) return
    beforeFirstChange()
    const dir = resizeDirection

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
  }

  function handleDrag(event: MouseEvent) {
    if (dragGroup.length === 0) return
    let dx = event.clientX / zoomLevel.value - dragStartX
    let dy = event.clientY / zoomLevel.value - dragStartY
    if (dx === 0 && dy === 0 && !gestureChanged) return
    beforeFirstChange()

    // Gruppe als Ganzes einrasten (an Seite und nicht gezogenen Elementen)
    const startBoxes = dragGroup.map((g) => ({ ...elementBox(g.el), x: g.x, y: g.y }))
    const startBounds = boundsOf(startBoxes)
    if (event.altKey) {
      guides.value = { x: [], y: [] }
    } else {
      const ids = new Set(dragGroup.map((g) => g.el.id))
      const targets = currentElements.value.filter((el) => !ids.has(el.id)).map(elementBox)
      const snap = snapBox(
        { ...startBounds, x: startBounds.x + dx, y: startBounds.y + dy },
        targets,
        { width: pageWidth.value, height: pageHeight.value },
        SNAP_THRESHOLD_SCREEN_PX / zoomLevel.value
      )
      dx = snap.x - startBounds.x
      dy = snap.y - startBounds.y
      guides.value = { x: snap.guidesX, y: snap.guidesY }
    }

    // Wie bisher: linke obere Ecke bleibt in [0, Seite − 50]; die Gruppe bewegt sich gemeinsam
    const minX = Math.min(...dragGroup.map((g) => g.x))
    const maxX = Math.max(...dragGroup.map((g) => g.x))
    const minY = Math.min(...dragGroup.map((g) => g.y))
    const maxY = Math.max(...dragGroup.map((g) => g.y))
    dx = Math.max(-minX, Math.min(pageWidth.value - 50 - maxX, dx))
    dy = Math.max(-minY, Math.min(pageHeight.value - 50 - maxY, dy))

    for (const g of dragGroup) {
      g.el.x = g.x + dx
      g.el.y = g.y + dy
    }
  }

  function handleMouseMove(event: MouseEvent) {
    if (isTextResizing && selectedElement.value) {
      handleResize(event, selectedElement.value)
    } else if (isDragging && !editingTextId.value) {
      handleDrag(event)
    }
  }

  function handleMouseUp() {
    if (isDragging) {
      // Ganzzahlige Positionen wie bei Eingaben im Eigenschaften-Panel
      for (const g of dragGroup) {
        g.el.x = Math.round(g.el.x)
        g.el.y = Math.round(g.el.y)
      }
    }
    isDragging = false
    isTextResizing = false
    resizeDirection = ''
    dragGroup = []
    guides.value = { x: [], y: [] }
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
    guides,
    selectElement,
    startTextResize,
    zoomIn,
    zoomOut,
    fitToScreen,
    resetZoom,
  }
}
