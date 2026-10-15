// src/lib/features/export-zip.ts
import type { ImageObject } from '../core/types'
import { renderExportCanvas } from '../core/export-render'
import { readSourceExif } from '../core/exif'
import { encodeForExport, type TargetSizeOptions } from './target-size'
import { saveToTarget, type SaveTarget } from './save-file'

export type ZipProgressCallback = (current: number, total: number) => void

async function getJSZip() {
  // @ts-expect-error — JSZip may be loaded as a UMD global via script tag
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
  quality: number = 0.92,
  onProgress?: ZipProgressCallback,
  pngTransparent: boolean = true,
  pngBackgroundColor: string = '#ffffff',
  /** Vom Nutzer gewähltes Ziel; ohne Angabe wird die Datei heruntergeladen */
  saveTarget?: SaveTarget,
  /** Maximale Dateigröße pro Bild (nur JPG/WebP) */
  targetSize?: TargetSizeOptions | null,
  /** EXIF-Metadaten der Originaldatei übernehmen */
  keepExif: boolean = false
): Promise<{ overTarget: number }> {
  const JSZip = await getJSZip()

  if (!images || images.length === 0) {
    throw new Error('Keine Bilder zum Exportieren vorhanden')
  }

  const zip = new JSZip()
  const folder = zip.folder('bilder')

  if (!folder) {
    throw new Error('ZIP-Ordner konnte nicht erstellt werden')
  }

  const total = images.length
  let overTarget = 0

  // Bilder zum ZIP hinzufügen
  for (let i = 0; i < images.length; i++) {
    const image = images[i]
    try {
      // Fortschritt melden
      if (onProgress) {
        onProgress(i + 1, total)
      }

      const exportFormat = format || image.exportFormat || 'png'
      const exportQuality = format === 'png' ? 1.0 : quality / 100 || 0.92
      // Canvas mit angewendeten Filtern und Transformationen holen
      // PNG ohne Transparenz: Hintergrundfarbe setzen
      const backgroundColor =
        exportFormat === 'png' && !pngTransparent ? pngBackgroundColor : undefined
      // Filter-Passage und Kodierung laufen im Worker (Fallback: Hauptthread)
      const [exportCanvas, exif] = await Promise.all([
        renderExportCanvas(image, { backgroundColor }),
        keepExif ? readSourceExif(image.file) : null,
      ])
      const mimeType = `image/${exportFormat === 'jpg' ? 'jpeg' : exportFormat}`
      const result = await encodeForExport(exportCanvas, mimeType, exportQuality, targetSize, exif)
      if (!result.reached) overTarget++
      const blob = result.blob
      const fileName = image.outputName || `bild_${Date.now()}`
      const fileNameWithExt = fileName.includes('.') ? fileName : `${fileName}.${exportFormat}`
      folder.file(fileNameWithExt, blob)
    } catch (error) {
      console.warn(`Fehler beim Hinzufügen von ${image.file?.name}:`, error)
    }
  }

  // ZIP generieren und speichern
  const blob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  })

  await saveToTarget(
    saveTarget ?? { kind: 'download', name: resolveZipFileName(zipFileName) },
    blob
  )
  return { overTarget }
}

/** Dateiname des ZIP-Archivs: Eingabe des Nutzers oder datierter Standardname, immer mit .zip */
export function resolveZipFileName(zipFileName?: string): string {
  const fileName = zipFileName || `bilder_${new Date().toISOString().slice(0, 10)}.zip`
  return fileName.endsWith('.zip') ? fileName : `${fileName}.zip`
}
