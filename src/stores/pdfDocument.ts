// src/stores/pdfDocument.ts
// Zustand des PDF-Dokuments: Seitenlayout, Startseite, Kommentarseiten,
// Wasserzeichen und Passwortschutz. Der Store überlebt das Schließen des
// Exportdialogs und Routenwechsel; AppPage liest die Export-Optionen hier.
import { defineStore } from 'pinia'
import { computed, reactive } from 'vue'
import { defaultWatermark, type WatermarkSettings } from '@/lib/core/types'
import {
  isValidPdfPassword,
  type ImageFit,
  type ImagesPerPage,
  type PdfElement,
  type PdfExportSettings,
  type PdfPageFormat,
} from '@/lib/features/export-pdf'

export interface PdfDocumentSettings {
  orientation: 'portrait' | 'landscape'
  author: string

  // Seitenlayout
  pageFormat: PdfPageFormat
  /** Breite/Höhe in mm, nur bei pageFormat 'custom' */
  customWidth: number
  customHeight: number
  margin: number
  imagesPerPage: ImagesPerPage
  imageFit: ImageFit
  header: string
  footer: string
  pageNumbers: boolean
  bookmarks: boolean

  // Wasserzeichen im PDF
  watermark: WatermarkSettings
  /** Logo als Daten-URL; leer = kein Logo */
  watermarkLogo: string

  // Passwortschutz (nur im Speicher)
  protectPdf: boolean
  password: string
  allowPrinting: boolean

  // Gestaltete Startseite
  includeCustomFrontPage: boolean
  frontPageElements: PdfElement[]

  // Kommentarseiten
  includeCommentPages: boolean
  commentPageElements: PdfElement[]
}

/** Optionen für buildPdf, die aus dem Dokument stammen (ohne Texte, Fortschritt, Abbruch) */
export type PdfDocumentBuildOptions = Required<
  Pick<
    PdfExportSettings,
    | 'author'
    | 'includeCustomFrontPage'
    | 'frontPageElements'
    | 'includeTitlePage'
    | 'includeCommentPages'
    | 'commentPageElements'
    | 'includeImages'
    | 'orientation'
    | 'pageFormat'
    | 'customPageSize'
    | 'margin'
    | 'imagesPerPage'
    | 'imageFit'
    | 'header'
    | 'footer'
    | 'pageNumbers'
    | 'bookmarks'
    | 'watermark'
    | 'password'
    | 'allowPrinting'
  >
>

export function defaultPdfDocumentSettings(): PdfDocumentSettings {
  return {
    orientation: 'portrait',
    author: '',
    pageFormat: 'a4',
    customWidth: 210,
    customHeight: 297,
    margin: 10,
    imagesPerPage: 1,
    imageFit: 'contain',
    header: '',
    footer: '',
    pageNumbers: false,
    bookmarks: true,
    // Wie beim Bild-Wasserzeichen, aber grau und dezent
    watermark: { ...defaultWatermark, color: '#808080', opacity: 25 },
    watermarkLogo: '',
    protectPdf: false,
    password: '',
    allowPrinting: true,
    includeCustomFrontPage: false,
    frontPageElements: [],
    includeCommentPages: false,
    commentPageElements: [],
  }
}

/** Gestaltete Startseite wird nur verwendet, wenn sie aktiv ist und Elemente hat. */
export function usesCustomFrontPage(settings: PdfDocumentSettings): boolean {
  return settings.includeCustomFrontPage && settings.frontPageElements.length > 0
}

/** Passwortschutz gewünscht, aber Passwort leer oder ungültig */
export function isPasswordInvalid(settings: PdfDocumentSettings): boolean {
  return settings.protectPdf && !isValidPdfPassword(settings.password)
}

/**
 * Übersetzt den Dokumentzustand in buildPdf-Optionen. Ohne gestaltete
 * Startseite entsteht die automatische Titelseite.
 */
export function pdfBuildOptions(settings: PdfDocumentSettings): PdfDocumentBuildOptions {
  const customFront = usesCustomFrontPage(settings)
  return {
    author: settings.author,
    includeCustomFrontPage: customFront,
    frontPageElements: customFront ? settings.frontPageElements : [],
    includeTitlePage: !customFront,
    includeCommentPages: settings.includeCommentPages,
    commentPageElements: settings.commentPageElements,
    includeImages: true,
    orientation: settings.orientation,
    pageFormat: settings.pageFormat,
    customPageSize: { width: settings.customWidth, height: settings.customHeight },
    margin: settings.margin,
    imagesPerPage: settings.imagesPerPage,
    imageFit: settings.imageFit,
    header: settings.header,
    footer: settings.footer,
    pageNumbers: settings.pageNumbers,
    bookmarks: settings.bookmarks,
    watermark: { ...settings.watermark, logoDataUrl: settings.watermarkLogo || undefined },
    password: settings.protectPdf ? settings.password : '',
    allowPrinting: settings.allowPrinting,
  }
}

export const usePdfDocumentStore = defineStore('pdfDocument', () => {
  const settings = reactive<PdfDocumentSettings>(defaultPdfDocumentSettings())

  const hasCustomFrontPage = computed(() => usesCustomFrontPage(settings))
  const passwordInvalid = computed(() => isPasswordInvalid(settings))
  const buildOptions = computed(() => pdfBuildOptions(settings))

  function setFrontPageElements(elements: PdfElement[]) {
    settings.frontPageElements = elements
  }

  function clearFrontPage() {
    settings.frontPageElements = []
  }

  function setCommentPageElements(elements: PdfElement[]) {
    settings.commentPageElements = elements
  }

  function clearCommentPages() {
    settings.commentPageElements = []
  }

  /** Alles auf die Standardwerte zurücksetzen */
  function reset() {
    Object.assign(settings, defaultPdfDocumentSettings())
  }

  return {
    settings,
    hasCustomFrontPage,
    passwordInvalid,
    buildOptions,
    setFrontPageElements,
    clearFrontPage,
    setCommentPageElements,
    clearCommentPages,
    reset,
  }
})
