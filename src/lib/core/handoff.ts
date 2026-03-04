/**
 * KodiniTools Cross-Tool Handoff Protocol
 *
 * Enables image transfer between tools on kodinitools.com via localStorage.
 * All tools share the same origin, so localStorage acts as the transfer channel.
 *
 * Flow:
 *   1. Sender calls `prepareHandoff()` → serializes images → writes to localStorage
 *   2. Sender navigates to target tool with `?handoff=kodinitools` param
 *   3. Receiver calls `checkHandoff()` on mount → reads localStorage → shows banner
 *   4. User accepts → Receiver calls `consumeHandoff()` → imports images → cleans up
 *
 * Constraints:
 *   - localStorage limit: ~5 MB (conservative, varies by browser)
 *   - Images are compressed to JPEG 0.7 quality, max 1200px longest side
 *   - Max 20 images per handoff
 *   - Handoff expires after 5 minutes
 */

const STORAGE_KEY = 'kodinitools-handoff'
const MAX_IMAGES = 20
const MAX_DIMENSION = 1200
const JPEG_QUALITY = 0.7
const EXPIRY_MS = 5 * 60 * 1000 // 5 minutes

export interface HandoffImage {
  name: string
  dataUrl: string
  width: number
  height: number
}

export interface HandoffPayload {
  id: string
  source: string
  target: string
  timestamp: number
  images: HandoffImage[]
}

export type HandoffTarget = 'bildkonverter' | 'collagemaker' | 'color-extractor'

const TARGET_URLS: Record<HandoffTarget, string> = {
  'bildkonverter': 'https://kodinitools.com/bildkonverter/editor',
  'collagemaker': 'https://kodinitools.com/collagemaker/editor',
  'color-extractor': 'https://kodinitools.com/kodini-color-extractor/app'
}

/**
 * Downscale a canvas to fit within MAX_DIMENSION and return a compressed dataUrl.
 */
function compressCanvas(canvas: HTMLCanvasElement): { dataUrl: string; width: number; height: number } {
  let { width, height } = canvas

  if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
    const scale = MAX_DIMENSION / Math.max(width, height)
    width = Math.round(width * scale)
    height = Math.round(height * scale)
  }

  const tmp = document.createElement('canvas')
  tmp.width = width
  tmp.height = height
  const ctx = tmp.getContext('2d')!
  ctx.drawImage(canvas, 0, 0, width, height)

  return {
    dataUrl: tmp.toDataURL('image/jpeg', JPEG_QUALITY),
    width,
    height
  }
}

/**
 * SENDER: Prepare and store a handoff payload, then return the target URL.
 *
 * @param canvases - Array of { name, canvas } from the current tool
 * @param target - Which KodiniTool to hand off to
 * @returns The full URL to navigate to, or null if handoff failed (e.g. storage full)
 */
export function prepareHandoff(
  canvases: Array<{ name: string; canvas: HTMLCanvasElement }>,
  target: HandoffTarget
): string | null {
  const limited = canvases.slice(0, MAX_IMAGES)

  const images: HandoffImage[] = limited.map(({ name, canvas }) => {
    const { dataUrl, width, height } = compressCanvas(canvas)
    return { name, dataUrl, width, height }
  })

  const payload: HandoffPayload = {
    id: `hoff_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    source: 'bilder-batchbearbeitung',
    target,
    timestamp: Date.now(),
    images
  }

  try {
    const json = JSON.stringify(payload)

    // Safety check: warn if payload is huge (> 4 MB)
    if (json.length > 4 * 1024 * 1024) {
      console.warn('[Handoff] Payload too large, reducing image count')
      // Retry with fewer images
      payload.images = images.slice(0, Math.max(1, Math.floor(images.length / 2)))
      const reducedJson = JSON.stringify(payload)
      localStorage.setItem(STORAGE_KEY, reducedJson)
    } else {
      localStorage.setItem(STORAGE_KEY, json)
    }

    const url = new URL(TARGET_URLS[target])
    url.searchParams.set('handoff', 'kodinitools')
    return url.toString()
  } catch (e) {
    console.error('[Handoff] Failed to store payload:', e)
    // Clean up on failure
    localStorage.removeItem(STORAGE_KEY)
    return null
  }
}

/**
 * RECEIVER: Check if a handoff is waiting.
 * Call this on app mount when `?handoff=kodinitools` is in the URL.
 *
 * @returns The handoff payload if valid and not expired, otherwise null
 */
export function checkHandoff(): HandoffPayload | null {
  const params = new URLSearchParams(window.location.search)
  if (params.get('handoff') !== 'kodinitools') return null

  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null

    const payload: HandoffPayload = JSON.parse(raw)

    // Check expiry
    if (Date.now() - payload.timestamp > EXPIRY_MS) {
      localStorage.removeItem(STORAGE_KEY)
      return null
    }

    // Validate structure
    if (!payload.images || !Array.isArray(payload.images) || payload.images.length === 0) {
      localStorage.removeItem(STORAGE_KEY)
      return null
    }

    return payload
  } catch {
    localStorage.removeItem(STORAGE_KEY)
    return null
  }
}

/**
 * RECEIVER: Consume (accept) the handoff and clean up.
 * Returns the images as an array ready for import into the target tool's store.
 */
export function consumeHandoff(): HandoffImage[] | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null

    const payload: HandoffPayload = JSON.parse(raw)
    localStorage.removeItem(STORAGE_KEY)

    // Clean URL param
    const url = new URL(window.location.href)
    url.searchParams.delete('handoff')
    window.history.replaceState({}, '', url.toString())

    return payload.images
  } catch {
    localStorage.removeItem(STORAGE_KEY)
    return null
  }
}

/**
 * RECEIVER: Dismiss the handoff without importing.
 */
export function dismissHandoff(): void {
  localStorage.removeItem(STORAGE_KEY)

  const url = new URL(window.location.href)
  url.searchParams.delete('handoff')
  window.history.replaceState({}, '', url.toString())
}

/**
 * Convert a HandoffImage dataUrl back to a canvas (for receiver-side use).
 */
export function handoffImageToCanvas(img: HandoffImage): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = image.naturalWidth
      canvas.height = image.naturalHeight
      const ctx = canvas.getContext('2d')
      if (!ctx) return reject(new Error('Canvas context not available'))
      ctx.drawImage(image, 0, 0)
      resolve(canvas)
    }
    image.onerror = () => reject(new Error(`Failed to load image: ${img.name}`))
    image.src = img.dataUrl
  })
}
