# Design-System · Tokens v2

Design Tokens von „Bilderserie bearbeiten“. Sie sind eine Kopie des Design-Systems des Collage
Makers (`KodiniTools/Collage-Maker`, `src/design-system/` und `src/style.css`, Stand `9dc4eca`),
der sie wiederum aus dem Playlist Generator übernimmt. So teilen die Apps auf kodinitools.com
dieselbe Palette, dieselben Radien, dieselbe Motion und dieselbe Angleichung der SSI-Partials.
Werte werden im Collage Maker gepflegt und hierher übernommen.

## Dateien

| Datei                         | Zweck                                                                                                                            |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `tokens-v2.css`               | **Laufzeit-Quelle.** CSS Custom Properties `--ds-*`, Dark auf `:root`, Light auf `.light-theme` und `:root[data-theme='light']`. |
| `tokens-v2.json`              | Maschinenlesbare Fassung (W3C-Design-Tokens-nah), `$extensions.css` nennt die Variable.                                          |
| `tokens-v2.ts`                | Typisierter Zugriff für TS, z. B. `themeColorsV2('light')` für Canvas-Zeichnung.                                                 |
| `src/assets/styles/main.css`  | Basis-Styles wie `src/style.css` im Collage Maker: Body, Fokus, SSI-Partials, Modal-Portal, Range-Slider, Touch, Bewegung.       |
| `src/assets/styles/fonts.css` | Schriften für Texte in Bildern und PDF-Seiten; die UI-Schrift ist Supreme (`--ds-font-sans`).                                    |

## Theme-Mechanik

`html[data-theme]` schaltet die Tokens und die SSI-Partials. Ein Inline-Skript in `index.html`
setzt den Wert vor dem ersten Paint aus `localStorage.theme`, `src/utils/theme.ts` übernimmt danach.
Standard ist Light, die Systemeinstellung wird wie im Collage Maker nicht ausgewertet.
`body.light-theme` wird bewusst nicht gesetzt: Die App-Variablen hängen an `:root`, ein Theme nur
auf `body` würde Brücke und Tokens auseinanderlaufen lassen, wenn die SSI-Navigation das Theme
umschaltet.

## Brücke für die Komponenten

Die scoped Styles nutzen weiter die App-Variablen; `main.css` lässt sie auf die Tokens zeigen.
Neue Styles verwenden `--ds-*` direkt.

| Rolle                        | App-Variable                                  | Token                                         |
| ---------------------------- | --------------------------------------------- | --------------------------------------------- |
| Seite, Panel, Eingabe, Hover | `--bg`, `--panel`, `--btn`, `--btn-hover`     | `--ds-surface-0…3`                            |
| Rahmen                       | `--border-color`, `--glass-border`            | `--ds-border` (`--ds-border-strong`)          |
| Text 1–2                     | `--text`, `--muted`                           | `--ds-text`, `--ds-text-2`                    |
| Primäraktion                 | `--accent`, `--accent-hover`, `--accent-text` | `--ds-accent*`, `--ds-on-accent`              |
| Link, Sekundär               | `--secondary`, `--color-blue`                 | `--ds-link`                                   |
| Status                       | `--green`, `--red`, `--yellow`, `--orange`    | `--ds-success`, `--ds-danger`, `--ds-warning` |
| Radien                       | `--radius-sm/md/lg` (`xl`, `2xl` → `lg`)      | `--ds-radius-sm` 6 · `md` 10 · `lg` 16        |
| Abstände                     | `--space-1…7`                                 | `--ds-space-1/2/3/4/6/8/12` (4er-Raster)      |
| Motion                       | `--ease-smooth`, `--ease-spring`              | `--ds-ease`, `--ds-duration*`                 |
| Schatten, Glas               | `--surface-elevation`, `--glass-bg`           | keine Karten-Schatten, deckend                |

## Regeln (wie im Collage Maker)

Gold ist Vollfläche nur für die Primäraktion, Fokus und aktive Zustände. Ein Rahmen (1 px), drei
Radien, Schatten nur für Overlays (`--ds-shadow-overlay`: Dialoge, Toasts, Banner). Keine
Verläufe, kein Blur. Hover ändert Farbe, nie Größe. Fokus über `--ds-focus-ring`.

## SSI-Partials

`nav.html`, `footer.html` und `cookie-banner.html` stehen außerhalb von `#app`. `main.css` macht
ihre Hintergründe transparent, setzt Text- und Linkfarben aus den Tokens und stellt Dropdowns,
Hamburger-Icons und den Cookie-Banner wieder her. Damit diese Regeln keine App-Modals treffen,
rendern alle Modals per `<Teleport to="#modal-portal">` in `#modal-portal` innerhalb von `#app`.
`#app` hat deshalb keinen `z-index`; der Portal-Stacking-Context liegt über der Navigation und
unter dem Cookie-Banner.
