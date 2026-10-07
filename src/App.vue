<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSeoMeta } from '@/composables/useSeoMeta'
import { readStoredTheme, applyTheme } from '@/utils/theme'

const { locale } = useI18n()

// Dynamic SEO meta tags per route and locale
useSeoMeta()

// FontAwesome CSS is now imported via main.ts and bundled by Vite

/**
 * Handle the 'locale-changed' event dispatched by the SSI nav.html.
 * The SSI nav already handles localStorage, button styling and translateNav().
 * We only need to sync vue-i18n so Vue components re-render.
 */
function onLanguageChanged(e: Event) {
  const lang = (e as CustomEvent).detail?.locale
  if (lang && lang !== locale.value) {
    locale.value = lang
  }
}

onMounted(() => {
  // Gespeichertes Theme anwenden (Standard Light, wie im Collage Maker)
  applyTheme(readStoredTheme())

  // Listen for language changes from SSI nav — no interception needed,
  // nav.html handles everything and dispatches this event
  window.addEventListener('locale-changed', onLanguageChanged)
})

onUnmounted(() => {
  window.removeEventListener('locale-changed', onLanguageChanged)
})
</script>

<template>
  <!-- Ziel aller App-Modals (<Teleport to="#modal-portal">); steht vor der
       RouterView, damit es beim Mounten der Seiten bereits im DOM ist. -->
  <div id="modal-portal"></div>
  <RouterView />
</template>

<style>
/* Global app styles are in main.css */
</style>
