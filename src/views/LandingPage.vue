<script setup lang="ts">
import { onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'

const { locale, t } = useI18n()
const router = useRouter()

const goToApp = () => {
  router.push('/app')
}

const goToFaq = () => {
  router.push('/faq')
}

const goToBlog = () => {
  router.push('/blog')
}

const goToLearn = () => {
  router.push('/learn')
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
        <div class="nav-links">
          <button class="nav-link" @click="goToApp">
            <i class="fa-solid fa-rocket"></i>
            {{ t('landing.nav.app') }}
          </button>
          <button class="nav-link" @click="goToBlog">
            <i class="fa-solid fa-book"></i>
            {{ t('landing.nav.blog') }}
          </button>
          <button class="nav-link" @click="goToLearn">
            <i class="fa-solid fa-graduation-cap"></i>
            {{ t('landing.nav.learn') }}
          </button>
          <button class="nav-link" @click="goToFaq">
            <i class="fa-solid fa-circle-question"></i>
            {{ t('landing.nav.faq') }}
          </button>
        </div>
        <!-- Theme & Language Switcher sind jetzt in der globalen SSI Navigation -->
      </div>
    </nav>

    <!-- Hero Section -->
    <section class="hero-section">
      <div class="hero-container">
        <div class="hero-content">
          <h1 class="hero-title">{{ t('landing.hero.title') }}</h1>
          <p class="hero-subtitle">{{ t('landing.hero.subtitle') }}</p>
          <button class="hero-cta" @click="goToApp">
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

    <!-- Donate Section -->
    <section class="donate-section">
      <div class="donate-container">
        <h2>{{ t('donate.title') }}</h2>
        <p class="donate-text">{{ t('donate.text') }}</p>
        <form action="https://www.paypal.com/donate" method="post" target="_top" class="paypal-form">
          <input type="hidden" name="hosted_button_id" value="8RGLGQ2BFMHU6" />
          <button type="submit" class="paypal-button">
            <i class="fa-brands fa-paypal"></i>
            {{ t('donate.button') }}
          </button>
        </form>
      </div>
    </section>

    <!-- Footer CTA -->
    <section class="footer-cta">
      <div class="footer-cta-container">
        <h2>{{ t('landing.app.title') }}</h2>
        <p>{{ t('landing.app.subtitle') }}</p>
        <button class="hero-cta" @click="goToApp">
          <i class="fa-solid fa-arrow-right"></i>
          {{ t('landing.hero.cta') }}
        </button>
      </div>
    </section>
  </div>
</template>

<style scoped>
.landing-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--body-gradient);
  background-attachment: fixed;
}

/* Navigation */
.landing-nav {
  position: sticky;
  top: 0;
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
  gap: var(--space-4);
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
  transform: translateY(-1px);
}

.nav-link i {
  font-size: 0.85rem;
  color: var(--accent);
}

/* Hero Section */
.hero-section {
  padding-top: var(--space-7);
  padding-bottom: var(--space-7);
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

/* Donate Section */
.donate-section {
  padding: var(--space-7) 0;
}

.donate-container {
  max-width: 800px;
  margin: 0 auto;
  padding: var(--space-6) var(--space-5);
  background: linear-gradient(135deg,
    color-mix(in oklab, var(--accent) 8%, transparent) 0%,
    color-mix(in oklab, var(--accent) 3%, transparent) 100%);
  border: 1px solid color-mix(in oklab, var(--accent) 25%, transparent);
  border-radius: var(--radius-2xl);
  text-align: center;
}

.donate-container h2 {
  margin: 0 0 var(--space-4);
  font-size: 1.8rem;
  font-weight: 700;
  background: linear-gradient(135deg, var(--text), var(--accent));
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.donate-text {
  margin-bottom: var(--space-5);
  color: var(--muted);
  font-size: 1.05rem;
  line-height: 1.6;
}

.paypal-form {
  display: inline-block;
}

.paypal-button {
  display: inline-flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-4) var(--space-6);
  font-size: 1.1rem;
  font-weight: 600;
  color: white;
  background: linear-gradient(135deg, #0070ba, #1f8dd6);
  border: none;
  border-radius: var(--radius-xl);
  cursor: pointer;
  transition: all 0.3s var(--ease-smooth);
  box-shadow: 0 4px 12px rgba(0, 112, 186, 0.3);
}

.paypal-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0, 112, 186, 0.4);
  background: linear-gradient(135deg, #005a94, #1a7ab8);
}

.paypal-button:active {
  transform: translateY(0);
}

.paypal-button i {
  font-size: 1.4rem;
}

/* Footer CTA */
.footer-cta {
  padding: var(--space-7) 0;
  background: var(--panel);
  border-top: 1px solid var(--glass-border);
}

.footer-cta-container {
  max-width: 600px;
  margin: 0 auto;
  padding: 0 var(--space-5);
  text-align: center;
}

.footer-cta h2 {
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0 0 var(--space-3);
  color: var(--text);
}

.footer-cta p {
  font-size: 1rem;
  color: var(--muted);
  margin: 0 0 var(--space-5);
}

/* Responsive */
@media (max-width: 768px) {
  .hero-section {
    padding-top: var(--space-6);
  }

  .nav-container {
    flex-wrap: wrap;
  }

  .nav-links {
    order: 3;
    width: 100%;
    justify-content: center;
    margin-top: var(--space-3);
    padding-top: var(--space-3);
    border-top: 1px solid var(--glass-border);
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

  .donate-container {
    padding: var(--space-5);
  }

  .donate-container h2 {
    font-size: 1.5rem;
  }
}

@media (max-width: 480px) {
  .hero-cta {
    width: 100%;
    justify-content: center;
  }

  .nav-link {
    padding: var(--space-2) var(--space-3);
    font-size: 0.85rem;
  }

  .paypal-button {
    padding: var(--space-3) var(--space-5);
    font-size: 1rem;
  }
}
</style>
