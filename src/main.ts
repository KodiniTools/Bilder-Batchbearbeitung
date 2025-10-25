import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { createI18n } from 'vue-i18n'
import App from './App.vue'

// Import translations
import de from './locales/de.json'
import en from './locales/en.json'

// Import global styles
import './assets/styles/main.css'

// Create i18n instance
const i18n = createI18n({
  legacy: false,
  locale: localStorage.getItem('language') || 'de',
  fallbackLocale: 'de',
  messages: {
    de,
    en
  }
})

// Create app
const app = createApp(App)

// Use plugins
app.use(createPinia())
app.use(i18n)

// Mount app
app.mount('#app')
