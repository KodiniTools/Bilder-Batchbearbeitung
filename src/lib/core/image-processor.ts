// src/lib/core/image-processor.ts
// Bildverarbeitungs-Modul für Canvas-Operationen und Format-Konvertierungen

import type { ImageFormat, ImageObject } from './types'

/**
 * Zentrale Klasse für alle Bildverarbeitungsoperationen
 */
export class ImageProcessor {
  
  /**
   * Verfügbare Export-Formate
   */
  static availableFormats: ImageFormat[] = [
    { name: 'PNG',  mimeType: 'image/png',  ext: 'png'  },
    { name: 'JPEG', mimeType: 'image/jpeg', ext: 'jpg'  },
    { name: 'WebP', mimeType: 'image/webp', ext: 'webp' },
    { name: 'BMP',  mimeType: 'image/bmp',  ext: 'bmp'  },
    { name: 'GIF',  mimeType: 'image/gif',  ext: 'gif'  }
  ]

  /**
   * Prüft ob ein Format vom Browser unterstützt wird
   */
  static supportsFormat(mimeType: string): boolean {
    if (mimeType === 'image/png') return true
    const canvas = document.createElement('canvas')
    canvas.width = 1
    canvas.height = 1
    try {
      const dataURL = canvas.toDataURL(mimeType)
      return dataURL.startsWith('data:' + mimeType)
    } catch (e) { 
      return false
    }
  }

  /**
   * Verarbeitet eine Datei und erstellt ein Image-Objekt
   */
  static async processFile(file: File): Promise<ImageObject | null> {
    if (!file.type.match('image.*')) {
      throw new Error('Nur Bilddateien werden unterstützt')
    }

    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      
      reader.onload = (ev) => {
        const image = new Image()
        
        image.onload = () => {
          const canvas = document.createElement('canvas')
          const ctx = canvas.getContext('2d')
          
          if (!ctx) {
            reject(new Error('Canvas 2D Kontext nicht verfügbar'))
            return
          }

          canvas.width = image.width
          canvas.height = image.height
          ctx.drawImage(image, 0, 0)

          const imageObj: ImageObject = {
            id: Date.now() + '-' + Math.random().toString(36).substr(2, 9),
            file,
            image,
            canvas,
            ctx,
            originalWidth: image.width,
            originalHeight: image.height,
            selected: false,
            outputName: this.getFileNameWithoutExtension(file.name)
          }

          resolve(imageObj)
        }
        
        image.onerror = () => {
          reject(new Error(`Die Datei ${file.name} konnte nicht geladen werden`))
        }
        
        image.src = String(ev.target?.result || '')
      }
      
      reader.onerror = () => {
        reject(new Error(`Die Datei ${file.name} konnte nicht gelesen werden`))
      }
      
      reader.readAsDataURL(file)
    })
  }

  /**
   * Ändert die Größe eines Bildes
   */
  static resizeImage(
    imageObj: ImageObject, 
    newWidth: number, 
    newHeight: number, 
    keepAspect = false
  ): void {
    const { canvas, ctx, originalWidth, originalHeight } = imageObj
    if (!canvas || !ctx) return

    let targetW = newWidth
    let targetH = newHeight
    
    if (keepAspect) {
      const aspect = originalWidth / originalHeight
      if (newWidth / newHeight > aspect) {
        targetW = Math.round(newHeight * aspect)
      } else {
        targetH = Math.round(newWidth / aspect)
      }
    }

    const tempCanvas = document.createElement('canvas')
    tempCanvas.width = targetW
    tempCanvas.height = targetH
    const tempCtx = tempCanvas.getContext('2d')
    if (!tempCtx) return

    tempCtx.drawImage(canvas, 0, 0, canvas.width, canvas.height, 0, 0, targetW, targetH)

    canvas.width = targetW
    canvas.height = targetH
    ctx.clearRect(0, 0, targetW, targetH)
    ctx.drawImage(tempCanvas, 0, 0)
  }

  /**
   * Konvertiert ein Bild in ein bestimmtes Format
   */
  static async convertToFormat(
    imageObj: ImageObject, 
    format: ImageFormat, 
    quality = 0.95
  ): Promise<Blob> {
    const { canvas } = imageObj
    
    return new Promise((resolve, reject) => {
      if (canvas.toBlob) {
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob)
          } else {
            reject(new Error('Blob konnte nicht erzeugt werden'))
          }
        }, format.mimeType, quality)
      } else {
        try {
          const dataURL = canvas.toDataURL(format.mimeType, quality)
          const blob = this.dataURLtoBlob(dataURL)
          resolve(blob)
        } catch (err) {
          reject(err)
        }
      }
    })
  }

  /**
   * Konvertiert Data URL zu Blob
   */
  static dataURLtoBlob(dataURL: string): Blob {
    const parts = dataURL.split(',')
    const meta = parts[0]
    const base64 = parts[1]
    const mime = meta.match(/data:(.*?);base64/)?.[1] || 'application/octet-stream'
    const binStr = atob(base64)
    const len = binStr.length
    const arr = new Uint8Array(len)
    for (let i = 0; i < len; i++) {
      arr[i] = binStr.charCodeAt(i)
    }
    return new Blob([arr], { type: mime })
  }

  /**
   * Erstellt eine Vorschau-Canvas mit begrenzter Größe
   */
  static createPreview(
    imageObj: ImageObject, 
    maxWidth = 300, 
    maxHeight = 300
  ): HTMLCanvasElement {
    const previewCanvas = document.createElement('canvas')
    const ctx = previewCanvas.getContext('2d')
    if (!ctx) return previewCanvas

    const scale = Math.min(
      maxWidth / imageObj.canvas.width, 
      maxHeight / imageObj.canvas.height, 
      1
    )
    previewCanvas.width = Math.floor(imageObj.canvas.width * scale)
    previewCanvas.height = Math.floor(imageObj.canvas.height * scale)

    ctx.drawImage(imageObj.canvas, 0, 0, previewCanvas.width, previewCanvas.height)
    return previewCanvas
  }

  /**
   * Rotiert ein Bild um gegebene Grad
   */
  static rotateImage(imageObj: ImageObject, degrees: number): void {
    const { canvas, ctx } = imageObj
    if (!canvas || !ctx) return

    const tempCanvas = document.createElement('canvas')
    const tempCtx = tempCanvas.getContext('2d')
    if (!tempCtx) return

    const w = canvas.width
    const h = canvas.height

    if (Math.abs(degrees) === 90) {
      tempCanvas.width = h
      tempCanvas.height = w
      tempCtx.translate(h / 2, w / 2)
      tempCtx.rotate(degrees * Math.PI / 180)
      tempCtx.drawImage(canvas, -w / 2, -h / 2)
      canvas.width = h
      canvas.height = w
    } else { // 180 Grad
      tempCanvas.width = w
      tempCanvas.height = h
      tempCtx.translate(w / 2, h / 2)
      tempCtx.rotate(degrees * Math.PI / 180)
      tempCtx.drawImage(canvas, -w / 2, -h / 2)
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(tempCanvas, 0, 0)
  }

  /**
   * Spiegelt ein Bild horizontal oder vertikal
   */
  static flipImage(imageObj: ImageObject, direction: 'horizontal' | 'vertical'): void {
    const { canvas, ctx } = imageObj
    if (!canvas || !ctx) return

    const tempCanvas = document.createElement('canvas')
    tempCanvas.width = canvas.width
    tempCanvas.height = canvas.height
    const tempCtx = tempCanvas.getContext('2d')
    if (!tempCtx) return

    tempCtx.save()
    if (direction === 'horizontal') {
      tempCtx.scale(-1, 1)
      tempCtx.drawImage(canvas, -canvas.width, 0)
    } else { // vertical
      tempCtx.scale(1, -1)
      tempCtx.drawImage(canvas, 0, -canvas.height)
    }
    tempCtx.restore()

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(tempCanvas, 0, 0)
  }

  /**
   * Hilfsfunktion: Extrahiert Dateiname ohne Erweiterung
   */
  static getFileNameWithoutExtension(fileName: string): string {
    const dotIndex = fileName.lastIndexOf('.')
    return dotIndex > 0 ? fileName.substring(0, dotIndex) : fileName
  }

  /**
   * Hilfsfunktion: Extrahiert Dateierweiterung
   */
  static getFileExtension(fileName: string): string {
    const dot = fileName.lastIndexOf('.')
    return dot > -1 ? fileName.substring(dot + 1) : ''
  }

  /**
   * Bereinigt einen Dateinamen für sicheren Export
   */
  static safeBaseName(name: string): string {
    return (name || '').replace(/[\\\/:*?"<>|]+/g, '_').trim() || 'Unbenannt'
  }

  /**
   * Löst den finalen Basisnamen für Export auf
   */
  static resolveBaseName(imageObj: ImageObject): string {
    const orig = this.getFileNameWithoutExtension(imageObj.file.name)
    return this.safeBaseName(imageObj.outputName || orig)
  }

  /**
   * Formatiert Dateigröße in lesbarem Format
   */
  static formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B'
    const units = ['KB', 'MB', 'GB', 'TB']
    let u = -1
    do {
      bytes /= 1024
      ++u
    } while (bytes >= 1024 && u < units.length - 1)
    return bytes.toFixed(1) + ' ' + units[u]
  }
}
