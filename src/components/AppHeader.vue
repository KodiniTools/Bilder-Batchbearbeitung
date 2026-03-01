<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'

const router = useRouter()
const { locale, t } = useI18n()

const isElectron = !!(window as any).electronAPI?.isElectron
const theme = ref<'light' | 'dark'>('light')

const goHome = () => {
  router.push('/')
}

const setLanguage = (lang: string) => {
  locale.value = lang
  localStorage.setItem('locale', lang)
}

const toggleTheme = () => {
  const newTheme = theme.value === 'dark' ? 'light' : 'dark'
  theme.value = newTheme
  document.documentElement.dataset.theme = newTheme
  localStorage.setItem('theme', newTheme)
}

onMounted(() => {
  const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  theme.value = savedTheme || (prefersDark ? 'dark' : 'light')
})
</script>

<template>
  <header class="app-header">
    <div class="app-header__limiter">
      <div class="app-header__leading">
        <button
          v-if="!isElectron"
          class="home-btn"
          @click="goHome"
          :title="t('landing.nav.home')"
          :aria-label="t('landing.nav.home')"
        >
          <i class="fa-solid fa-house"></i>
        </button>
      </div>

      <div class="app-header__title-container">
        <h1 class="app-title">{{ t('header.title') }}</h1>
      </div>

      <div class="app-header__trailing">
        <div v-if="isElectron" class="header-actions">
          <button
            class="lang-toggle"
            :class="{ active: locale === 'de' }"
            @click="setLanguage('de')"
            title="Deutsch"
          >
            DE
          </button>
          <button
            class="lang-toggle"
            :class="{ active: locale === 'en' }"
            @click="setLanguage('en')"
            title="English"
          >
            EN
          </button>
          <button
            class="theme-toggle"
            @click="toggleTheme"
            :title="t('header.themeToggle')"
          >
            {{ theme === 'dark' ? '\u2600\uFE0F' : '\uD83C\uDF13' }}
          </button>
        </div>
      </div>
    </div>
  </header>
</template>

<style scoped>
.app-header {
  position: sticky;
  top: 0;
  z-index: 100;
  padding: var(--space-3) var(--space-5);
  backdrop-filter: saturate(1.8) blur(24px);
  background: var(--glass-bg);
  border-bottom: 1px solid var(--glass-border);
  box-shadow:
    0 8px 32px color-mix(in oklab, var(--shadow-color) 8%, transparent),
    inset 0 1px 0 color-mix(in oklab, white 10%, transparent);
  transition: all 0.3s var(--ease-smooth);
}

.app-header__limiter {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  width: 100%;
}

.app-header__leading {
  flex: 1 1 0%;
  display: flex;
  align-items: center;
}

.home-btn {
  display: inline-grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: 1px solid transparent;
  background: transparent;
  color: var(--muted);
  font-size: 1rem;
  transition: all 0.3s var(--ease-spring);
  cursor: pointer;
}

.home-btn:hover {
  color: var(--accent);
  transform: scale(1.1);
  border-color: var(--border-color);
  background: var(--btn);
}

.app-header__title-container {
  flex: 0 1 auto;
  min-width: 0;
  text-align: center;
}

.app-title {
  font-weight: 700;
  font-size: 1.2rem;
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  background: linear-gradient(135deg, var(--text), color-mix(in oklab, var(--text) 70%, var(--accent)));
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.app-header__trailing {
  flex: 1 1 0%;
  display: flex;
  justify-content: flex-end;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.theme-toggle,
.lang-toggle {
  display: inline-grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: 1px solid transparent;
  background: transparent;
  color: var(--muted);
  font-size: 1rem;
  transition: all 0.3s var(--ease-spring);
  cursor: pointer;
}

.theme-toggle:hover,
.lang-toggle:hover {
  color: var(--text);
  transform: scale(1.1);
  border-color: var(--border-color);
  background: var(--btn);
}

.lang-toggle.active {
  background: var(--accent);
  color: var(--accent-text);
  box-shadow: 0 4px 16px color-mix(in oklab, var(--accent) 30%, transparent);
}

@media (max-width: 768px) {
  .app-header__limiter {
    flex-wrap: wrap;
    justify-content: space-between;
  }

  .app-header__leading {
    flex: 0 0 auto;
  }

  .app-header__title-container {
    flex-basis: 100%;
    order: -1;
    text-align: center;
    margin-bottom: var(--space-3);
  }

  .app-title {
    white-space: normal;
  }

  .app-header__trailing:empty {
    display: none;
  }
}

@media (max-width: 480px) {
  .app-title {
    font-size: 1rem;
  }
}
</style>
