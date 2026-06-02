<script setup lang="ts">
import { onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'

const { locale, t } = useI18n()
const router = useRouter()

const goToHome = () => {
  router.push('/')
}

const goToApp = () => {
  router.push('/app')
}

const scrollToSection = (id: string) => {
  const element = document.getElementById(id)
  if (element) {
    element.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}

onMounted(() => {
  // Theme-Initialisierung als Fallback (SSI nav.html setzt Theme primär)
  if (!document.documentElement.getAttribute('data-theme')) {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const theme = savedTheme || (prefersDark ? 'dark' : 'light')
    document.documentElement.dataset.theme = theme
    localStorage.setItem('theme', theme)
  }

  const savedLang = localStorage.getItem('locale')
  if (savedLang) {
    locale.value = savedLang
  }
})

const sections = [
  'upload', 'transform', 'filters', 'batch', 'editor',
  'pdf', 'zip', 'svg', 'save', 'ui', 'i18n', 'theme', 'shortcuts', 'privacy'
]
</script>

<template>
  <div class="blog-page">
    <!-- Navigation -->
    <nav class="blog-nav">
      <div class="nav-container">
        <div class="nav-links">
          <button class="nav-link" @click="goToHome">{{ t('landing.nav.home') }}</button>
          <button class="nav-link primary" @click="goToApp">{{ t('landing.nav.app') }}</button>
        </div>
        <!-- Theme & Language Switcher sind jetzt in der globalen SSI Navigation -->
      </div>
    </nav>

    <!-- Hero -->
    <header class="blog-hero">
      <div class="hero-container">
        <h1>{{ t('blog.title') }}</h1>
        <p class="hero-subtitle">{{ t('blog.subtitle') }}</p>
      </div>
    </header>

    <!-- Main Content -->
    <main class="blog-content">
      <div class="blog-container">
        <!-- Table of Contents -->
        <aside class="toc">
          <h3>{{ t('blog.toc') }}</h3>
          <nav>
            <button
              v-for="(section, index) in sections"
              :key="section"
              class="toc-link"
              @click="scrollToSection(section)"
            >
              {{ index + 1 }}. {{ t(`blog.sections.${section}.title`) }}
            </button>
          </nav>
        </aside>

        <!-- Article -->
        <article class="article">
          <!-- Introduction -->
          <section class="intro-section">
            <p>{{ t('blog.intro.p1') }}</p>
            <p>{{ t('blog.intro.p2') }}</p>
          </section>

          <!-- Section 1: Upload -->
          <section id="upload" class="content-section">
            <h2><span class="section-number">1</span> {{ t('blog.sections.upload.title') }}</h2>
            <h3>{{ t('blog.sections.upload.simple.title') }}</h3>
            <p>{{ t('blog.sections.upload.simple.text') }}</p>
            <ul>
              <li><strong>Drag & Drop:</strong> {{ t('blog.sections.upload.simple.dragdrop') }}</li>
              <li><strong>{{ t('blog.sections.upload.simple.clickLabel') }}:</strong> {{ t('blog.sections.upload.simple.click') }}</li>
            </ul>
            <h3>{{ t('blog.sections.upload.formats.title') }}</h3>
            <ul class="format-list">
              <li><strong>JPEG/JPG</strong> – {{ t('blog.sections.upload.formats.jpeg') }}</li>
              <li><strong>PNG</strong> – {{ t('blog.sections.upload.formats.png') }}</li>
              <li><strong>WebP</strong> – {{ t('blog.sections.upload.formats.webp') }}</li>
              <li><strong>BMP</strong> – {{ t('blog.sections.upload.formats.bmp') }}</li>
              <li><strong>GIF</strong> – {{ t('blog.sections.upload.formats.gif') }}</li>
            </ul>
          </section>

          <!-- Section 2: Transformations -->
          <section id="transform" class="content-section">
            <h2><span class="section-number">2</span> {{ t('blog.sections.transform.title') }}</h2>
            <div class="feature-grid">
              <div class="feature-box">
                <i class="fa-solid fa-rotate"></i>
                <h4>{{ t('blog.sections.transform.rotate.title') }}</h4>
                <p>{{ t('blog.sections.transform.rotate.text') }}</p>
              </div>
              <div class="feature-box">
                <i class="fa-solid fa-arrows-left-right"></i>
                <h4>{{ t('blog.sections.transform.flip.title') }}</h4>
                <p>{{ t('blog.sections.transform.flip.text') }}</p>
              </div>
              <div class="feature-box">
                <i class="fa-solid fa-expand"></i>
                <h4>{{ t('blog.sections.transform.resize.title') }}</h4>
                <p>{{ t('blog.sections.transform.resize.text') }}</p>
              </div>
              <div class="feature-box">
                <i class="fa-solid fa-crop"></i>
                <h4>{{ t('blog.sections.transform.crop.title') }}</h4>
                <p>{{ t('blog.sections.transform.crop.text') }}</p>
              </div>
            </div>
          </section>

          <!-- Section 3: Filters -->
          <section id="filters" class="content-section">
            <h2><span class="section-number">3</span> {{ t('blog.sections.filters.title') }}</h2>
            <p>{{ t('blog.sections.filters.intro') }}</p>
            <div class="filter-list">
              <div class="filter-item">
                <h4><i class="fa-solid fa-sun"></i> {{ t('blog.sections.filters.brightness.title') }}</h4>
                <p>{{ t('blog.sections.filters.brightness.text') }}</p>
              </div>
              <div class="filter-item">
                <h4><i class="fa-solid fa-circle-half-stroke"></i> {{ t('blog.sections.filters.contrast.title') }}</h4>
                <p>{{ t('blog.sections.filters.contrast.text') }}</p>
              </div>
              <div class="filter-item">
                <h4><i class="fa-solid fa-palette"></i> {{ t('blog.sections.filters.saturation.title') }}</h4>
                <p>{{ t('blog.sections.filters.saturation.text') }}</p>
              </div>
              <div class="filter-item">
                <h4><i class="fa-solid fa-droplet"></i> {{ t('blog.sections.filters.blur.title') }}</h4>
                <p>{{ t('blog.sections.filters.blur.text') }}</p>
              </div>
            </div>
          </section>

          <!-- Section 4: Batch -->
          <section id="batch" class="content-section">
            <h2><span class="section-number">4</span> {{ t('blog.sections.batch.title') }}</h2>
            <p>{{ t('blog.sections.batch.intro') }}</p>
            <div class="highlight-box">
              <h4><i class="fa-solid fa-pen"></i> {{ t('blog.sections.batch.rename.title') }}</h4>
              <p>{{ t('blog.sections.batch.rename.text') }}</p>
            </div>
            <div class="highlight-box">
              <h4><i class="fa-solid fa-sliders"></i> {{ t('blog.sections.batch.panel.title') }}</h4>
              <p>{{ t('blog.sections.batch.panel.text') }}</p>
            </div>
          </section>

          <!-- Section 5: Editor -->
          <section id="editor" class="content-section">
            <h2><span class="section-number">5</span> {{ t('blog.sections.editor.title') }}</h2>
            <p>{{ t('blog.sections.editor.intro') }}</p>
            <ul>
              <li>{{ t('blog.sections.editor.features.preview') }}</li>
              <li>{{ t('blog.sections.editor.features.info') }}</li>
              <li>{{ t('blog.sections.editor.features.tools') }}</li>
              <li>{{ t('blog.sections.editor.features.name') }}</li>
            </ul>
          </section>

          <!-- Section 6: PDF -->
          <section id="pdf" class="content-section">
            <h2><span class="section-number">6</span> {{ t('blog.sections.pdf.title') }}</h2>
            <p>{{ t('blog.sections.pdf.intro') }}</p>
            <div class="feature-grid">
              <div class="feature-box accent">
                <i class="fa-solid fa-file-lines"></i>
                <h4>{{ t('blog.sections.pdf.titlepage.title') }}</h4>
                <p>{{ t('blog.sections.pdf.titlepage.text') }}</p>
              </div>
              <div class="feature-box accent">
                <i class="fa-solid fa-comments"></i>
                <h4>{{ t('blog.sections.pdf.comments.title') }}</h4>
                <p>{{ t('blog.sections.pdf.comments.text') }}</p>
              </div>
              <div class="feature-box accent">
                <i class="fa-solid fa-compress"></i>
                <h4>{{ t('blog.sections.pdf.optimize.title') }}</h4>
                <p>{{ t('blog.sections.pdf.optimize.text') }}</p>
              </div>
            </div>
          </section>

          <!-- Section 7: ZIP -->
          <section id="zip" class="content-section">
            <h2><span class="section-number">7</span> {{ t('blog.sections.zip.title') }}</h2>
            <p>{{ t('blog.sections.zip.intro') }}</p>
            <p>{{ t('blog.sections.zip.formats') }}</p>
          </section>

          <!-- Section 8: SVG -->
          <section id="svg" class="content-section">
            <h2><span class="section-number">8</span> {{ t('blog.sections.svg.title') }}</h2>
            <p>{{ t('blog.sections.svg.intro') }}</p>
            <p>{{ t('blog.sections.svg.modes') }}</p>
          </section>

          <!-- Section 9: Save -->
          <section id="save" class="content-section">
            <h2><span class="section-number">9</span> {{ t('blog.sections.save.title') }}</h2>
            <p>{{ t('blog.sections.save.intro') }}</p>
            <p>{{ t('blog.sections.save.formats') }}</p>
          </section>

          <!-- Section 10: UI -->
          <section id="ui" class="content-section">
            <h2><span class="section-number">10</span> {{ t('blog.sections.ui.title') }}</h2>
            <p>{{ t('blog.sections.ui.intro') }}</p>
            <ul>
              <li>{{ t('blog.sections.ui.features.grid') }}</li>
              <li>{{ t('blog.sections.ui.features.buttons') }}</li>
              <li>{{ t('blog.sections.ui.features.statusbar') }}</li>
              <li>{{ t('blog.sections.ui.features.toasts') }}</li>
            </ul>
          </section>

          <!-- Section 11: i18n -->
          <section id="i18n" class="content-section">
            <h2><span class="section-number">11</span> {{ t('blog.sections.i18n.title') }}</h2>
            <p>{{ t('blog.sections.i18n.intro') }}</p>
            <p>{{ t('blog.sections.i18n.languages') }}</p>
          </section>

          <!-- Section 12: Theme -->
          <section id="theme" class="content-section">
            <h2><span class="section-number">12</span> {{ t('blog.sections.theme.title') }}</h2>
            <p>{{ t('blog.sections.theme.intro') }}</p>
            <p>{{ t('blog.sections.theme.features') }}</p>
          </section>

          <!-- Section 13: Shortcuts -->
          <section id="shortcuts" class="content-section">
            <h2><span class="section-number">13</span> {{ t('blog.sections.shortcuts.title') }}</h2>
            <p>{{ t('blog.sections.shortcuts.intro') }}</p>
            <table class="shortcuts-table">
              <thead>
                <tr>
                  <th>{{ t('blog.sections.shortcuts.key') }}</th>
                  <th>{{ t('blog.sections.shortcuts.action') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><kbd>Ctrl</kbd> + <kbd>A</kbd></td>
                  <td>{{ t('blog.sections.shortcuts.selectAll') }}</td>
                </tr>
                <tr>
                  <td><kbd>Delete</kbd></td>
                  <td>{{ t('blog.sections.shortcuts.delete') }}</td>
                </tr>
                <tr>
                  <td><kbd>Escape</kbd></td>
                  <td>{{ t('blog.sections.shortcuts.deselect') }}</td>
                </tr>
              </tbody>
            </table>
          </section>

          <!-- Section 14: Privacy -->
          <section id="privacy" class="content-section">
            <h2><span class="section-number">14</span> {{ t('blog.sections.privacy.title') }}</h2>
            <div class="privacy-highlight">
              <i class="fa-solid fa-shield-halved"></i>
              <div>
                <h4>{{ t('blog.sections.privacy.local.title') }}</h4>
                <p>{{ t('blog.sections.privacy.local.text') }}</p>
              </div>
            </div>
            <ul>
              <li>{{ t('blog.sections.privacy.points.noUpload') }}</li>
              <li>{{ t('blog.sections.privacy.points.noTracking') }}</li>
              <li>{{ t('blog.sections.privacy.points.noPersist') }}</li>
              <li>{{ t('blog.sections.privacy.points.secure') }}</li>
            </ul>
          </section>

          <!-- Conclusion -->
          <section class="conclusion-section">
            <h2>{{ t('blog.conclusion.title') }}</h2>
            <p>{{ t('blog.conclusion.text') }}</p>
            <div class="benefits-list">
              <div class="benefit-item"><i class="fa-solid fa-check"></i> {{ t('blog.conclusion.benefits.local') }}</div>
              <div class="benefit-item"><i class="fa-solid fa-check"></i> {{ t('blog.conclusion.benefits.batch') }}</div>
              <div class="benefit-item"><i class="fa-solid fa-check"></i> {{ t('blog.conclusion.benefits.pdf') }}</div>
              <div class="benefit-item"><i class="fa-solid fa-check"></i> {{ t('blog.conclusion.benefits.formats') }}</div>
              <div class="benefit-item"><i class="fa-solid fa-check"></i> {{ t('blog.conclusion.benefits.ui') }}</div>
              <div class="benefit-item"><i class="fa-solid fa-check"></i> {{ t('blog.conclusion.benefits.free') }}</div>
            </div>
            <button class="cta-button" @click="goToApp">
              <i class="fa-solid fa-rocket"></i>
              {{ t('landing.hero.cta') }}
            </button>
          </section>
        </article>
      </div>
    </main>
  </div>
</template>

<style scoped>
.blog-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--body-gradient);
  background-attachment: fixed;
}

/* Navigation */
.blog-nav {
  position: sticky;
  top: 0;
  z-index: 100;
  backdrop-filter: saturate(1.8) blur(24px);
  background: var(--glass-bg);
  border-bottom: 1px solid var(--glass-border);
}

.nav-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: var(--space-3) var(--space-5);
  display: flex;
  justify-content: center;
  align-items: center;
  gap: var(--space-4);
}

.nav-links {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.nav-link {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-4);
  border-radius: var(--radius-lg);
  border: 1px solid transparent;
  background: transparent;
  color: var(--text);
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s var(--ease-spring);
}

.nav-link:hover {
  background: var(--btn);
  border-color: var(--border-color);
}

.nav-link.primary {
  background: var(--accent);
  color: var(--accent-text);
}

.nav-link.primary:hover {
  background: var(--accent-hover);
  box-shadow: 0 4px 12px color-mix(in oklab, var(--accent) 30%, transparent);
}

/* Hero */
.blog-hero {
  padding-top: var(--space-7);
  padding-bottom: var(--space-6);
  text-align: center;
  background: var(--panel);
  border-bottom: 1px solid var(--glass-border);
}

.hero-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 0 var(--space-5);
}

.blog-hero h1 {
  font-size: clamp(1.8rem, 4vw, 2.5rem);
  font-weight: 800;
  margin: 0 0 var(--space-4);
  background: linear-gradient(135deg, var(--text), var(--accent));
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.hero-subtitle {
  font-size: 1.1rem;
  color: var(--muted);
  line-height: 1.6;
}

/* Content Layout */
.blog-content {
  flex: 1;
  padding: var(--space-6) 0;
}

.blog-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 var(--space-5);
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: var(--space-6);
}

/* TOC */
.toc {
  position: sticky;
  top: var(--space-4);
  height: fit-content;
  background: var(--glass-bg);
  backdrop-filter: blur(16px);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-xl);
  padding: var(--space-4);
}

.toc h3 {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--muted);
  margin: 0 0 var(--space-3);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.toc nav {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.toc-link {
  text-align: left;
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-md);
  border: none;
  background: transparent;
  color: var(--text);
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s var(--ease-smooth);
}

.toc-link:hover {
  background: var(--btn);
  color: var(--accent);
}

/* Article */
.article {
  background: var(--glass-bg);
  backdrop-filter: blur(16px);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-2xl);
  padding: var(--space-6);
}

.intro-section {
  font-size: 1.1rem;
  line-height: 1.8;
  color: var(--text);
  padding-bottom: var(--space-6);
  border-bottom: 1px solid var(--glass-border);
  margin-bottom: var(--space-6);
}

.intro-section p { margin: 0 0 var(--space-4); }
.intro-section p:last-child { margin-bottom: 0; }

.content-section {
  padding-bottom: var(--space-6);
  margin-bottom: var(--space-6);
  border-bottom: 1px solid var(--glass-border);
}

.content-section h2 {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text);
  margin: 0 0 var(--space-4);
}

.section-number {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--accent);
  color: var(--accent-text);
  font-size: 0.9rem;
  font-weight: 700;
}

.content-section h3 {
  font-size: 1.15rem;
  font-weight: 600;
  color: var(--text);
  margin: var(--space-4) 0 var(--space-3);
}

.content-section p {
  color: var(--text);
  line-height: 1.7;
  margin: 0 0 var(--space-4);
}

.content-section ul {
  margin: 0 0 var(--space-4);
  padding-left: var(--space-5);
}

.content-section li {
  color: var(--text);
  line-height: 1.7;
  margin-bottom: var(--space-2);
}

/* Feature Grid */
.feature-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--space-4);
  margin-top: var(--space-4);
}

.feature-box {
  padding: var(--space-4);
  background: var(--btn);
  border-radius: var(--radius-lg);
  border: 1px solid var(--glass-border);
  text-align: center;
}

.feature-box.accent {
  background: color-mix(in oklab, var(--accent) 8%, transparent);
  border-color: color-mix(in oklab, var(--accent) 20%, transparent);
}

.feature-box i {
  font-size: 1.5rem;
  color: var(--accent);
  margin-bottom: var(--space-2);
}

.feature-box h4 {
  font-size: 1rem;
  font-weight: 600;
  color: var(--text);
  margin: 0 0 var(--space-2);
}

.feature-box p {
  font-size: 0.9rem;
  color: var(--muted);
  margin: 0;
  line-height: 1.5;
}

/* Filter List */
.filter-list {
  display: grid;
  gap: var(--space-3);
}

.filter-item {
  padding: var(--space-4);
  background: var(--btn);
  border-radius: var(--radius-lg);
}

.filter-item h4 {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: 1rem;
  margin: 0 0 var(--space-2);
  color: var(--text);
}

.filter-item h4 i { color: var(--accent); }
.filter-item p { margin: 0; color: var(--muted); font-size: 0.9rem; }

/* Highlight Box */
.highlight-box {
  padding: var(--space-4);
  background: color-mix(in oklab, var(--accent) 6%, transparent);
  border-left: 4px solid var(--accent);
  border-radius: 0 var(--radius-lg) var(--radius-lg) 0;
  margin-bottom: var(--space-4);
}

.highlight-box h4 {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin: 0 0 var(--space-2);
  color: var(--text);
}

.highlight-box h4 i { color: var(--accent); }
.highlight-box p { margin: 0; color: var(--text); line-height: 1.6; }

/* Privacy Highlight */
.privacy-highlight {
  display: flex;
  align-items: flex-start;
  gap: var(--space-4);
  padding: var(--space-5);
  background: linear-gradient(135deg,
    color-mix(in oklab, var(--green) 10%, transparent),
    color-mix(in oklab, var(--accent) 5%, transparent));
  border-radius: var(--radius-xl);
  margin-bottom: var(--space-4);
}

.privacy-highlight > i {
  font-size: 2rem;
  color: var(--green);
}

.privacy-highlight h4 {
  margin: 0 0 var(--space-2);
  color: var(--text);
}

.privacy-highlight p {
  margin: 0;
  color: var(--muted);
}

/* Shortcuts Table */
.shortcuts-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: var(--space-4);
}

.shortcuts-table th,
.shortcuts-table td {
  padding: var(--space-3);
  text-align: left;
  border-bottom: 1px solid var(--glass-border);
}

.shortcuts-table th {
  font-weight: 600;
  color: var(--muted);
  font-size: 0.85rem;
  text-transform: uppercase;
}

.shortcuts-table td { color: var(--text); }

kbd {
  display: inline-block;
  padding: 2px 8px;
  font-family: var(--font-mono);
  font-size: 0.85rem;
  background: var(--btn);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  box-shadow: 0 2px 0 var(--border-color);
}

/* Conclusion */
.conclusion-section {
  text-align: center;
  padding-top: var(--space-6);
}

.conclusion-section h2 {
  font-size: 1.5rem;
  margin: 0 0 var(--space-4);
  color: var(--text);
}

.conclusion-section > p {
  color: var(--muted);
  max-width: 600px;
  margin: 0 auto var(--space-5);
  line-height: 1.7;
}

.benefits-list {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: var(--space-3);
  margin-bottom: var(--space-5);
}

.benefit-item {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-4);
  background: var(--btn);
  border-radius: var(--radius-lg);
  font-size: 0.9rem;
  color: var(--text);
}

.benefit-item i { color: var(--green); }

.cta-button {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-4) var(--space-6);
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--accent-text);
  background: linear-gradient(135deg, var(--accent), color-mix(in oklab, var(--accent) 80%, var(--secondary)));
  border: none;
  border-radius: var(--radius-xl);
  cursor: pointer;
  transition: all 0.3s var(--ease-spring);
  box-shadow: 0 4px 16px color-mix(in oklab, var(--accent) 30%, transparent);
}

.cta-button:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 24px color-mix(in oklab, var(--accent) 40%, transparent);
}

/* Responsive */
@media (max-width: 900px) {
  .blog-container {
    grid-template-columns: 1fr;
  }

  .toc {
    position: static;
    order: -1;
  }

  .toc nav {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: var(--space-2);
  }
}

@media (max-width: 768px) {
  .nav-container { flex-wrap: wrap; }

  .nav-links {
    order: 3;
    width: 100%;
    justify-content: center;
    margin-top: var(--space-3);
    padding-top: var(--space-3);
    border-top: 1px solid var(--glass-border);
  }

  .article { padding: var(--space-4); }

  .feature-grid { grid-template-columns: 1fr; }

  .privacy-highlight { flex-direction: column; text-align: center; align-items: center; }
}

@media (max-width: 480px) {
  .nav-container {
    padding: var(--space-2) var(--space-3);
  }

  .nav-link {
    padding: var(--space-2) var(--space-3);
    font-size: 0.85rem;
  }

  .hero-container {
    padding: 0 var(--space-3);
  }

  .blog-container {
    padding: 0 var(--space-3);
  }

  .article {
    padding: var(--space-3);
  }

  .toc {
    padding: var(--space-3);
  }

  .toc nav {
    grid-template-columns: 1fr;
  }

  .content-section h2 {
    font-size: 1.2rem;
  }

  .cta-button {
    width: 100%;
    justify-content: center;
    padding: var(--space-3) var(--space-5);
  }

  .shortcuts-table th,
  .shortcuts-table td {
    padding: var(--space-2);
    font-size: 0.85rem;
  }
}
</style>
