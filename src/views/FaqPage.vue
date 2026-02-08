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
  <div class="faq-page">
    <!-- Navigation -->
    <nav class="faq-nav">
      <div class="nav-container">
        <button class="nav-brand" @click="goToHome">
          <i class="fa-solid fa-images"></i>
          <span>{{ t('landing.brand') }}</span>
        </button>
        <div class="nav-links">
          <button class="nav-link" @click="goToHome">
            <i class="fa-solid fa-home"></i>
            {{ t('landing.nav.home') }}
          </button>
          <button class="nav-link primary" @click="goToApp">
            <i class="fa-solid fa-rocket"></i>
            {{ t('landing.nav.app') }}
          </button>
        </div>
        <!-- Theme & Language Switcher sind jetzt in der globalen SSI Navigation -->
      </div>
    </nav>

    <!-- Main Content -->
    <main class="faq-content">
      <div class="faq-container">
        <h1 class="faq-title">{{ t('faq.title') }}</h1>

        <!-- Privacy Notice -->
        <div class="privacy-notice">
          <i class="fa-solid fa-shield-halved"></i>
          <div>
            <strong>{{ t('faq.privacy.title') }}</strong>
            <p>{{ t('faq.privacy.text') }}</p>
          </div>
        </div>

        <!-- FAQ List -->
        <div class="faq-list">
          <details v-for="i in 8" :key="i" class="faq-item">
            <summary>{{ t(`faq.q${i}.question`) }}</summary>
            <p v-html="t(`faq.q${i}.answer`)"></p>
          </details>
        </div>

        <!-- CTA -->
        <div class="faq-cta">
          <h2>{{ t('landing.app.title') }}</h2>
          <p>{{ t('landing.app.subtitle') }}</p>
          <button class="cta-button" @click="goToApp">
            <i class="fa-solid fa-rocket"></i>
            {{ t('landing.hero.cta') }}
          </button>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
.faq-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--body-gradient);
  background-attachment: fixed;
}

/* Navigation */
.faq-nav {
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
  background: none;
  border: none;
  cursor: pointer;
  transition: all 0.3s var(--ease-spring);
}

.nav-brand:hover {
  color: var(--accent);
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

.nav-link.primary {
  background: var(--accent);
  color: var(--accent-text);
  border-color: var(--accent);
}

.nav-link.primary:hover {
  background: var(--accent-hover);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px color-mix(in oklab, var(--accent) 30%, transparent);
}

.nav-link i {
  font-size: 0.85rem;
}

/* Main Content */
.faq-content {
  flex: 1;
  padding-top: var(--space-7);
  padding-bottom: var(--space-7);
}

.faq-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 0 var(--space-5);
}

.faq-title {
  text-align: center;
  font-size: clamp(1.8rem, 4vw, 2.5rem);
  font-weight: 800;
  margin: 0 0 var(--space-6);
  background: linear-gradient(135deg, var(--text), var(--accent));
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

/* Privacy Notice */
.privacy-notice {
  display: flex;
  align-items: flex-start;
  gap: var(--space-4);
  padding: var(--space-5);
  background: linear-gradient(135deg,
    color-mix(in oklab, var(--accent) 8%, transparent) 0%,
    color-mix(in oklab, var(--green) 6%, transparent) 100%);
  border-radius: var(--radius-2xl);
  border: 1px solid color-mix(in oklab, var(--accent) 25%, transparent);
  margin-bottom: var(--space-6);
}

.privacy-notice > i {
  font-size: 2rem;
  color: var(--accent);
  margin-top: 4px;
  flex-shrink: 0;
}

.privacy-notice strong {
  display: block;
  margin-bottom: var(--space-2);
  color: var(--text);
  font-size: 1.1rem;
}

.privacy-notice p {
  margin: 0;
  color: var(--muted);
  font-size: 0.95rem;
  line-height: 1.6;
}

/* FAQ List */
.faq-list {
  background: var(--glass-bg);
  backdrop-filter: blur(16px);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-2xl);
  overflow: hidden;
}

.faq-item {
  border-bottom: 1px solid var(--glass-border);
  transition: all 0.3s var(--ease-smooth);
}

.faq-item:last-child {
  border-bottom: none;
}

.faq-item summary {
  font-weight: 600;
  cursor: pointer;
  list-style: none;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-5);
  transition: all 0.3s var(--ease-smooth);
  color: var(--text);
}

.faq-item summary:hover {
  background: color-mix(in oklab, var(--accent) 5%, transparent);
}

.faq-item summary::after {
  content: '+';
  font-size: 1.5rem;
  font-weight: 300;
  color: var(--accent);
  transition: all 0.3s var(--ease-spring);
  width: 28px;
  height: 28px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: color-mix(in oklab, var(--accent) 10%, transparent);
  flex-shrink: 0;
}

.faq-item[open] summary::after {
  transform: rotate(45deg);
  background: var(--accent);
  color: var(--accent-text);
}

.faq-item p {
  margin: 0;
  padding: 0 var(--space-5) var(--space-5);
  color: var(--muted);
  line-height: 1.7;
  padding-left: var(--space-5);
  border-left: 3px solid color-mix(in oklab, var(--accent) 20%, transparent);
  margin-left: var(--space-5);
  margin-right: var(--space-5);
  margin-bottom: var(--space-5);
}

/* CTA */
.faq-cta {
  margin-top: var(--space-7);
  text-align: center;
  padding: var(--space-6);
  background: var(--panel);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-2xl);
}

.faq-cta h2 {
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0 0 var(--space-3);
  color: var(--text);
}

.faq-cta p {
  font-size: 1rem;
  color: var(--muted);
  margin: 0 0 var(--space-5);
}

.cta-button {
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

.cta-button:hover {
  transform: translateY(-3px) scale(1.02);
  box-shadow:
    0 8px 24px color-mix(in oklab, var(--accent) 40%, transparent),
    inset 0 1px 0 color-mix(in oklab, white 20%, transparent);
}

/* Responsive */
@media (max-width: 768px) {
  .faq-content {
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

  .nav-brand span {
    display: none;
  }

  .privacy-notice {
    flex-direction: column;
    text-align: center;
    align-items: center;
  }

  .faq-item summary {
    padding: var(--space-4);
  }

  .faq-item p {
    padding: 0 var(--space-4) var(--space-4);
    margin-left: var(--space-4);
    margin-right: var(--space-4);
    margin-bottom: var(--space-4);
  }
}

@media (max-width: 480px) {
  .nav-link {
    padding: var(--space-2) var(--space-3);
    font-size: 0.85rem;
  }

  .cta-button {
    width: 100%;
    justify-content: center;
  }
}
</style>
