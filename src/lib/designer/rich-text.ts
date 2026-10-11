/**
 * Rich-Text für Designer-Texte: **fett** und *kursiv* innerhalb eines Textes.
 *
 * Der Inhalt bleibt ein String (PdfElement.content); Auszeichnungen sind
 * Markdown-artige Marker. `\*` steht für ein wörtliches Sternchen. Marker ohne
 * Gegenstück bleiben als Text stehen. Die Auszeichnung ergänzt den Grundstil
 * des Elements (fettes Element bleibt überall fett).
 */

export interface RichRun {
  text: string
  bold: boolean
  italic: boolean
}

export type RichMarker = '**' | '*'

type Token = { kind: 'text'; text: string } | { kind: RichMarker }

function tokenize(content: string): Token[] {
  const tokens: Token[] = []
  let text = ''
  const flush = () => {
    if (text) tokens.push({ kind: 'text', text })
    text = ''
  }
  for (let i = 0; i < content.length; i++) {
    const ch = content[i]
    if (ch === '\\' && content[i + 1] === '*') {
      text += '*'
      i++
    } else if (ch === '*') {
      flush()
      if (content[i + 1] === '*') {
        tokens.push({ kind: '**' })
        i++
      } else {
        tokens.push({ kind: '*' })
      }
    } else {
      text += ch
    }
  }
  flush()
  return tokens
}

/** Zerlegt einen Text in Abschnitte gleichen Stils (Zeilenumbrüche bleiben im Text). */
export function parseRichText(content: string): RichRun[] {
  const tokens = tokenize(content)
  // Ungerade Anzahl: der letzte Marker hat kein Gegenstück und bleibt Text
  for (const kind of ['**', '*'] as const) {
    const indices = tokens.flatMap((t, i) => (t.kind === kind ? [i] : []))
    if (indices.length % 2 === 1) tokens[indices[indices.length - 1]] = { kind: 'text', text: kind }
  }

  const runs: RichRun[] = []
  let bold = false
  let italic = false
  for (const token of tokens) {
    if (token.kind === '**') bold = !bold
    else if (token.kind === '*') italic = !italic
    else if (token.kind === 'text') {
      const last = runs[runs.length - 1]
      if (last && last.bold === bold && last.italic === italic) last.text += token.text
      else runs.push({ text: token.text, bold, italic })
    }
  }
  return runs
}

/** Enthält der Text Auszeichnungen oder Escapes, die anders als Klartext dargestellt werden? */
export function hasRichMarkup(content: string | undefined): boolean {
  return !!content && content.includes('*')
}

/** Text ohne Auszeichnungen (Listen, Lesezeichen) */
export function stripRichText(content: string): string {
  return parseRichText(content)
    .map((run) => run.text)
    .join('')
}

/** Sternchen in eingesetzten Werten (Platzhalter) wörtlich halten */
export function escapeRichText(value: string): string {
  return value.replace(/\*/g, '\\*')
}

function starsBefore(value: string, index: number): number {
  let n = 0
  while (index - n - 1 >= 0 && value[index - n - 1] === '*') n++
  return n
}

function starsAfter(value: string, index: number): number {
  let n = 0
  while (value[index + n] === '*') n++
  return n
}

/** Liegt die Auszeichnung bei n Sternchen links und k rechts vor? */
function hasMarker(marker: RichMarker, n: number, k: number): boolean {
  return marker === '**' ? n >= 2 && k >= 2 : n % 2 === 1 && k % 2 === 1
}

export interface RichEdit {
  value: string
  selectionStart: number
  selectionEnd: number
}

/**
 * Schaltet fett/kursiv für die Auswahl um (Strg+B / Strg+I): umschließt sie
 * mit Markern oder entfernt vorhandene. Ohne Auswahl wird ein leeres
 * Markerpaar eingefügt und der Cursor dazwischen gesetzt.
 */
export function toggleRichMarker(
  value: string,
  start: number,
  end: number,
  marker: RichMarker
): RichEdit {
  const m = marker.length
  if (start > end) [start, end] = [end, start]

  // Marker direkt außerhalb der Auswahl
  if (start !== end && hasMarker(marker, starsBefore(value, start), starsAfter(value, end))) {
    return {
      value: value.slice(0, start - m) + value.slice(start, end) + value.slice(end + m),
      selectionStart: start - m,
      selectionEnd: end - m,
    }
  }

  // Marker am Rand innerhalb der Auswahl (z. B. „**Wort**“ komplett markiert)
  const inner = value.slice(start, end)
  if (
    inner.length > 2 * m &&
    hasMarker(marker, starsAfter(inner, 0), starsBefore(inner, inner.length))
  ) {
    return {
      value: value.slice(0, start) + inner.slice(m, inner.length - m) + value.slice(end),
      selectionStart: start,
      selectionEnd: end - 2 * m,
    }
  }

  return {
    value: value.slice(0, start) + marker + inner + marker + value.slice(end),
    selectionStart: start + m,
    selectionEnd: end + m,
  }
}

export interface RichSegment extends RichRun {
  /** Breite in der Einheit von measure() */
  width: number
}

export interface RichLine {
  segments: RichSegment[]
  /** Breite ohne Leerzeichen am Zeilenende (für die Ausrichtung) */
  width: number
}

type Measure = (text: string, bold: boolean, italic: boolean) => number

/**
 * Bricht Abschnitte in Zeilen um (wie CSS white-space: pre-wrap;
 * word-break: break-word): an Leerzeichen, überlange Wörter zeichenweise,
 * explizite Zeilenumbrüche bleiben erhalten.
 */
export function layoutRichText(runs: RichRun[], maxWidth: number, measure: Measure): RichLine[] {
  // Absätze aus Abschnitten bilden
  const paragraphs: RichRun[][] = [[]]
  for (const run of runs) {
    run.text.split('\n').forEach((part, i) => {
      if (i > 0) paragraphs.push([])
      if (part) paragraphs[paragraphs.length - 1].push({ ...run, text: part })
    })
  }

  const lines: RichLine[] = []
  for (const paragraph of paragraphs) {
    // Wörter über Stilgrenzen hinweg zusammenhalten
    const pieces: { space: boolean; segments: RichRun[] }[] = []
    for (const run of paragraph) {
      for (const text of run.text.split(/(\s+)/)) {
        if (!text) continue
        const space = /^\s+$/.test(text)
        const last = pieces[pieces.length - 1]
        const seg = { text, bold: run.bold, italic: run.italic }
        if (last && !space && !last.space) last.segments.push(seg)
        else pieces.push({ space, segments: [seg] })
      }
    }

    let line: RichSegment[] = []
    let lineWidth = 0
    let wrapped = false
    const push = (seg: RichRun) => {
      const width = measure(seg.text, seg.bold, seg.italic)
      const prev = line[line.length - 1]
      if (prev && prev.bold === seg.bold && prev.italic === seg.italic) {
        prev.text += seg.text
        prev.width = measure(prev.text, prev.bold, prev.italic)
      } else {
        line.push({ ...seg, width })
      }
      lineWidth = line.reduce((sum, s) => sum + s.width, 0)
    }
    const breakLine = () => {
      lines.push(finishLine(line, measure))
      line = []
      lineWidth = 0
      wrapped = true
    }

    for (const piece of pieces) {
      if (piece.space) {
        // Nach einem Umbruch hängen Leerzeichen am Ende der Vorzeile
        if (line.length > 0 || !wrapped) piece.segments.forEach(push)
        continue
      }
      const wordWidth = piece.segments.reduce(
        (sum, s) => sum + measure(s.text, s.bold, s.italic),
        0
      )
      const hasWord = line.some((s) => s.text.trim() !== '')
      if (hasWord && lineWidth + wordWidth > maxWidth) breakLine()
      if (wordWidth <= maxWidth - lineWidth) {
        piece.segments.forEach(push)
        continue
      }
      // Überlanges Wort: zeichenweise umbrechen
      for (const seg of piece.segments) {
        for (const ch of seg.text) {
          const w = measure(ch, seg.bold, seg.italic)
          if (line.length > 0 && lineWidth + w > maxWidth) breakLine()
          push({ text: ch, bold: seg.bold, italic: seg.italic })
        }
      }
    }
    lines.push(finishLine(line, measure))
  }
  return lines
}

function finishLine(segments: RichSegment[], measure: Measure): RichLine {
  // Leerzeichen am Ende zählen für die Ausrichtung nicht (wie im Browser)
  const trimmed = segments.map((s) => ({ ...s }))
  while (trimmed.length > 0) {
    const last = trimmed[trimmed.length - 1]
    const text = last.text.replace(/\s+$/, '')
    if (text) {
      if (text !== last.text) {
        last.text = text
        last.width = measure(text, last.bold, last.italic)
      }
      break
    }
    trimmed.pop()
  }
  return { segments: trimmed, width: trimmed.reduce((sum, s) => sum + s.width, 0) }
}
