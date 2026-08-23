// src/lib/core/image-processor.ts
// Bildverarbeitungs-Modul für Canvas-Operationen und Format-Konvertierungen

import type { ImageFormat, ImageFilters, ImageObject, ImageTransforms, WatermarkSettings } from './types'
import { defaultFilters, defaultTransforms, defaultWatermark } from './types'

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
            version: 0
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
      offsetX, offsetY, cropWidth, cropHeight,  // Quellbereich
      0, 0, cropWidth, cropHeight               // Zielbereich
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
    filters: ImageFilters
  ): HTMLCanvasElement {
    const f = { ...defaultFilters, ...filters }

    const hasColor =
      f.brightness !== 100 ||
      f.contrast !== 100 ||
      f.saturation !== 100 ||
      f.hue !== 0 ||
      f.grayscale !== 0 ||
      f.sepia !== 0 ||
      f.invert !== 0 ||
      f.temperature !== 0 ||
      f.vibrance !== 0
    const hasBlur = f.blur > 0
    const hasOpacity = f.opacity !== 100
    const hasVignette = f.vignette !== 0

    if (!hasColor && !hasBlur && !hasOpacity && !hasVignette) {
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

    const width = filteredCanvas.width
    const height = filteredCanvas.height
    const imageData = ctx.getImageData(0, 0, width, height)
    const data = imageData.data

    // 1) Weichzeichnen (räumliche Passage) – echter Gauß über Box-Blur
    if (hasBlur) {
      this.applyGaussianBlur(data, width, height, f.blur)
    }

    // 2) Farb-Pipeline (eine Pixel-Passage für alle Farboperationen)
    if (hasColor) {
      this.applyColorPipeline(data, f)
    }

    // 3) Deckkraft auf den Alpha-Kanal
    if (hasOpacity) {
      const alpha = f.opacity / 100
      for (let i = 3; i < data.length; i += 4) {
        data[i] = data[i] * alpha
      }
    }

    ctx.putImageData(imageData, 0, 0)

    // 4) Vignette als radiale Abdunklung (echte Pixel, kein CSS-Filter)
    if (hasVignette) {
      this.applyVignette(ctx, width, height, f.vignette)
    }

    return filteredCanvas
  }

  /**
   * Echte pixelbasierte Farb-Pipeline. Alle Operationen werden nacheinander
   * pro Pixel auf den RGB-Kanälen (0-255) berechnet – ohne CSS-Filter.
   *
   * Reihenfolge: Helligkeit → Kontrast → Sättigung → Farbton → Temperatur →
   * Vibrance → Graustufen → Sepia → Invert.
   */
  private static applyColorPipeline(
    data: Uint8ClampedArray,
    f: ImageFilters
  ): void {
    // Rec. 709 Luminanz-Koeffizienten (auch von CSS für grayscale genutzt)
    const LR = 0.2126
    const LG = 0.7152
    const LB = 0.0722

    const brightness = f.brightness / 100   // 1 = neutral
    const contrast = f.contrast / 100       // 1 = neutral
    const saturation = f.saturation / 100   // 1 = neutral
    const grayscale = f.grayscale / 100     // 0 = aus
    const sepia = f.sepia / 100             // 0 = aus
    const invert = f.invert / 100           // 0 = aus
    const tempShift = (f.temperature / 100) * 45  // max ±45 auf 0-255-Skala
    const vib = f.vibrance / 100            // -1 .. 1

    const doBright = brightness !== 1
    const doContrast = contrast !== 1
    const doSat = saturation !== 1
    const doGray = grayscale !== 0
    const doSepia = sepia !== 0
    const doInvert = invert !== 0
    const doTemp = tempShift !== 0
    const doVib = vib !== 0

    // Farbton-Rotation als 3×3-Matrix (W3C Filter-Effects hue-rotate)
    const doHue = f.hue !== 0
    let m00 = 1, m01 = 0, m02 = 0
    let m10 = 0, m11 = 1, m12 = 0
    let m20 = 0, m21 = 0, m22 = 1
    if (doHue) {
      const a = (f.hue * Math.PI) / 180
      const cos = Math.cos(a)
      const sin = Math.sin(a)
      m00 = 0.213 + cos * 0.787 - sin * 0.213
      m01 = 0.715 - cos * 0.715 - sin * 0.715
      m02 = 0.072 - cos * 0.072 + sin * 0.928
      m10 = 0.213 - cos * 0.213 + sin * 0.143
      m11 = 0.715 + cos * 0.285 + sin * 0.140
      m12 = 0.072 - cos * 0.072 - sin * 0.283
      m20 = 0.213 - cos * 0.213 - sin * 0.787
      m21 = 0.715 - cos * 0.715 + sin * 0.715
      m22 = 0.072 + cos * 0.928 + sin * 0.072
    }

    for (let i = 0; i < data.length; i += 4) {
      let r = data[i]
      let g = data[i + 1]
      let b = data[i + 2]

      // Helligkeit: lineare Multiplikation (wie CSS brightness)
      if (doBright) {
        r *= brightness
        g *= brightness
        b *= brightness
      }

      // Kontrast: Spreizung um mittleres Grau (127.5)
      if (doContrast) {
        r = (r - 127.5) * contrast + 127.5
        g = (g - 127.5) * contrast + 127.5
        b = (b - 127.5) * contrast + 127.5
      }

      // Sättigung: Interpolation zwischen Luminanz und Farbe
      if (doSat) {
        const l = LR * r + LG * g + LB * b
        r = l + (r - l) * saturation
        g = l + (g - l) * saturation
        b = l + (b - l) * saturation
      }

      // Farbton-Rotation (Matrix)
      if (doHue) {
        const nr = m00 * r + m01 * g + m02 * b
        const ng = m10 * r + m11 * g + m12 * b
        const nb = m20 * r + m21 * g + m22 * b
        r = nr
        g = ng
        b = nb
      }

      // Temperatur: warm = mehr Rot / weniger Blau, kühl umgekehrt
      if (doTemp) {
        r += tempShift
        b -= tempShift
      }

      // Vibrance: wenig gesättigte Pixel stärker anheben, gesättigte schonen
      if (doVib) {
        const max = Math.max(r, g, b)
        const min = Math.min(r, g, b)
        const sat = max <= 0 ? 0 : (max - min) / max
        const amt = vib * (1 - sat)
        r += (max - r) * amt
        g += (max - g) * amt
        b += (max - b) * amt
      }

      // Graustufen: Interpolation Richtung Luminanz
      if (doGray) {
        const l = LR * r + LG * g + LB * b
        r += (l - r) * grayscale
        g += (l - g) * grayscale
        b += (l - b) * grayscale
      }

      // Sepia: Interpolation Richtung Sepia-Matrix
      if (doSepia) {
        const sr = 0.393 * r + 0.769 * g + 0.189 * b
        const sg = 0.349 * r + 0.686 * g + 0.168 * b
        const sb = 0.272 * r + 0.534 * g + 0.131 * b
        r += (sr - r) * sepia
        g += (sg - g) * sepia
        b += (sb - b) * sepia
      }

      // Invert: Interpolation Richtung Negativ
      if (doInvert) {
        r += (255 - 2 * r) * invert
        g += (255 - 2 * g) * invert
        b += (255 - 2 * b) * invert
      }

      // Uint8ClampedArray rundet und begrenzt automatisch auf 0-255
      data[i] = r
      data[i + 1] = g
      data[i + 2] = b
    }
  }

  /**
   * Echter Gauß-Weichzeichner über drei separierbare Box-Blur-Passagen
   * (Approximation nach Kutskir). Rechnet mit vormultipliziertem Alpha, damit
   * transparente Bereiche keine dunklen Ränder erzeugen.
   * @param blur Radius in Pixeln (entspricht der Standardabweichung)
   */
  private static applyGaussianBlur(
    data: Uint8ClampedArray,
    width: number,
    height: number,
    blur: number
  ): void {
    const sigma = Math.round(blur)
    if (sigma < 1) return

    const n = width * height
    const r = new Float32Array(n)
    const g = new Float32Array(n)
    const b = new Float32Array(n)
    const a = new Float32Array(n)

    // Kanäle mit vormultipliziertem Alpha extrahieren
    for (let i = 0, p = 0; i < data.length; i += 4, p++) {
      const al = data[i + 3] / 255
      r[p] = data[i] * al
      g[p] = data[i + 1] * al
      b[p] = data[i + 2] * al
      a[p] = data[i + 3]
    }

    // Drei Box-Passagen ≈ Gauß
    const boxes = this.boxesForGauss(sigma, 3)
    for (let k = 0; k < 3; k++) {
      const radius = (boxes[k] - 1) / 2
      this.boxBlur(r, width, height, radius)
      this.boxBlur(g, width, height, radius)
      this.boxBlur(b, width, height, radius)
      this.boxBlur(a, width, height, radius)
    }

    // Alpha wieder herausrechnen und zurückschreiben
    for (let i = 0, p = 0; i < data.length; i += 4, p++) {
      const al = a[p]
      if (al > 0) {
        const inv = 255 / al
        data[i] = r[p] * inv
        data[i + 1] = g[p] * inv
        data[i + 2] = b[p] * inv
      } else {
        data[i] = 0
        data[i + 1] = 0
        data[i + 2] = 0
      }
      data[i + 3] = al
    }
  }

  /**
   * Ideale Box-Größen für die Gauß-Approximation über `passes` Box-Blurs.
   */
  private static boxesForGauss(sigma: number, passes: number): number[] {
    const wIdeal = Math.sqrt((12 * sigma * sigma) / passes + 1)
    let wl = Math.floor(wIdeal)
    if (wl % 2 === 0) wl--
    const wu = wl + 2
    const mIdeal =
      (12 * sigma * sigma - passes * wl * wl - 4 * passes * wl - 3 * passes) /
      (-4 * wl - 4)
    const m = Math.round(mIdeal)
    const sizes: number[] = []
    for (let i = 0; i < passes; i++) sizes.push(i < m ? wl : wu)
    return sizes
  }

  /**
   * Separierbarer Box-Blur (horizontal + vertikal) für einen Kanal.
   */
  private static boxBlur(
    channel: Float32Array,
    width: number,
    height: number,
    radius: number
  ): void {
    if (radius < 1) return
    const temp = new Float32Array(channel.length)
    this.boxBlurH(channel, temp, width, height, radius)
    this.boxBlurV(temp, channel, width, height, radius)
  }

  /** Horizontale Box-Blur-Passage mit gleitendem Fenster (Ränder geklemmt). */
  private static boxBlurH(
    src: Float32Array,
    dst: Float32Array,
    width: number,
    height: number,
    radius: number
  ): void {
    const norm = 1 / (radius + radius + 1)
    for (let y = 0; y < height; y++) {
      const row = y * width
      let acc = 0
      for (let x = -radius; x <= radius; x++) {
        const cx = x < 0 ? 0 : x >= width ? width - 1 : x
        acc += src[row + cx]
      }
      for (let x = 0; x < width; x++) {
        dst[row + x] = acc * norm
        const addX = x + radius + 1
        const remX = x - radius
        const ai = addX >= width ? width - 1 : addX
        const ri = remX < 0 ? 0 : remX
        acc += src[row + ai] - src[row + ri]
      }
    }
  }

  /** Vertikale Box-Blur-Passage mit gleitendem Fenster (Ränder geklemmt). */
  private static boxBlurV(
    src: Float32Array,
    dst: Float32Array,
    width: number,
    height: number,
    radius: number
  ): void {
    const norm = 1 / (radius + radius + 1)
    for (let x = 0; x < width; x++) {
      let acc = 0
      for (let y = -radius; y <= radius; y++) {
        const cy = y < 0 ? 0 : y >= height ? height - 1 : y
        acc += src[cy * width + x]
      }
      for (let y = 0; y < height; y++) {
        dst[y * width + x] = acc * norm
        const addY = y + radius + 1
        const remY = y - radius
        const ai = (addY >= height ? height - 1 : addY) * width + x
        const ri = (remY < 0 ? 0 : remY) * width + x
        acc += src[ai] - src[ri]
      }
    }
  }

  /**
   * Zeichnet eine Vignette (abgedunkelte Ränder) über das Bild.
   * @param vignette 0-100 Stärke
   */
  private static applyVignette(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    vignette: number
  ): void {
    const strength = Math.max(0, Math.min(1, vignette / 100)) * 0.9
    if (strength <= 0) return

    const cx = width / 2
    const cy = height / 2
    const outer = Math.sqrt(cx * cx + cy * cy)
    const inner = outer * 0.45

    const gradient = ctx.createRadialGradient(cx, cy, inner, cx, cy, outer)
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0)')
    gradient.addColorStop(1, `rgba(0, 0, 0, ${strength})`)

    ctx.save()
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, width, height)
    ctx.restore()
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
   * Erstellt ein Canvas mit Text-Wasserzeichen
   * @param sourceCanvas Das Quell-Canvas
   * @param watermark Die Wasserzeichen-Einstellungen
   * @returns Canvas mit Wasserzeichen
   */
  static getCanvasWithWatermark(
    sourceCanvas: HTMLCanvasElement,
    watermark: WatermarkSettings
  ): HTMLCanvasElement {
    if (!watermark.enabled || !watermark.text.trim()) {
      return sourceCanvas
    }

    const canvas = document.createElement('canvas')
    canvas.width = sourceCanvas.width
    canvas.height = sourceCanvas.height
    const ctx = canvas.getContext('2d')

    if (!ctx) return sourceCanvas

    // Quellbild zuerst zeichnen (mit voller Deckkraft)
    ctx.drawImage(sourceCanvas, 0, 0)

    // Wasserzeichen-Einstellungen
    const fontWeight = watermark.bold ? 'bold' : 'normal'
    const fontStyle = watermark.italic ? 'italic' : 'normal'
    const fontSize = watermark.fontSize
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

    return canvas
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
    const filteredCanvas = this.getCanvasWithFilters(imageObj)
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
    x: number, y: number,
    w: number, h: number,
    rx: number, ry?: number
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
  static getCanvasWithTransforms(
    sourceCanvas: HTMLCanvasElement,
    transforms: ImageTransforms
  ): HTMLCanvasElement {
    const t = transforms
    const hasTransforms = t.borderWidth > 0 || t.borderRadius > 0 || t.shadowBlur > 0

    if (!hasTransforms) {
      return sourceCanvas
    }

    const imgW = sourceCanvas.width
    const imgH = sourceCanvas.height

    // borderRadius als Prozent der Bilddimensionen skalieren
    // Slider 0-200 → 0%-50% → bei 200 = voller Kreis/Ellipse
    const radiusFraction = t.borderRadius / 200 * 0.5 // 0 bis 0.5
    const innerRx = radiusFraction * imgW
    const innerRy = radiusFraction * imgH

    // Padding für Schatten berechnen
    const shadowPadding = t.shadowBlur > 0
      ? Math.ceil(t.shadowBlur * 2 + Math.max(Math.abs(t.shadowOffsetX), Math.abs(t.shadowOffsetY)))
      : 0

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
    if (t.shadowBlur > 0) {
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
