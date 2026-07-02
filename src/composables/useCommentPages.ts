import { ref, computed, type Ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { CanvasElement } from '@/lib/features/export-pdf'

export interface CommentPage {
  id: string
  elements: CanvasElement[]
}

/** Generate a unique element / page id. */
export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2)
}

interface UseCommentPagesOptions {
  /** Current page width in px (depends on orientation). */
  pageWidth: Ref<number>
  /** Current page height in px (depends on orientation). */
  pageHeight: Ref<number>
  /** Hidden file input used for image uploads. */
  imageInput: Ref<HTMLInputElement | null>
  /** The canvas element (used to detect background clicks). */
  canvasRef: Ref<HTMLElement | null>
}

/**
 * Owns the multi-page document state of the CommentPageDesigner:
 * pages, current page, selection and all element / page CRUD operations.
 */
export function useCommentPages(options: UseCommentPagesOptions) {
  const { pageWidth, pageHeight, imageInput, canvasRef } = options
  const { t } = useI18n()

  const pages = ref<CommentPage[]>([{ id: generateId(), elements: [] }])
  const currentPageIndex = ref(0)
  const selectedElement = ref<CanvasElement | null>(null)
  const editingTextId = ref<string | null>(null)

  const currentElements = computed(() => pages.value[currentPageIndex.value].elements)

  /** Total element count across all pages. */
  function getTotalElementCount(): number {
    return pages.value.reduce((total, page) => total + page.elements.length, 0)
  }

  /** Load initial elements, distributing them across pages by their page number. */
  function initFromElements(initialElements: CanvasElement[]) {
    selectedElement.value = null
    editingTextId.value = null
    currentPageIndex.value = 0

    if (initialElements && initialElements.length > 0) {
      const elementsByPage = new Map<number, CanvasElement[]>()
      const elements: CanvasElement[] = JSON.parse(JSON.stringify(initialElements))

      elements.forEach((el) => {
        // Backward compatibility: add width/height for text elements that don't have them
        if (el.type === 'text') {
          if (!el.width) el.width = 300
          if (!el.height) el.height = 60
        }
        const pageNum = el.page || 1
        const bucket = elementsByPage.get(pageNum)
        if (bucket) {
          bucket.push(el)
        } else {
          elementsByPage.set(pageNum, [el])
        }
      })

      const pageNumbers = Array.from(elementsByPage.keys()).sort((a, b) => a - b)
      pages.value = pageNumbers.map((pageNum) => ({
        id: generateId(),
        elements: elementsByPage.get(pageNum) ?? [],
      }))
    } else {
      // No initial elements — start fresh with one empty page
      pages.value = [{ id: generateId(), elements: [] }]
    }
  }

  /** Flatten all pages into a single element list, stamping each with its page number. */
  function exportElements(): CanvasElement[] {
    return pages.value.flatMap((page, pageIndex) =>
      page.elements.map((element) => ({
        ...element,
        page: pageIndex + 1,
      })),
    )
  }

  // ── Page management ─────────────────────────────────────────────
  function addNewPage() {
    pages.value.push({ id: generateId(), elements: [] })
    currentPageIndex.value = pages.value.length - 1
    selectedElement.value = null
  }

  function deletePage() {
    if (pages.value.length === 1) {
      alert(t('alerts.cannotDeleteLastPage'))
      return
    }

    if (confirm(t('alerts.confirmDeletePage', { page: currentPageIndex.value + 1 }))) {
      pages.value.splice(currentPageIndex.value, 1)

      if (currentPageIndex.value >= pages.value.length) {
        currentPageIndex.value = pages.value.length - 1
      }

      selectedElement.value = null
      editingTextId.value = null
    }
  }

  function previousPage() {
    if (currentPageIndex.value > 0) {
      currentPageIndex.value--
      selectedElement.value = null
      editingTextId.value = null
    }
  }

  function nextPage() {
    if (currentPageIndex.value < pages.value.length - 1) {
      currentPageIndex.value++
      selectedElement.value = null
      editingTextId.value = null
    }
  }

  function goToPage(index: number) {
    currentPageIndex.value = index
    selectedElement.value = null
    editingTextId.value = null
  }

  // ── Element management ──────────────────────────────────────────
  function addTextElement() {
    const newElement: CanvasElement = {
      id: generateId(),
      type: 'text',
      content: 'Neuer Text',
      x: Math.random() * (pageWidth.value - 350),
      y: Math.random() * (pageHeight.value - 100),
      width: 300,
      height: 60,
      fontSize: 24,
      fontFamily: 'Helvetica',
      color: '#000000',
      align: 'left',
      bold: false,
      italic: false,
      zIndex: currentElements.value.length,
    }

    currentElements.value.push(newElement)
    selectedElement.value = newElement
  }

  function triggerImageUpload() {
    imageInput.value?.click()
  }

  function handleImageUpload(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      const result = e.target?.result as string
      const img = new Image()
      img.onload = () => {
        const maxW = Math.min(400, pageWidth.value * 0.5)
        const ratio = img.height / img.width
        const w = Math.min(img.width, maxW)
        const h = Math.round(w * ratio)
        const newElement: CanvasElement = {
          id: generateId(),
          type: 'image',
          src: result,
          x: Math.max(0, Math.round(Math.random() * (pageWidth.value - w - 40))),
          y: Math.max(0, Math.round(Math.random() * (pageHeight.value - h - 40))),
          width: w,
          height: h,
          opacity: 1,
          zIndex: currentElements.value.length,
        }
        currentElements.value.push(newElement)
        selectedElement.value = newElement
      }
      img.src = result
    }
    reader.readAsDataURL(file)

    ;(event.target as HTMLInputElement).value = ''
  }

  function clearCurrentPage() {
    if (confirm(t('alerts.confirmClearPage', { page: currentPageIndex.value + 1 }))) {
      currentElements.value.length = 0
      selectedElement.value = null
      editingTextId.value = null
    }
  }

  function deleteSelectedElement() {
    const selected = selectedElement.value
    if (!selected) return

    const index = currentElements.value.findIndex((el) => el.id === selected.id)
    if (index !== -1) {
      currentElements.value.splice(index, 1)
      selectedElement.value = null
      editingTextId.value = null
    }
  }

  function moveToFront() {
    if (!selectedElement.value) return
    const maxZ = Math.max(...currentElements.value.map((el) => el.zIndex), 0)
    selectedElement.value.zIndex = maxZ + 1
  }

  function moveToBack() {
    if (!selectedElement.value) return
    const minZ = Math.min(...currentElements.value.map((el) => el.zIndex), 0)
    selectedElement.value.zIndex = minZ - 1
  }

  // ── Inline text editing ─────────────────────────────────────────
  function startInlineEdit(element: CanvasElement) {
    if (element.type !== 'text') return
    editingTextId.value = element.id
    selectedElement.value = element
  }

  function stopInlineEdit() {
    editingTextId.value = null
  }

  function handleCanvasClick(event: MouseEvent) {
    const target = event.target as HTMLElement
    if (target === canvasRef.value || target.classList.contains('canvas-grid')) {
      selectedElement.value = null
      editingTextId.value = null
    }
  }

  return {
    // state
    pages,
    currentPageIndex,
    selectedElement,
    editingTextId,
    currentElements,
    // document lifecycle
    getTotalElementCount,
    initFromElements,
    exportElements,
    // page management
    addNewPage,
    deletePage,
    previousPage,
    nextPage,
    goToPage,
    // element management
    addTextElement,
    triggerImageUpload,
    handleImageUpload,
    clearCurrentPage,
    deleteSelectedElement,
    moveToFront,
    moveToBack,
    // inline editing
    startInlineEdit,
    stopInlineEdit,
    handleCanvasClick,
  }
}
