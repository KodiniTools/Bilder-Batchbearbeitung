import jsPDF from 'jspdf'

/**
 * 🎨 VOLLSTÄNDIGE PDF-EXPORT-LÖSUNG
 * Unterstützt: Benutzerdefinierte Startseite, Mehrere Kommentarseiten, Bilder, Texte, Formatierungen
 * 
 * ✨ OPTIMIERUNGEN FÜR KLEINE DATEIGRÖSSEN:
 * 1. JPEG-Komprimierung statt PNG (bis zu 90% kleiner)
 * 2. Automatisches Herunterskalieren zu großer Bilder (Standard: max 1920px)
 * 3. Konfigurierbare Qualität (0.0 - 1.0)
 * 
 * 📊 ERWARTETE DATEIGRÖSSEN:
 * - 8 Seiten mit Bildern: ca. 2-5 MB (statt 18+ MB ohne Optimierung)
 * - Pro Seite: ca. 300-600 KB
 * - Standard-Qualität: 0.75 (gute Balance zwischen Qualität und Größe)
 * - Mit optimizeSize: 0.65 (noch kleiner, immer noch gute Qualität)
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface CanvasElement {
  id: string
  type: 'text' | 'image'
  x: number
  y: number
  zIndex: number
  page?: number // Seiten-Nummer (wird automatisch hinzugefügt wenn nicht vorhanden)
  // Text properties
  content?: string
  fontSize?: number
  fontFamily?: string
  color?: string
  align?: 'left' | 'center' | 'right'
  bold?: boolean
  italic?: boolean
  // Shared properties
  width?: number
  height?: number
  // Image properties
  src?: string
  opacity?: number
}

// Startseiten-Element (vom FrontPageDesigner)
export interface FrontPageElement {
  id: string
  type: 'text' | 'image'
  x: number
  y: number
  width: number
  height: number
  // Text properties
  content?: string
  fontSize?: number
  fontFamily?: string
  fontWeight?: 'normal' | 'bold'
  textAlign?: 'left' | 'center' | 'right'
  color?: string
  // Image properties
  src?: string
  alt?: string
  originalWidth?: number
  originalHeight?: number
}

export interface ImageData {
  canvas?: HTMLCanvasElement // Für direkte Canvas-Objekte
  dataUrl?: string // Für Base64-Daten
  originalName: string
}

export interface PdfExportSettings {
  title?: string
  author?: string
  includeTitlePage?: boolean
  includeCustomFrontPage?: boolean // ✨ NEU: Benutzerdefinierte Startseite
  frontPageElements?: FrontPageElement[] // ✨ NEU: Elemente für Startseite
  includeCommentPages?: boolean
  commentPageElements?: CanvasElement[]
  includeFileName?: boolean
  includeImages?: boolean
  optimizeSize?: boolean
  imageQuality?: number // JPEG Qualität: 0.0 (niedrig) bis 1.0 (hoch), default 0.75
  maxImageDimension?: number // Maximale Breite/Höhe in Pixel, default 1920
  orientation?: 'portrait' | 'landscape'
}

// ============================================================================
// MAIN EXPORT FUNCTION
// ============================================================================

/**
 * Exportiert Bilder mit optionalen Kommentarseiten als PDF
 * 
 * @param images - Array von Bildern (mit canvas oder dataUrl)
 * @param settings - Export-Einstellungen
 * @param filename - Dateiname für das PDF (optional)
 */
export async function exportMultipleImagesAsPdf(
  images: ImageData[],
  settings: PdfExportSettings = {},
  filename?: string
): Promise<void> {
  const {
    title = 'Bildersammlung',
    author,
    includeTitlePage = true,
    includeCustomFrontPage = false, // ✨ NEU
    frontPageElements = [], // ✨ NEU
    includeCommentPages = false,
    commentPageElements = [],
    includeFileName = true,
    includeImages = true,
    imageQuality,
    maxImageDimension = 1920, // Standard: 1920px (Full HD)
    optimizeSize = false,
    orientation = 'portrait'
  } = settings

  // Bestimme JPEG-Qualität:
  // - Wenn imageQuality gesetzt ist, verwende diesen Wert
  // - Wenn optimizeSize=true, verwende niedrigere Qualität (0.65) für kleinere Dateien
  // - Ansonsten verwende gute Standard-Qualität (0.75)
  const jpegQuality = imageQuality !== undefined ? imageQuality : (optimizeSize ? 0.65 : 0.75)

  const pdf = new jsPDF({
    orientation: orientation,
    unit: 'mm',
    format: 'a4'
  })

  let pageAdded = false

  console.log('📄 Starte PDF-Export...')
  console.log(`📊 ${images.length} Bilder, ${commentPageElements.length} Kommentar-Elemente, ${frontPageElements.length} Startseiten-Elemente`)
  console.log(`🎨 JPEG-Qualität: ${(jpegQuality * 100).toFixed(0)}% ${optimizeSize ? '(optimiert)' : ''}`)
  console.log(`📏 Max. Bildauflösung: ${maxImageDimension}px`)

  // ========================================
  // 1. STARTSEITE
  // ========================================
  // Prüfe ob benutzerdefinierte Startseite aktiviert ist UND Elemente vorhanden sind
  if (includeCustomFrontPage && frontPageElements.length > 0) {
    console.log('✨ Erstelle benutzerdefinierte Startseite...')
    await createCustomFrontPage(pdf, frontPageElements, jpegQuality, maxImageDimension, orientation)
    pageAdded = true
  } else if (includeTitlePage) {
    // Fallback: Automatische Titelseite wenn keine benutzerdefinierte Startseite
    console.log('📋 Erstelle automatische Titel-Seite...')
    createTitlePage(pdf, title, images.length, author)
    pageAdded = true
  }

  // ========================================
  // 2. KOMMENTAR-SEITEN
  // ========================================
  if (includeCommentPages && commentPageElements.length > 0) {
    console.log('🎨 Erstelle Kommentar-Seiten...')
    
    if (pageAdded) {
      pdf.addPage()
    }
    
    // Automatisch page-Nummern hinzufügen wenn nicht vorhanden
    const elementsWithPages = assignPageNumbersIfMissing(commentPageElements)
    
    await createCommentPagesFromElements(pdf, elementsWithPages, jpegQuality, maxImageDimension)
    pageAdded = true
  }

  // ========================================
  // 3. BILD-SEITEN
  // ========================================
  if (includeImages && images.length > 0) {
    console.log('🖼️ Füge Bilder hinzu...')
    
    for (let i = 0; i < images.length; i++) {
      const image = images[i]

      if (pageAdded) {
        pdf.addPage()
      }

      try {
        // Hole dataUrl - entweder direkt oder vom Canvas
        let dataUrl: string
        if (image.dataUrl) {
          // Konvertiere und skaliere dataUrl (auch PNG→JPEG!)
          dataUrl = await resizeAndConvertDataUrl(image.dataUrl, maxImageDimension, jpegQuality)
        } else if (image.canvas) {
          // Skaliere Canvas herunter wenn nötig
          const resizedCanvas = resizeCanvas(image.canvas, maxImageDimension)
          // Verwende JPEG-Komprimierung für kleinere Dateien und schnellere Speicherung
          dataUrl = resizedCanvas.toDataURL('image/jpeg', jpegQuality)
        } else {
          console.warn(`⚠️ Bild ${i} hat weder canvas noch dataUrl`)
          continue
        }

        const pageWidth = pdf.internal.pageSize.getWidth()
        const pageHeight = pdf.internal.pageSize.getHeight()
        const margin = 10

        // Get image properties
        const imgProps = pdf.getImageProperties(dataUrl)
        const imgAspectRatio = imgProps.width / imgProps.height

        // Calculate dimensions
        let imgWidth = pageWidth - margin * 2
        let imgHeight = imgWidth / imgAspectRatio

        if (imgHeight > pageHeight - margin * 2) {
          imgHeight = pageHeight - margin * 2
          imgWidth = imgHeight * imgAspectRatio
        }

        // Center image
        const x = (pageWidth - imgWidth) / 2
        const y = (pageHeight - imgHeight) / 2

        // Add image - nach Konvertierung sollte es immer JPEG sein
        // Aber wir überprüfen trotzdem zur Sicherheit
        const imageFormat = dataUrl.startsWith('data:image/png') ? 'PNG' : 'JPEG'
        pdf.addImage(dataUrl, imageFormat, x, y, imgWidth, imgHeight)

        // Add filename
        if (includeFileName) {
          pdf.setFontSize(10)
          pdf.setFont('helvetica', 'normal')
          pdf.setTextColor(120, 120, 120)
          const filename = image.originalName
          const filenameWidth = pdf.getTextWidth(filename)
          pdf.text(filename, (pageWidth - filenameWidth) / 2, y + imgHeight + 5)
        }
        
        console.log(`  ✔ Bild ${i + 1}/${images.length} hinzugefügt`)
      } catch (error) {
        console.error(`❌ Fehler bei Bild ${i}:`, error)
      }

      pageAdded = true
    }
  }

  // ========================================
  // 4. PDF SPEICHERN
  // ========================================
  const finalFilename = filename || `bilder-export-${new Date().toISOString().slice(0, 10)}.pdf`
  pdf.save(finalFilename)
  
  console.log('✅ PDF erfolgreich gespeichert:', finalFilename)
}

// ============================================================================
// ALTERNATIVE EXPORT-FUNKTION (für Kompatibilität mit App.vue)
// ============================================================================

/**
 * Alternative Export-Funktion die mit der App.vue kompatibel ist
 */
export async function exportImagesWithComments(
  images: ImageData[],
  settings: {
    orientation?: 'portrait' | 'landscape'
    author?: string
    includeCustomFrontPage?: boolean
    frontPageElements?: FrontPageElement[]
    includeCommentPages?: boolean
    commentPageElements?: CanvasElement[]
  },
  filename: string
): Promise<void> {
  await exportMultipleImagesAsPdf(images, {
    title: 'Bildersammlung',
    author: settings.author,
    includeTitlePage: !settings.includeCustomFrontPage, // Automatische Titelseite nur wenn keine benutzerdefinierte
    includeCustomFrontPage: settings.includeCustomFrontPage,
    frontPageElements: settings.frontPageElements,
    includeCommentPages: settings.includeCommentPages,
    commentPageElements: settings.commentPageElements,
    includeFileName: true,
    includeImages: true,
    orientation: settings.orientation || 'portrait'
  }, filename)
}

export interface ExportSettings {
  orientation?: 'portrait' | 'landscape'
  author?: string
  includeCustomFrontPage?: boolean
  frontPageElements?: FrontPageElement[]
  includeCommentPages?: boolean
  commentPageElements?: CanvasElement[]
  imageQuality?: number // JPEG Qualität: 0.0 bis 1.0
  maxImageDimension?: number // Max. Breite/Höhe in Pixel
  zipName?: string
  format?: string
  quality?: number
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Erstellt eine benutzerdefinierte Startseite aus Designer-Elementen.
 * Rendert via HTML5 Canvas, damit benutzerdefinierte @font-face-Schriften
 * korrekt im PDF erscheinen.
 */
async function createCustomFrontPage(
  pdf: jsPDF,
  elements: FrontPageElement[],
  jpegQuality: number,
  _maxImageDimension: number,
  orientation: 'portrait' | 'landscape' = 'portrait'
): Promise<void> {
  if (elements.length === 0) return

  console.log('🎨 Verarbeite', elements.length, 'Elemente für Startseite (Canvas-Rendering)')

  // Canvas-Dimensionen passend zur PDF-Orientierung (A4 bei 96 DPI)
  // Designer arbeitet immer im Hochformat (794×1123); für Querformat skalieren wir proportional.
  const designWidth = 794
  const designHeight = 1123
  const canvasWidth = orientation === 'landscape' ? designHeight : designWidth
  const canvasHeight = orientation === 'landscape' ? designWidth : designHeight

  // Skalierungsfaktoren von Designer-Koordinaten auf Canvas-Koordinaten
  const scaleX = canvasWidth / designWidth
  const scaleY = canvasHeight / designHeight

  // Offscreen-Canvas erstellen
  const canvas = document.createElement('canvas')
  // 2× Auflösung für scharfe Schrift im PDF
  const scale = 2
  canvas.width = canvasWidth * scale
  canvas.height = canvasHeight * scale
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const ctx = canvas.getContext('2d')! // guaranteed on a freshly created canvas element
  ctx.scale(scale * scaleX, scale * scaleY)

  // Weißer Hintergrund (Koordinaten im Design-Raum 794×1123)
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, designWidth, designHeight)

  // Sortiere Elemente nach y-Position
  const sortedElements = [...elements].sort((a, b) => a.y - b.y)

  for (const element of sortedElements) {
    try {
      if (element.type === 'text') {
        renderFrontPageTextOnCanvas(ctx, element)
      } else if (element.type === 'image') {
        await renderFrontPageImageOnCanvas(ctx, element)
      }
    } catch (error) {
      console.error('❌ Fehler beim Canvas-Rendern:', element.id, error)
    }
  }

  // Canvas als JPEG in PDF einfügen
  const imgData = canvas.toDataURL('image/jpeg', jpegQuality)
  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  pdf.addImage(imgData, 'JPEG', 0, 0, pageWidth, pageHeight)

  console.log('✅ Startseite erfolgreich erstellt (Canvas-Rendering)')
}

/**
 * Rendert ein Text-Element auf dem Offscreen-Canvas.
 * Unterstützt benutzerdefinierte Schriftarten über @font-face.
 */
function renderFrontPageTextOnCanvas(
  ctx: CanvasRenderingContext2D,
  element: FrontPageElement
): void {
  if (!element.content?.trim()) return

  const padding = 8
  const fontSize = element.fontSize || 24
  const fontFamily = element.fontFamily || 'Helvetica, Arial, sans-serif'
  const fontWeight = element.fontWeight === 'bold' ? 'bold' : 'normal'
  const lineHeight = fontSize * 1.4

  ctx.save()
  ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`
  ctx.fillStyle = element.color || '#000000'
  ctx.textBaseline = 'top'

  const contentWidth = element.width - padding * 2
  const x = element.x + padding
  let y = element.y + padding

  // Mehrzeiligen Text verarbeiten (explizite Umbrüche + Wortumbruch)
  const explicitLines = element.content.split('\n')
  const allLines: string[] = []

  for (const line of explicitLines) {
    if (line.trim() === '') {
      allLines.push('')
    } else {
      allLines.push(...wrapText(ctx, line, contentWidth))
    }
  }

  for (const line of allLines) {
    let xPos = x
    if (element.textAlign === 'center') {
      const w = ctx.measureText(line).width
      xPos = x + (contentWidth - w) / 2
    } else if (element.textAlign === 'right') {
      const w = ctx.measureText(line).width
      xPos = x + contentWidth - w
    }
    ctx.fillText(line, xPos, y)
    y += lineHeight
  }

  ctx.restore()
}

/** Bricht Text in Zeilen um die in maxWidth passen */
function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(' ')
  const lines: string[] = []
  let current = ''

  for (const word of words) {
    const test = current ? current + ' ' + word : word
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current)
      current = word
    } else {
      current = test
    }
  }
  if (current) lines.push(current)
  return lines.length ? lines : ['']
}

/** Rendert ein Bild-Element auf dem Offscreen-Canvas */
async function renderFrontPageImageOnCanvas(
  ctx: CanvasRenderingContext2D,
  element: FrontPageElement
): Promise<void> {
  if (!element.src) return

  return new Promise<void>((resolve) => {
    const img = new Image()
    img.onload = () => {
      ctx.drawImage(img, element.x, element.y, element.width, element.height)
      resolve()
    }
    img.onerror = () => {
      console.error('❌ Bild konnte nicht geladen werden:', element.id)
      resolve()
    }
    img.src = element.src
  })
}

/* renderFrontPageTextElement entfernt – Text wird jetzt via Canvas gerendert
   (siehe renderFrontPageTextOnCanvas) für Custom-Font-Unterstützung */

/* renderFrontPageImageElement entfernt – Bilder werden jetzt via Canvas gerendert
   (siehe renderFrontPageImageOnCanvas) */

/**
 * Fügt automatisch page-Nummern zu Elementen hinzu die keine haben
 * Gruppiert zusammenhängende Elemente auf die gleiche Seite
 */
function assignPageNumbersIfMissing(elements: CanvasElement[]): CanvasElement[] {
  // Wenn alle Elemente bereits page-Nummern haben, nichts tun
  if (elements.every(el => el.page !== undefined)) {
    return elements
  }
  
  console.log('⚠️ Einige Elemente haben keine page-Nummer, weise automatisch zu...')
  
  // Sortiere nach Y-Position
  const sorted = [...elements].sort((a, b) => a.y - b.y)
  
  // Gruppiere Elemente die nah beieinander sind auf die gleiche Seite
  const pageHeight = 1123 // A4 bei 96 DPI
  let currentPage = 1
  let lastY = 0
  
  return sorted.map(element => {
    if (element.page !== undefined) {
      return element
    }
    
    // Wenn Element viel weiter unten ist, neue Seite
    if (element.y - lastY > pageHeight * 0.9) {
      currentPage++
    }
    
    lastY = element.y
    
    return {
      ...element,
      page: currentPage
    }
  })
}

/**
 * Erstellt eine automatische Titel-Seite
 */
function createTitlePage(
  pdf: jsPDF,
  title: string,
  imageCount: number,
  author?: string
): void {
  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()

  // Title
  pdf.setFontSize(32)
  pdf.setFont('helvetica', 'bold')
  pdf.setTextColor(102, 126, 234)
  const titleWidth = pdf.getTextWidth(title)
  pdf.text(title, (pageWidth - titleWidth) / 2, pageHeight / 3)

  // Image count
  pdf.setFontSize(18)
  pdf.setFont('helvetica', 'normal')
  pdf.setTextColor(60, 60, 60)
  const countText = `${imageCount} Bild${imageCount !== 1 ? 'er' : ''}`
  const countWidth = pdf.getTextWidth(countText)
  pdf.text(countText, (pageWidth - countWidth) / 2, pageHeight / 3 + 20)

  // Author
  if (author) {
    pdf.setFontSize(14)
    pdf.setTextColor(120, 120, 120)
    const authorText = `Autor: ${author}`
    const authorWidth = pdf.getTextWidth(authorText)
    pdf.text(authorText, (pageWidth - authorWidth) / 2, pageHeight / 3 + 35)
  }

  // Date
  pdf.setFontSize(12)
  pdf.setTextColor(150, 150, 150)
  const dateText = new Date().toLocaleDateString('de-DE', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
  const dateWidth = pdf.getTextWidth(dateText)
  pdf.text(dateText, (pageWidth - dateWidth) / 2, pageHeight / 3 + 50)

  // Footer
  pdf.setFontSize(10)
  pdf.setTextColor(180, 180, 180)
  const footer = 'Erstellt mit Kodini Tools'
  const footerWidth = pdf.getTextWidth(footer)
  pdf.text(footer, (pageWidth - footerWidth) / 2, pageHeight - 20)
}

/**
 * Erstellt Kommentar-Seiten aus Designer-Elementen
 * Gruppiert Elemente nach Seiten und erstellt separate PDF-Seiten
 */
async function createCommentPagesFromElements(
  pdf: jsPDF,
  elements: CanvasElement[],
  jpegQuality: number,
  maxImageDimension: number
): Promise<void> {
  if (elements.length === 0) return

  console.log('🎨 Verarbeite', elements.length, 'Elemente für Kommentar-Seiten')

  // Gruppiere Elemente nach Seiten
  const elementsByPage = new Map<number, CanvasElement[]>()
  
  elements.forEach(element => {
    const pageNum = element.page || 1
    if (!elementsByPage.has(pageNum)) {
      elementsByPage.set(pageNum, [])
    }
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    elementsByPage.get(pageNum)!.push(element) // set() called on line above
  })

  // Sortiere Seiten-Nummern
  const pageNumbers = Array.from(elementsByPage.keys()).sort((a, b) => a - b)
  console.log(`📄 Gefundene Seiten: ${pageNumbers.join(', ')} (insgesamt ${pageNumbers.length})`)

  // Rendere jede Seite
  for (let i = 0; i < pageNumbers.length; i++) {
    const pageNum = pageNumbers[i]
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const pageElements = elementsByPage.get(pageNum)! // key guaranteed from keys() above

    // Füge neue Seite hinzu (außer für die erste)
    if (i > 0) {
      pdf.addPage()
    }

    console.log(`  📝 Rendere Seite ${pageNum} mit ${pageElements.length} Elementen`)
    
    await renderSingleCommentPage(pdf, pageElements, pageNum, pageNumbers.length, jpegQuality, maxImageDimension)
  }
}

/**
 * Rendert eine einzelne Kommentar-Seite mit ihren Elementen
 */
async function renderSingleCommentPage(
  pdf: jsPDF,
  elements: CanvasElement[],
  pageNumber: number,
  totalPages: number,
  jpegQuality: number,
  maxImageDimension: number
): Promise<void> {
  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()

  // Canvas-Dimensionen vom Designer (A4 bei 96 DPI)
  const canvasWidth = 794 // pixels
  const canvasHeight = 1123 // pixels

  // Umrechnungsfaktoren von Pixel zu mm
  const scaleX = pageWidth / canvasWidth
  const scaleY = pageHeight / canvasHeight

  // Sortiere Elemente nach z-Index für korrekte Render-Reihenfolge
  const sortedElements = [...elements].sort((a, b) => a.zIndex - b.zIndex)

  // Rendere jedes Element
  for (const element of sortedElements) {
    try {
      if (element.type === 'text') {
        renderTextElement(pdf, element, scaleX, scaleY)
      } else if (element.type === 'image') {
        await renderImageElement(pdf, element, scaleX, scaleY, jpegQuality, maxImageDimension)
      }
    } catch (error) {
      console.error('❌ Fehler beim Rendern von Element:', element.id, error)
    }
  }

  // Footer mit Seiten-Nummer
  pdf.setFontSize(9)
  pdf.setTextColor(150, 150, 150)
  const dateStr = new Date().toLocaleDateString('de-DE')
  const footerText = `Erstellt am ${dateStr} • Kommentarseite ${pageNumber}${totalPages > 1 ? ` von ${totalPages}` : ''}`
  pdf.text(footerText, (pageWidth - pdf.getTextWidth(footerText)) / 2, pageHeight - 10)
}

/**
 * Rendert ein Text-Element (für Kommentarseiten)
 *
 * Koordinatensystem-Abgleich mit dem Canvas-Editor:
 * - Canvas: 794×1123px (A4 @ 96 DPI)
 * - PDF A4: 210×297mm
 * - 1 Canvas-Pixel = scaleX mm (≈ 0.2645 mm)
 * - CSS .element-text hat padding: 8px
 * - CSS .text-content hat line-height: 1.5
 * - jsPDF text() positioniert an der Baseline
 * - jsPDF setFontSize() erwartet Punkte (1pt = 0.3528mm)
 */
function renderTextElement(
  pdf: jsPDF,
  element: CanvasElement,
  scaleX: number,
  scaleY: number
): void {
  if (!element.content || !element.content.trim()) return

  // Padding des Canvas-Elements in px (CSS: .element-text { padding: 8px })
  const paddingPx = 8

  // Schriftgröße: Canvas-px → PDF-Punkte
  // fontSizePt = fontSizePx × (mm pro Canvas-px) / (mm pro Punkt)
  const fontSizePx = element.fontSize || 24
  const fontSizePt = fontSizePx * scaleY / 0.3528
  pdf.setFontSize(fontSizePt)

  // Schrift-Style setzen
  if (element.bold && element.italic) {
    pdf.setFont('helvetica', 'bolditalic')
  } else if (element.bold) {
    pdf.setFont('helvetica', 'bold')
  } else if (element.italic) {
    pdf.setFont('helvetica', 'italic')
  } else {
    pdf.setFont('helvetica', 'normal')
  }

  // Farbe setzen
  if (element.color) {
    const color = hexToRgb(element.color)
    if (color) {
      pdf.setTextColor(color.r, color.g, color.b)
    }
  } else {
    pdf.setTextColor(0, 0, 0)
  }

  // X-Position: element.x + Padding (in mm)
  const xBase = (element.x + paddingPx) * scaleX

  // Verfügbare Breite für Textumbruch: Element-Breite minus Padding (WYSIWYG)
  const elementWidth = element.width || 300
  const availableWidthMm = (elementWidth - paddingPx * 2) * scaleX

  // Mehrzeiligen Text verarbeiten: erst explizite Zeilenumbrüche, dann Wortumbruch
  // splitTextToSize() repliziert das CSS word-break: break-word Verhalten
  const explicitLines = element.content.split('\n')
  const allLines: string[] = []

  explicitLines.forEach(line => {
    if (line.trim() === '') {
      allLines.push('')
    } else {
      const wrappedLines = pdf.splitTextToSize(line, availableWidthMm)
      allLines.push(...wrappedLines)
    }
  })

  allLines.forEach((line, index) => {
    // Y-Position: Baseline der n-ten Zeile
    // = element.y + padding + fontSize (Baseline der 1. Zeile) + index × lineHeight
    // CSS-Modell: half-leading (0.25×fontSize) + Ascent (≈0.75×fontSize) ≈ fontSize
    const yPosPx = element.y + paddingPx + fontSizePx * (1 + index * 1.5)
    const yPosMm = yPosPx * scaleY

    // Text-Ausrichtung relativ zur Element-Breite (wie CSS text-align)
    if (element.align === 'center') {
      const textWidthMm = pdf.getTextWidth(line)
      const xPos = xBase + (availableWidthMm - textWidthMm) / 2
      pdf.text(line, xPos, yPosMm)
    } else if (element.align === 'right') {
      const textWidthMm = pdf.getTextWidth(line)
      const xPos = xBase + (availableWidthMm - textWidthMm)
      pdf.text(line, xPos, yPosMm)
    } else {
      pdf.text(line, xBase, yPosMm)
    }
  })
}

/**
 * Rendert ein Bild-Element (konvertiert PNG zu JPEG für kleinere Dateien)
 */
async function renderImageElement(
  pdf: jsPDF,
  element: CanvasElement,
  scaleX: number,
  scaleY: number,
  jpegQuality: number,
  maxImageDimension: number
): Promise<void> {
  if (!element.src) return

  try {
    // Konvertiere PNG zu JPEG wenn nötig
    let imageSrc = element.src
    if (element.src.startsWith('data:image/png')) {
      console.log('  🔄 Konvertiere Kommentar-Bild von PNG zu JPEG...')
      imageSrc = await resizeAndConvertDataUrl(element.src, maxImageDimension, jpegQuality)
    }
    
    // Konvertiere Koordinaten und Dimensionen
    const x = element.x * scaleX
    const y = element.y * scaleY
    
    // Hole Bild-Eigenschaften
    const imgProps = pdf.getImageProperties(imageSrc)
    const imgAspectRatio = imgProps.width / imgProps.height
    
    // Berechne skalierte Größe
    const width = (element.width || 200) * scaleX
    const height = width / imgAspectRatio

    // Füge Bild hinzu (sollte jetzt immer JPEG sein)
    const imageFormat = imageSrc.startsWith('data:image/png') ? 'PNG' : 'JPEG'
    pdf.addImage(imageSrc, imageFormat, x, y, width, height)
  } catch (error) {
    console.error('❌ Fehler beim Hinzufügen von Bild zum PDF:', error)
  }
}

/**
 * Konvertiert Hex-Farbe zu RGB
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      }
    : null
}

/**
 * Skaliert ein Canvas-Bild herunter, wenn es größer als maxDimension ist
 * Dies reduziert die Dateigröße erheblich ohne sichtbaren Qualitätsverlust
 */
function resizeCanvas(sourceCanvas: HTMLCanvasElement, maxDimension: number): HTMLCanvasElement {
  const width = sourceCanvas.width
  const height = sourceCanvas.height
  
  // Wenn Bild bereits klein genug ist, Original zurückgeben
  if (width <= maxDimension && height <= maxDimension) {
    return sourceCanvas
  }
  
  // Berechne neue Dimensionen unter Beibehaltung des Seitenverhältnisses
  let newWidth: number
  let newHeight: number
  
  if (width > height) {
    newWidth = maxDimension
    newHeight = Math.round((height / width) * maxDimension)
  } else {
    newHeight = maxDimension
    newWidth = Math.round((width / height) * maxDimension)
  }
  
  // Erstelle neues Canvas mit reduzierten Dimensionen
  const resizedCanvas = document.createElement('canvas')
  resizedCanvas.width = newWidth
  resizedCanvas.height = newHeight
  
  const ctx = resizedCanvas.getContext('2d')
  if (!ctx) {
    console.warn('⚠️ Konnte Canvas-Context nicht erstellen, verwende Original')
    return sourceCanvas
  }
  
  // Zeichne Bild in reduzierter Größe (mit Antialiasing für bessere Qualität)
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(sourceCanvas, 0, 0, newWidth, newHeight)
  
  console.log(`  📏 Bild skaliert: ${width}x${height} → ${newWidth}x${newHeight} (${((newWidth * newHeight) / (width * height) * 100).toFixed(1)}% der Originalgröße)`)
  
  return resizedCanvas
}

/**
 * Konvertiert und skaliert eine dataUrl zu JPEG
 * WICHTIG: Konvertiert PNG zu JPEG für drastisch kleinere Dateien!
 */
async function resizeAndConvertDataUrl(dataUrl: string, maxDimension: number, quality: number): Promise<string> {
  return new Promise((resolve, _reject) => {
    const img = new Image()
    
    img.onload = () => {
      // Berechne Dimensionen (immer neu erstellen für JPEG-Konvertierung)
      let newWidth: number
      let newHeight: number
      
      // Wenn Bild klein genug ist, behalte Original-Größe
      if (img.width <= maxDimension && img.height <= maxDimension) {
        newWidth = img.width
        newHeight = img.height
      } else {
        // Skaliere herunter
        if (img.width > img.height) {
          newWidth = maxDimension
          newHeight = Math.round((img.height / img.width) * maxDimension)
        } else {
          newHeight = maxDimension
          newWidth = Math.round((img.width / img.height) * maxDimension)
        }
      }
      
      // Erstelle Canvas und zeichne Bild
      const canvas = document.createElement('canvas')
      canvas.width = newWidth
      canvas.height = newHeight
      
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        console.warn('⚠️ Konnte Canvas-Context nicht erstellen')
        resolve(dataUrl)
        return
      }
      
      // Zeichne mit High-Quality Antialiasing
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'
      ctx.drawImage(img, 0, 0, newWidth, newHeight)
      
      // IMMER zu JPEG konvertieren (auch wenn Original PNG war!)
      const originalFormat = dataUrl.startsWith('data:image/png') ? 'PNG' : 'JPEG'
      const jpegDataUrl = canvas.toDataURL('image/jpeg', quality)
      
      if (img.width !== newWidth || img.height !== newHeight) {
        console.log(`  📏 Bild skaliert: ${img.width}x${img.height} → ${newWidth}x${newHeight}`)
      }
      if (originalFormat === 'PNG') {
        const originalSize = Math.round(dataUrl.length / 1024)
        const newSize = Math.round(jpegDataUrl.length / 1024)
        const savings = Math.round((1 - newSize / originalSize) * 100)
        console.log(`  🔄 PNG→JPEG konvertiert: ${originalSize}KB → ${newSize}KB (${savings}% kleiner)`)
      }
      
      resolve(jpegDataUrl)
    }
    
    img.onerror = () => {
      console.warn('⚠️ Fehler beim Laden des Bildes, verwende Original')
      resolve(dataUrl)
    }
    
    img.src = dataUrl
  })
}
