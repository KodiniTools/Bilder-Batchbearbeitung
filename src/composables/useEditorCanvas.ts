import { ref, type Ref } from 'vue'
import type { ImageObject } from '@/lib/core/types'

export function useEditorCanvas(
  previewCanvas: Ref<HTMLCanvasElement | null>,
  originalPreviewCanvas: Ref<HTMLCanvasElement | null>,
  previewAreaRef: Ref<HTMLElement | null>,
  canvasWrapperRef: Ref<HTMLElement | null>,
  changesApplied: Ref<boolean>,
) {
  // Internal (non-reactive) canvases / state
  let _workingCanvas: HTMLCanvasElement | null = null
  let _originalCanvas: HTMLCanvasElement | null = null
  let _originalImageObj: ImageObject | null = null
  let _aspectRatio = 1

  // Reactive state
  const currentWidth = ref(0)
  const currentHeight = ref(0)
  const isCropMode = ref(false)
  const cropLockedRatio = ref<number | null>(null)
  const cropNorm = ref({ x: 0, y: 0, w: 1, h: 1 })
  const splitDividerPos = ref(50)

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
