import jsPDF, { GState, type EncryptionOptions } from 'jspdf'
import { applyPdfFont, registerPdfFonts, toPdfFontStyle, type PdfFontStyle } from './pdf-fonts'
import type { WatermarkSettings } from '@/lib/core/types'
import { PdfImageEncoder, type EncodedPdfImage, type PdfImageSource } from './pdf-image-encoder'
import { scaledImageSize } from './pdf-image-size'
import {
  escapeRichText,
  hasRichMarkup,
  layoutRichText,
  parseRichText,
} from '@/lib/designer/rich-text'

/**
 * Wasserzeichen im PDF: dieselben Felder wie das Bild-Wasserzeichen
 * (fontSize in px bei 96 DPI, opacity 0–100, rotation im Uhrzeigersinn),
 * optional zusätzlich ein Logo als Daten-URL.
 */
export interface PdfWatermark extends WatermarkSettings {
  logoDataUrl?: string
}

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

/**
 * Element einer gestalteten PDF-Seite (Startseite oder Kommentarseite).
 * Koordinaten in px auf der A4-Fläche bei 96 DPI (794×1123 bzw. quer 1123×794).
 */
export type PdfShapeKind = 'rect' | 'ellipse' | 'line'

export interface PdfElement {
  id: string
  type: 'text' | 'image' | 'shape'
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
  alt?: string
  opacity?: number
  // Form-Eigenschaften (type 'shape')
  shape?: PdfShapeKind
  /** Füllfarbe (hex); leer = keine Füllung. Linien haben keine Füllung. */
  fillColor?: string
  /** Rand-/Linienfarbe (hex); leer = kein Rand */
  strokeColor?: string
  /** Rand-/Linienstärke in px */
  strokeWidth?: number
  /** Eckenradius für Rechtecke in px */
  cornerRadius?: number
  /**
   * Seitenhintergrund: füllt die ganze Seite (Farbe als Rechteck-Form oder Bild),
   * liegt immer ganz hinten und ist im Designer nicht verschiebbar.
   */
  background?: boolean
}

export interface ImageData {
  canvas?: HTMLCanvasElement // Für direkte Canvas-Objekte
  /**
   * Erzeugt das Canvas erst beim Export (bevorzugt vor canvas/dataUrl):
   * So liegen nie alle Bilder einer Serie gleichzeitig im Speicher.
   */
  getCanvas?: () => HTMLCanvasElement
  dataUrl?: string // Für Base64-Daten
  /** Nur für Fehlermeldungen; der Dateiname erscheint nicht im PDF */
  originalName: string
  /** Mehrzeiliger Bildkommentar, wird unter dem Bild ausgegeben */
  comment?: string
}

/** Texte, die ins PDF geschrieben werden; die App übergibt sie in der UI-Sprache. */
export interface PdfLabels {
  /** BCP-47-Sprache für Datumsangaben, z. B. 'de' oder 'en' */
  locale: string
  imageCount: (count: number) => string
  author: (name: string) => string
  createdWith: string
  commentFooter: (page: number, total: number) => string
  /** Seitenzahl in der Fußzeile */
  pageNumber: (page: number, total: number) => string
  /** Lesezeichen im PDF-Inhaltsverzeichnis */
  bookmarkCover: string
  bookmarkComment: (page: number) => string
  bookmarkImage: (index: number) => string
}

const DEFAULT_PDF_LABELS: PdfLabels = {
  locale: 'de-DE',
  imageCount: (count) => `${count} Bild${count !== 1 ? 'er' : ''}`,
  author: (name) => `Autor: ${name}`,
  createdWith: 'Erstellt mit Kodini Tools',
  commentFooter: (page, total) =>
    `Erstellt am ${new Date().toLocaleDateString('de-DE')} • Kommentarseite ${page}${total > 1 ? ` von ${total}` : ''}`,
  pageNumber: (page, total) => `${page} / ${total}`,
  bookmarkCover: 'Startseite',
  bookmarkComment: (page) => `Kommentarseite ${page}`,
  bookmarkImage: (index) => `Bild ${index}`,
}

/** Seitenformate; Maße in mm im Hochformat */
export type PdfPageFormat = 'a4' | 'a5' | 'a3' | 'letter' | 'square' | 'custom'
/** Bilder pro Seite */
export type ImagesPerPage = 1 | 2 | 4 | 6 | 9
/** contain: ganzes Bild sichtbar; cover: Zelle füllen, Überstand wird beschnitten */
export type ImageFit = 'contain' | 'cover'

export const PAGE_FORMAT_SIZES_MM: Record<Exclude<PdfPageFormat, 'custom'>, [number, number]> = {
  a4: [210, 297],
  a5: [148, 210],
  a3: [297, 420],
  letter: [215.9, 279.4],
  square: [210, 210],
}

/** Grenzen für benutzerdefinierte Seitengrößen und Ränder in mm */
export const CUSTOM_PAGE_MIN_MM = 50
export const CUSTOM_PAGE_MAX_MM = 1000
export const PAGE_MARGIN_MAX_MM = 40

export interface PdfExportSettings {
  title?: string
  author?: string
  includeTitlePage?: boolean
  includeCustomFrontPage?: boolean // ✨ NEU: Benutzerdefinierte Startseite
  /** Elemente der gestalteten Startseite (alle auf einer Seite) */
  frontPageElements?: PdfElement[]
  includeCommentPages?: boolean
  commentPageElements?: PdfElement[]
  includeImages?: boolean
  optimizeSize?: boolean
  imageQuality?: number // JPEG Qualität: 0.0 (niedrig) bis 1.0 (hoch), default 0.75
  maxImageDimension?: number // Maximale Breite/Höhe in Pixel, default 1920
  orientation?: 'portrait' | 'landscape'
  /** Seitenformat, Standard A4 */
  pageFormat?: PdfPageFormat
  /** Breite × Höhe in mm (Hochformat), nur bei pageFormat 'custom' */
  customPageSize?: { width: number; height: number }
  /** Seitenrand der Bildseiten in mm, Standard 10 */
  margin?: number
  /** Bilder pro Seite, Standard 1 */
  imagesPerPage?: ImagesPerPage
  /** Einpassen (Standard) oder Füllen */
  imageFit?: ImageFit
  /** Kopfzeile; Platzhalter {page}, {total}, {title}, {date} */
  header?: string
  /** Fußzeile; Platzhalter wie header */
  footer?: string
  /** Seitenzahl unten rechts */
  pageNumbers?: boolean
  /** PDF-Lesezeichen für Startseite, Kommentarseiten und Bilder, Standard an */
  bookmarks?: boolean
  /** Wasserzeichen auf allen Seiten (Text und/oder Logo) */
  watermark?: PdfWatermark
  /** Öffnen-Passwort (druckbares ASCII, max. 32 Zeichen); leer = ungeschützt */
  password?: string
  /** Mit Passwort: Drucken erlauben (Standard: ja) */
  allowPrinting?: boolean
  /** Übersetzte PDF-Texte; fehlende Einträge fallen auf Deutsch zurück */
  labels?: Partial<PdfLabels>
  /** Fortschritt in Arbeitsschritten (Startseite, je Kommentarseite, je Bild) */
  onProgress?: (done: number, total: number) => void
  /** Bricht den Export zwischen zwei Schritten mit einem AbortError ab */
  signal?: AbortSignal
  /** Wird je Bild aufgerufen, das nicht ins PDF übernommen werden konnte */
  onImageError?: (originalName: string, error?: unknown) => void
}

export interface PdfExportResult {
  /** Anzahl der Seiten im erzeugten PDF */
  pageCount: number
  /** Dateinamen der Bilder, die nicht ins PDF übernommen werden konnten */
  failedImages: string[]
}

// ============================================================================
// MAIN EXPORT FUNCTION
// ============================================================================

/**
 * Erzeugt das PDF und gibt es als Blob zurück (ohne Download).
 * Der Aufrufer entscheidet, was damit passiert: herunterladen (downloadPdf),
 * in einer Vorschau anzeigen oder in Electron speichern.
 *
 * @param images - Bilder (mit canvas oder dataUrl)
 * @param settings - Export-Einstellungen; Fehler einzelner Bilder meldet onImageError
 */
export async function buildPdf(
  images: ImageData[],
  settings: PdfExportSettings = {}
): Promise<Blob> {
  const { pdf } = await buildPdfDocument(images, settings)
  return pdf.output('blob')
}

/** Lädt ein PDF-Blob als Datei herunter. */
export function downloadPdf(blob: Blob, filename?: string): void {
  const finalFilename = filename || `bilder-export-${new Date().toISOString().slice(0, 10)}.pdf`
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = finalFilename
  link.rel = 'noopener'
  document.body.appendChild(link)
  link.click()
  link.remove()
  // Erst nach dem Start des Downloads freigeben
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  console.log('✅ PDF gespeichert:', finalFilename)
}

/**
 * Baut das jsPDF-Dokument auf. Grundlage von buildPdf(); in Tests direkt nutzbar,
 * um Schriften, Seiten und fehlgeschlagene Bilder zu prüfen.
 */
export async function buildPdfDocument(
  images: ImageData[],
  settings: PdfExportSettings = {}
): Promise<{ pdf: jsPDF; result: PdfExportResult }> {
  const {
    title = 'Bildersammlung',
    author,
    includeTitlePage = true,
    includeCustomFrontPage = false, // ✨ NEU
    frontPageElements: rawFrontPageElements = [],
    includeCommentPages = false,
    commentPageElements: rawCommentPageElements = [],
    includeImages = true,
    imageQuality,
    maxImageDimension = 1920, // Standard: 1920px (Full HD)
    optimizeSize = false,
    orientation = 'portrait',
    pageFormat = 'a4',
    customPageSize,
    imagesPerPage = 1,
    imageFit = 'contain',
    header = '',
    footer = '',
    pageNumbers = false,
    bookmarks = true,
    watermark,
    password = '',
    allowPrinting = true,
    onProgress,
    signal,
    onImageError,
  } = settings
  const margin = clamp(settings.margin ?? IMAGE_PAGE_MARGIN, 0, PAGE_MARGIN_MAX_MM)
  const perPage: ImagesPerPage = ([1, 2, 4, 6, 9] as const).includes(imagesPerPage)
    ? imagesPerPage
    : 1
  const labels: PdfLabels = { ...DEFAULT_PDF_LABELS, ...settings.labels }
  const exportDate = new Date().toLocaleDateString(labels.locale)

  // Platzhalter in Designer-Texten ({title}, {date}, {images}, {author})
  const placeholderValues = {
    title,
    date: exportDate,
    images: images.length,
    author: author?.trim() ?? '',
  }
  const frontPageElements = fillElementPlaceholders(rawFrontPageElements, placeholderValues)
  const commentPageElements = fillElementPlaceholders(rawCommentPageElements, placeholderValues)

  // Bestimme JPEG-Qualität:
  // - Wenn imageQuality gesetzt ist, verwende diesen Wert
  // - Wenn optimizeSize=true, verwende niedrigere Qualität (0.65) für kleinere Dateien
  // - Ansonsten verwende gute Standard-Qualität (0.75)
  const jpegQuality = imageQuality !== undefined ? imageQuality : optimizeSize ? 0.65 : 0.75

  const pageSize = resolvePageSize(pageFormat, orientation, customPageSize)
  const pdf = new jsPDF({
    orientation: pageSize.width > pageSize.height ? 'landscape' : 'portrait',
    unit: 'mm',
    format: [pageSize.width, pageSize.height],
    ...(password ? { encryption: pdfEncryption(password, allowPrinting) } : {}),
  })

  // Metadaten: Titel/Autor erscheinen in den Dokumenteigenschaften des PDF-Viewers
  pdf.setProperties({
    title,
    subject: labels.imageCount(images.length),
    author: author?.trim() || '',
    creator: labels.createdWith,
  })
  pdf.setLanguage(labels.locale as Parameters<jsPDF['setLanguage']>[0])

  // Eigene Schriften (Startseite + Kommentarseiten) vorab laden und einbetten
  const hasCoverPage = includeCustomFrontPage && frontPageElements.length > 0
  const hasCommentPages = includeCommentPages && commentPageElements.length > 0
  const hasWatermarkText = Boolean(watermark?.enabled && watermark.text.trim())
  const fonts = await registerPdfFonts(pdf, [
    ...(hasCoverPage ? elementFontUsages(frontPageElements) : []),
    ...(hasCommentPages ? elementFontUsages(commentPageElements) : []),
    ...(hasWatermarkText && watermark
      ? [
          {
            fontFamily: watermark.fontFamily,
            style: toPdfFontStyle(watermark.bold, watermark.italic),
          },
        ]
      : []),
  ])

  // Fortschritt: ein Schritt je Startseite, Kommentarseite und Bild
  const commentPageCount = hasCommentPages
    ? new Set(assignPageNumbersIfMissing(commentPageElements).map((el) => el.page ?? 1)).size
    : 0
  const totalSteps =
    (hasCoverPage || includeTitlePage ? 1 : 0) +
    commentPageCount +
    (includeImages ? images.length : 0)
  let doneSteps = 0
  const step = async () => {
    doneSteps++
    onProgress?.(doneSteps, totalSteps)
    // UI kurz atmen lassen, damit der Fortschrittsbalken neu gezeichnet wird
    await new Promise((resolve) => setTimeout(resolve, 0))
    throwIfAborted(signal)
  }
  throwIfAborted(signal)
  onProgress?.(0, totalSteps)

  const failedImages: string[] = []
  let pageAdded = false
  const outline: { title: string; pageNumber: number }[] = []
  // Eigener Fußbereich ersetzt die automatische Fußzeile der Kommentarseiten
  const hasCustomFooter = footer.trim() !== '' || pageNumbers

  console.log('📄 Starte PDF-Export...')
  console.log(
    `📊 ${images.length} Bilder, ${commentPageElements.length} Kommentar-Elemente, ${frontPageElements.length} Startseiten-Elemente`
  )
  console.log(
    `🎨 JPEG-Qualität: ${(jpegQuality * 100).toFixed(0)}% ${optimizeSize ? '(optimiert)' : ''}`
  )
  console.log(`📏 Max. Bildauflösung: ${maxImageDimension}px`)

  // ========================================
  // 1. STARTSEITE
  // ========================================
  // Prüfe ob benutzerdefinierte Startseite aktiviert ist UND Elemente vorhanden sind
  if (hasCoverPage) {
    console.log('✨ Erstelle benutzerdefinierte Startseite...')
    await createCustomFrontPage(
      pdf,
      frontPageElements,
      jpegQuality,
      maxImageDimension,
      orientation,
      labels,
      fonts,
      author
    )
    pageAdded = true
    outline.push({ title: labels.bookmarkCover, pageNumber: 1 })
    await step()
  } else if (includeTitlePage) {
    // Fallback: Automatische Titelseite wenn keine benutzerdefinierte Startseite
    console.log('📋 Erstelle automatische Titel-Seite...')
    createTitlePage(pdf, title, images.length, labels, author)
    pageAdded = true
    outline.push({ title: labels.bookmarkCover, pageNumber: 1 })
    await step()
  }

  // ========================================
  // 2. KOMMENTAR-SEITEN
  // ========================================
  if (hasCommentPages) {
    console.log('🎨 Erstelle Kommentar-Seiten...')

    if (pageAdded) {
      pdf.addPage()
    }

    // Automatisch page-Nummern hinzufügen wenn nicht vorhanden
    const elementsWithPages = assignPageNumbersIfMissing(commentPageElements)
    const firstCommentPage = pdf.getNumberOfPages()
    for (let k = 0; k < commentPageCount; k++) {
      outline.push({ title: labels.bookmarkComment(k + 1), pageNumber: firstCommentPage + k })
    }

    await createCommentPagesFromElements(
      pdf,
      elementsWithPages,
      jpegQuality,
      maxImageDimension,
      orientation,
      labels,
      fonts,
      step,
      !hasCustomFooter
    )
    pageAdded = true
  }

  // ========================================
  // 3. BILD-SEITEN
  // ========================================
  if (includeImages && images.length > 0) {
    console.log('🖼️ Füge Bilder hinzu...')

    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()
    const content = imageContentArea(pageWidth, pageHeight, margin, {
      header: header.trim() !== '',
      footer: hasCustomFooter,
    })
    const grid = imageGrid(perPage, pageWidth > pageHeight)
    const cells = gridCells(content, grid.cols, grid.rows)
    const commentFontPt = perPage === 1 ? IMAGE_COMMENT_FONT_PT : IMAGE_COMMENT_FONT_PT_GRID
    const commentLineMm = commentFontPt * PT_TO_MM * IMAGE_COMMENT_LINE_HEIGHT
    let slot = 0

    // Skalieren + JPEG-Kodierung laufen im Worker-Pool; einige Bilder werden
    // vorab kodiert, eingefügt wird weiterhin streng in Reihenfolge.
    const encoder = new PdfImageEncoder(encodeOnMainThread)
    const lookahead = encoder.concurrency + 1
    const jobs: (Promise<EncodedPdfImage | null> | undefined)[] = []
    const startJob = (k: number) => {
      if (k >= images.length || jobs[k]) return
      const image = images[k]
      const job = (async () => {
        const source = imageSource(image)
        return source ? encoder.encode(source, maxImageDimension, jpegQuality) : null
      })()
      // Fehler werden beim Abholen behandelt; keine unbehandelte Ablehnung bei Abbruch
      job.catch(() => {})
      jobs[k] = job
    }

    try {
      for (let i = 0; i < images.length; i++) {
        const image = images[i]
        for (let k = i; k < i + lookahead; k++) startJob(k)

        try {
          const encoded = await jobs[i]
          jobs[i] = undefined
          if (!encoded) {
            console.warn(`⚠️ Bild ${i} hat weder canvas noch dataUrl`)
            failedImages.push(image.originalName)
            onImageError?.(image.originalName)
            await step()
            continue
          }
          const imgProps =
            encoded.width > 0 && encoded.height > 0
              ? { width: encoded.width, height: encoded.height }
              : pdf.getImageProperties(encoded.data)

          // Neue Seite erst, wenn das Bild geladen ist (fehlerhafte Bilder belegen keine Zelle)
          if (slot === 0 && pageAdded) pdf.addPage()
          pageAdded = true
          const cell = cells[slot]

          // Kommentar umbrechen (Schrift muss vor splitTextToSize gesetzt sein)
          pdf.setFont('helvetica', 'normal')
          pdf.setFontSize(commentFontPt)
          const maxLines = Math.max(
            1,
            Math.floor((cell.height * IMAGE_COMMENT_MAX_SHARE) / commentLineMm)
          )
          const commentLines = wrapImageComment(pdf, image.comment, cell.width, maxLines)

          const layout = layoutImageCell(
            cell,
            imgProps.width / imgProps.height,
            commentLines.length,
            commentLineMm,
            imageFit
          )

          const imageFormat = encoded.format
          if (layout.clip) {
            // Füllen: Überstand an der Zelle beschneiden
            pdf.saveGraphicsState()
            pdf.rect(layout.clip.x, layout.clip.y, layout.clip.width, layout.clip.height, null)
            pdf.clip()
            pdf.discardPath()
            pdf.addImage(encoded.data, imageFormat, layout.x, layout.y, layout.width, layout.height)
            pdf.restoreGraphicsState()
          } else {
            pdf.addImage(encoded.data, imageFormat, layout.x, layout.y, layout.width, layout.height)
          }

          // Bildkommentar zentriert unter dem Bild (der Dateiname erscheint nicht)
          if (commentLines.length > 0) {
            pdf.setTextColor(60, 60, 60)
            pdf.text(commentLines, cell.x + cell.width / 2, layout.commentY, {
              align: 'center',
              baseline: 'top',
              lineHeightFactor: IMAGE_COMMENT_LINE_HEIGHT,
            })
          }

          outline.push({
            title: imageBookmarkTitle(labels.bookmarkImage(i + 1), image.comment),
            pageNumber: pdf.getNumberOfPages(),
          })
          slot = (slot + 1) % perPage
          console.log(`  ✔ Bild ${i + 1}/${images.length} hinzugefügt`)
        } catch (error) {
          console.error(`❌ Fehler bei Bild ${i}:`, error)
          failedImages.push(image.originalName)
          onImageError?.(image.originalName, error)
        }

        await step()
      }
    } finally {
      encoder.dispose()
    }
  }

  // ========================================
  // 4. KOPF-/FUSSZEILE, LESEZEICHEN
  // ========================================
  const hasCover = hasCoverPage || includeTitlePage
  renderHeaderFooter(pdf, {
    header,
    footer,
    pageNumbers,
    margin,
    skipFirstPage: hasCover,
    title,
    date: exportDate,
    pageNumberText: labels.pageNumber,
  })

  if (watermark?.enabled) {
    await renderWatermark(pdf, watermark, fonts)
  }

  if (bookmarks) {
    for (const entry of outline) {
      pdf.outline.add(null, entry.title, { pageNumber: entry.pageNumber })
    }
  }

  return {
    pdf,
    result: { pageCount: pdf.getNumberOfPages(), failedImages },
  }
}

// ============================================================================
// BILDSEITE: LAYOUT MIT KOMMENTAR
// ============================================================================

/** Seitenrand der Bildseiten in mm */
const IMAGE_PAGE_MARGIN = 10
/** Abstand zwischen Bild und Kommentar in mm */
const IMAGE_COMMENT_GAP = 4
/** Schriftgröße des Bildkommentars in pt */
const IMAGE_COMMENT_FONT_PT = 11
/** Zeilenhöhe des Bildkommentars als Faktor der Schriftgröße */
const IMAGE_COMMENT_LINE_HEIGHT = 1.4
/** Höchstens dieser Anteil der Seitenhöhe geht an den Kommentar */
const IMAGE_COMMENT_MAX_SHARE = 0.35

/** Höhe einer Kommentarzeile in mm (1 pt = 0.3528 mm) */
const IMAGE_COMMENT_LINE_MM = IMAGE_COMMENT_FONT_PT * 0.3528 * IMAGE_COMMENT_LINE_HEIGHT

/** Wie viele Kommentarzeilen auf eine Bildseite passen. */
export function maxImageCommentLines(pageHeight: number): number {
  const available = (pageHeight - IMAGE_PAGE_MARGIN * 2) * IMAGE_COMMENT_MAX_SHARE
  return Math.max(1, Math.floor(available / IMAGE_COMMENT_LINE_MM))
}

/**
 * Bricht den Kommentar auf die verfügbare Breite um (explizite Zeilenumbrüche
 * bleiben erhalten). Ist er zu lang, wird die letzte sichtbare Zeile mit „…“ gekürzt.
 */
export function wrapImageComment(
  pdf: jsPDF,
  comment: string | undefined,
  maxWidth: number,
  maxLines: number
): string[] {
  const text = comment?.replace(/\r\n?/g, '\n').trim()
  if (!text) return []

  const lines: string[] = []
  for (const paragraph of text.split('\n')) {
    if (paragraph.trim() === '') {
      lines.push('')
    } else {
      lines.push(...(pdf.splitTextToSize(paragraph, maxWidth) as string[]))
    }
  }

  if (lines.length <= maxLines) return lines

  const visible = lines.slice(0, maxLines)
  let last = visible[maxLines - 1].trimEnd()
  while (last && pdf.getTextWidth(`${last}…`) > maxWidth) {
    last = last.slice(0, -1).trimEnd()
  }
  visible[maxLines - 1] = `${last}…`
  return visible
}

export interface ImagePageLayout {
  x: number
  y: number
  width: number
  height: number
  /** Oberkante des Kommentarblocks in mm */
  commentY: number
}

export interface ImageCellLayout extends ImagePageLayout {
  /** Beschnitt bei „Füllen“; das Bild ragt dann über die Zelle hinaus */
  clip?: PdfRect
}

/**
 * Bild + Kommentar als Block vertikal zentrieren. Das Bild wird so groß wie
 * möglich eingepasst; der Kommentar bekommt darunter genau den Platz, den er braucht.
 */
export function layoutImagePage(
  pageWidth: number,
  pageHeight: number,
  aspectRatio: number,
  commentLineCount: number
): ImagePageLayout {
  return layoutImageCell(
    {
      x: IMAGE_PAGE_MARGIN,
      y: IMAGE_PAGE_MARGIN,
      width: pageWidth - IMAGE_PAGE_MARGIN * 2,
      height: pageHeight - IMAGE_PAGE_MARGIN * 2,
    },
    aspectRatio,
    commentLineCount,
    IMAGE_COMMENT_LINE_MM,
    'contain'
  )
}

/**
 * Layout eines Bildes in einer Zelle. „contain“: Bild + Kommentar als Block
 * vertikal zentriert. „cover“: Bild füllt die Zelle über dem Kommentar und
 * wird mittig beschnitten.
 */
export function layoutImageCell(
  cell: PdfRect,
  aspectRatio: number,
  commentLineCount: number,
  commentLineMm: number,
  fit: ImageFit
): ImageCellLayout {
  const commentHeight =
    commentLineCount > 0 ? IMAGE_COMMENT_GAP + commentLineCount * commentLineMm : 0
  const boxHeight = Math.max(1, cell.height - commentHeight)

  if (fit === 'cover') {
    let width = cell.width
    let height = width / aspectRatio
    if (height < boxHeight) {
      height = boxHeight
      width = height * aspectRatio
    }
    return {
      x: cell.x + (cell.width - width) / 2,
      y: cell.y + (boxHeight - height) / 2,
      width,
      height,
      commentY: cell.y + boxHeight + IMAGE_COMMENT_GAP,
      clip: { x: cell.x, y: cell.y, width: cell.width, height: boxHeight },
    }
  }

  let width = cell.width
  let height = width / aspectRatio
  if (height > boxHeight) {
    height = boxHeight
    width = height * aspectRatio
  }

  const blockTop = cell.y + (cell.height - (height + commentHeight)) / 2
  return {
    x: cell.x + (cell.width - width) / 2,
    y: blockTop,
    width,
    height,
    commentY: blockTop + height + IMAGE_COMMENT_GAP,
  }
}

// ============================================================================
// EINZELBILD-PDF (BILDEDITOR)
// ============================================================================

/**
 * PDF mit genau einem Bild in Originalgröße (Einheit px). Mit Kommentar wird
 * die Seite um einen Textstreifen unter dem Bild verlängert; ohne Kommentar
 * entspricht die Seite exakt dem Bild.
 */
export function buildSingleImagePdf(
  dataUrl: string,
  width: number,
  height: number,
  comment?: string
): jsPDF {
  const measure = new jsPDF({ unit: 'px', format: [width, height], hotfixes: ['px_scaling'] })

  // Schrift skaliert mit der Bildbreite (≈ 11 pt auf A4-Breite), in px
  const fontPx = Math.min(64, Math.max(14, width * 0.025))
  const lineHeightPx = fontPx * IMAGE_COMMENT_LINE_HEIGHT
  const margin = fontPx
  measure.setFont('helvetica', 'normal')
  measure.setFontSize(fontPx * 0.75) // px → pt
  const maxLines = Math.max(3, Math.floor((height * IMAGE_COMMENT_MAX_SHARE) / lineHeightPx))
  const lines = wrapImageComment(measure, comment, width - margin * 2, maxLines)

  const band = lines.length > 0 ? margin * 2 + lines.length * lineHeightPx : 0
  const pageHeight = height + band
  const pdf = new jsPDF({
    orientation: width >= pageHeight ? 'l' : 'p',
    unit: 'px',
    format: [width, pageHeight],
    hotfixes: ['px_scaling'],
  })
  pdf.addImage(dataUrl, 'JPEG', 0, 0, width, height)

  if (lines.length > 0) {
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(fontPx * 0.75)
    pdf.setTextColor(60, 60, 60)
    pdf.text(lines, width / 2, height + margin, {
      align: 'center',
      baseline: 'top',
      lineHeightFactor: IMAGE_COMMENT_LINE_HEIGHT,
    })
  }
  return pdf
}

// ============================================================================
// SEITENFORMAT, RASTER, KOPF-/FUSSZEILE
// ============================================================================

/** Schriftgröße des Bildkommentars bei mehreren Bildern pro Seite in pt */
const IMAGE_COMMENT_FONT_PT_GRID = 8
/** Abstand zwischen Rasterzellen in mm */
const IMAGE_GRID_GAP = 5
/** Höhe des Kopf- bzw. Fußbereichs in mm */
const HEADER_FOOTER_BAND = 8
/** Schriftgröße von Kopf- und Fußzeile in pt */
const HEADER_FOOTER_FONT_PT = 9
/** 1 pt in mm */
const PT_TO_MM = 0.3528

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min
  return Math.min(max, Math.max(min, value))
}

/**
 * Seitengröße in mm passend zur Ausrichtung. Benutzerdefinierte Maße werden auf
 * CUSTOM_PAGE_MIN_MM…CUSTOM_PAGE_MAX_MM begrenzt; Quadrat bleibt quadratisch.
 */
export function resolvePageSize(
  format: PdfPageFormat,
  orientation: 'portrait' | 'landscape',
  custom?: { width: number; height: number }
): { width: number; height: number } {
  let [a, b] =
    format === 'custom'
      ? [
          clamp(custom?.width ?? 210, CUSTOM_PAGE_MIN_MM, CUSTOM_PAGE_MAX_MM),
          clamp(custom?.height ?? 297, CUSTOM_PAGE_MIN_MM, CUSTOM_PAGE_MAX_MM),
        ]
      : (PAGE_FORMAT_SIZES_MM[format] ?? PAGE_FORMAT_SIZES_MM.a4)
  if (a > b) [a, b] = [b, a]
  return orientation === 'landscape' ? { width: b, height: a } : { width: a, height: b }
}

/** Spalten × Zeilen für die Anzahl Bilder pro Seite. */
export function imageGrid(
  perPage: ImagesPerPage,
  landscape: boolean
): { cols: number; rows: number } {
  switch (perPage) {
    case 1:
      return { cols: 1, rows: 1 }
    case 2:
      return landscape ? { cols: 2, rows: 1 } : { cols: 1, rows: 2 }
    case 4:
      return { cols: 2, rows: 2 }
    case 6:
      return landscape ? { cols: 3, rows: 2 } : { cols: 2, rows: 3 }
    case 9:
      return { cols: 3, rows: 3 }
    default: {
      const exhaustive: never = perPage
      return exhaustive
    }
  }
}

export interface PdfRect {
  x: number
  y: number
  width: number
  height: number
}

/** Fläche für Bilder: Seite minus Rand minus Kopf-/Fußbereich. */
export function imageContentArea(
  pageWidth: number,
  pageHeight: number,
  margin: number,
  bands: { header: boolean; footer: boolean }
): PdfRect {
  const top = margin + (bands.header ? HEADER_FOOTER_BAND : 0)
  const bottom = margin + (bands.footer ? HEADER_FOOTER_BAND : 0)
  return {
    x: margin,
    y: top,
    width: Math.max(1, pageWidth - margin * 2),
    height: Math.max(1, pageHeight - top - bottom),
  }
}

/** Zellen zeilenweise von links oben nach rechts unten. */
export function gridCells(area: PdfRect, cols: number, rows: number): PdfRect[] {
  const gapX = cols > 1 ? IMAGE_GRID_GAP : 0
  const gapY = rows > 1 ? IMAGE_GRID_GAP : 0
  const width = (area.width - gapX * (cols - 1)) / cols
  const height = (area.height - gapY * (rows - 1)) / rows
  const cells: PdfRect[] = []
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      cells.push({
        x: area.x + c * (width + gapX),
        y: area.y + r * (height + gapY),
        width,
        height,
      })
    }
  }
  return cells
}

/** Ersetzt {page}, {total}, {title} und {date}. */
export function fillPlaceholders(
  text: string,
  values: { page: number; total: number; title: string; date: string }
): string {
  return text
    .replace(/\{page\}/g, String(values.page))
    .replace(/\{total\}/g, String(values.total))
    .replace(/\{title\}/g, values.title)
    .replace(/\{date\}/g, values.date)
}

/** Platzhalter in Designer-Texten ersetzen; andere Elemente bleiben unverändert. */
export function fillElementPlaceholders(
  elements: PdfElement[],
  values: { title: string; date: string; images: number; author: string }
): PdfElement[] {
  return elements.map((el) =>
    el.type === 'text' && el.content?.includes('{')
      ? {
          ...el,
          // Sternchen in Titel/Autor nicht als Auszeichnung lesen
          content: el.content
            .replace(/\{title\}/g, escapeRichText(values.title))
            .replace(/\{date\}/g, escapeRichText(values.date))
            .replace(/\{images\}/g, String(values.images))
            .replace(/\{author\}/g, escapeRichText(values.author)),
        }
      : el
  )
}

/** Lesezeichentitel: „Bild n“, ergänzt um die erste Kommentarzeile. */
function imageBookmarkTitle(base: string, comment?: string): string {
  const first = comment?.trim().split(/\r?\n/)[0]?.trim()
  if (!first) return base
  return `${base}: ${first.length > 60 ? `${first.slice(0, 59)}…` : first}`
}

/**
 * Kopf- und Fußzeile auf alle Seiten schreiben (nach dem Aufbau, damit {total}
 * bekannt ist). Die Startseite bleibt frei.
 */
function renderHeaderFooter(
  pdf: jsPDF,
  options: {
    header: string
    footer: string
    pageNumbers: boolean
    margin: number
    skipFirstPage: boolean
    title: string
    date: string
    pageNumberText: (page: number, total: number) => string
  }
): void {
  const header = options.header.trim()
  const footer = options.footer.trim()
  if (!header && !footer && !options.pageNumbers) return

  const total = pdf.getNumberOfPages()
  const inset = Math.max(options.margin, 8)
  for (let page = options.skipFirstPage ? 2 : 1; page <= total; page++) {
    pdf.setPage(page)
    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()
    const values = { page, total, title: options.title, date: options.date }
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(HEADER_FOOTER_FONT_PT)
    pdf.setTextColor(120, 120, 120)

    const headerY = options.margin + HEADER_FOOTER_BAND / 2
    const footerY = pageHeight - options.margin - HEADER_FOOTER_BAND / 2
    if (header) {
      pdf.text(fillPlaceholders(header, values), pageWidth / 2, headerY, {
        align: 'center',
        baseline: 'middle',
      })
    }
    if (footer) {
      pdf.text(fillPlaceholders(footer, values), pageWidth / 2, footerY, {
        align: 'center',
        baseline: 'middle',
      })
    }
    if (options.pageNumbers) {
      pdf.text(options.pageNumberText(page, total), pageWidth - inset, footerY, {
        align: 'right',
        baseline: 'middle',
      })
    }
  }
}

// ============================================================================
// WASSERZEICHEN
// ============================================================================

/** Breite des Logo-Wasserzeichens als Anteil der Seitenbreite */
const WATERMARK_LOGO_SHARE = 0.25

/**
 * Ankerpunkte (Mitte des Wasserzeichens) in mm, wie beim Bild-Wasserzeichen:
 * Ecken bei 15 %/10 % bzw. 85 %/90 %, Kacheln als Raster über die Diagonale.
 */
export function watermarkAnchors(
  position: WatermarkSettings['position'],
  pageWidth: number,
  pageHeight: number,
  tileSpacing: { x: number; y: number } = { x: 80, y: 40 }
): { x: number; y: number }[] {
  switch (position) {
    case 'top-left':
      return [{ x: pageWidth * 0.15, y: pageHeight * 0.1 }]
    case 'top-right':
      return [{ x: pageWidth * 0.85, y: pageHeight * 0.1 }]
    case 'bottom-left':
      return [{ x: pageWidth * 0.15, y: pageHeight * 0.9 }]
    case 'bottom-right':
      return [{ x: pageWidth * 0.85, y: pageHeight * 0.9 }]
    case 'tile': {
      const anchors: { x: number; y: number }[] = []
      const sx = Math.max(10, tileSpacing.x)
      const sy = Math.max(10, tileSpacing.y)
      for (let y = sy / 2; y < pageHeight + sy; y += sy) {
        // Jede zweite Reihe versetzt, damit gedrehter Text die Fläche gleichmäßig deckt
        const offset = Math.round(y / sy) % 2 === 0 ? 0 : sx / 2
        for (let x = offset; x < pageWidth + sx; x += sx) anchors.push({ x, y })
      }
      return anchors
    }
    case 'center':
    default:
      return [{ x: pageWidth / 2, y: pageHeight / 2 }]
  }
}

/**
 * PNG und JPEG direkt übernehmen (PNG behält die Transparenz des Logos),
 * andere Formate (WebP, SVG …) per Canvas in PNG umwandeln.
 */
function toPdfImageDataUrl(dataUrl: string): Promise<string> {
  if (/^data:image\/(png|jpe?g);/i.test(dataUrl)) return Promise.resolve(dataUrl)
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth || img.width
      canvas.height = img.naturalHeight || img.height
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('Canvas-Context fehlt'))
        return
      }
      ctx.drawImage(img, 0, 0)
      resolve(canvas.toDataURL('image/png'))
    }
    img.onerror = () => reject(new Error('Logo konnte nicht geladen werden'))
    img.src = dataUrl
  })
}

/** Text zentriert um (cx, cy) und im Uhrzeigersinn um `rotation` Grad gedreht schreiben. */
function rotatedCenteredText(
  pdf: jsPDF,
  text: string,
  cx: number,
  cy: number,
  rotation: number,
  fontSizeMm: number
): void {
  const width = pdf.getTextWidth(text)
  const rad = (rotation * Math.PI) / 180
  // Lokale Startposition: halbe Breite links, Grundlinie ≈ 0,35 Schriftgrößen unter der Mitte
  const lx = -width / 2
  const ly = fontSizeMm * 0.35
  const x = cx + Math.cos(rad) * lx - Math.sin(rad) * ly
  const y = cy + Math.sin(rad) * lx + Math.cos(rad) * ly
  // jsPDF dreht gegen den Uhrzeigersinn
  pdf.text(text, x, y, { angle: -rotation })
}

/** Wasserzeichen (Text und/oder Logo) auf jede Seite legen. */
async function renderWatermark(
  pdf: jsPDF,
  watermark: PdfWatermark,
  fonts: ReadonlySet<string>
): Promise<void> {
  const text = watermark.text.trim()
  const logo = watermark.logoDataUrl
  if (!text && !logo) return

  const opacity = clamp(watermark.opacity, 0, 100) / 100
  const rotation = clamp(watermark.rotation, -180, 180)
  const fontSizePx = clamp(watermark.fontSize, 10, 200)
  const fontSizePt = fontSizePx * 0.75
  const fontSizeMm = fontSizePt * PT_TO_MM
  const color = hexToRgb(watermark.color) ?? { r: 255, g: 255, b: 255 }

  let logoData: { src: string; format: string; aspect: number } | null = null
  if (logo) {
    try {
      const src = await toPdfImageDataUrl(logo)
      const props = pdf.getImageProperties(src)
      logoData = {
        src,
        format: src.startsWith('data:image/png') ? 'PNG' : 'JPEG',
        aspect: props.width / props.height,
      }
    } catch (error) {
      console.error('❌ Wasserzeichen-Logo konnte nicht geladen werden:', error)
    }
  }

  const total = pdf.getNumberOfPages()
  for (let page = 1; page <= total; page++) {
    pdf.setPage(page)
    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()

    pdf.saveGraphicsState()
    pdf.setGState(new GState({ opacity, 'stroke-opacity': opacity }))

    if (text) {
      applyPdfFont(
        pdf,
        watermark.fontFamily,
        toPdfFontStyle(watermark.bold, watermark.italic),
        fonts
      )
      pdf.setFontSize(fontSizePt)
      pdf.setTextColor(color.r, color.g, color.b)
      const textWidth = pdf.getTextWidth(text)
      // Abstände wie beim Bild-Wasserzeichen: Breite + 2,5 Schriftgrößen, Zeilen 4 Schriftgrößen
      const anchors = watermarkAnchors(watermark.position, pageWidth, pageHeight, {
        x: textWidth + fontSizeMm * 2.5,
        y: fontSizeMm * 4,
      })
      for (const a of anchors) rotatedCenteredText(pdf, text, a.x, a.y, rotation, fontSizeMm)
    }

    if (logoData) {
      const w = pageWidth * WATERMARK_LOGO_SHARE
      const h = w / logoData.aspect
      const anchors = watermarkAnchors(watermark.position, pageWidth, pageHeight, {
        x: w * 1.6,
        y: h * 1.6,
      })
      for (const a of anchors) {
        pdf.addImage(
          logoData.src,
          logoData.format,
          a.x - w / 2,
          a.y - h / 2,
          w,
          h,
          'pdf-watermark-logo'
        )
      }
    }

    pdf.restoreGraphicsState()
  }
}

/** Höchstlänge des PDF-Passworts (Standard-Sicherheitshandler, Revision 2) */
export const PDF_PASSWORD_MAX_LENGTH = 32

/**
 * Passwort für die PDF-Verschlüsselung: druckbares ASCII, damit jeder Viewer
 * es gleich kodiert; längere Passwörter würden still abgeschnitten.
 */
export function isValidPdfPassword(password: string): boolean {
  return (
    password.length > 0 &&
    password.length <= PDF_PASSWORD_MAX_LENGTH &&
    /^[\x20-\x7e]+$/.test(password)
  )
}

/**
 * Verschlüsselung für jsPDF. Das Eigentümer-Passwort ist zufällig: Mit einem
 * leeren Eigentümer-Passwort könnte jeder die Rechte (Drucken) aufheben.
 * Kopieren bleibt erlaubt (Barrierefreiheit, Textauswahl).
 */
function pdfEncryption(password: string, allowPrinting: boolean): EncryptionOptions {
  if (!isValidPdfPassword(password)) {
    throw new RangeError('Ungültiges PDF-Passwort')
  }
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  const ownerPassword = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
  return {
    userPassword: password,
    ownerPassword: ownerPassword.slice(0, PDF_PASSWORD_MAX_LENGTH),
    userPermissions: allowPrinting ? ['print', 'copy'] : ['copy'],
  }
}

/** Wirft einen AbortError, wenn der Export abgebrochen wurde. */
function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new DOMException('PDF-Export abgebrochen', 'AbortError')
  }
}

/** Schriften, die die Textelemente einer gestalteten Seite brauchen. */
function elementFontUsages(elements: PdfElement[]): { fontFamily?: string; style: PdfFontStyle }[] {
  return elements
    .filter((el) => el.type === 'text' && el.content?.trim())
    .flatMap((el) => {
      const base = { fontFamily: el.fontFamily, style: toPdfFontStyle(el.bold, el.italic) }
      if (!hasRichMarkup(el.content)) return [base]
      // Fett/kursiv innerhalb des Textes braucht die passenden Schnitte
      const styles = new Set(
        parseRichText(el.content ?? '').map((run) =>
          toPdfFontStyle(el.bold || run.bold, el.italic || run.italic)
        )
      )
      return [...styles].map((style) => ({ fontFamily: el.fontFamily, style }))
    })
}

export interface ExportSettings {
  orientation?: 'portrait' | 'landscape'
  author?: string
  pageFormat?: PdfPageFormat
  customWidth?: number
  customHeight?: number
  margin?: number
  imagesPerPage?: ImagesPerPage
  imageFit?: ImageFit
  header?: string
  footer?: string
  pageNumbers?: boolean
  bookmarks?: boolean
  watermark?: WatermarkSettings
  /** Logo für das PDF-Wasserzeichen (Daten-URL) */
  watermarkLogo?: string
  /** Öffnen-Passwort für das PDF; leer = ungeschützt */
  password?: string
  /** Mit Passwort: Drucken erlauben */
  allowPrinting?: boolean
  /** PDF speichern (Standard) oder direkt auf dem Gerät drucken */
  output?: 'download' | 'print'
  includeCustomFrontPage?: boolean
  frontPageElements?: PdfElement[]
  includeCommentPages?: boolean
  commentPageElements?: PdfElement[]
  imageQuality?: number // JPEG Qualität: 0.0 bis 1.0
  maxImageDimension?: number // Max. Breite/Höhe in Pixel
  zipName?: string
  format?: string
  quality?: number
  pngTransparent?: boolean
  pngBackgroundColor?: string
  // SVG-Export
  svgColormode?: 'color' | 'binary'
  svgFilterSpeckle?: number
  svgQuality?: 'standard' | 'high' | 'ultra'
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Erstellt die gestaltete Startseite. Sie nutzt denselben Designer und dieselbe
 * Darstellung wie die Kommentarseiten (renderPageElements); statt der Fußzeile
 * steht unten der Autorenname.
 */
async function createCustomFrontPage(
  pdf: jsPDF,
  elements: PdfElement[],
  jpegQuality: number,
  maxImageDimension: number,
  orientation: 'portrait' | 'landscape' = 'portrait',
  labels: PdfLabels = DEFAULT_PDF_LABELS,
  fonts: ReadonlySet<string> = new Set(),
  author?: string
): Promise<void> {
  if (elements.length === 0) return

  console.log('🎨 Verarbeite', elements.length, 'Elemente für Startseite')

  const { scale, origin, canvasHeight } = await renderPageElements(
    pdf,
    elements,
    orientation,
    jpegQuality,
    maxImageDimension,
    fonts
  )

  // Autorenname am unteren Rand (13px, grau, zentriert, Unterkante 16px über dem Rand)
  if (author?.trim()) {
    const pageWidth = pdf.internal.pageSize.getWidth()
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(pxToPt(13, scale))
    pdf.setTextColor(102, 102, 102)
    const text = labels.author(author.trim())
    pdf.text(
      text,
      (pageWidth - pdf.getTextWidth(text)) / 2,
      origin.y + (canvasHeight - 16) * scale,
      {
        baseline: 'bottom',
      }
    )
  }

  console.log('✅ Startseite erstellt')
}

/**
 * Zeichnet die Designer-Elemente einer Seite (Startseite oder Kommentarseite)
 * in z-Reihenfolge auf die aktuelle PDF-Seite.
 */
async function renderPageElements(
  pdf: jsPDF,
  elements: PdfElement[],
  orientation: 'portrait' | 'landscape',
  jpegQuality: number,
  maxImageDimension: number,
  fonts: ReadonlySet<string>
): Promise<{ scale: number; origin: { x: number; y: number }; canvasHeight: number }> {
  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()

  // Designer-Fläche: A4 bei 96 DPI — muss mit PdfPageDesigner übereinstimmen
  const canvasWidth = orientation === 'landscape' ? 1123 : 794
  const canvasHeight = orientation === 'landscape' ? 794 : 1123

  // Einheitlicher Maßstab px → mm; bei anderen Seitenverhältnissen als A4
  // wird die Designer-Fläche mittig eingepasst (keine Verzerrung)
  const scale = Math.min(pageWidth / canvasWidth, pageHeight / canvasHeight)
  const origin = {
    x: (pageWidth - canvasWidth * scale) / 2,
    y: (pageHeight - canvasHeight * scale) / 2,
  }

  // Hintergrund zuerst, danach nach z-Index für korrekte Render-Reihenfolge
  const sortedElements = [...elements].sort(
    (a, b) => Number(!!b.background) - Number(!!a.background) || a.zIndex - b.zIndex
  )

  for (const element of sortedElements) {
    try {
      if (element.background) {
        await renderPageBackground(pdf, element, jpegQuality, maxImageDimension)
      } else if (element.type === 'shape') {
        renderShape(pdf, element, scale, origin)
      } else if (element.type === 'text') {
        // CSS PdfDesignerElement: .element-text padding 8px; .text-content line-height 1.5
        renderText(
          pdf,
          {
            content: element.content,
            x: element.x,
            y: element.y,
            width: element.width,
            fontSize: element.fontSize,
            fontFamily: element.fontFamily,
            style: toPdfFontStyle(element.bold, element.italic),
            color: element.color,
            align: element.align,
            paddingPx: 8,
            lineHeight: 1.5,
          },
          scale,
          origin,
          fonts
        )
      } else if (element.type === 'image') {
        await renderImageElement(pdf, element, scale, origin, jpegQuality, maxImageDimension)
      }
    } catch (error) {
      console.error('❌ Fehler beim Rendern von Element:', element.id, error)
    }
  }

  return { scale, origin, canvasHeight }
}

/**
 * Fügt automatisch page-Nummern zu Elementen hinzu die keine haben
 * Gruppiert zusammenhängende Elemente auf die gleiche Seite
 */
function assignPageNumbersIfMissing(elements: PdfElement[]): PdfElement[] {
  // Wenn alle Elemente bereits page-Nummern haben, nichts tun
  if (elements.every((el) => el.page !== undefined)) {
    return elements
  }

  console.log('⚠️ Einige Elemente haben keine page-Nummer, weise automatisch zu...')

  // Sortiere nach Y-Position
  const sorted = [...elements].sort((a, b) => a.y - b.y)

  // Gruppiere Elemente die nah beieinander sind auf die gleiche Seite
  const pageHeight = 1123 // A4 bei 96 DPI
  let currentPage = 1
  let lastY = 0

  return sorted.map((element) => {
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
      page: currentPage,
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
  labels: PdfLabels,
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
  const countText = labels.imageCount(imageCount)
  const countWidth = pdf.getTextWidth(countText)
  pdf.text(countText, (pageWidth - countWidth) / 2, pageHeight / 3 + 20)

  // Author
  if (author) {
    pdf.setFontSize(14)
    pdf.setTextColor(120, 120, 120)
    const authorText = labels.author(author)
    const authorWidth = pdf.getTextWidth(authorText)
    pdf.text(authorText, (pageWidth - authorWidth) / 2, pageHeight / 3 + 35)
  }

  // Date
  pdf.setFontSize(12)
  pdf.setTextColor(150, 150, 150)
  const dateText = new Date().toLocaleDateString(labels.locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
  const dateWidth = pdf.getTextWidth(dateText)
  pdf.text(dateText, (pageWidth - dateWidth) / 2, pageHeight / 3 + 50)

  // Footer
  pdf.setFontSize(10)
  pdf.setTextColor(180, 180, 180)
  const footer = labels.createdWith
  const footerWidth = pdf.getTextWidth(footer)
  pdf.text(footer, (pageWidth - footerWidth) / 2, pageHeight - 20)
}

/**
 * Erstellt Kommentar-Seiten aus Designer-Elementen
 * Gruppiert Elemente nach Seiten und erstellt separate PDF-Seiten
 */
async function createCommentPagesFromElements(
  pdf: jsPDF,
  elements: PdfElement[],
  jpegQuality: number,
  maxImageDimension: number,
  orientation: 'portrait' | 'landscape' = 'portrait',
  labels: PdfLabels = DEFAULT_PDF_LABELS,
  fonts: ReadonlySet<string> = new Set(),
  onPageDone?: () => Promise<void>,
  showFooter = true
): Promise<void> {
  if (elements.length === 0) return

  console.log('🎨 Verarbeite', elements.length, 'Elemente für Kommentar-Seiten')

  // Gruppiere Elemente nach Seiten
  const elementsByPage = new Map<number, PdfElement[]>()

  elements.forEach((element) => {
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

    await renderSingleCommentPage(
      pdf,
      pageElements,
      pageNum,
      pageNumbers.length,
      jpegQuality,
      maxImageDimension,
      orientation,
      labels,
      fonts,
      showFooter
    )
    await onPageDone?.()
  }
}

/**
 * Rendert eine einzelne Kommentar-Seite mit ihren Elementen
 */
async function renderSingleCommentPage(
  pdf: jsPDF,
  elements: PdfElement[],
  pageNumber: number,
  totalPages: number,
  jpegQuality: number,
  maxImageDimension: number,
  orientation: 'portrait' | 'landscape' = 'portrait',
  labels: PdfLabels = DEFAULT_PDF_LABELS,
  fonts: ReadonlySet<string> = new Set(),
  showFooter = true
): Promise<void> {
  await renderPageElements(pdf, elements, orientation, jpegQuality, maxImageDimension, fonts)
  // Eigene Fußzeile/Seitenzahlen des Exports ersetzen die automatische Fußzeile
  if (!showFooter) return

  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()

  // Footer mit Seiten-Nummer
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(9)
  pdf.setTextColor(150, 150, 150)
  const footerText = labels.commentFooter(pageNumber, totalPages)
  pdf.text(footerText, (pageWidth - pdf.getTextWidth(footerText)) / 2, pageHeight - 10)
}

/** Textblock in Designer-Koordinaten (px auf der A4-Fläche bei 96 DPI). */
interface PdfTextBlock {
  content?: string
  x: number
  y: number
  width?: number
  fontSize?: number
  fontFamily?: string
  style: PdfFontStyle
  color?: string
  align?: 'left' | 'center' | 'right'
  /** Innenabstand der Textbox in px (CSS padding) */
  paddingPx: number
  /** CSS line-height als Faktor der Schriftgröße */
  lineHeight: number
}

/** Canvas-px → PDF-Punkte: px × (mm pro Canvas-px) / (mm pro Punkt). */
function pxToPt(px: number, scale: number): number {
  return (px * scale) / 0.3528
}

/**
 * Rendert einen Textblock (Startseite und Kommentarseiten).
 *
 * Koordinatensystem-Abgleich mit dem Designer:
 * - Fläche: 794×1123px (A4 @ 96 DPI), PDF A4: 210×297mm
 * - 1 Canvas-Pixel = scale mm (≈ 0.2645 mm)
 * - jsPDF text() positioniert an der Baseline
 * - Baseline der 1. Zeile nach CSS-Modell: half-leading ((lineHeight − 1) / 2 × fontSize)
 *   + Ascent (≈ 0.75 × fontSize); bei line-height 1.5 also genau 1 × fontSize
 */
function renderText(
  pdf: jsPDF,
  block: PdfTextBlock,
  scale: number,
  origin: { x: number; y: number },
  fonts: ReadonlySet<string>
): void {
  if (!block.content || !block.content.trim()) return

  const { paddingPx, lineHeight } = block
  const fontSizePx = block.fontSize || 24
  pdf.setFontSize(pxToPt(fontSizePx, scale))

  // Eingebettete Schrift (Fallback: nächster Schnitt der Familie, sonst Helvetica)
  applyPdfFont(pdf, block.fontFamily, block.style, fonts)

  const color = block.color ? hexToRgb(block.color) : null
  if (color) {
    pdf.setTextColor(color.r, color.g, color.b)
  } else {
    pdf.setTextColor(0, 0, 0)
  }

  // X-Position: Box + Padding (in mm)
  const xBase = origin.x + (block.x + paddingPx) * scale

  // Verfügbare Breite für Textumbruch: Box-Breite minus Padding (WYSIWYG)
  const boxWidth = block.width || 300
  const availableWidthMm = (boxWidth - paddingPx * 2) * scale

  const firstBaselinePx = fontSizePx * ((lineHeight - 1) / 2 + 0.75)
  const baselineMm = (index: number) =>
    origin.y + (block.y + paddingPx + firstBaselinePx + index * lineHeight * fontSizePx) * scale
  const alignOffset = (lineWidth: number) => {
    if (block.align === 'center') return (availableWidthMm - lineWidth) / 2
    if (block.align === 'right') return availableWidthMm - lineWidth
    return 0
  }

  // **fett** / *kursiv* innerhalb des Textes: Abschnitte mit eigenem Schnitt
  if (hasRichMarkup(block.content)) {
    const baseBold = block.style === 'bold' || block.style === 'bolditalic'
    const baseItalic = block.style === 'italic' || block.style === 'bolditalic'
    const useStyle = (bold: boolean, italic: boolean) =>
      applyPdfFont(
        pdf,
        block.fontFamily,
        toPdfFontStyle(baseBold || bold, baseItalic || italic),
        fonts
      )
    const lines = layoutRichText(parseRichText(block.content), availableWidthMm, (text, b, i) => {
      useStyle(b, i)
      return pdf.getTextWidth(text)
    })
    lines.forEach((line, index) => {
      let x = xBase + alignOffset(line.width)
      for (const segment of line.segments) {
        useStyle(segment.bold, segment.italic)
        pdf.text(segment.text, x, baselineMm(index))
        x += segment.width
      }
    })
    return
  }

  // Mehrzeiligen Text verarbeiten: erst explizite Zeilenumbrüche, dann Wortumbruch
  // splitTextToSize() repliziert das CSS word-break: break-word Verhalten
  const allLines: string[] = []
  block.content.split('\n').forEach((line) => {
    if (line.trim() === '') {
      allLines.push('')
    } else {
      allLines.push(...pdf.splitTextToSize(line, availableWidthMm))
    }
  })

  allLines.forEach((line, index) => {
    // Text-Ausrichtung relativ zur Box-Breite (wie CSS text-align)
    pdf.text(line, xBase + alignOffset(pdf.getTextWidth(line)), baselineMm(index))
  })
}

/**
 * Rendert ein Bild-Element (skaliert und als JPEG, mit Deckkraft)
 */
async function renderImageElement(
  pdf: jsPDF,
  element: PdfElement,
  scale: number,
  origin: { x: number; y: number },
  jpegQuality: number,
  maxImageDimension: number
): Promise<void> {
  if (!element.src) return

  try {
    // Immer skalieren + JPEG (transparente Bereiche werden weiß)
    const imageSrc = await resizeAndConvertDataUrl(element.src, maxImageDimension, jpegQuality)

    // Wie im Designer (img: width 100%, height auto): Breite aus dem Element,
    // Höhe aus dem Seitenverhältnis des Bildes
    const imgProps = pdf.getImageProperties(imageSrc)
    const imgAspectRatio = imgProps.width / imgProps.height
    const x = origin.x + element.x * scale
    const y = origin.y + element.y * scale
    const width = (element.width || 200) * scale
    const height = width / imgAspectRatio

    const imageFormat = imageSrc.startsWith('data:image/png') ? 'PNG' : 'JPEG'
    const opacity = element.opacity ?? 1
    if (opacity < 1) {
      pdf.saveGraphicsState()
      pdf.setGState(new GState({ opacity }))
      pdf.addImage(imageSrc, imageFormat, x, y, width, height)
      pdf.restoreGraphicsState()
    } else {
      pdf.addImage(imageSrc, imageFormat, x, y, width, height)
    }
  } catch (error) {
    console.error('❌ Fehler beim Hinzufügen von Bild zum PDF:', error)
  }
}

/**
 * Zeichnet eine Form (Rechteck, Ellipse, Linie) wie im Designer: Der Rand
 * liegt innerhalb der Box, Linien laufen mittig längs der längeren Seite.
 */
export function renderShape(
  pdf: jsPDF,
  element: PdfElement,
  scale: number,
  origin: { x: number; y: number }
): void {
  const x = origin.x + element.x * scale
  const y = origin.y + element.y * scale
  const width = (element.width ?? 100) * scale
  const height = (element.height ?? 100) * scale
  const isLine = element.shape === 'line'
  const fill = isLine ? null : hexToRgb(element.fillColor ?? '')
  const stroke = hexToRgb(element.strokeColor ?? '')
  const lineWidth = Math.max(0, element.strokeWidth ?? 0) * scale
  const hasStroke = stroke !== null && lineWidth > 0
  if (!fill && !hasStroke) return

  const opacity = element.opacity ?? 1
  pdf.saveGraphicsState()
  if (opacity < 1) pdf.setGState(new GState({ opacity, 'stroke-opacity': opacity }))
  if (fill) pdf.setFillColor(fill.r, fill.g, fill.b)
  if (stroke && hasStroke) {
    pdf.setDrawColor(stroke.r, stroke.g, stroke.b)
    pdf.setLineWidth(lineWidth)
  }
  const style = fill && hasStroke ? 'FD' : fill ? 'F' : 'S'
  const inset = hasStroke && !isLine ? lineWidth / 2 : 0
  const w = Math.max(0, width - 2 * inset)
  const h = Math.max(0, height - 2 * inset)

  if (isLine) {
    if (width >= height) pdf.line(x, y + height / 2, x + width, y + height / 2)
    else pdf.line(x + width / 2, y, x + width / 2, y + height)
  } else if (element.shape === 'ellipse') {
    pdf.ellipse(x + width / 2, y + height / 2, w / 2, h / 2, style)
  } else {
    const radius = Math.min((element.cornerRadius ?? 0) * scale, w / 2, h / 2)
    if (radius > 0) pdf.roundedRect(x + inset, y + inset, w, h, radius, radius, style)
    else pdf.rect(x + inset, y + inset, w, h, style)
  }
  pdf.restoreGraphicsState()
}

/**
 * Seitenhintergrund über die ganze PDF-Seite (auch wenn die Designer-Fläche bei
 * anderen Formaten nur eingepasst ist): Farbe oder Bild im Modus „Füllen“.
 */
async function renderPageBackground(
  pdf: jsPDF,
  element: PdfElement,
  jpegQuality: number,
  maxImageDimension: number
): Promise<void> {
  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  const opacity = element.opacity ?? 1

  if (element.type === 'image') {
    if (!element.src) return
    const src = await resizeAndConvertDataUrl(element.src, maxImageDimension, jpegQuality)
    const props = pdf.getImageProperties(src)
    const fit = Math.max(pageWidth / props.width, pageHeight / props.height)
    const width = props.width * fit
    const height = props.height * fit
    pdf.saveGraphicsState()
    if (opacity < 1) pdf.setGState(new GState({ opacity }))
    pdf.rect(0, 0, pageWidth, pageHeight, null)
    pdf.clip()
    pdf.discardPath()
    pdf.addImage(
      src,
      src.startsWith('data:image/png') ? 'PNG' : 'JPEG',
      (pageWidth - width) / 2,
      (pageHeight - height) / 2,
      width,
      height
    )
    pdf.restoreGraphicsState()
    return
  }

  const fill = hexToRgb(element.fillColor ?? '')
  if (!fill) return
  pdf.saveGraphicsState()
  if (opacity < 1) pdf.setGState(new GState({ opacity }))
  pdf.setFillColor(fill.r, fill.g, fill.b)
  pdf.rect(0, 0, pageWidth, pageHeight, 'F')
  pdf.restoreGraphicsState()
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
        b: parseInt(result[3], 16),
      }
    : null
}

/** Bildquelle eines Eintrags: getCanvas vor dataUrl vor canvas; null = keine Quelle */
function imageSource(image: ImageData): PdfImageSource | null {
  if (image.getCanvas) return image.getCanvas()
  return image.dataUrl || image.canvas || null
}

/** Bisheriger Weg im Hauptthread; Fallback, wenn kein Worker verfügbar ist */
async function encodeOnMainThread(
  source: PdfImageSource,
  maxDimension: number,
  quality: number
): Promise<string> {
  if (typeof source === 'string') return resizeAndConvertDataUrl(source, maxDimension, quality)
  return resizeCanvas(source, maxDimension).toDataURL('image/jpeg', quality)
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
  const { width: newWidth, height: newHeight } = scaledImageSize(width, height, maxDimension)

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

  console.log(
    `  📏 Bild skaliert: ${width}x${height} → ${newWidth}x${newHeight} (${(((newWidth * newHeight) / (width * height)) * 100).toFixed(1)}% der Originalgröße)`
  )

  return resizedCanvas
}

/**
 * Konvertiert und skaliert eine dataUrl zu JPEG
 * WICHTIG: Konvertiert PNG zu JPEG für drastisch kleinere Dateien!
 */
async function resizeAndConvertDataUrl(
  dataUrl: string,
  maxDimension: number,
  quality: number
): Promise<string> {
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

      // JPEG kennt keine Transparenz: transparente Bereiche weiß statt schwarz,
      // passend zur weißen PDF-Seite
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, newWidth, newHeight)

      // Zeichne mit High-Quality Antialiasing
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'
      ctx.drawImage(img, 0, 0, newWidth, newHeight)

      // IMMER zu JPEG konvertieren (auch wenn Original PNG war!)
      const originalFormat = dataUrl.startsWith('data:image/png') ? 'PNG' : 'JPEG'
      let jpegDataUrl: string
      try {
        jpegDataUrl = canvas.toDataURL('image/jpeg', quality)
      } catch (error) {
        // z. B. fremde Bildquelle ohne CORS (Canvas „tainted“)
        console.warn('⚠️ Bild konnte nicht konvertiert werden, verwende Original', error)
        resolve(dataUrl)
        return
      }

      if (img.width !== newWidth || img.height !== newHeight) {
        console.log(`  📏 Bild skaliert: ${img.width}x${img.height} → ${newWidth}x${newHeight}`)
      }
      if (originalFormat === 'PNG') {
        const originalSize = Math.round(dataUrl.length / 1024)
        const newSize = Math.round(jpegDataUrl.length / 1024)
        const savings = Math.round((1 - newSize / originalSize) * 100)
        console.log(
          `  🔄 PNG→JPEG konvertiert: ${originalSize}KB → ${newSize}KB (${savings}% kleiner)`
        )
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
