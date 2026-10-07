/**
 * Tokens v2: typisierter Zugriff auf tokens-v2.json.
 * CSS-Namespace --ds-*, Laufzeit-Quelle tokens-v2.css. Kopie aus
 * KodiniTools/Collage-Maker (src/design-system/tokens-v2.ts, Stand 9dc4eca), dort aus dem
 * Playlist Generator, ohne v1-Bezug.
 */
import tokens from './tokens-v2.json'

export type ThemeName = 'dark' | 'light'
export type ColorTokenV2Name = keyof typeof tokens.color.dark
export type EffectTokenV2Name = keyof typeof tokens.effect.dark
export type SpacingTokenV2Name = keyof typeof tokens.spacing
export type RadiusTokenV2Name = keyof typeof tokens.radius

/** Die kompletten v2-Tokens, Struktur siehe tokens-v2.json. */
export const designTokensV2 = tokens

/** Farbwert eines v2-Tokens für ein Theme, z. B. colorTokenV2('dark', 'accent') → '#d4a257'. */
export function colorTokenV2(theme: ThemeName, name: ColorTokenV2Name): string {
  return tokens.color[theme][name].$value
}

/** Flache Farbkarte eines Themes, z. B. für Canvas- oder SVG-Zeichnung. */
export function themeColorsV2(theme: ThemeName): Readonly<Record<ColorTokenV2Name, string>> {
  const source = tokens.color[theme]
  const result = {} as Record<ColorTokenV2Name, string>
  for (const key of Object.keys(source) as ColorTokenV2Name[]) {
    result[key] = source[key].$value
  }
  return result
}

/** CSS-Variablenname eines v2-Farb-Tokens, z. B. colorCssVarV2('accent') → '--ds-accent'. */
export function colorCssVarV2(name: ColorTokenV2Name): string {
  return tokens.color.dark[name].$extensions.css
}

/** var()-Ausdruck mit optionalem Fallback: cssVarV2('text2') → 'var(--ds-text-2)'. */
export function cssVarV2(name: ColorTokenV2Name, fallback?: string): string {
  const variable = colorCssVarV2(name)
  return fallback === undefined ? `var(${variable})` : `var(${variable}, ${fallback})`
}

/** Control-Höhen in px, z. B. für Canvas-Layout oder Virtualisierung. */
export const controlSizesV2 = {
  sm: parseInt(tokens.size.control.sm.$value, 10),
  md: parseInt(tokens.size.control.md.$value, 10),
  lg: parseInt(tokens.size.control.lg.$value, 10),
  row: parseInt(tokens.size.row.$value, 10),
} as const

/** Breakpoints in px für window.matchMedia. */
export const breakpointsV2 = {
  phone: parseInt(tokens.layout.breakpoint.phone.$value, 10),
  tablet: parseInt(tokens.layout.breakpoint.tablet.$value, 10),
  desktop: parseInt(tokens.layout.breakpoint.desktop.$value, 10),
} as const
