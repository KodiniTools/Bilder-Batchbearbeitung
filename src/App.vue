<script setup lang="ts">
import { onMounted, onUnmounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import { useSeoMeta } from '@/composables/useSeoMeta'

const { locale } = useI18n()
const route = useRoute()

// Dynamic SEO meta tags per route and locale
useSeoMeta()

// Load FontAwesome CSS dynamically only on pages that need it (not on landing page)
function loadFontAwesome() {
  if (!document.getElementById('fa-core-css')) {
    const core = document.createElement('link')
    core.id = 'fa-core-css'
    core.rel = 'stylesheet'
    core.href = '/fontawesome/css/fontawesome.min.css'
    document.head.appendChild(core)

    const solid = document.createElement('link')
    solid.id = 'fa-solid-css'
    solid.rel = 'stylesheet'
    solid.href = '/fontawesome/css/solid.min.css'
    document.head.appendChild(solid)
  }
}

function unloadFontAwesome() {
  document.getElementById('fa-core-css')?.remove()
  document.getElementById('fa-solid-css')?.remove()
}

watch(() => route.path, (path) => {
  if (path === '/') {
    unloadFontAwesome()
  } else {
    loadFontAwesome()
  }
}, { immediate: true })

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
