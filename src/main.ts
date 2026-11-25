import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { createI18n } from 'vue-i18n'
import App from './App.vue'
import router from './router'
import { initLocale } from './lib/core/initial-locale'

// Import translations
import de from './locales/de.json'
import en from './locales/en.json'

// Import FontAwesome (bundled by Vite for both web and Electron builds)
import '@fortawesome/fontawesome-free/css/fontawesome.min.css'
import '@fortawesome/fontawesome-free/css/solid.min.css'

// Import global styles
import './assets/styles/fonts.css'
import './assets/styles/main.css'
// Grundlayout Design-Umbau Etappe 1 (nach main.css, überschreibt scoped View-Styles gezielt)
import './assets/styles/kodini-layout-stage1.css'
// Kopfzeilen Design-Umbau Etappe 2
import './assets/styles/kodini-header-stage2.css'
// Bedienfelder und Dialoge Design-Umbau Etappe 3 (vor kodini-buttons.css)
import './assets/styles/kodini-controls-stage3.css'
// Alle Text-Buttons dunkelgold mit weisser Schrift
import './assets/styles/kodini-buttons.css'

// Create i18n instance
const i18n = createI18n({
  legacy: false,
  locale: initLocale(),
  fallbackLocale: 'de',
  messages: {
    de,
    en,
  },
})

// Create app
const app = createApp(App)

// Use plugins
app.use(createPinia())
app.use(router)
app.use(i18n)

// Mount app
app.mount('#app')
