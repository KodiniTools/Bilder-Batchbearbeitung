// src/types/image.ts
// Type definitions for image processing

export interface ProcessedImage {
  id: string
  file: File
  canvas: HTMLCanvasElement
  originalWidth: number
  originalHeight: number
  outputName?: string
  previewUrl?: string
}

export interface ImageTransform {
  rotation: number
  flipHorizontal: boolean
  flipVertical: boolean
  width: number
  height: number
}

export interface ImageFormat {
  name: string
  ext: string
  mimeType: string
}

export interface ExportOptions {
  format: ImageFormat
  quality?: number
  fileName?: string
}
