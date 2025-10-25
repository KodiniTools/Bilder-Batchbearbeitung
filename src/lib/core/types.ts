// src/lib/core/types.ts
// Zentrale TypeScript-Typdefinitionen für die Bildverarbeitung

export interface ImageFormat {
  name: string
  mimeType: string
  ext: string
}

export interface ImageObject {
  id: string
  file: File
  image: HTMLImageElement
  canvas: HTMLCanvasElement
  ctx: CanvasRenderingContext2D
  originalWidth: number
  originalHeight: number
  selected: boolean
  outputName: string
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
