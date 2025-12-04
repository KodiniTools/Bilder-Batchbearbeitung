// src/lib/core/types.ts
// Zentrale TypeScript-Typdefinitionen für die Bildverarbeitung

export interface ImageFormat {
  name: string
  mimeType: string
  ext: string
}

export interface ImageFilters {
  brightness: number  // 0-200, default 100
  contrast: number    // 0-200, default 100
  saturation: number  // 0-200, default 100
  hue: number         // 0-360, default 0
  opacity: number     // 0-100, default 100
  blur: number        // 0-20, default 0
}

export const defaultFilters: ImageFilters = {
  brightness: 100,
  contrast: 100,
  saturation: 100,
  hue: 0,
  opacity: 100,
  blur: 0
}

export interface ImageObject {
  id: string
  file: File
  image: HTMLImageElement
  canvas: HTMLCanvasElement
  ctx: CanvasRenderingContext2D
  originalCanvas: HTMLCanvasElement
  originalWidth: number
  originalHeight: number
  selected: boolean
  outputName: string
  filters?: ImageFilters
}

export interface PdfSettings {
  title: string
  author: string
  includeTitlePage: boolean
  includeCommentPage: boolean
  includeFileName: boolean
  optimizeSize: boolean
  orientation: 'auto' | 'portrait' | 'landscape'
  commentText?: string
  commentImageData?: string | null
  hasCommentImage?: boolean
}

export interface EditorState {
  currentImage: ImageObject | null
  originalCanvas: HTMLCanvasElement | null
}

export type TransformOperation = 'rotateLeft' | 'rotateRight' | 'rotate180' | 'flipHorizontal' | 'flipVertical'
