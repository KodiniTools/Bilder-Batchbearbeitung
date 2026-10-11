import { ref, computed, watch, type Ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { PdfElement, PdfShapeKind } from '@/lib/features/export-pdf'
import { useConfirm } from '@/composables/useConfirm'
import { alignBoxes, distributeBoxes, elementBox, type AlignMode } from '@/lib/designer/arrange'
import { createColorBackground, createImageBackground, createShape } from '@/lib/designer/shapes'

export interface PdfPage {
  id: string
  elements: PdfElement[]
}

/** Generate a unique element / page id. */
export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2)
}

/** Höchstzahl Elemente pro Seite (wie die Sperre in PdfDesignerTools) */
export const MAX_ELEMENTS_PER_PAGE = 20

/** Versatz für Duplikate und eingefügte Elemente in px */
const PASTE_OFFSET = 20

/** Zwischenablage, gemeinsam für Startseite und Kommentarseiten */
let clipboard: PdfElement[] = []

interface UsePdfPagesOptions {
  /** Current page width in px (depends on orientation). */
  pageWidth: Ref<number>
  /** Current page height in px (depends on orientation). */
  pageHeight: Ref<number>
  /** Hidden file input used for image uploads. */
  imageInput: Ref<HTMLInputElement | null>
  /** The canvas element (used to detect background clicks). */
  canvasRef: Ref<HTMLElement | null>
  /** Single-page document (cover page): no page management, all elements on page 1. */
  singlePage?: Ref<boolean>
  /**
   * Wird VOR jeder Änderung aufgerufen (Undo-Checkpoint). Gleicher Schlüssel
   * in kurzer Folge = ein Schritt.
   */
  onBeforeChange?: (key?: string) => void
}

/**
 * Owns the page state of the PdfPageDesigner (cover page or comment pages):
 * pages, current page, selection and all element / page CRUD operations.
 */
export function usePdfPages(options: UsePdfPagesOptions) {
  const { pageWidth, pageHeight, imageInput, canvasRef, singlePage, onBeforeChange } = options
  const { t } = useI18n()
  const dialog = useConfirm()

  const pages = ref<PdfPage[]>([{ id: generateId(), elements: [] }])
  const currentPageIndex = ref(0)
  /** Primär ausgewähltes Element (Eigenschaften-Panel, Größenänderung) */
  const selectedElement = ref<PdfElement | null>(null)
  /** Alle ausgewählten Elemente der aktuellen Seite (Mehrfachauswahl) */
  const selectedIds = ref<string[]>([])
  const editingTextId = ref<string | null>(null)

  const currentElements = computed(() => pages.value[currentPageIndex.value].elements)
  const selectedElements = computed(() =>
    currentElements.value.filter((el) => selectedIds.value.includes(el.id))
  )
  /** Seitenhintergrund der aktuellen Seite (Farbe oder Bild) */
  const currentBackground = computed(
    () => currentElements.value.find((el) => el.background) ?? null
  )

  // Wer selectedElement direkt setzt, wählt genau dieses Element aus
  watch(
    selectedElement,
    (el) => {
      if (!el) selectedIds.value = []
      else if (!selectedIds.value.includes(el.id)) selectedIds.value = [el.id]
    },
    { flush: 'sync' }
  )

  function change(key?: string) {
    onBeforeChange?.(key)
  }

  function clearSelection() {
    selectedElement.value = null
    editingTextId.value = null
  }

  /** Auswahl setzen; additiv (Umschalt/Strg) schaltet das Element in der Auswahl um. */
  function selectElement(element: PdfElement, additive = false) {
    if (!additive) {
      selectedIds.value = [element.id]
      selectedElement.value = element
      return
    }
    if (selectedIds.value.includes(element.id)) {
      const rest = selectedIds.value.filter((id) => id !== element.id)
      selectedIds.value = rest
      const lastId = rest[rest.length - 1]
      selectedElement.value = currentElements.value.find((el) => el.id === lastId) ?? null
    } else {
      selectedIds.value = [...selectedIds.value, element.id]
      selectedElement.value = element
    }
  }

  function selectAll() {
    const els = currentElements.value.filter((el) => !el.background)
    if (els.length === 0) return
    selectedIds.value = els.map((el) => el.id)
    selectedElement.value = els[els.length - 1]
  }

  /** Auswahl nach Undo/Redo auf die neuen Objekte mit gleicher id setzen. */
  function reselectAfterRestore() {
    editingTextId.value = null
    const ids = selectedIds.value.filter((id) => currentElements.value.some((el) => el.id === id))
    const primaryId = selectedElement.value?.id
    selectedIds.value = ids
    selectedElement.value =
      currentElements.value.find((el) => el.id === primaryId && ids.includes(el.id)) ??
      currentElements.value.find((el) => el.id === ids[ids.length - 1]) ??
      null
  }

  /** Total element count across all pages. */
  function getTotalElementCount(): number {
    return pages.value.reduce((total, page) => total + page.elements.length, 0)
  }

  /** Load initial elements, distributing them across pages by their page number. */
  function initFromElements(initialElements: PdfElement[]) {
    selectedElement.value = null
    editingTextId.value = null
    currentPageIndex.value = 0

    if (initialElements && initialElements.length > 0) {
      const elementsByPage = new Map<number, PdfElement[]>()
      const elements: PdfElement[] = JSON.parse(JSON.stringify(initialElements))

      elements.forEach((el) => {
        // Backward compatibility: add width/height for text elements that don't have them
        if (el.type === 'text') {
          if (!el.width) el.width = 300
          if (!el.height) el.height = 60
        }
        const pageNum = singlePage?.value ? 1 : el.page || 1
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
  function exportElements(): PdfElement[] {
    return pages.value.flatMap((page, pageIndex) =>
      page.elements.map((element) => ({
        ...element,
        page: pageIndex + 1,
      }))
    )
  }

  // ── Page management ─────────────────────────────────────────────
  function addNewPage() {
    if (singlePage?.value) return
    change()
    pages.value.push({ id: generateId(), elements: [] })
    currentPageIndex.value = pages.value.length - 1
    selectedElement.value = null
  }

  async function deletePage() {
    if (pages.value.length === 1) {
      await dialog.alert(t('alerts.cannotDeleteLastPage'))
      return
    }

    const page = pages.value[currentPageIndex.value]
    const ok = await dialog.confirm({
      message: t('alerts.confirmDeletePage', { page: currentPageIndex.value + 1 }),
      confirmLabel: t('dialog.delete'),
      danger: true,
    })
    // Seite per Objekt suchen: Während der Rückfrage kann sich der Index nicht ändern, sicher ist sicher
    const index = pages.value.indexOf(page)
    if (!ok || index === -1 || pages.value.length === 1) return

    change()
    pages.value.splice(index, 1)
    if (currentPageIndex.value >= pages.value.length) {
      currentPageIndex.value = pages.value.length - 1
    }
    selectedElement.value = null
    editingTextId.value = null
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

  /** Kopie der aktuellen Seite (neue ids) direkt dahinter einfügen und anzeigen. */
  function duplicatePage() {
    if (singlePage?.value) return
    change()
    const source = pages.value[currentPageIndex.value]
    const copy: PdfPage = {
      id: generateId(),
      elements: source.elements.map((el) => ({ ...el, id: generateId() })),
    }
    pages.value.splice(currentPageIndex.value + 1, 0, copy)
    goToPage(currentPageIndex.value + 1)
  }

  /** Seite verschieben (Drag-and-Drop in der Thumbnail-Leiste); die angezeigte Seite bleibt. */
  function movePage(from: number, to: number) {
    const count = pages.value.length
    if (from === to || from < 0 || to < 0 || from >= count || to >= count) return
    change()
    const current = pages.value[currentPageIndex.value]
    const [moved] = pages.value.splice(from, 1)
    pages.value.splice(to, 0, moved)
    currentPageIndex.value = pages.value.indexOf(current)
  }

  // ── Element management ──────────────────────────────────────────
  function addTextElement() {
    const newElement: PdfElement = {
      id: generateId(),
      type: 'text',
      content: t('frontPageDesigner.element.text.default'),
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

    change()
    currentElements.value.push(newElement)
    selectedElement.value = newElement
  }

  function addShapeElement(kind: PdfShapeKind) {
    if (currentElements.value.length >= MAX_ELEMENTS_PER_PAGE) return
    const z = Math.max(...currentElements.value.map((el) => el.zIndex), 0) + 1
    const shape = createShape(
      kind,
      generateId(),
      { width: pageWidth.value, height: pageHeight.value },
      z
    )
    change()
    currentElements.value.push(shape)
    const added = currentElements.value[currentElements.value.length - 1]
    selectedIds.value = [added.id]
    selectedElement.value = added
  }

  // ── Seitenhintergrund ───────────────────────────────────────────
  function replaceBackground(next: PdfElement | null) {
    const page = pages.value[currentPageIndex.value]
    const rest = page.elements.filter((el) => !el.background)
    page.elements = next ? [next, ...rest] : rest
  }

  /** Hintergrundfarbe setzen; schnelle Folgeänderungen (Farbwähler) = ein Undo-Schritt. */
  function setBackgroundColor(color: string) {
    const bg = currentBackground.value
    if (bg && bg.type === 'shape') {
      change(`bg-color:${bg.id}`)
      bg.fillColor = color
      return
    }
    if (!bg && currentElements.value.length >= MAX_ELEMENTS_PER_PAGE) return
    change()
    const page = { width: pageWidth.value, height: pageHeight.value }
    replaceBackground(createColorBackground(generateId(), color, page))
  }

  function setBackgroundImage(src: string) {
    if (!currentBackground.value && currentElements.value.length >= MAX_ELEMENTS_PER_PAGE) return
    change()
    const page = { width: pageWidth.value, height: pageHeight.value }
    replaceBackground(createImageBackground(generateId(), src, page))
  }

  function removeBackground() {
    if (!currentBackground.value) return
    change()
    replaceBackground(null)
  }

  // ── Vorlagen ────────────────────────────────────────────────────
  /** Inhalt der aktuellen Seite durch Vorlagen-Elemente ersetzen (Rückfrage, wenn nicht leer). */
  async function applyTemplateElements(elements: PdfElement[]): Promise<boolean> {
    const page = pages.value[currentPageIndex.value]
    if (page.elements.length > 0) {
      const ok = await dialog.confirm({
        message: t('commentPageDesigner.templates.confirmReplace'),
        confirmLabel: t('commentPageDesigner.templates.replace'),
      })
      if (!ok || !pages.value.includes(page)) return false
    }
    change()
    page.elements = elements.slice(0, MAX_ELEMENTS_PER_PAGE)
    clearSelection()
    return true
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
        const newElement: PdfElement = {
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
        change()
        currentElements.value.push(newElement)
        selectedElement.value = newElement
      }
      img.src = result
    }
    reader.readAsDataURL(file)
    ;(event.target as HTMLInputElement).value = ''
  }

  async function clearCurrentPage() {
    const page = pages.value[currentPageIndex.value]
    const ok = await dialog.confirm({
      message: t('alerts.confirmClearPage', { page: currentPageIndex.value + 1 }),
      confirmLabel: t('dialog.clear'),
      danger: true,
    })
    if (!ok || !pages.value.includes(page)) return
    change()
    page.elements.length = 0
    selectedElement.value = null
    editingTextId.value = null
  }

  function deleteSelectedElement() {
    const ids = selectedIds.value
    if (ids.length === 0) return
    change()
    const page = pages.value[currentPageIndex.value]
    page.elements = page.elements.filter((el) => !ids.includes(el.id))
    clearSelection()
  }

  function moveToFront() {
    if (!selectedElement.value) return
    change()
    const maxZ = Math.max(...currentElements.value.map((el) => el.zIndex), 0)
    selectedElement.value.zIndex = maxZ + 1
  }

  function moveToBack() {
    if (!selectedElement.value) return
    change()
    const minZ = Math.min(...currentElements.value.map((el) => el.zIndex), 0)
    selectedElement.value.zIndex = minZ - 1
  }

  // ── Duplizieren, Kopieren, Einfügen, Verschieben ───────────────
  /** Kopien mit neuen ids, versetzt und obenauf; begrenzt auf die freien Plätze der Seite. */
  function insertCopies(sources: PdfElement[]) {
    const free = MAX_ELEMENTS_PER_PAGE - currentElements.value.length
    if (sources.length === 0 || free <= 0) return
    change()
    let z = Math.max(...currentElements.value.map((el) => el.zIndex), 0)
    const copies = sources.slice(0, free).map((el) => ({
      ...el,
      id: generateId(),
      x: Math.min(el.x + PASTE_OFFSET, Math.max(0, pageWidth.value - 50)),
      y: Math.min(el.y + PASTE_OFFSET, Math.max(0, pageHeight.value - 50)),
      zIndex: ++z,
    }))
    currentElements.value.push(...copies)
    const inserted = currentElements.value.slice(-copies.length)
    selectedIds.value = inserted.map((el) => el.id)
    selectedElement.value = inserted[inserted.length - 1]
  }

  function duplicateSelected() {
    insertCopies(selectedElements.value)
  }

  function copySelected(): boolean {
    if (selectedElements.value.length === 0) return false
    clipboard = selectedElements.value.map((el) => ({ ...el }))
    return true
  }

  function pasteClipboard(): boolean {
    if (clipboard.length === 0) return false
    insertCopies(clipboard)
    // Wiederholtes Einfügen versetzt weiter
    clipboard = clipboard.map((el) => ({ ...el, x: el.x + PASTE_OFFSET, y: el.y + PASTE_OFFSET }))
    return true
  }

  /** Auswahl per Pfeiltaste verschieben; bleibt auf der Seite. */
  function nudgeSelected(dx: number, dy: number) {
    const els = selectedElements.value
    if (els.length === 0) return
    change('nudge')
    for (const el of els) {
      el.x = Math.max(0, Math.min(pageWidth.value - 50, el.x + dx))
      el.y = Math.max(0, Math.min(pageHeight.value - 50, el.y + dy))
    }
  }

  function alignSelected(mode: AlignMode) {
    const els = selectedElements.value
    if (els.length === 0) return
    change()
    const positions = alignBoxes(els.map(elementBox), mode, {
      width: pageWidth.value,
      height: pageHeight.value,
    })
    els.forEach((el, i) => {
      el.x = Math.round(positions[i].x)
      el.y = Math.round(positions[i].y)
    })
  }

  function distributeSelected(axis: 'horizontal' | 'vertical') {
    const els = selectedElements.value
    if (els.length < 3) return
    change()
    const positions = distributeBoxes(els.map(elementBox), axis)
    els.forEach((el, i) => {
      el.x = Math.round(positions[i].x)
      el.y = Math.round(positions[i].y)
    })
  }

  // ── Inline text editing ─────────────────────────────────────────
  function startInlineEdit(element: PdfElement) {
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
      clearSelection()
    }
  }

  return {
    // state
    pages,
    currentPageIndex,
    selectedElement,
    selectedIds,
    selectedElements,
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
    duplicatePage,
    movePage,
    // selection
    selectElement,
    selectAll,
    clearSelection,
    reselectAfterRestore,
    // element management
    addTextElement,
    addShapeElement,
    currentBackground,
    setBackgroundColor,
    setBackgroundImage,
    removeBackground,
    applyTemplateElements,
    triggerImageUpload,
    handleImageUpload,
    clearCurrentPage,
    deleteSelectedElement,
    moveToFront,
    moveToBack,
    duplicateSelected,
    copySelected,
    pasteClipboard,
    nudgeSelected,
    alignSelected,
    distributeSelected,
    // inline editing
    startInlineEdit,
    stopInlineEdit,
    handleCanvasClick,
  }
}
