// src/lib/features/export-zip.ts
import type { ImageObject } from '../core/types'

interface ZipSettings {
  zipName?: string
  format?: 'png' | 'jpg' | 'webp'
  quality?: number
}

async function getJSZip() {
  // @ts-ignore
  if (window.JSZip) return window.JSZip
  try {
    const mod = await import('jszip')
    return mod.default
  } catch {
    throw new Error('JSZip nicht geladen. Bitte das UMD-Script einbinden.')
  }
}

export async function exportImagesAsZip(
  images: ImageObject[],
  zipFileName?: string,
  format: string = 'png',
  quality: number = 0.92
): Promise<void> {
  const JSZip = await getJSZip()
  
  if (!images || images.length === 0) {
    throw new Error('Keine Bilder zum Exportieren vorhanden')
  }

  const zip = new JSZip()
  const folder = zip.folder('bilder')

  if (!folder) {
    throw new Error('ZIP-Ordner konnte nicht erstellt werden')
  }

  // Bilder zum ZIP hinzufügen
  for (const image of images) {
    try {
      const exportFormat = format || image.exportFormat || 'png'
      const exportQuality = format === 'png' ? 1.0 : (quality / 100) || 0.92
      const blob = await canvasToBlob(image.canvas, exportFormat, exportQuality)
      const fileName = image.outputName || `bild_${Date.now()}`
      const fileNameWithExt = fileName.includes('.') 
        ? fileName 
        : `${fileName}.${exportFormat}`
      folder.file(fileNameWithExt, blob)
    } catch (error) {
      console.warn(`Fehler beim Hinzufügen von ${image.file?.name}:`, error)
    }
  }

  // ZIP generieren und downloaden
  const blob = await zip.generateAsync({ 
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 }
  })

  let fileName = zipFileName || `bilder_${new Date().toISOString().slice(0, 10)}.zip`
  if (!fileName.endsWith('.zip')) {
    fileName += '.zip'
  }
  
  downloadBlob(blob, fileName)
}

// Hilfsfunktionen

function canvasToBlob(
  canvas: HTMLCanvasElement,
  format: string = 'png',
  quality: number = 0.92
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const mimeType = `image/${format === 'jpg' ? 'jpeg' : format}`
    
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob)
        } else {
          reject(new Error('Canvas konnte nicht zu Blob konvertiert werden'))
        }
      },
      mimeType,
      quality
    )
  })
}

function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.style.display = 'none'
  
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  
  // URL nach kurzer Verzögerung freigeben
  setTimeout(() => URL.revokeObjectURL(url), 100)
}
