// Tastatur und Buttons für Rich-Text in Textfeldern (Designer und Eigenschaften-Panel)
import { toggleRichMarker, type RichEdit, type RichMarker } from './rich-text'

/**
 * Schaltet die Auszeichnung für die Auswahl des Textfelds um und setzt Wert und
 * Auswahl direkt. Der Aufrufer übernimmt edit.value in sein Modell.
 */
export function applyRichMarker(textarea: HTMLTextAreaElement, marker: RichMarker): RichEdit {
  const edit = toggleRichMarker(
    textarea.value,
    textarea.selectionStart,
    textarea.selectionEnd,
    marker
  )
  textarea.value = edit.value
  textarea.setSelectionRange(edit.selectionStart, edit.selectionEnd)
  return edit
}

/** Strg/Cmd+B = fett, Strg/Cmd+I = kursiv; null, wenn die Taste nichts davon ist. */
export function richFormatShortcut(event: KeyboardEvent): RichEdit | null {
  if (!(event.ctrlKey || event.metaKey) || event.altKey || event.shiftKey) return null
  const key = event.key.toLowerCase()
  const marker: RichMarker | null = key === 'b' ? '**' : key === 'i' ? '*' : null
  if (!marker || !(event.target instanceof HTMLTextAreaElement)) return null
  event.preventDefault()
  return applyRichMarker(event.target, marker)
}
