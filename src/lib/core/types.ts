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
  grayscale: number   // 0-100, default 0
  sepia: number       // 0-100, default 0
  invert: number      // 0-100, default 0
}

export const defaultFilters: ImageFilters = {
  brightness: 100,
  contrast: 100,
  saturation: 100,
  hue: 0,
  opacity: 100,
  blur: 0,
  grayscale: 0,
  sepia: 0,
  invert: 0
}

export interface ImageTransforms {
  borderWidth: number     // 0-50, default 0
  borderColor: string     // hex, default '#000000'
  borderRadius: number    // 0-200, default 0
  shadowBlur: number      // 0-50, default 0
  shadowColor: string     // hex, default '#000000'
  shadowOpacity: number   // 0-100, default 40
  shadowOffsetX: number   // -25 to 25, default 5
  shadowOffsetY: number   // -25 to 25, default 5
}

export const defaultTransforms: ImageTransforms = {
  borderWidth: 0,
  borderColor: '#000000',
  borderRadius: 0,
  shadowBlur: 0,
  shadowColor: '#000000',
  shadowOpacity: 40,
  shadowOffsetX: 5,
  shadowOffsetY: 5
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
  transforms?: ImageTransforms
  watermark?: WatermarkSettings
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

export interface TextItem {
  id: string
  text: string        // multi-line (newlines preserved)
  x: number          // % from left edge (0–100)
  y: number          // % from top edge (0–100)
  fontSize: number   // px at preview-canvas scale
  fontFamily: string // CSS font stack
  color: string      // hex color
  bold: boolean
  italic: boolean
  align: 'left' | 'center' | 'right'
  opacity: number    // 0–100
}

export interface WatermarkSettings {
  enabled: boolean
  text: string
  fontFamily: string
  fontSize: number       // 10-200, default 48
  color: string          // hex, default '#ffffff'
  opacity: number        // 0-100, default 50
  rotation: number       // -180 to 180, default -30
  position: 'center' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'tile'
  bold: boolean
  italic: boolean
}

export const defaultWatermark: WatermarkSettings = {
  enabled: false,
  text: '',
  fontFamily: 'Helvetica',
  fontSize: 48,
  color: '#ffffff',
  opacity: 50,
  rotation: -30,
  position: 'center',
  bold: false,
  italic: false
}

export type TransformOperation = 'rotateLeft' | 'rotateRight' | 'rotate180' | 'flipHorizontal' | 'flipVertical'
