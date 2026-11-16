import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { buildPages, localizeHtml } from '../../vite-plugins/localized-html'
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
})
