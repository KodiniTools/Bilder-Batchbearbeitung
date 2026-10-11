import type { PdfElement } from '@/lib/features/export-pdf'
import type { PageSize } from './arrange'

export type TemplateMode = 'cover' | 'comment'

/** Layout einer Designer-Seite (Startseite oder Kommentarseite). */
export interface PdfTemplate {
  id: string
  name: string
  mode: TemplateMode
  /** Seitengröße, für die das Layout gebaut wurde (px) */
  pageWidth: number
  pageHeight: number
  elements: PdfElement[]
  builtIn?: boolean
}

/** Texte der eingebauten Vorlagen in der UI-Sprache */
export interface TemplateTexts {
  names: { photobook: string; report: string; portfolio: string; note: string; columns: string }
  heading: string
  body: string
  /** z. B. „{images} Bilder“ */
  images: string
}

const A4 = { width: 794, height: 1123 }
const STORAGE_KEY = 'kodini.pdfDesigner.templates'
const FILE_FORMAT = 'kodini-pdf-templates'
const ELEMENT_TYPES = new Set(['text', 'image', 'shape'])
const SHAPES = new Set(['rect', 'ellipse', 'line'])

type ElementSpec = Omit<PdfElement, 'id' | 'zIndex'>

function build(specs: ElementSpec[]): PdfElement[] {
  return specs.map((spec, i) => ({ ...spec, id: `tpl-${i}`, zIndex: i }))
}

function text(spec: Partial<PdfElement> & Pick<PdfElement, 'x' | 'y' | 'content'>): ElementSpec {
  return {
    type: 'text',
    width: 300,
    height: 60,
    fontSize: 24,
    fontFamily: 'Helvetica',
    color: '#1f2933',
    align: 'left',
    bold: false,
    italic: false,
    ...spec,
  }
}

function background(fillColor: string): ElementSpec {
  return {
    type: 'shape',
    shape: 'rect',
    background: true,
    x: 0,
    y: 0,
    width: A4.width,
    height: A4.height,
    fillColor,
    strokeColor: '',
    strokeWidth: 0,
  }
}

/** Eingebaute Vorlagen (A4 hoch; beim Anwenden auf die Seitengröße skaliert). */
export function builtInTemplates(texts: TemplateTexts): PdfTemplate[] {
  const base = { pageWidth: A4.width, pageHeight: A4.height, builtIn: true }
  return [
    {
      ...base,
      id: 'builtin-photobook',
      name: texts.names.photobook,
      mode: 'cover',
      elements: build([
        background('#1f2933'),
        text({
          x: 97,
          y: 430,
          width: 600,
          height: 110,
          content: '{title}',
          fontSize: 56,
          fontFamily: 'Clash Display',
          bold: true,
          color: '#ffffff',
          align: 'center',
        }),
        {
          type: 'shape',
          shape: 'line',
          x: 297,
          y: 550,
          width: 200,
          height: 12,
          strokeColor: '#e0b354',
          strokeWidth: 3,
        },
        text({
          x: 197,
          y: 575,
          width: 400,
          height: 50,
          content: '{date}',
          fontSize: 20,
          fontFamily: 'Satoshi',
          color: '#cbd2d9',
          align: 'center',
        }),
      ]),
    },
    {
      ...base,
      id: 'builtin-report',
      name: texts.names.report,
      mode: 'cover',
      elements: build([
        {
          type: 'shape',
          shape: 'rect',
          x: 0,
          y: 0,
          width: A4.width,
          height: 260,
          fillColor: '#2f5d8a',
          strokeColor: '',
          strokeWidth: 0,
        },
        text({
          x: 60,
          y: 110,
          width: 674,
          height: 90,
          content: '{title}',
          fontSize: 44,
          fontFamily: 'General Sans',
          bold: true,
          color: '#ffffff',
        }),
        text({
          x: 60,
          y: 300,
          width: 674,
          height: 50,
          content: `{date} · ${texts.images}`,
          fontSize: 18,
          fontFamily: 'General Sans',
          color: '#52606d',
        }),
        {
          type: 'shape',
          shape: 'line',
          x: 68,
          y: 360,
          width: 658,
          height: 10,
          strokeColor: '#cbd2d9',
          strokeWidth: 2,
        },
      ]),
    },
    {
      ...base,
      id: 'builtin-portfolio',
      name: texts.names.portfolio,
      mode: 'cover',
      elements: build([
        background('#f4f1ea'),
        {
          type: 'shape',
          shape: 'rect',
          x: 60,
          y: 60,
          width: 674,
          height: 1003,
          fillColor: '',
          strokeColor: '#1f2933',
          strokeWidth: 2,
        },
        text({
          x: 100,
          y: 760,
          width: 594,
          height: 120,
          content: '{title}',
          fontSize: 60,
          fontFamily: 'Zodiak',
          italic: true,
          color: '#1f2933',
        }),
        text({
          x: 100,
          y: 890,
          width: 594,
          height: 50,
          content: '{date}',
          fontSize: 18,
          fontFamily: 'Switzer',
          color: '#52606d',
        }),
      ]),
    },
    {
      ...base,
      id: 'builtin-note',
      name: texts.names.note,
      mode: 'comment',
      elements: build([
        text({
          x: 60,
          y: 70,
          width: 674,
          height: 70,
          content: texts.heading,
          fontSize: 36,
          fontFamily: 'General Sans',
          bold: true,
        }),
        {
          type: 'shape',
          shape: 'line',
          x: 68,
          y: 145,
          width: 120,
          height: 10,
          strokeColor: '#2f5d8a',
          strokeWidth: 4,
        },
        text({
          x: 60,
          y: 180,
          width: 674,
          height: 400,
          content: texts.body,
          fontSize: 16,
          fontFamily: 'Satoshi',
          color: '#323f4b',
        }),
      ]),
    },
    {
      ...base,
      id: 'builtin-columns',
      name: texts.names.columns,
      mode: 'comment',
      elements: build([
        text({
          x: 60,
          y: 70,
          width: 674,
          height: 70,
          content: texts.heading,
          fontSize: 36,
          fontFamily: 'General Sans',
          bold: true,
        }),
        text({
          x: 60,
          y: 170,
          width: 322,
          height: 500,
          content: texts.body,
          fontSize: 15,
          fontFamily: 'Satoshi',
          color: '#323f4b',
        }),
        {
          type: 'shape',
          shape: 'line',
          x: 387,
          y: 170,
          width: 20,
          height: 500,
          strokeColor: '#cbd2d9',
          strokeWidth: 1,
        },
        text({
          x: 412,
          y: 170,
          width: 322,
          height: 500,
          content: texts.body,
          fontSize: 15,
          fontFamily: 'Satoshi',
          color: '#323f4b',
        }),
      ]),
    },
  ]
}

/**
 * Elemente einer Vorlage für die aktuelle Seite: neue ids, auf die Seitengröße
 * skaliert (Schrift und Linien mit dem kleineren Faktor), Hintergrund ganzseitig.
 */
export function instantiateTemplate(
  template: PdfTemplate,
  page: PageSize,
  newId: () => string
): PdfElement[] {
  const sx = page.width / template.pageWidth
  const sy = page.height / template.pageHeight
  const s = Math.min(sx, sy)
  const round = (n: number) => Math.round(n * 100) / 100
  return template.elements.map((el) => {
    const copy: PdfElement = { ...el, id: newId(), page: undefined }
    if (el.background) {
      return { ...copy, x: 0, y: 0, width: page.width, height: page.height }
    }
    copy.x = round(el.x * sx)
    copy.y = round(el.y * sy)
    if (el.width !== undefined) copy.width = round(el.width * sx)
    if (el.height !== undefined) copy.height = round(el.height * sy)
    if (el.fontSize !== undefined) copy.fontSize = Math.max(8, Math.round(el.fontSize * s))
    if (el.strokeWidth !== undefined) copy.strokeWidth = round(el.strokeWidth * s)
    if (el.cornerRadius !== undefined) copy.cornerRadius = round(el.cornerRadius * s)
    return copy
  })
}

/** Neue eigene Vorlage aus den Elementen der aktuellen Seite. */
export function createTemplate(
  name: string,
  mode: TemplateMode,
  page: PageSize,
  elements: PdfElement[],
  id: string
): PdfTemplate {
  return {
    id,
    name: name.trim(),
    mode,
    pageWidth: page.width,
    pageHeight: page.height,
    elements: elements.map((el, i) => ({ ...el, id: `tpl-${i}`, page: undefined })),
  }
}

// ── Prüfung (localStorage und importierte Dateien sind nicht vertrauenswürdig) ──

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)
const isStr = (v: unknown): v is string => typeof v === 'string'
const isColor = (v: unknown) =>
  v === undefined || v === '' || (isStr(v) && /^#[0-9a-f]{6}$/i.test(v))

/** Element prüfen und auf bekannte Felder reduzieren; null = ungültig. */
export function sanitizeElement(raw: unknown): PdfElement | null {
  if (!raw || typeof raw !== 'object') return null
  const el = raw as Record<string, unknown>
  if (!isStr(el.id) || !isStr(el.type) || !ELEMENT_TYPES.has(el.type)) return null
  if (!isNum(el.x) || !isNum(el.y)) return null
  if (el.type === 'shape' && !(isStr(el.shape) && SHAPES.has(el.shape))) return null
  // Nur eingebettete Bilder, keine externen URLs
  if (el.type === 'image' && !(isStr(el.src) && /^data:image\/[a-z+]+;base64,/i.test(el.src))) {
    return null
  }
  if (![el.color, el.fillColor, el.strokeColor].every(isColor)) return null

  const out: PdfElement = {
    id: el.id,
    type: el.type as PdfElement['type'],
    x: el.x,
    y: el.y,
    zIndex: isNum(el.zIndex) ? el.zIndex : 0,
  }
  const nums = ['width', 'height', 'fontSize', 'opacity', 'strokeWidth', 'cornerRadius'] as const
  for (const key of nums) if (isNum(el[key])) out[key] = el[key] as number
  const strs = ['content', 'fontFamily', 'color', 'fillColor', 'strokeColor', 'src'] as const
  for (const key of strs) if (isStr(el[key])) out[key] = el[key] as string
  if (el.align === 'left' || el.align === 'center' || el.align === 'right') out.align = el.align
  if (el.shape) out.shape = el.shape as PdfElement['shape']
  if (el.bold === true) out.bold = true
  if (el.italic === true) out.italic = true
  if (el.background === true) out.background = true
  return out
}

export function sanitizeTemplate(raw: unknown): PdfTemplate | null {
  if (!raw || typeof raw !== 'object') return null
  const tpl = raw as Record<string, unknown>
  if (!isStr(tpl.id) || !isStr(tpl.name) || !tpl.name.trim()) return null
  if (tpl.mode !== 'cover' && tpl.mode !== 'comment') return null
  if (
    !isNum(tpl.pageWidth) ||
    !isNum(tpl.pageHeight) ||
    tpl.pageWidth <= 0 ||
    tpl.pageHeight <= 0
  ) {
    return null
  }
  if (!Array.isArray(tpl.elements)) return null
  const elements = tpl.elements.map(sanitizeElement)
  if (elements.some((el) => el === null)) return null
  return {
    id: tpl.id,
    name: tpl.name.trim().slice(0, 80),
    mode: tpl.mode,
    pageWidth: tpl.pageWidth,
    pageHeight: tpl.pageHeight,
    elements: elements as PdfElement[],
  }
}

// ── Speichern / Laden ─────────────────────────────────────────────

export function loadUserTemplates(
  storage: Storage | undefined = globalThis.localStorage
): PdfTemplate[] {
  try {
    const raw = storage?.getItem(STORAGE_KEY)
    if (!raw) return []
    const list: unknown = JSON.parse(raw)
    if (!Array.isArray(list)) return []
    return list.map(sanitizeTemplate).filter((tpl): tpl is PdfTemplate => tpl !== null)
  } catch {
    return []
  }
}

/** Wirft bei vollem Speicher (QuotaExceededError), damit die UI es melden kann. */
export function saveUserTemplates(
  templates: PdfTemplate[],
  storage: Storage | undefined = globalThis.localStorage
): void {
  if (!storage) throw new Error('localStorage nicht verfügbar')
  storage.setItem(STORAGE_KEY, JSON.stringify(templates))
}

/** JSON-Datei für Export/Weitergabe */
export function serializeTemplates(templates: PdfTemplate[]): string {
  return JSON.stringify({ format: FILE_FORMAT, version: 1, templates }, null, 2)
}

/** Importierte Datei lesen; wirft bei ungültigem Inhalt. */
export function parseTemplateFile(json: string): PdfTemplate[] {
  const data: unknown = JSON.parse(json)
  const list =
    data && typeof data === 'object' && (data as { format?: unknown }).format === FILE_FORMAT
      ? (data as { templates?: unknown }).templates
      : undefined
  if (!Array.isArray(list)) throw new Error('Keine Vorlagen-Datei')
  const templates = list.map(sanitizeTemplate).filter((tpl): tpl is PdfTemplate => tpl !== null)
  if (templates.length === 0) throw new Error('Keine gültigen Vorlagen')
  return templates
}
