// src/lib/imageProcessor.ts
// Image processing utilities

export interface ImageFormat {
  name: string
  ext: string
  mimeType: string
}

export const availableFormats: ImageFormat[] = [
  { name: 'PNG', ext: 'png', mimeType: 'image/png' },
  { name: 'JPEG', ext: 'jpg', mimeType: 'image/jpeg' },
  { name: 'WebP', ext: 'webp', mimeType: 'image/webp' },
]

/**
 * Check if a format is supported by the browser
 */
export function supportsFormat(mimeType: string): boolean {
  const canvas = document.createElement('canvas')
  canvas.width = 1
  canvas.height = 1
  
  try {
    const dataUrl = canvas.toDataURL(mimeType)
    return dataUrl.indexOf(`data:${mimeType}`) === 0
  } catch {
    return false
  }
}

/**
 * Get file extension from filename
 */
export function getFileExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.')
  return lastDot > 0 ? filename.substring(lastDot + 1) : ''
}

/**
 * Get filename without extension
 */
export function getFileNameWithoutExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.')
  return lastDot > 0 ? filename.substring(0, lastDot) : filename
}

/**
 * Create safe basename for file
 */
export function safeBaseName(name: string): string {
  return name.replace(/[^a-zA-Z0-9_-]/g, '_')
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

/**
 * Rotate image on canvas
 */
export function rotateCanvas(canvas: HTMLCanvasElement, degrees: number): HTMLCanvasElement {
  const newCanvas = document.createElement('canvas')
  const ctx = newCanvas.getContext('2d')
  if (!ctx) return canvas

  const radians = (degrees * Math.PI) / 180

  if (degrees === 90 || degrees === -90 || degrees === 270) {
    newCanvas.width = canvas.height
    newCanvas.height = canvas.width
  } else {
    newCanvas.width = canvas.width
    newCanvas.height = canvas.height
  }

  ctx.translate(newCanvas.width / 2, newCanvas.height / 2)
  ctx.rotate(radians)
  ctx.drawImage(canvas, -canvas.width / 2, -canvas.height / 2)

  return newCanvas
}

/**
 * Flip image on canvas
 */
export function flipCanvas(
  canvas: HTMLCanvasElement,
  direction: 'horizontal' | 'vertical'
): HTMLCanvasElement {
  const newCanvas = document.createElement('canvas')
  newCanvas.width = canvas.width
  newCanvas.height = canvas.height
  const ctx = newCanvas.getContext('2d')
  if (!ctx) return canvas

  if (direction === 'horizontal') {
    ctx.scale(-1, 1)
    ctx.drawImage(canvas, -canvas.width, 0)
  } else {
    ctx.scale(1, -1)
    ctx.drawImage(canvas, 0, -canvas.height)
  }

  return newCanvas
}

/**
 * Resize canvas
 */
export function resizeCanvas(
  canvas: HTMLCanvasElement,
  width: number,
  height: number
): HTMLCanvasElement {
  const newCanvas = document.createElement('canvas')
  newCanvas.width = width
  newCanvas.height = height
  const ctx = newCanvas.getContext('2d')
  if (!ctx) return canvas

  ctx.drawImage(canvas, 0, 0, width, height)

  return newCanvas
}

/**
 * Convert canvas to blob with specific format
 */
export async function canvasToBlob(
  canvas: HTMLCanvasElement,
  format: ImageFormat,
  quality = 0.92
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob)
        } else {
          reject(new Error('Failed to create blob from canvas'))
        }
      },
      format.mimeType,
      quality
    )
  })
}

/**
 * Load image file to canvas
 */
export async function loadImageToCanvas(file: File): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('Failed to get canvas context'))
        return
      }
      
      ctx.drawImage(img, 0, 0)
      URL.revokeObjectURL(img.src)
      resolve(canvas)
    }
    
    img.onerror = () => {
      URL.revokeObjectURL(img.src)
      reject(new Error('Failed to load image'))
    }
    
    img.src = URL.createObjectURL(file)
  })
}

/**
 * Create preview URL from canvas
 */
export function createPreviewUrl(canvas: HTMLCanvasElement): string {
  return canvas.toDataURL('image/png')
}

// Export as singleton for convenience
export const imageProcessor = {
  availableFormats,
  supportsFormat,
  getFileExtension,
  getFileNameWithoutExtension,
  safeBaseName,
  formatFileSize,
  rotateCanvas,
  flipCanvas,
  resizeCanvas,
  canvasToBlob,
  loadImageToCanvas,
  createPreviewUrl,
}
