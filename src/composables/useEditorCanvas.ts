import { ref, type Ref } from 'vue'
import type { ImageObject } from '@/lib/core/types'

export function useEditorCanvas(
  previewCanvas: Ref<HTMLCanvasElement | null>,
  originalPreviewCanvas: Ref<HTMLCanvasElement | null>,
  previewAreaRef: Ref<HTMLElement | null>,
  canvasWrapperRef: Ref<HTMLElement | null>,
  changesApplied: Ref<boolean>,
  onEditedPreview?: () => void,
) {
  // Internal (non-reactive) canvases / state
  let _workingCanvas: HTMLCanvasElement | null = null
  let _originalCanvas: HTMLCanvasElement | null = null
  let _originalImageObj: ImageObject | null = null
  let _aspectRatio = 1
  let _straightenBase: HTMLCanvasElement | null = null

  // Reactive state
  const currentWidth = ref(0)
  const currentHeight = ref(0)
  const isCropMode = ref(false)
  const cropLockedRatio = ref<number | null>(null)
  const cropNorm = ref({ x: 0, y: 0, w: 1, h: 1 })
  const splitDividerPos = ref(50)
  const isStraightenMode = ref(false)
  const straightenAngle = ref(0)

  let isDraggingSplit = false

  // ── Init ────────────────────────────────────────────────────────
  function init(image: ImageObject) {
    if (!image) return
    _originalImageObj = image

    _workingCanvas = document.createElement('canvas')
    _workingCanvas.width = image.canvas.width
    _workingCanvas.height = image.canvas.height
    _workingCanvas.getContext('2d')?.drawImage(image.canvas, 0, 0)

    _originalCanvas = document.createElement('canvas')
    _originalCanvas.width = image.canvas.width
    _originalCanvas.height = image.canvas.height
    _originalCanvas.getContext('2d')?.drawImage(image.canvas, 0, 0)

    _aspectRatio = _workingCanvas.width / _workingCanvas.height
  }

  // ── Preview ─────────────────────────────────────────────────────
  function updatePreview() {
    if (!previewCanvas.value || !_workingCanvas) return

    currentWidth.value = _workingCanvas.width
    currentHeight.value = _workingCanvas.height

    const panel = previewAreaRef.value
    const maxW = panel ? panel.clientWidth - 48 : 500
    const maxH = panel ? panel.clientHeight - 80 : 500
    const scale = Math.min(maxW / _workingCanvas.width, maxH / _workingCanvas.height, 1)

    const dw = Math.max(1, Math.floor(_workingCanvas.width * scale))
    const dh = Math.max(1, Math.floor(_workingCanvas.height * scale))

    previewCanvas.value.width = dw
    previewCanvas.value.height = dh

    const ctx = previewCanvas.value.getContext('2d')
    if (ctx) {
      ctx.clearRect(0, 0, dw, dh)
      ctx.drawImage(_workingCanvas, 0, 0, dw, dh)
    }

    updateOriginalPreview(dw, dh)

    // Let the editor bake filters (incl. temperature/vibrance/vignette) on top
    onEditedPreview?.()
  }

  function updateOriginalPreview(dw: number, dh: number) {
    if (!originalPreviewCanvas.value || !_originalCanvas) return
    const target = originalPreviewCanvas.value
    target.width = dw
    target.height = dh
    const ctx = target.getContext('2d')
    if (ctx) {
      ctx.clearRect(0, 0, dw, dh)
      ctx.drawImage(_originalCanvas, 0, 0, dw, dh)
    }
  }

  // ── Transforms ──────────────────────────────────────────────────
  function rotate(degrees: number) {
    if (!_workingCanvas) return
    changesApplied.value = false
    const tempCanvas = document.createElement('canvas')
    const tempCtx = tempCanvas.getContext('2d')
    if (!tempCtx) return
    const w = _workingCanvas.width
    const h = _workingCanvas.height
    if (Math.abs(degrees) === 90) {
      tempCanvas.width = h; tempCanvas.height = w
      tempCtx.translate(h / 2, w / 2)
      tempCtx.rotate((degrees * Math.PI) / 180)
      tempCtx.drawImage(_workingCanvas, -w / 2, -h / 2)
      _workingCanvas.width = h; _workingCanvas.height = w
    } else {
      tempCanvas.width = w; tempCanvas.height = h
      tempCtx.translate(w / 2, h / 2)
      tempCtx.rotate((degrees * Math.PI) / 180)
      tempCtx.drawImage(_workingCanvas, -w / 2, -h / 2)
    }
    const ctx = _workingCanvas.getContext('2d')
    if (ctx) { ctx.clearRect(0, 0, _workingCanvas.width, _workingCanvas.height); ctx.drawImage(tempCanvas, 0, 0) }
    _aspectRatio = _workingCanvas.width / _workingCanvas.height
    updatePreview()
  }

  function flip(direction: 'horizontal' | 'vertical') {
    if (!_workingCanvas) return
    changesApplied.value = false
    const tempCanvas = document.createElement('canvas')
    tempCanvas.width = _workingCanvas.width; tempCanvas.height = _workingCanvas.height
    const tempCtx = tempCanvas.getContext('2d')
    if (!tempCtx) return
    tempCtx.save()
    if (direction === 'horizontal') {
      tempCtx.scale(-1, 1); tempCtx.drawImage(_workingCanvas, -_workingCanvas.width, 0)
    } else {
      tempCtx.scale(1, -1); tempCtx.drawImage(_workingCanvas, 0, -_workingCanvas.height)
    }
    tempCtx.restore()
    const ctx = _workingCanvas.getContext('2d')
    if (ctx) { ctx.clearRect(0, 0, _workingCanvas.width, _workingCanvas.height); ctx.drawImage(tempCanvas, 0, 0) }
    updatePreview()
  }

  // ── Crop ────────────────────────────────────────────────────────
  function startCropMode() {
    cropLockedRatio.value = null
    isCropMode.value = true
  }

  function cancelCropMode() { isCropMode.value = false }
  function setCropRatio(ratio: number | null) { cropLockedRatio.value = ratio }
  function onCropUpdate(rect: { x: number; y: number; w: number; h: number }) { cropNorm.value = rect }

  function applyCrop() {
    if (!_workingCanvas) return
    const x = Math.round(cropNorm.value.x * _workingCanvas.width)
    const y = Math.round(cropNorm.value.y * _workingCanvas.height)
    const w = Math.max(1, Math.round(cropNorm.value.w * _workingCanvas.width))
    const h = Math.max(1, Math.round(cropNorm.value.h * _workingCanvas.height))
    const tempCanvas = document.createElement('canvas')
    tempCanvas.width = w; tempCanvas.height = h
    const tempCtx = tempCanvas.getContext('2d')
    if (!tempCtx) return
    tempCtx.drawImage(_workingCanvas, x, y, w, h, 0, 0, w, h)
    _workingCanvas.width = w; _workingCanvas.height = h
    const ctx = _workingCanvas.getContext('2d')
    if (ctx) { ctx.clearRect(0, 0, w, h); ctx.drawImage(tempCanvas, 0, 0) }
    _aspectRatio = w / h
    isCropMode.value = false
    changesApplied.value = false
    updatePreview()
  }

  // ── Straighten / free rotation ──────────────────────────────────
  /**
   * Größtes achsen-paralleles Rechteck, das nach Rotation eines w×h-Bildes
   * um `angle` (rad) noch vollständig innerhalb des Bildes liegt.
   * (Standard-Formel für "rotate & auto-crop".)
   */
  function rotatedRectWithMaxArea(w: number, h: number, angle: number) {
    if (w <= 0 || h <= 0) return { w: 0, h: 0 }
    const widthIsLonger = w >= h
    const sideLong = widthIsLonger ? w : h
    const sideShort = widthIsLonger ? h : w
    const sinA = Math.abs(Math.sin(angle))
    const cosA = Math.abs(Math.cos(angle))

    let wr: number
    let hr: number
    if (sideShort <= 2 * sinA * cosA * sideLong || Math.abs(sinA - cosA) < 1e-10) {
      const x = 0.5 * sideShort
      if (widthIsLonger) { wr = x / sinA; hr = x / cosA }
      else { wr = x / cosA; hr = x / sinA }
    } else {
      const cos2a = cosA * cosA - sinA * sinA
      wr = (w * cosA - h * sinA) / cos2a
      hr = (h * cosA - w * sinA) / cos2a
    }
    return { w: wr, h: hr }
  }

  function startStraighten() {
    if (!_workingCanvas) return
    _straightenBase = document.createElement('canvas')
    _straightenBase.width = _workingCanvas.width
    _straightenBase.height = _workingCanvas.height
    _straightenBase.getContext('2d')?.drawImage(_workingCanvas, 0, 0)
    straightenAngle.value = 0
    isStraightenMode.value = true
  }

  /** Wendet den aktuellen Winkel an (immer ausgehend von der Basis, nicht kumulativ). */
  function setStraightenAngle(deg: number) {
    if (!isStraightenMode.value || !_straightenBase || !_workingCanvas) return
    straightenAngle.value = deg

    const base = _straightenBase
    const bw = base.width
    const bh = base.height
    const ctx = _workingCanvas.getContext('2d')
    if (!ctx) return

    if (deg === 0) {
      _workingCanvas.width = bw
      _workingCanvas.height = bh
      ctx.clearRect(0, 0, bw, bh)
      ctx.drawImage(base, 0, 0)
      _aspectRatio = bw / bh
      changesApplied.value = false
      updatePreview()
      return
    }

    const a = (deg * Math.PI) / 180
    const sin = Math.abs(Math.sin(a))
    const cos = Math.abs(Math.cos(a))
    const rotW = Math.ceil(bw * cos + bh * sin)
    const rotH = Math.ceil(bw * sin + bh * cos)

    const rot = document.createElement('canvas')
    rot.width = rotW
    rot.height = rotH
    const rctx = rot.getContext('2d')
    if (!rctx) return
    rctx.translate(rotW / 2, rotH / 2)
    rctx.rotate(a)
    rctx.drawImage(base, -bw / 2, -bh / 2)

    // Auto-Beschnitt auf größtes eingeschriebenes Rechteck
    const inner = rotatedRectWithMaxArea(bw, bh, a)
    const cropW = Math.max(1, Math.floor(inner.w))
    const cropH = Math.max(1, Math.floor(inner.h))
    const ox = Math.floor((rotW - cropW) / 2)
    const oy = Math.floor((rotH - cropH) / 2)

    _workingCanvas.width = cropW
    _workingCanvas.height = cropH
    ctx.clearRect(0, 0, cropW, cropH)
    ctx.drawImage(rot, ox, oy, cropW, cropH, 0, 0, cropW, cropH)
    _aspectRatio = cropW / cropH
    changesApplied.value = false
    updatePreview()
  }

  function applyStraighten() {
    isStraightenMode.value = false
    _straightenBase = null
  }

  function cancelStraighten() {
    if (_straightenBase && _workingCanvas) {
      _workingCanvas.width = _straightenBase.width
      _workingCanvas.height = _straightenBase.height
      const ctx = _workingCanvas.getContext('2d')
      if (ctx) {
        ctx.clearRect(0, 0, _workingCanvas.width, _workingCanvas.height)
        ctx.drawImage(_straightenBase, 0, 0)
      }
      _aspectRatio = _workingCanvas.width / _workingCanvas.height
    }
    straightenAngle.value = 0
    isStraightenMode.value = false
    _straightenBase = null
    updatePreview()
  }

  // ── Split compare drag ──────────────────────────────────────────
  function startSplitDrag() {
    isDraggingSplit = true
    document.addEventListener('mousemove', onSplitMouseMove)
    document.addEventListener('mouseup', stopSplitDrag)
    document.addEventListener('touchmove', onSplitTouchMove, { passive: false })
    document.addEventListener('touchend', stopSplitDrag)
  }

  function onSplitMouseMove(event: MouseEvent) {
    if (!isDraggingSplit) return
    moveSplitTo(event.clientX)
  }

  function onSplitTouchMove(event: TouchEvent) {
    if (!isDraggingSplit) return
    event.preventDefault()
    moveSplitTo(event.touches[0].clientX)
  }

  function moveSplitTo(clientX: number) {
    if (!canvasWrapperRef.value) return
    const rect = canvasWrapperRef.value.getBoundingClientRect()
    const pos = ((clientX - rect.left) / rect.width) * 100
    splitDividerPos.value = Math.max(2, Math.min(98, pos))
  }

  function stopSplitDrag() {
    isDraggingSplit = false
    document.removeEventListener('mousemove', onSplitMouseMove)
    document.removeEventListener('mouseup', stopSplitDrag)
    document.removeEventListener('touchmove', onSplitTouchMove)
    document.removeEventListener('touchend', stopSplitDrag)
  }

  function dispose() {
    stopSplitDrag()
  }

  // ── Accessors ───────────────────────────────────────────────────
  function getWorkingCanvas() { return _workingCanvas }
  function getOriginalCanvas() { return _originalCanvas }
  function getOriginalImageObj() { return _originalImageObj }
  function getAspectRatio() { return _aspectRatio }
  function setAspectRatio(ratio: number) { _aspectRatio = ratio }

  return {
    // reactive state
    currentWidth,
    currentHeight,
    isCropMode,
    cropLockedRatio,
    cropNorm,
    splitDividerPos,
    isStraightenMode,
    straightenAngle,
    // functions
    init,
    updatePreview,
    rotate,
    flip,
    startCropMode,
    cancelCropMode,
    setCropRatio,
    onCropUpdate,
    applyCrop,
    startStraighten,
    setStraightenAngle,
    applyStraighten,
    cancelStraighten,
    startSplitDrag,
    stopSplitDrag,
    dispose,
    // accessors
    getWorkingCanvas,
    getOriginalCanvas,
    getOriginalImageObj,
    getAspectRatio,
    setAspectRatio,
  }
}
