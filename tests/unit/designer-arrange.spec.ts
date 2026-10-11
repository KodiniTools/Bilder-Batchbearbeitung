import { describe, it, expect } from 'vitest'
import { ref } from 'vue'
import { alignBoxes, distributeBoxes, snapBox } from '@/lib/designer/arrange'
import { useDesignerHistory } from '@/composables/useDesignerHistory'
import type { PdfPage } from '@/composables/usePdfPages'

const page = { width: 800, height: 1000 }

describe('snapBox', () => {
  it('rastet an der Seitenmitte ein und meldet die Hilfslinie', () => {
    const r = snapBox({ x: 347, y: 100, width: 100, height: 50 }, [], page, 6)
    expect(r.x).toBe(350)
    expect(r.guidesX).toEqual([400])
    expect(r.y).toBe(100)
    expect(r.guidesY).toEqual([])
  })

  it('rastet an Kanten anderer Elemente ein, nimmt den nächsten Kandidaten', () => {
    const other = { x: 200, y: 300, width: 100, height: 100 }
    const r = snapBox({ x: 304, y: 405, width: 50, height: 50 }, [other], page, 6)
    expect(r.x).toBe(300) // linke Kante an rechter Kante des anderen
    expect(r.y).toBe(400) // obere Kante an unterer Kante
  })

  it('außerhalb der Schwelle keine Änderung', () => {
    const r = snapBox({ x: 120, y: 120, width: 50, height: 50 }, [], page, 6)
    expect(r).toEqual({ x: 120, y: 120, guidesX: [], guidesY: [] })
  })
})

describe('alignBoxes / distributeBoxes', () => {
  it('einzelnes Element richtet sich an der Seite aus', () => {
    expect(alignBoxes([{ x: 10, y: 20, width: 200, height: 100 }], 'centerH', page)).toEqual([
      { x: 300, y: 20 },
    ])
    expect(alignBoxes([{ x: 10, y: 20, width: 200, height: 100 }], 'bottom', page)).toEqual([
      { x: 10, y: 900 },
    ])
  })

  it('mehrere Elemente richten sich an der Auswahl aus', () => {
    const boxes = [
      { x: 10, y: 0, width: 50, height: 10 },
      { x: 100, y: 50, width: 100, height: 10 },
    ]
    expect(alignBoxes(boxes, 'right', page).map((p) => p.x)).toEqual([150, 100])
  })

  it('verteilt mit gleichen Abständen, Reihenfolge der Eingabe bleibt', () => {
    const boxes = [
      { x: 300, y: 0, width: 50, height: 10 },
      { x: 0, y: 0, width: 50, height: 10 },
      { x: 100, y: 0, width: 50, height: 10 },
    ]
    expect(distributeBoxes(boxes, 'horizontal').map((p) => p.x)).toEqual([300, 0, 150])
    expect(distributeBoxes(boxes.slice(0, 2), 'horizontal').map((p) => p.x)).toEqual([300, 0])
  })
})

describe('useDesignerHistory', () => {
  function setup() {
    const pages = ref<PdfPage[]>([
      { id: 'p1', elements: [{ id: 'a', type: 'text', x: 0, y: 0, zIndex: 0, content: 'A' }] },
    ])
    const currentPageIndex = ref(0)
    const history = useDesignerHistory({ pages, currentPageIndex })
    return { pages, history }
  }

  it('Undo und Redo stellen den Stand wieder her', () => {
    const { pages, history } = setup()
    history.checkpoint()
    pages.value[0].elements[0].x = 50
    expect(history.canUndo.value).toBe(true)
    history.undo()
    expect(pages.value[0].elements[0].x).toBe(0)
    expect(history.canRedo.value).toBe(true)
    history.redo()
    expect(pages.value[0].elements[0].x).toBe(50)
  })

  it('gleicher Schlüssel in kurzer Folge ergibt einen Schritt', () => {
    const { pages, history } = setup()
    for (const x of [1, 2, 3]) {
      history.checkpoint('nudge')
      pages.value[0].elements[0].x = x
    }
    history.undo()
    expect(pages.value[0].elements[0].x).toBe(0)
    expect(history.canUndo.value).toBe(false)
  })

  it('neue Änderung verwirft Redo', () => {
    const { pages, history } = setup()
    history.checkpoint()
    pages.value[0].elements[0].x = 5
    history.undo()
    history.checkpoint()
    pages.value[0].elements[0].x = 7
    expect(history.canRedo.value).toBe(false)
  })
})
