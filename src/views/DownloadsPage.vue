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
</script>

<template>
  <div class="downloads-page">
    <!-- Navigation -->
    <nav class="downloads-nav">
      <div class="nav-container">
        <div class="nav-links">
          <button class="nav-link" @click="goToHome">{{ t('landing.nav.home') }}</button>
          <button class="nav-link primary" @click="goToApp">{{ t('landing.nav.app') }}</button>
        </div>
      </div>
    </nav>

    <!-- Main Content -->
    <main class="downloads-content">
      <div class="downloads-container">
        <!-- Header -->
        <div class="downloads-header">
          <h1 class="downloads-title">{{ t('downloads.title') }}</h1>
          <p class="downloads-subtitle">{{ t('downloads.subtitle') }}</p>
        </div>

        <!-- Download Cards Grid -->
        <div class="downloads-grid">
          <!-- Installer Card -->
          <div class="download-card installer-card">
            <div class="card-icon">
              <i class="fa-solid fa-display"></i>
            </div>
            <h2 class="card-title">{{ t('downloads.installer.title') }}</h2>
            <p class="card-description">{{ t('downloads.installer.description') }}</p>

            <ul class="card-features">
              <li>
                <i class="fa-solid fa-check"></i>
                {{ t('downloads.installer.features.desktop') }}
              </li>
              <li>
                <i class="fa-solid fa-check"></i>
                {{ t('downloads.installer.features.startmenu') }}
              </li>
              <li>
                <i class="fa-solid fa-check"></i>
                {{ t('downloads.installer.features.auto') }}
              </li>
              <li>
                <i class="fa-solid fa-check"></i>
                {{ t('downloads.installer.features.registry') }}
              </li>
            </ul>

            <div class="card-meta">
              <span><i class="fa-solid fa-hard-drive"></i> {{ t('downloads.installer.size') }}</span>
              <span><i class="fa-solid fa-microchip"></i> {{ t('downloads.installer.requirements') }}</span>
            </div>

            <a
              href="https://github.com/KodiniTools/Bilder-Batchbearbeitung/releases/latest"
              target="_blank"
              rel="noopener"
              class="download-button installer-button"
            >
              <i class="fa-solid fa-download"></i>
              {{ t('downloads.installer.button') }}
            </a>
          </div>

          <!-- Portable Card -->
          <div class="download-card portable-card">
            <div class="card-icon">
              <i class="fa-solid fa-box-open"></i>
            </div>
            <h2 class="card-title">{{ t('downloads.portable.title') }}</h2>
            <p class="card-description">{{ t('downloads.portable.description') }}</p>

            <ul class="card-features">
              <li>
                <i class="fa-solid fa-check"></i>
                {{ t('downloads.portable.features.noinstall') }}
              </li>
              <li>
                <i class="fa-solid fa-check"></i>
                {{ t('downloads.portable.features.usb') }}
              </li>
              <li>
                <i class="fa-solid fa-check"></i>
                {{ t('downloads.portable.features.noAdmin') }}
              </li>
              <li>
                <i class="fa-solid fa-check"></i>
                {{ t('downloads.portable.features.clean') }}
              </li>
            </ul>

            <div class="card-meta">
              <span><i class="fa-solid fa-hard-drive"></i> {{ t('downloads.portable.size') }}</span>
              <span><i class="fa-solid fa-microchip"></i> {{ t('downloads.portable.requirements') }}</span>
            </div>

            <a
              href="https://github.com/KodiniTools/Bilder-Batchbearbeitung/releases/latest"
              target="_blank"
              rel="noopener"
              class="download-button portable-button"
            >
              <i class="fa-solid fa-file-zipper"></i>
              {{ t('downloads.portable.button') }}
            </a>
          </div>
        </div>

        <!-- Info Section -->
        <div class="downloads-info">
          <h3><i class="fa-solid fa-circle-info"></i> {{ t('downloads.info.title') }}</h3>
          <ul>
            <li>
              <i class="fa-solid fa-shield-halved"></i>
              {{ t('downloads.info.offline') }}
            </li>
            <li>
              <i class="fa-brands fa-github"></i>
              {{ t('downloads.info.source') }}
            </li>
            <li>
              <i class="fa-solid fa-globe"></i>
              {{ t('downloads.info.web') }}
            </li>
          </ul>
        </div>

        <!-- Web CTA -->
        <div class="web-cta">
          <p>{{ t('downloads.webCta') }}</p>
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
.downloads-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--body-gradient);
  background-attachment: fixed;
}

/* Navigation */
.downloads-nav {
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

/* Main Content */
.downloads-content {
  flex: 1;
  padding-top: var(--space-7);
  padding-bottom: var(--space-7);
}

.downloads-container {
  max-width: 1000px;
  margin: 0 auto;
  padding: 0 var(--space-5);
}

/* Header */
.downloads-header {
  text-align: center;
  margin-bottom: var(--space-7);
}

.downloads-title {
  font-size: clamp(1.8rem, 4vw, 2.8rem);
  font-weight: 800;
  margin: 0 0 var(--space-4);
  background: linear-gradient(135deg, var(--text), var(--accent));
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.downloads-subtitle {
  font-size: clamp(1rem, 2vw, 1.15rem);
  color: var(--muted);
  max-width: 600px;
  margin: 0 auto;
  line-height: 1.6;
}

/* Download Cards Grid */
.downloads-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-5);
  margin-bottom: var(--space-6);
}

.download-card {
  background: var(--glass-bg);
  backdrop-filter: blur(16px);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-2xl);
  padding: var(--space-6);
  display: flex;
  flex-direction: column;
  transition: all 0.4s var(--ease-spring);
  position: relative;
  overflow: hidden;
}

.download-card::before {
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

.download-card:hover {
  transform: translateY(-8px);
  box-shadow: var(--surface-hover);
  border-color: color-mix(in oklab, var(--accent) 30%, var(--glass-border));
}

.download-card:hover::before {
  opacity: 1;
}

.card-icon {
  width: 56px;
  height: 56px;
  display: grid;
  place-items: center;
  border-radius: var(--radius-xl);
  margin-bottom: var(--space-4);
  font-size: 1.5rem;
}

.installer-card .card-icon {
  background: linear-gradient(135deg,
    color-mix(in oklab, var(--accent) 15%, transparent),
    color-mix(in oklab, var(--accent) 8%, transparent));
  color: var(--accent);
}

.portable-card .card-icon {
  background: linear-gradient(135deg,
    color-mix(in oklab, var(--secondary) 15%, transparent),
    color-mix(in oklab, var(--secondary) 8%, transparent));
  color: var(--secondary);
}

.card-title {
  font-size: 1.3rem;
  font-weight: 700;
  margin: 0 0 var(--space-3);
  color: var(--text);
}

.card-description {
  color: var(--muted);
  font-size: 0.95rem;
  line-height: 1.6;
  margin: 0 0 var(--space-4);
}

.card-features {
  list-style: none;
  padding: 0;
  margin: 0 0 var(--space-4);
  flex: 1;
}

.card-features li {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) 0;
  font-size: 0.9rem;
  color: var(--text);
  border-top: 1px solid color-mix(in oklab, var(--border-color) 30%, transparent);
}

.card-features li:first-child {
  border-top: none;
}

.card-features li i {
  color: var(--accent);
  font-size: 0.8rem;
  flex-shrink: 0;
}

.card-meta {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
  margin-bottom: var(--space-4);
  padding: var(--space-3);
  background: color-mix(in oklab, var(--panel) 60%, transparent);
  border-radius: var(--radius-lg);
}

.card-meta span {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  font-size: 0.8rem;
  color: var(--muted);
}

.card-meta span i {
  font-size: 0.75rem;
}

/* Download Buttons */
.download-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  padding: var(--space-4) var(--space-5);
  font-size: 1rem;
  font-weight: 600;
  border: none;
  border-radius: var(--radius-xl);
  cursor: pointer;
  transition: all 0.3s var(--ease-spring);
  text-decoration: none;
}

.installer-button {
  color: var(--accent-text);
  background: linear-gradient(135deg, var(--accent) 0%, color-mix(in oklab, var(--accent) 80%, var(--secondary)) 100%);
  box-shadow:
    0 4px 16px color-mix(in oklab, var(--accent) 30%, transparent),
    inset 0 1px 0 color-mix(in oklab, white 20%, transparent);
}

.installer-button:hover {
  transform: translateY(-3px) scale(1.02);
  box-shadow:
    0 8px 24px color-mix(in oklab, var(--accent) 40%, transparent),
    inset 0 1px 0 color-mix(in oklab, white 20%, transparent);
}

.portable-button {
  color: var(--text);
  background: var(--glass-bg);
  border: 2px solid var(--border-color);
}

.portable-button:hover {
  transform: translateY(-3px) scale(1.02);
  border-color: var(--accent);
  box-shadow: 0 8px 24px color-mix(in oklab, var(--accent) 20%, transparent);
}

/* Info Section */
.downloads-info {
  background: linear-gradient(135deg,
    color-mix(in oklab, var(--accent) 8%, transparent) 0%,
    color-mix(in oklab, var(--green, var(--accent)) 6%, transparent) 100%);
  border: 1px solid color-mix(in oklab, var(--accent) 25%, transparent);
  border-radius: var(--radius-2xl);
  padding: var(--space-5);
  margin-bottom: var(--space-6);
}

.downloads-info h3 {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: 1.1rem;
  font-weight: 600;
  margin: 0 0 var(--space-4);
  color: var(--text);
}

.downloads-info h3 i {
  color: var(--accent);
}

.downloads-info ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.downloads-info li {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
  padding: var(--space-2) 0;
  color: var(--muted);
  font-size: 0.95rem;
  line-height: 1.6;
}

.downloads-info li i {
  color: var(--accent);
  margin-top: 4px;
  flex-shrink: 0;
  width: 18px;
  text-align: center;
}

/* Web CTA */
.web-cta {
  text-align: center;
  padding: var(--space-5);
  background: var(--panel);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-2xl);
}

.web-cta p {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text);
  margin: 0 0 var(--space-4);
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
  .downloads-content {
    padding-top: var(--space-6);
  }

  .downloads-grid {
    grid-template-columns: 1fr;
    gap: var(--space-4);
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
}

@media (max-width: 480px) {
  .nav-container {
    padding: var(--space-2) var(--space-3);
  }

  .nav-link {
    padding: var(--space-2) var(--space-3);
    font-size: 0.85rem;
  }

  .downloads-container {
    padding: 0 var(--space-3);
  }

  .downloads-content {
    padding-top: var(--space-5);
    padding-bottom: var(--space-5);
  }

  .download-card {
    padding: var(--space-4);
  }

  .downloads-info {
    padding: var(--space-4);
  }

  .web-cta {
    padding: var(--space-4);
  }

  .cta-button {
    width: 100%;
    justify-content: center;
    padding: var(--space-3) var(--space-5);
  }

  .download-button {
    width: 100%;
    padding: var(--space-3) var(--space-4);
  }
}
</style>
