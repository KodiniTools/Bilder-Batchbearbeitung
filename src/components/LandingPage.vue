<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'

const { locale, t } = useI18n()
const theme = ref<'light' | 'dark'>('light')

const setLanguage = (lang: string) => {
  locale.value = lang
  localStorage.setItem('language', lang)
}

const applyTheme = (newTheme: 'light' | 'dark') => {
  theme.value = newTheme
  document.documentElement.dataset.theme = newTheme
  localStorage.setItem('theme', newTheme)
}

const toggleTheme = () => {
  applyTheme(theme.value === 'dark' ? 'light' : 'dark')
}

const scrollToApp = () => {
  const appSection = document.getElementById('app-section')
  if (appSection) {
    appSection.scrollIntoView({ behavior: 'smooth' })
  }
}

onMounted(() => {
  const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  applyTheme(savedTheme || (prefersDark ? 'dark' : 'light'))

  const savedLang = localStorage.getItem('language')
  if (savedLang) {
    locale.value = savedLang
  }
})
</script>

<template>
  <div class="landing-page">
    <!-- Navigation -->
    <nav class="landing-nav">
      <div class="nav-container">
        <div class="nav-brand">
          <i class="fa-solid fa-images"></i>
          <span>{{ t('landing.brand') }}</span>
        </div>
        <div class="nav-actions">
          <button
            class="lang-btn"
            :class="{ active: locale === 'de' }"
            @click="setLanguage('de')"
            :title="t('header.langDE')"
          >
            DE
          </button>
          <button
            class="lang-btn"
            :class="{ active: locale === 'en' }"
            @click="setLanguage('en')"
            :title="t('header.langEN')"
          >
            EN
          </button>
          <button
            class="theme-btn"
            @click="toggleTheme"
            :title="t('header.themeToggle')"
          >
            <i v-if="theme === 'dark'" class="fa-solid fa-sun"></i>
            <i v-else class="fa-solid fa-moon"></i>
          </button>
        </div>
      </div>
    </nav>

    <!-- Hero Section -->
    <section class="hero-section">
      <div class="hero-container">
        <div class="hero-content">
          <h1 class="hero-title">{{ t('landing.hero.title') }}</h1>
          <p class="hero-subtitle">{{ t('landing.hero.subtitle') }}</p>
          <button class="hero-cta" @click="scrollToApp">
            <i class="fa-solid fa-rocket"></i>
            {{ t('landing.hero.cta') }}
          </button>
        </div>

        <!-- Feature Cards Grid -->
        <div class="feature-grid">
          <!-- Card 1: Privacy -->
          <div class="feature-card">
            <div class="feature-icon privacy">
              <i class="fa-solid fa-shield-halved"></i>
            </div>
            <h3 class="feature-title">{{ t('landing.features.privacy.title') }}</h3>
            <p class="feature-description">{{ t('landing.features.privacy.description') }}</p>
            <ul class="feature-list">
              <li><i class="fa-solid fa-check"></i> {{ t('landing.features.privacy.point1') }}</li>
              <li><i class="fa-solid fa-check"></i> {{ t('landing.features.privacy.point2') }}</li>
              <li><i class="fa-solid fa-check"></i> {{ t('landing.features.privacy.point3') }}</li>
            </ul>
          </div>

          <!-- Card 2: Batch Operations -->
          <div class="feature-card">
            <div class="feature-icon batch">
              <i class="fa-solid fa-layer-group"></i>
            </div>
            <h3 class="feature-title">{{ t('landing.features.batch.title') }}</h3>
            <p class="feature-description">{{ t('landing.features.batch.description') }}</p>
            <ul class="feature-list">
              <li><i class="fa-solid fa-check"></i> {{ t('landing.features.batch.point1') }}</li>
              <li><i class="fa-solid fa-check"></i> {{ t('landing.features.batch.point2') }}</li>
              <li><i class="fa-solid fa-check"></i> {{ t('landing.features.batch.point3') }}</li>
            </ul>
          </div>

          <!-- Card 3: Export Formats -->
          <div class="feature-card">
            <div class="feature-icon export">
              <i class="fa-solid fa-file-export"></i>
            </div>
            <h3 class="feature-title">{{ t('landing.features.export.title') }}</h3>
            <p class="feature-description">{{ t('landing.features.export.description') }}</p>
            <ul class="feature-list">
              <li><i class="fa-solid fa-check"></i> {{ t('landing.features.export.point1') }}</li>
              <li><i class="fa-solid fa-check"></i> {{ t('landing.features.export.point2') }}</li>
              <li><i class="fa-solid fa-check"></i> {{ t('landing.features.export.point3') }}</li>
            </ul>
          </div>
        </div>
      </div>
    </section>

    <!-- Features Detail Section -->
    <section class="details-section">
      <div class="details-container">
        <h2 class="section-title">{{ t('landing.details.title') }}</h2>

        <div class="details-grid">
          <div class="detail-item">
            <i class="fa-solid fa-crop"></i>
            <h4>{{ t('landing.details.crop.title') }}</h4>
            <p>{{ t('landing.details.crop.text') }}</p>
          </div>
          <div class="detail-item">
            <i class="fa-solid fa-sliders"></i>
            <h4>{{ t('landing.details.filters.title') }}</h4>
            <p>{{ t('landing.details.filters.text') }}</p>
          </div>
          <div class="detail-item">
            <i class="fa-solid fa-rotate"></i>
            <h4>{{ t('landing.details.transform.title') }}</h4>
            <p>{{ t('landing.details.transform.text') }}</p>
          </div>
          <div class="detail-item">
            <i class="fa-solid fa-file-pdf"></i>
            <h4>{{ t('landing.details.pdf.title') }}</h4>
            <p>{{ t('landing.details.pdf.text') }}</p>
          </div>
          <div class="detail-item">
            <i class="fa-solid fa-bezier-curve"></i>
            <h4>{{ t('landing.details.svg.title') }}</h4>
            <p>{{ t('landing.details.svg.text') }}</p>
          </div>
          <div class="detail-item">
            <i class="fa-solid fa-language"></i>
            <h4>{{ t('landing.details.i18n.title') }}</h4>
            <p>{{ t('landing.details.i18n.text') }}</p>
          </div>
        </div>
      </div>
    </section>

  </div>
</template>

<style scoped>
.landing-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

/* Navigation */
.landing-nav {
  position: fixed;
  top: var(--global-nav-height, 0);
  left: 0;
  right: 0;
  z-index: 100;
  backdrop-filter: saturate(1.8) blur(24px);
  background: var(--glass-bg);
  border-bottom: 1px solid var(--glass-border);
  transition: all 0.3s var(--ease-smooth);
}

.nav-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: var(--space-3) var(--space-5);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.nav-brand {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-weight: 700;
  font-size: 1.1rem;
  color: var(--text);
}

.nav-brand i {
  color: var(--accent);
  font-size: 1.3rem;
}

.nav-actions {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.lang-btn,
.theme-btn {
  display: inline-grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 1px solid transparent;
  background: transparent;
  color: var(--muted);
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s var(--ease-spring);
}

.lang-btn:hover,
.theme-btn:hover {
  color: var(--text);
  background: var(--btn);
  border-color: var(--border-color);
  transform: scale(1.05);
}

.lang-btn.active {
  background: var(--accent);
  color: var(--accent-text);
  box-shadow: 0 4px 12px color-mix(in oklab, var(--accent) 25%, transparent);
}

.theme-btn {
  color: var(--accent);
}

.theme-btn:hover {
  background: var(--accent);
  color: var(--accent-text);
}

/* Hero Section */
.hero-section {
  padding-top: calc(80px + var(--space-7));
  padding-bottom: var(--space-7);
  background: var(--body-gradient);
  background-attachment: fixed;
}

.hero-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 var(--space-5);
}

.hero-content {
  text-align: center;
  margin-bottom: var(--space-7);
}

.hero-title {
  font-size: clamp(2rem, 5vw, 3.5rem);
  font-weight: 800;
  line-height: 1.1;
  margin: 0 0 var(--space-4);
  background: linear-gradient(135deg, var(--text) 0%, var(--accent) 50%, var(--secondary) 100%);
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.hero-subtitle {
  font-size: clamp(1rem, 2vw, 1.25rem);
  color: var(--muted);
  max-width: 600px;
  margin: 0 auto var(--space-5);
  line-height: 1.6;
}

.hero-cta {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-4) var(--space-6);
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--accent-text);
  background: linear-gradient(135deg, var(--accent) 0%, color-mix(in oklab, var(--accent) 80%, var(--secondary)) 100%);
  border: none;
  border-radius: var(--radius-xl);
  cursor: pointer;
  transition: all 0.3s var(--ease-spring);
  box-shadow:
    0 4px 16px color-mix(in oklab, var(--accent) 30%, transparent),
    inset 0 1px 0 color-mix(in oklab, white 20%, transparent);
}

.hero-cta:hover {
  transform: translateY(-3px) scale(1.02);
  box-shadow:
    0 8px 24px color-mix(in oklab, var(--accent) 40%, transparent),
    inset 0 1px 0 color-mix(in oklab, white 20%, transparent);
}

.hero-cta:active {
  transform: translateY(-1px);
}

/* Feature Cards Grid */
.feature-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: var(--space-5);
  margin-top: var(--space-6);
}

.feature-card {
  background: var(--glass-bg);
  backdrop-filter: blur(16px);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-2xl);
  padding: var(--space-6);
  transition: all 0.4s var(--ease-spring);
  position: relative;
  overflow: hidden;
}

.feature-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, var(--accent), var(--secondary));
  opacity: 0;
  transition: opacity 0.3s var(--ease-smooth);
}

.feature-card:hover {
  transform: translateY(-8px);
  box-shadow: var(--surface-hover);
  border-color: color-mix(in oklab, var(--accent) 30%, var(--glass-border));
}

.feature-card:hover::before {
  opacity: 1;
}

.feature-icon {
  width: 64px;
  height: 64px;
  border-radius: var(--radius-xl);
  display: grid;
  place-items: center;
  font-size: 1.75rem;
  margin-bottom: var(--space-4);
  transition: all 0.3s var(--ease-spring);
}

.feature-icon.privacy {
  background: linear-gradient(135deg,
    color-mix(in oklab, var(--green) 15%, transparent),
    color-mix(in oklab, var(--green) 5%, transparent));
  color: var(--green);
}

.feature-icon.batch {
  background: linear-gradient(135deg,
    color-mix(in oklab, var(--accent) 15%, transparent),
    color-mix(in oklab, var(--accent) 5%, transparent));
  color: var(--accent);
}

.feature-icon.export {
  background: linear-gradient(135deg,
    color-mix(in oklab, var(--purple) 15%, transparent),
    color-mix(in oklab, var(--purple) 5%, transparent));
  color: var(--purple);
}

.feature-card:hover .feature-icon {
  transform: scale(1.1) rotate(-5deg);
}

.feature-title {
  font-size: 1.25rem;
  font-weight: 700;
  margin: 0 0 var(--space-3);
  color: var(--text);
}

.feature-description {
  color: var(--muted);
  font-size: 0.95rem;
  line-height: 1.6;
  margin: 0 0 var(--space-4);
}

.feature-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.feature-list li {
  display: flex;
  align-items: flex-start;
  gap: var(--space-2);
  padding: var(--space-2) 0;
  font-size: 0.9rem;
  color: var(--text);
  border-top: 1px solid color-mix(in oklab, var(--border-color) 30%, transparent);
}

.feature-list li:first-child {
  border-top: none;
}

.feature-list li i {
  color: var(--green);
  font-size: 0.8rem;
  margin-top: 3px;
  flex-shrink: 0;
}

/* Details Section */
.details-section {
  padding: var(--space-7) 0;
  background: var(--panel);
  border-top: 1px solid var(--glass-border);
  border-bottom: 1px solid var(--glass-border);
}

.details-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 var(--space-5);
}

.section-title {
  text-align: center;
  font-size: clamp(1.5rem, 3vw, 2rem);
  font-weight: 700;
  margin: 0 0 var(--space-6);
  background: linear-gradient(135deg, var(--text), var(--accent));
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.details-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: var(--space-5);
}

.detail-item {
  text-align: center;
  padding: var(--space-5);
  border-radius: var(--radius-xl);
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  transition: all 0.3s var(--ease-smooth);
}

.detail-item:hover {
  transform: translateY(-4px);
  box-shadow: var(--surface-elevation);
  border-color: color-mix(in oklab, var(--accent) 25%, var(--glass-border));
}

.detail-item i {
  font-size: 2rem;
  color: var(--accent);
  margin-bottom: var(--space-3);
}

.detail-item h4 {
  font-size: 1.1rem;
  font-weight: 600;
  margin: 0 0 var(--space-2);
  color: var(--text);
}

.detail-item p {
  font-size: 0.9rem;
  color: var(--muted);
  margin: 0;
  line-height: 1.5;
}

/* Responsive */
@media (max-width: 768px) {
  .hero-section {
    padding-top: calc(70px + var(--space-6));
  }

  .feature-grid {
    grid-template-columns: 1fr;
    gap: var(--space-4);
  }

  .feature-card {
    padding: var(--space-5);
  }

  .details-grid {
    grid-template-columns: 1fr;
  }

  .nav-brand span {
    display: none;
  }
}

@media (max-width: 480px) {
  .hero-cta {
    width: 100%;
    justify-content: center;
  }

  .lang-btn,
  .theme-btn {
    width: 36px;
    height: 36px;
    font-size: 0.8rem;
  }
}
</style>
