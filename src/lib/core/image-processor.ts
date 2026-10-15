// src/lib/core/image-processor.ts
// Bildverarbeitungs-Modul für Canvas-Operationen und Format-Konvertierungen

import type {
  ImageFormat,
  ImageFilters,
  ImageObject,
  ImageTransforms,
  WatermarkSettings,
} from './types'
import { defaultFilters, defaultTransforms, defaultWatermark } from './types'
import { drawWatermarkLogo, getLoadedWatermarkLogo } from './watermark-logo'
import { applyFiltersToContext, hasActiveFilters } from './filter-kernels'

/**
 * Zentrale Klasse für alle Bildverarbeitungsoperationen
 */
export class ImageProcessor {
  /**
   * Verfügbare Export-Formate
   */
  static availableFormats: ImageFormat[] = [
    { name: 'PNG', mimeType: 'image/png', ext: 'png' },
    { name: 'JPEG', mimeType: 'image/jpeg', ext: 'jpg' },
    { name: 'WebP', mimeType: 'image/webp', ext: 'webp' },
    { name: 'BMP', mimeType: 'image/bmp', ext: 'bmp' },
    { name: 'GIF', mimeType: 'image/gif', ext: 'gif' },
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
    } catch (_e) {
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

          // Original-Canvas für Rückgängig-Funktion erstellen
          const originalCanvas = document.createElement('canvas')
          originalCanvas.width = image.width
          originalCanvas.height = image.height
          const originalCtx = originalCanvas.getContext('2d')
          if (originalCtx) {
            originalCtx.drawImage(image, 0, 0)
          }

          const imageObj: ImageObject = {
            id: Date.now() + '-' + Math.random().toString(36).substr(2, 9),
            file,
            image,
            canvas,
            ctx,
            originalCanvas,
            originalWidth: image.width,
            originalHeight: image.height,
            selected: false,
            outputName: this.getFileNameWithoutExtension(file.name),
            version: 0,
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
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob)
            } else {
              reject(new Error('Blob konnte nicht erzeugt werden'))
            }
          },
          format.mimeType,
          quality
        )
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
  static createPreview(imageObj: ImageObject, maxWidth = 300, maxHeight = 300): HTMLCanvasElement {
    const previewCanvas = document.createElement('canvas')
    const ctx = previewCanvas.getContext('2d')
    if (!ctx) return previewCanvas

    const scale = Math.min(maxWidth / imageObj.canvas.width, maxHeight / imageObj.canvas.height, 1)
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
      tempCtx.rotate((degrees * Math.PI) / 180)
      tempCtx.drawImage(canvas, -w / 2, -h / 2)
      canvas.width = h
      canvas.height = w
    } else {
      // 180 Grad
      tempCanvas.width = w
      tempCanvas.height = h
      tempCtx.translate(w / 2, h / 2)
      tempCtx.rotate((degrees * Math.PI) / 180)
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
    } else {
      // vertical
      tempCtx.scale(1, -1)
      tempCtx.drawImage(canvas, 0, -canvas.height)
    }
    tempCtx.restore()

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(tempCanvas, 0, 0)
  }

  /**
   * Schneidet ein Bild auf ein bestimmtes Seitenverhältnis zu (zentriert)
   * @param imageObj Das Bild-Objekt
   * @param aspectRatio Das Seitenverhältnis als Zahl (Breite/Höhe), z.B. 1 für 1:1, 16/9 für 16:9
   */
  static cropToAspectRatio(imageObj: ImageObject, aspectRatio: number): void {
    const { canvas, ctx } = imageObj
    if (!canvas || !ctx) return

    const currentWidth = canvas.width
    const currentHeight = canvas.height
    const currentAspect = currentWidth / currentHeight

    let cropWidth: number
    let cropHeight: number
    let offsetX: number
    let offsetY: number

    if (currentAspect > aspectRatio) {
      // Bild ist breiter als gewünscht -> Seiten abschneiden
      cropHeight = currentHeight
      cropWidth = Math.round(currentHeight * aspectRatio)
      offsetX = Math.round((currentWidth - cropWidth) / 2)
      offsetY = 0
    } else {
      // Bild ist höher als gewünscht -> Oben/Unten abschneiden
      cropWidth = currentWidth
      cropHeight = Math.round(currentWidth / aspectRatio)
      offsetX = 0
      offsetY = Math.round((currentHeight - cropHeight) / 2)
    }

    // Temporäres Canvas für den Ausschnitt erstellen
    const tempCanvas = document.createElement('canvas')
    tempCanvas.width = cropWidth
    tempCanvas.height = cropHeight
    const tempCtx = tempCanvas.getContext('2d')
    if (!tempCtx) return

    // Ausschnitt auf temporäres Canvas zeichnen
    tempCtx.drawImage(
      canvas,
      offsetX,
      offsetY,
      cropWidth,
      cropHeight, // Quellbereich
      0,
      0,
      cropWidth,
      cropHeight // Zielbereich
    )

    // Original-Canvas auf neue Größe setzen
    canvas.width = cropWidth
    canvas.height = cropHeight
    ctx.clearRect(0, 0, cropWidth, cropHeight)
    ctx.drawImage(tempCanvas, 0, 0)
  }

  /**
   * Setzt ein Bild auf seinen ursprünglichen Zustand zurück
   */
  static resetToOriginal(imageObj: ImageObject): void {
    const { canvas, ctx, originalCanvas } = imageObj
    if (!canvas || !ctx || !originalCanvas) return

    // Canvas auf Original-Größe setzen
    canvas.width = originalCanvas.width
    canvas.height = originalCanvas.height

    // Original-Inhalt wiederherstellen
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(originalCanvas, 0, 0)
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
    return (name || '').replace(/[\\/:*?"<>|]+/g, '_').trim() || 'Unbenannt'
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

  /**
   * Erstellt ein Canvas mit angewendeten Filtern für den Export
   * @param imageObj Das Bild-Objekt
   * @returns Canvas mit angewendeten Filtern
   */
  static getCanvasWithFilters(imageObj: ImageObject): HTMLCanvasElement {
    return this.applyFiltersToCanvas(imageObj.canvas, imageObj.filters || defaultFilters)
  }

  /**
   * Wendet alle Bildfilter auf ein beliebiges Quell-Canvas an und gibt ein neues
   * Canvas zurück.
   *
   * Alle Filter werden **echt pixelbasiert** berechnet: eine einzige
   * `getImageData`/`putImageData`-Passage rechnet Helligkeit, Kontrast,
   * Sättigung, Farbton, Temperatur, Vibrance, Graustufen, Sepia und Invert
   * direkt auf den RGB-Werten; Weichzeichnen (Blur) läuft als echter,
   * separierbarer Gauß-Filter (3 Box-Passagen mit vormultipliziertem Alpha);
   * die Deckkraft wirkt auf den Alpha-Kanal und die Vignette als radiale
   * Abdunklung. Es werden **keine** CSS-Filter (`ctx.filter`) mehr verwendet –
   * das Ergebnis ist damit browserunabhängig und in Vorschau wie Export
   * identisch (WYSIWYG).
   *
   * Zentrale Methode, damit Vorschau (Editor, Galerie, Grid) und Export exakt
   * dasselbe Ergebnis liefern.
   */
  static applyFiltersToCanvas(
    sourceCanvas: HTMLCanvasElement,
    filters: ImageFilters,
    /** Verhältnis Quell-Canvas zu Originalbild (Vorschau < 1); skaliert Pixelmaße wie den Blur-Radius */
    scale = 1
  ): HTMLCanvasElement {
    if (!hasActiveFilters(filters)) {
      return sourceCanvas
    }

    const filteredCanvas = document.createElement('canvas')
    filteredCanvas.width = sourceCanvas.width
    filteredCanvas.height = sourceCanvas.height
    const ctx = filteredCanvas.getContext('2d')

    if (!ctx) {
      return sourceCanvas
    }

    ctx.drawImage(sourceCanvas, 0, 0)
    applyFiltersToContext(ctx, filteredCanvas.width, filteredCanvas.height, filters, scale)
    return filteredCanvas
  }

  /** Weicht mindestens ein Filter vom Standard ab? */
  static hasActiveFilters(filters: ImageFilters | undefined): boolean {
    return hasActiveFilters(filters)
  }

  /** Ist mindestens ein Effekt (Filter, Wasserzeichen, Rahmen/Ecken/Schatten) aktiv? */
  static hasAnyEffect(imageObj: ImageObject): boolean {
    const w = imageObj.watermark
    const t = imageObj.transforms || defaultTransforms
    return (
      this.hasActiveFilters(imageObj.filters) ||
      (!!w && w.enabled && (w.text.trim().length > 0 || !!w.logoDataUrl)) ||
      t.borderWidth > 0 ||
      t.borderRadius > 0 ||
      this.hasVisibleShadow(t)
    )
  }

  /**
   * Konvertiert ein Bild mit Filtern in Data URL
   * @param imageObj Das Bild-Objekt
   * @param format MIME-Type (optional)
   * @param quality Qualität 0-1 (optional)
   * @returns Data URL des Bildes mit angewendeten Filtern
   */
  static getDataUrlWithFilters(
    imageObj: ImageObject,
    format = 'image/png',
    quality = 0.92
  ): string {
    const filteredCanvas = this.getCanvasWithFilters(imageObj)
    return filteredCanvas.toDataURL(format, quality)
  }

  /**
   * Erstellt ein Canvas mit Text- und/oder Logo-Wasserzeichen.
   * Das Logo wird nur gezeichnet, wenn es bereits dekodiert ist
   * (siehe ensureWatermarkLogo in export-render.ts).
   * @param sourceCanvas Das Quell-Canvas
   * @param watermark Die Wasserzeichen-Einstellungen
   * @returns Canvas mit Wasserzeichen
   */
  static getCanvasWithWatermark(
    sourceCanvas: HTMLCanvasElement,
    watermark: WatermarkSettings,
    /** Verhältnis Quell-Canvas zu Originalbild (Vorschau < 1); skaliert die Schriftgröße */
    scale = 1
  ): HTMLCanvasElement {
    const hasText = !!watermark.text?.trim()
    const logo = watermark.logoDataUrl ? getLoadedWatermarkLogo(watermark.logoDataUrl) : null
    if (!watermark.enabled || (!hasText && !logo)) {
      return sourceCanvas
    }

    const canvas = document.createElement('canvas')
    canvas.width = sourceCanvas.width
    canvas.height = sourceCanvas.height
    const ctx = canvas.getContext('2d')

    if (!ctx) return sourceCanvas

    // Quellbild zuerst zeichnen (mit voller Deckkraft)
    ctx.drawImage(sourceCanvas, 0, 0)

    if (hasText) this.drawTextWatermark(ctx, canvas, watermark, scale)
    if (logo) drawWatermarkLogo(ctx, canvas.width, canvas.height, logo, watermark)

    return canvas
  }

  private static drawTextWatermark(
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    watermark: WatermarkSettings,
    scale: number
  ): void {
    // Wasserzeichen-Einstellungen
    const fontWeight = watermark.bold ? 'bold' : 'normal'
    const fontStyle = watermark.italic ? 'italic' : 'normal'
    const fontSize = watermark.fontSize * scale
    const fontFamily = watermark.fontFamily || 'Helvetica'
    ctx.font = `${fontStyle} ${fontWeight} ${fontSize}px "${fontFamily}", Arial, sans-serif`
    ctx.fillStyle = watermark.color
    ctx.globalAlpha = watermark.opacity / 100
    ctx.textBaseline = 'middle'
    ctx.textAlign = 'center'

    const text = watermark.text
    const rotation = (watermark.rotation * Math.PI) / 180

    if (watermark.position === 'tile') {
      // Kachelmodus: Text wiederholt über das gesamte Bild
      const metrics = ctx.measureText(text)
      const textWidth = metrics.width
      const spacingX = textWidth + fontSize * 2.5
      const spacingY = fontSize * 4

      // Größeren Bereich abdecken für Rotation
      const diagonal = Math.sqrt(canvas.width ** 2 + canvas.height ** 2)

      ctx.save()
      // Koordinatensystem: Zur Mitte verschieben, rotieren, dann zurück
      ctx.translate(canvas.width / 2, canvas.height / 2)
      ctx.rotate(rotation)

      // Von der Mitte aus den gesamten Bereich abdecken
      const halfDiag = diagonal / 2 + spacingX
      for (let y = -halfDiag; y < halfDiag; y += spacingY) {
        for (let x = -halfDiag; x < halfDiag; x += spacingX) {
          ctx.fillText(text, x, y)
        }
      }
      ctx.restore()
    } else {
      // Einzelposition
      let x: number
      let y: number

      switch (watermark.position) {
        case 'top-left':
          x = canvas.width * 0.15
          y = canvas.height * 0.1
          break
        case 'top-right':
          x = canvas.width * 0.85
          y = canvas.height * 0.1
          break
        case 'bottom-left':
          x = canvas.width * 0.15
          y = canvas.height * 0.9
          break
        case 'bottom-right':
          x = canvas.width * 0.85
          y = canvas.height * 0.9
          break
        case 'center':
        default:
          x = canvas.width / 2
          y = canvas.height / 2
          break
      }

      ctx.save()
      ctx.translate(x, y)
      ctx.rotate(rotation)
      ctx.fillText(text, 0, 0)
      ctx.restore()
    }

    // Alpha zurücksetzen
    ctx.globalAlpha = 1
  }

  /**
   * Erstellt ein Export-Canvas mit allen Filtern UND Transformationen (Rand, Schatten, Ecken)
   * Zentrale Methode für alle Export-Pfade (ZIP, PDF, SVG, Download)
   * @param imageObj Das Bild-Objekt
   * @param options Export-Optionen (z.B. Hintergrundfarbe für PNG ohne Transparenz)
   * @returns Canvas mit angewendeten Filtern und Transformationen
   */
  static getExportCanvas(
    imageObj: ImageObject,
    options?: { backgroundColor?: string }
  ): HTMLCanvasElement {
    return this.composeExportCanvas(this.getCanvasWithFilters(imageObj), imageObj, options)
  }

  /**
   * Zweite Hälfte der Export-Pipeline: Wasserzeichen, Transformationen und
   * Hintergrund auf ein bereits gefiltertes Canvas. Getrennt, damit die
   * Filter-Passage auch im Web Worker laufen kann (siehe export-render.ts).
   */
  static composeExportCanvas(
    filteredCanvas: HTMLCanvasElement,
    imageObj: ImageObject,
    options?: { backgroundColor?: string }
  ): HTMLCanvasElement {
    const watermarkedCanvas = this.getCanvasWithWatermark(
      filteredCanvas,
      imageObj.watermark || defaultWatermark
    )
    const transformedCanvas = this.getCanvasWithTransforms(
      watermarkedCanvas,
      imageObj.transforms || defaultTransforms
    )

    // Hintergrundfarbe anwenden (z.B. für PNG ohne Transparenz)
    if (options?.backgroundColor) {
      const bgCanvas = document.createElement('canvas')
      bgCanvas.width = transformedCanvas.width
      bgCanvas.height = transformedCanvas.height
      const ctx = bgCanvas.getContext('2d')
      if (ctx) {
        ctx.fillStyle = options.backgroundColor
        ctx.fillRect(0, 0, bgCanvas.width, bgCanvas.height)
        ctx.drawImage(transformedCanvas, 0, 0)
        return bgCanvas
      }
    }

    return transformedCanvas
  }

  /**
   * Erstellt eine Data URL mit allen Filtern UND Transformationen für den Export
   * @param imageObj Das Bild-Objekt
   * @param format MIME-Type (optional)
   * @param quality Qualität 0-1 (optional)
   * @param options Export-Optionen (z.B. Hintergrundfarbe)
   * @returns Data URL des Bildes mit angewendeten Filtern und Transformationen
   */
  static getDataUrlForExport(
    imageObj: ImageObject,
    format = 'image/png',
    quality = 0.92,
    options?: { backgroundColor?: string }
  ): string {
    const exportCanvas = this.getExportCanvas(imageObj, options)
    return exportCanvas.toDataURL(format, quality)
  }

  /**
   * Zeichnet ein abgerundetes Rechteck als Pfad (mit elliptischen Ecken)
   * @param rx Horizontaler Eckenradius
   * @param ry Vertikaler Eckenradius (optional, Standard = rx)
   */
  private static drawRoundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    rx: number,
    ry?: number
  ): void {
    if (ry === undefined) ry = rx
    rx = Math.min(rx, w / 2)
    ry = Math.min(ry, h / 2)

    ctx.beginPath()
    ctx.moveTo(x + rx, y)
    ctx.lineTo(x + w - rx, y)
    // Oben-rechts
    ctx.ellipse(x + w - rx, y + ry, rx, ry, 0, -Math.PI / 2, 0)
    ctx.lineTo(x + w, y + h - ry)
    // Unten-rechts
    ctx.ellipse(x + w - rx, y + h - ry, rx, ry, 0, 0, Math.PI / 2)
    ctx.lineTo(x + rx, y + h)
    // Unten-links
    ctx.ellipse(x + rx, y + h - ry, rx, ry, 0, Math.PI / 2, Math.PI)
    ctx.lineTo(x, y + ry)
    // Oben-links
    ctx.ellipse(x + rx, y + ry, rx, ry, 0, Math.PI, -Math.PI / 2)
    ctx.closePath()
  }

  /**
   * Konvertiert Hex-Farbe + Opacity zu rgba String
   */
  static hexToRgba(hex: string, opacity: number): string {
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    return `rgba(${r}, ${g}, ${b}, ${opacity})`
  }

  /**
   * Erstellt ein Canvas mit angewendeten Transformationen (Rand, Schatten, abgerundete Ecken)
   * @param sourceCanvas Das Quell-Canvas
   * @param transforms Die Transformations-Einstellungen
   * @returns Canvas mit angewendeten Transformationen
   */
  /**
   * Ist der Schatten sichtbar? Er muss Deckkraft haben und über das Bild
   * hinausragen: entweder weichgezeichnet oder versetzt. Ein harter Schatten
   * (Weichzeichnen 0) mit Versatz ist ein gültiger Look.
   */
  static hasVisibleShadow(t: ImageTransforms): boolean {
    return (
      t.shadowOpacity > 0 && (t.shadowBlur > 0 || t.shadowOffsetX !== 0 || t.shadowOffsetY !== 0)
    )
  }

  /**
   * Platz (px pro Seite), den ein sichtbarer Schatten über das Bild hinaus
   * braucht: Unschärfe-Radius plus Versatz. 0, wenn kein Schatten sichtbar ist.
   * Wird vom Export-Renderer und von den Vorschauen gleichermaßen genutzt.
   */
  static getShadowPadding(t: ImageTransforms): number {
    if (!this.hasVisibleShadow(t)) return 0
    return Math.ceil(
      t.shadowBlur * 2 + Math.max(Math.abs(t.shadowOffsetX), Math.abs(t.shadowOffsetY))
    )
  }

  /**
   * Skaliert alle Pixelmaße der Transformationen (Randbreite, Schatten-
   * Unschärfe und -Versatz) mit `scale`. Der Eckenradius ist bereits relativ
   * zur Bildgröße definiert und bleibt unverändert.
   */
  static scaleTransforms(t: ImageTransforms, scale: number): ImageTransforms {
    if (scale === 1) return t
    return {
      ...t,
      borderWidth: t.borderWidth * scale,
      shadowBlur: t.shadowBlur * scale,
      shadowOffsetX: t.shadowOffsetX * scale,
      shadowOffsetY: t.shadowOffsetY * scale,
    }
  }

  /**
   * Vorschau = exakt die Export-Pipeline (Filter → Wasserzeichen →
   * Transformationen) auf einer um `scale` verkleinerten Kopie des Bildes.
   * Alle Pixelmaße werden mitskaliert, damit Vorschau und Export bis auf die
   * Auflösung identisch sind (WYSIWYG).
   * @param scale Verkleinerungsfaktor 0 < scale <= 1
   */
  static getPreviewCanvas(imageObj: ImageObject, scale: number): HTMLCanvasElement {
    const base = this.getPreviewBase(imageObj, scale)
    const filtered = this.applyFiltersToCanvas(base, imageObj.filters || defaultFilters, scale)
    return this.composePreviewCanvas(filtered, imageObj, scale)
  }

  /** Auf `scale` verkleinerte Kopie des Bildes (bei scale >= 1 das Original-Canvas) */
  static getPreviewBase(imageObj: ImageObject, scale: number): HTMLCanvasElement {
    const src = imageObj.canvas
    let base: HTMLCanvasElement = src
    if (scale < 1) {
      const scaled = document.createElement('canvas')
      scaled.width = Math.max(1, Math.round(src.width * scale))
      scaled.height = Math.max(1, Math.round(src.height * scale))
      const sctx = scaled.getContext('2d')
      if (sctx) {
        // Hochwertiges Resampling, damit die verkleinerte Basis nicht aliasiert
        sctx.imageSmoothingEnabled = true
        sctx.imageSmoothingQuality = 'high'
        sctx.drawImage(src, 0, 0, scaled.width, scaled.height)
      }
      base = scaled
    }
    return base
  }

  /** Wasserzeichen und Transformationen auf eine bereits gefilterte Vorschau-Basis */
  static composePreviewCanvas(
    filtered: HTMLCanvasElement,
    imageObj: ImageObject,
    scale: number
  ): HTMLCanvasElement {
    const watermarked = this.getCanvasWithWatermark(
      filtered,
      imageObj.watermark || defaultWatermark,
      scale
    )
    return this.getCanvasWithTransforms(
      watermarked,
      imageObj.transforms || defaultTransforms,
      scale
    )
  }

  static getCanvasWithTransforms(
    sourceCanvas: HTMLCanvasElement,
    transforms: ImageTransforms,
    /** Verhältnis Quell-Canvas zu Originalbild (Vorschau < 1); skaliert Rand und Schatten */
    scale = 1
  ): HTMLCanvasElement {
    const t = this.scaleTransforms(transforms, scale)
    const hasShadow = this.hasVisibleShadow(t)
    const hasTransforms = t.borderWidth > 0 || t.borderRadius > 0 || hasShadow

    if (!hasTransforms) {
      return sourceCanvas
    }

    const imgW = sourceCanvas.width
    const imgH = sourceCanvas.height

    // borderRadius als Prozent der Bilddimensionen skalieren
    // Slider 0-200 → 0%-50% → bei 200 = voller Kreis/Ellipse
    const radiusFraction = (t.borderRadius / 200) * 0.5 // 0 bis 0.5
    const innerRx = radiusFraction * imgW
    const innerRy = radiusFraction * imgH

    // Padding für Schatten berechnen (Unschärfe-Radius + Versatz), damit er nicht abgeschnitten wird
    const shadowPadding = this.getShadowPadding(t)

    // Gesamtpadding pro Seite
    const padding = t.borderWidth + shadowPadding

    const canvas = document.createElement('canvas')
    canvas.width = imgW + padding * 2
    canvas.height = imgH + padding * 2
    const ctx = canvas.getContext('2d')

    if (!ctx) return sourceCanvas

    // Position des äußeren Rand-Rechtecks
    const outerX = shadowPadding
    const outerY = shadowPadding
    const outerW = imgW + t.borderWidth * 2
    const outerH = imgH + t.borderWidth * 2
    const outerRx = innerRx > 0 ? innerRx + t.borderWidth : 0
    const outerRy = innerRy > 0 ? innerRy + t.borderWidth : 0

    // Position des inneren Bildbereichs
    const innerX = shadowPadding + t.borderWidth
    const innerY = shadowPadding + t.borderWidth

    // Schatten zeichnen
    if (hasShadow) {
      ctx.save()
      ctx.shadowBlur = t.shadowBlur
      ctx.shadowColor = this.hexToRgba(t.shadowColor, t.shadowOpacity / 100)
      ctx.shadowOffsetX = t.shadowOffsetX
      ctx.shadowOffsetY = t.shadowOffsetY
      this.drawRoundRect(ctx, outerX, outerY, outerW, outerH, outerRx, outerRy)
      ctx.fillStyle = t.borderWidth > 0 ? t.borderColor : '#ffffff'
      ctx.fill()
      ctx.restore()
    }

    // Rand zeichnen (gefülltes Rechteck hinter dem Bild)
    if (t.borderWidth > 0) {
      ctx.save()
      this.drawRoundRect(ctx, outerX, outerY, outerW, outerH, outerRx, outerRy)
      ctx.fillStyle = t.borderColor
      ctx.fill()
      ctx.restore()
    }

    // Bild zeichnen (mit abgerundeten Ecken geclippt)
    ctx.save()
    if (innerRx > 0 || innerRy > 0) {
      this.drawRoundRect(ctx, innerX, innerY, imgW, imgH, innerRx, innerRy)
      ctx.clip()
    }
    ctx.drawImage(sourceCanvas, innerX, innerY)
    ctx.restore()

    return canvas
  }
}
