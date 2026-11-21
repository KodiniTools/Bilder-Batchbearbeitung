// Erzeugt die Vorschaubilder in public/: og-image(-en).jpg 1200×630 und screenshot(-en).jpg 1600×1000.
// Aufruf: node scripts/build-og-images.cjs . (Quelle: Hero-Szenen unter src/assets/images/landing/hero)
const { chromium } = require('playwright')
const fs = require('fs')
const path = require('path')
const REPO = process.argv[2]
const b64 = (p) => fs.readFileSync(path.join(REPO, p)).toString('base64')

const TEXT = {
  de: {
    title: 'Mehrere Bilder gleichzeitig bearbeiten',
    sub: 'Verkleinern, umbenennen, Filter und Wasserzeichen für die ganze Bilderserie.',
    points: [
      'Export als ZIP, PDF, SVG, JPG, PNG, WebP',
      '100 % lokal im Browser, kein Upload',
      'Kostenlos, ohne Anmeldung',
    ],
    app: 'Bilderserie Bearbeiten',
  },
  en: {
    title: 'Edit multiple images at once',
    sub: 'Resize, rename, filters and watermarks for your whole image series.',
    points: [
      'Export as ZIP, PDF, SVG, JPG, PNG, WebP',
      '100% local in your browser, no upload',
      'Free, no sign-up',
    ],
    app: 'Batch Image Editor',
  },
}

const html = (lang) => `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><style>
@font-face{font-family:'Supreme';src:url(data:font/woff2;base64,${b64('public/fonts/Supreme-Variable.woff2')}) format('woff2');font-weight:100 800}
*{box-sizing:border-box;margin:0}
body{width:1200px;height:630px;overflow:hidden;background:#f6f5f1;color:#0a1324;font-family:'Supreme',sans-serif;position:relative}
.left{position:absolute;left:64px;top:56px;width:470px}
.brand{display:flex;align-items:center;gap:14px;font-size:22px;font-weight:600;color:#3d4657}
.brand img{width:52px;height:52px;border-radius:12px}
.brand b{color:#0a1324;font-weight:700}
h1{margin-top:34px;font-size:48px;line-height:1.08;font-weight:700;letter-spacing:-0.02em}
p{margin-top:18px;font-size:22px;line-height:1.35;color:#3d4657}
ul{margin-top:24px;list-style:none;padding:0;display:grid;gap:12px}
li{display:flex;align-items:center;gap:12px;font-size:20px;font-weight:600}
li::before{content:'';flex:none;width:10px;height:10px;border-radius:50%;background:#c9984d}
.win{position:absolute;left:580px;top:86px;width:860px;border:1px solid #d9d6cc;border-radius:14px;overflow:hidden;background:#fff;box-shadow:0 18px 50px rgba(10,19,36,.18)}
.bar{height:34px;background:#ebe9e2;border-bottom:1px solid #d9d6cc;display:flex;align-items:center;gap:7px;padding:0 14px}
.bar i{width:10px;height:10px;border-radius:50%;display:block}
.win img{display:block;width:100%}
.url{position:absolute;left:64px;bottom:44px;font-size:19px;font-weight:600;color:#3d4657}
</style></head><body>
<div class="left">
  <div class="brand"><img src="data:image/png;base64,${b64('public/icons/icon-192.png')}"><span><b>KodiniTools</b> · ${TEXT[lang].app}</span></div>
  <h1>${TEXT[lang].title}</h1>
  <p>${TEXT[lang].sub}</p>
  <ul>${TEXT[lang].points.map((p) => `<li>${p}</li>`).join('')}</ul>
</div>
<div class="win"><div class="bar"><i style="background:#ff5f57"></i><i style="background:#febc2e"></i><i style="background:#28c840"></i></div>
<img src="data:image/webp;base64,${b64(`src/assets/images/landing/hero/scene-3-${lang}-light.webp`)}"></div>
<div class="url">kodinitools.com/bilderseriebearbeiten</div>
</body></html>`

;(async () => {
  const b = await chromium.launch()
  for (const lang of ['de', 'en']) {
    const suffix = lang === 'en' ? '-en' : ''
    const p = await b.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 })
    await p.setContent(html(lang))
    await p.evaluate(() => document.fonts.ready)
    await p.screenshot({
      path: path.join(REPO, `public/og-image${suffix}.jpg`),
      type: 'jpeg',
      quality: 86,
    })
    await p.close()
    const s = await b.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 })
    await s.setContent(
      `<body style="margin:0"><img style="display:block;width:1600px;height:1000px" src="data:image/webp;base64,${b64(`src/assets/images/landing/hero/scene-1-${lang}-light.webp`)}"></body>`
    )
    await s.screenshot({
      path: path.join(REPO, `public/screenshot${suffix}.jpg`),
      type: 'jpeg',
      quality: 84,
    })
    await s.close()
  }
  await b.close()
})()
