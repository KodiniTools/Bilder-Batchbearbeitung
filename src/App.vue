<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'

const { locale } = useI18n()

/**
 * Handle the 'language-changed' event dispatched by the SSI nav.html.
 * The SSI nav already handles localStorage, button styling and translateNav().
 * We only need to sync vue-i18n so Vue components re-render.
 */
function onLanguageChanged(e: Event) {
  const lang = (e as CustomEvent).detail?.lang
  if (lang && lang !== locale.value) {
    locale.value = lang
  }
}

onMounted(() => {
  // Apply saved theme on app mount
  const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  const theme = savedTheme || (prefersDark ? 'dark' : 'light')
  document.documentElement.dataset.theme = theme

  // Listen for language changes from SSI nav — no interception needed,
  // nav.html handles everything and dispatches this event
  window.addEventListener('language-changed', onLanguageChanged)
})

onUnmounted(() => {
  window.removeEventListener('language-changed', onLanguageChanged)
})
</script>

<template>
  <RouterView />
</template>

<style>
/* Global app styles are in main.css */
</style>
