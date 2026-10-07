/**
 * Theme-Mechanik wie im Collage Maker: html[data-theme] schaltet die
 * Design-Tokens (--ds-*) und die SSI-Partials. Standard ist Light, ein
 * gespeichertes 'dark' gewinnt; die Systemeinstellung wird nicht ausgewertet.
 * Das Inline-Skript in index.html setzt denselben Wert vor dem ersten Paint.
 */
export type Theme = 'light' | 'dark'

/** Gespeichertes Theme aus localStorage, sonst 'light'. */
export function readStoredTheme(): Theme {
  try {
    return localStorage.getItem('theme') === 'dark' ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}

/** Setzt html[data-theme] (Tokens, Partials) und `color-scheme` über main.css. */
export function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme
}
