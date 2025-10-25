<script setup lang="ts">
import { useI18n } from 'vue-i18n'

defineProps<{
  theme: 'light' | 'dark'
}>()

const emit = defineEmits<{
  'toggle-theme': []
}>()

const { locale, t } = useI18n()

const setLanguage = (lang: string) => {
  locale.value = lang
  localStorage.setItem('language', lang)
}
</script>

<template>
  <header class="app-header">
    <div class="app-header__limiter">
      <div class="app-header__leading"></div>
      
      <div class="app-header__title-container">
        <h1 class="app-title">{{ t('header.title') }}</h1>
      </div>
      
      <div class="header-actions">
        <button
          class="lang-toggle"
          :class="{ active: locale === 'de' }"
          @click="setLanguage('de')"
          title="Sprache auf Deutsch ändern"
        >
          DE
        </button>
        <button
          class="lang-toggle"
          :class="{ active: locale === 'en' }"
          @click="setLanguage('en')"
          title="Switch language to English"
        >
          EN
        </button>
        <button
          class="theme-toggle"
          @click="emit('toggle-theme')"
          :title="t('header.themeToggle')"
          :aria-label="t('header.themeToggle')"
        >
          🌓
        </button>
      </div>
    </div>
  </header>
</template>

<style scoped>
.app-header {
  position: sticky;
  top: var(--global-nav-height, 0);
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

.header-actions {
  flex: 1 1 0%;
  display: flex;
  align-items: center;
  justify-content: flex-end;
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
  position: relative;
  overflow: hidden;
  cursor: pointer;
}

.theme-toggle::before,
.lang-toggle::before {
  content: '';
  position: absolute;
  inset: 0;
  background: var(--btn);
  border-radius: inherit;
  opacity: 0;
  transition: opacity 0.3s var(--ease-smooth);
}

.theme-toggle:hover,
.lang-toggle:hover {
  color: var(--text);
  transform: scale(1.1);
  border-color: var(--border-color);
}

.theme-toggle:hover::before,
.lang-toggle:hover::before {
  opacity: 1;
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
    display: none;
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
  
  .header-actions {
    flex: 1;
    justify-content: center;
  }
}

@media (max-width: 480px) {
  .app-title {
    font-size: 1rem;
  }
}
</style>
