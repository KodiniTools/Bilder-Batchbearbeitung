import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  buildPages,
  localizeHtml,
  pageMeta,
  setStructuredData,
} from '../../vite-plugins/localized-html'
import { routeSeoConfig } from '../../src/lib/core/seo-routes'
import de from '../../src/locales/de.json'
import en from '../../src/locales/en.json'

const indexHtml = readFileSync('index.html', 'utf-8')
const pages = buildPages({ de, en })
const page = (fileName: string) => {
  const found = pages.find((p) => p.fileName === fileName)
  if (!found) throw new Error(`Seite fehlt: ${fileName}`)
  return found
}
/** Alle JSON-LD-Blöcke einer Seite, geparst */
const jsonLd = (html: string): Record<string, unknown>[] =>
  [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(
    (match) => JSON.parse(match[1] ?? '') as Record<string, unknown>
  )
const ofType = (html: string, type: string) => jsonLd(html).filter((d) => d['@type'] === type)

const render = (fileName: string) => {
  const { meta } = page(fileName)
  return meta ? localizeHtml(indexHtml, meta) : indexHtml
}

describe('localized-html', () => {
  it('erzeugt je Route und Sprache eine Datei', () => {
    expect(pages).toHaveLength(Object.keys(routeSeoConfig).length * 2)
  })

  it('englische Startseite: lang, Titel, Description, Canonical, hreflang', () => {
    const html = render('seo/home.en.html')
    expect(html).toContain('<html lang="en">')
    expect(html).toContain(`<title>${en.seo.home.title}</title>`)
    expect(html).toMatch(
      new RegExp(
        `name="description"\\s+content="${en.seo.home.description.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`
      )
    )
    expect(html).toContain(
      '<link rel="canonical" href="https://kodinitools.com/bilderseriebearbeiten/?lang=en" />'
    )
    expect(html).toContain('content="https://kodinitools.com/bilderseriebearbeiten/?lang=en"')
    expect(html).toMatch(/property="og:locale"\s+content="en_US"/)
    expect(html).toMatch(/property="og:locale:alternate"\s+content="de_DE"/)
    expect(html).toMatch(
      /hreflang="de"\s+href="https:\/\/kodinitools\.com\/bilderseriebearbeiten\/"/
    )
    expect(html).not.toContain(de.seo.home.title)
  })

  it('Unterseite bekommt eigene Canonical und hreflang', () => {
    const html = render('seo/faq.en.html')
    expect(html).toContain(
      '<link rel="canonical" href="https://kodinitools.com/bilderseriebearbeiten/faq?lang=en" />'
    )
    expect(html).toMatch(
      /hreflang="x-default"\s+href="https:\/\/kodinitools\.com\/bilderseriebearbeiten\/faq"/
    )
    const deHtml = render('seo/faq.de.html')
    expect(deHtml).toContain('<html lang="de">')
    expect(deHtml).toContain(`<title>${de.seo.faq.title}</title>`)
    expect(deHtml).toContain(
      '<link rel="canonical" href="https://kodinitools.com/bilderseriebearbeiten/faq" />'
    )
  })

  it('deutsche Startseite bleibt identisch zur index.html', () => {
    expect(page('seo/home.de.html').meta).toBeNull()
  })

  it('lässt Body, SSI-Includes und Skripte unverändert', () => {
    const html = render('seo/app.en.html')
    const body = (s: string) => s.slice(s.indexOf('<body>'))
    expect(body(html)).toBe(body(indexHtml))
    expect(html).toContain('<!--#include virtual="/partials/nav.html" -->')
  })

  it('escaped Sonderzeichen und bricht bei fehlendem Tag ab', () => {
    const base = page('seo/home.en.html').meta
    if (!base) throw new Error('meta fehlt')
    const meta = { ...base, title: 'A & "B" <C>' }
    expect(localizeHtml(indexHtml, meta)).toContain(
      '<title>A &amp; &quot;B&quot; &lt;C&gt;</title>'
    )
    expect(() => localizeHtml(indexHtml.replace(/<link rel="canonical"[^>]*>/, ''), meta)).toThrow(
      /canonical/
    )
  })

  it('index.html trägt statisch dasselbe Meta wie die deutsche Startseite', () => {
    const meta = pageMeta('home', 'de', { de, en })
    expect(localizeHtml(indexHtml, meta)).toBe(setStructuredData(indexHtml, meta.structuredData))
  })

  it('englische Seiten: Keywords, Vorschaubild und Bildtexte sind englisch', () => {
    const html = render('seo/home.en.html')
    expect(html).toContain(`content="${en.seo.keywords}"`)
    expect(html).toContain(`content="${en.seo.imageAlt}"`)
    expect(html).not.toContain(de.seo.imageAlt)
    expect(html.match(/bilderseriebearbeiten\/og-image-en\.jpg/g)).toHaveLength(3)
    expect(html).not.toContain('twitter-card.jpg')
  })

  it('referenzierte Vorschaubilder liegen in public/', () => {
    const urls = pages.flatMap((p) => {
      const meta = p.meta ?? pageMeta('home', 'de', { de, en })
      const app = meta.structuredData.find((d) => d['@type'] === 'WebApplication')
      return [meta.imageUrl, String(app?.screenshot)]
    })
    for (const url of new Set(urls)) {
      const file = url.replace('https://kodinitools.com/bilderseriebearbeiten/', 'public/')
      expect(existsSync(file), file).toBe(true)
    }
  })

  it('JSON-LD: WebApplication und Breadcrumb in der Seitensprache, ohne Bewertung', () => {
    const html = render('seo/app.en.html')
    const [app] = ofType(html, 'WebApplication')
    expect(app).toMatchObject({
      name: en.seo.structured.name,
      inLanguage: 'en-US',
      url: 'https://kodinitools.com/bilderseriebearbeiten/?lang=en',
      featureList: en.seo.structured.featureList,
    })
    expect(html).not.toContain('aggregateRating')
    expect(ofType(html, 'SoftwareApplication')).toHaveLength(0)

    const [breadcrumb] = ofType(html, 'BreadcrumbList')
    const items = breadcrumb?.itemListElement as { name: string; item: string }[]
    expect(items.map((i) => i.item)).toEqual([
      'https://kodinitools.com/en/',
      'https://kodinitools.com/bilderseriebearbeiten/?lang=en',
      'https://kodinitools.com/bilderseriebearbeiten/app?lang=en',
    ])
    expect(ofType(render('seo/home.en.html'), 'BreadcrumbList')[0]?.itemListElement).toHaveLength(2)
  })

  it('JSON-LD: FAQPage nur auf der FAQ-Seite, Text wie auf der Seite ohne Markup', () => {
    expect(ofType(render('seo/home.en.html'), 'FAQPage')).toHaveLength(0)
    expect(ofType(render('seo/app.de.html'), 'FAQPage')).toHaveLength(0)

    const [faq] = ofType(render('seo/faq.de.html'), 'FAQPage')
    const questions = faq?.mainEntity as { name: string; acceptedAnswer: { text: string } }[]
    expect(questions).toHaveLength(8)
    expect(questions[0]?.name).toBe(de.faq.q1.question)
    expect(questions[4]?.acceptedAnswer.text).toBe(de.faq.q5.answer)
    for (const q of questions) {
      expect(q.acceptedAnswer.text).not.toMatch(/[<>]|\(\s*\)/)
    }
    expect(ofType(render('seo/faq.en.html'), 'FAQPage')[0]).toMatchObject({ inLanguage: 'en-US' })
  })

  it('maskiert < im JSON-LD, damit kein Tag entsteht', () => {
    const html = setStructuredData(indexHtml, [{ name: '</script><b>' }])
    expect(html).toContain('\\u003c/script>\\u003cb>')
    expect(jsonLd(html)[0]).toEqual({ name: '</script><b>' })
  })
})
