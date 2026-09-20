/**
 * Blog-Artikel von kodinitools.com/blog, die sich auf „Bilderserie bearbeiten" beziehen.
 *
 * Neue Beiträge werden hier ergänzt; die Übersicht (/artikel) sortiert automatisch
 * nach Datum (neueste zuerst). Bilder und Artikel liegen auf kodinitools.com,
 * im Repo wird nichts dupliziert.
 */

export type ArticleLocale = 'de' | 'en'

type Localized = Record<ArticleLocale, string>

export interface BlogArticle {
  /** Eindeutiger Schlüssel (v-for key) */
  id: string
  /** Veröffentlichungsdatum als ISO-Datum (YYYY-MM-DD), für Sortierung und Anzeige */
  date: string
  /** Lesezeit in Minuten */
  minutes: number
  /** Kategorie-Label, z. B. Bild / Image */
  tag: Localized
  /** Vollständige URL des Artikels je Sprache */
  url: Localized
  /** Vollständige URL des Vorschaubilds je Sprache */
  image: Localized
  title: Localized
  description: Localized
}

/** Sprachaufgelöste Sicht auf einen Artikel für die Anzeige */
export interface LocalizedBlogArticle {
  id: string
  date: string
  minutes: number
  tag: string
  url: string
  image: string
  title: string
  description: string
}

const SITE = 'https://kodinitools.com'

export const blogArticles: readonly BlogArticle[] = [
  {
    id: 'watermark-multiple-images',
    date: '2026-09-20',
    minutes: 5,
    tag: { de: 'Bild', en: 'Image' },
    url: {
      de: `${SITE}/blog/wasserzeichen-mehrere-bilder/`,
      en: `${SITE}/en/blog/watermark-multiple-images/`,
    },
    image: {
      de: `${SITE}/image/wasserzeichen-blog-de.png`,
      en: `${SITE}/image/watermark-blog-en.png`,
    },
    title: {
      de: 'Wasserzeichen für mehrere Bilder gleichzeitig: Hunderte Fotos in einem Durchgang schützen',
      en: 'Watermark Multiple Images at Once: Protect Hundreds of Photos in One Pass',
    },
    description: {
      de: 'Text-Wasserzeichen mit Schriftart, Grösse, Farbe, Deckkraft, Drehung und Position einmal einstellen, live auf allen ausgewählten Bildern prüfen und als ZIP exportieren – ohne Upload.',
      en: 'Set a text watermark with font, size, color, opacity, rotation and position once, check it live on all selected images and export as ZIP — no upload.',
    },
  },
  {
    id: 'batch-resize-images',
    date: '2026-06-14',
    minutes: 4,
    tag: { de: 'Bild', en: 'Image' },
    url: {
      de: `${SITE}/blog/bilder-batch-verkleinern/`,
      en: `${SITE}/en/blog/batch-resize-images/`,
    },
    image: {
      de: `${SITE}/image/bilderserie-blog-de.png`,
      en: `${SITE}/image/bilderserie-blog-en.png`,
    },
    title: {
      de: 'Mehrere Bilder gleichzeitig verkleinern: Batch-Bearbeitung leicht gemacht',
      en: 'How to Resize Multiple Images at Once: Batch Editing Made Easy',
    },
    description: {
      de: '100+ Bilder in Sekunden skalieren, umbenennen und als ZIP exportieren – ohne Installation.',
      en: 'Scale, rename and export 100+ images as a ZIP in seconds — no installation.',
    },
  },
]

/** Fallback für unbekannte Locale-Werte (z. B. 'fr' aus localStorage) */
export function toArticleLocale(locale: string): ArticleLocale {
  return locale === 'en' ? 'en' : 'de'
}

/**
 * Liefert alle Artikel in der gewünschten Sprache, neueste zuerst.
 * Das Quell-Array bleibt unverändert.
 */
export function getBlogArticles(locale: string): LocalizedBlogArticle[] {
  const lang = toArticleLocale(locale)
  return [...blogArticles]
    .sort((a, b) => b.date.localeCompare(a.date))
    .map((article) => ({
      id: article.id,
      date: article.date,
      minutes: article.minutes,
      tag: article.tag[lang],
      url: article.url[lang],
      image: article.image[lang],
      title: article.title[lang],
      description: article.description[lang],
    }))
}

/** Formatiert ein ISO-Datum sprachabhängig, z. B. „20. September 2026" / „September 20, 2026" */
export function formatArticleDate(isoDate: string, locale: string): string {
  const lang = toArticleLocale(locale)
  const date = new Date(`${isoDate}T00:00:00`)
  if (Number.isNaN(date.getTime())) return isoDate
  return new Intl.DateTimeFormat(lang === 'de' ? 'de-CH' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date)
}
