<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'

const { locale } = useI18n()

/**
 * Intercept clicks on the SSI nav language buttons during the capture phase.
 * This fires before the SSI handler, preventing window.location.reload()
 * while reactively updating vue-i18n instead.
 */
function handleLangClick(e: MouseEvent) {
  const btn = (e.target as HTMLElement).closest('.global-nav-lang-btn')
  if (!btn) return

  e.stopPropagation()
  e.preventDefault()

  const targetLang = btn.getAttribute('data-lang')
  if (!targetLang) return

  const currentLang = localStorage.getItem('locale') || 'de'
  if (targetLang === currentLang) return

  // Persist and apply new language (mirrors what SSI nav.html would do)
  localStorage.setItem('locale', targetLang)
  document.documentElement.setAttribute('lang', targetLang)

  // Reactively update vue-i18n — all components re-render without reload
  locale.value = targetLang

  // Update SSI nav active-button styling
  document.querySelectorAll('.global-nav-lang-btn').forEach(b => {
    b.classList.toggle('active', b.getAttribute('data-lang') === targetLang)
  })

  // Notify SSI nav to translate its own labels (since stopPropagation
  // prevented the nav's own click handler from running)
  window.dispatchEvent(new CustomEvent('language-changed', { detail: { lang: targetLang } }))
}

onMounted(() => {
  // Apply saved theme on app mount
  const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  const theme = savedTheme || (prefersDark ? 'dark' : 'light')
  document.documentElement.dataset.theme = theme

  // Capture-phase listener intercepts SSI nav language clicks before reload
  document.addEventListener('click', handleLangClick, { capture: true })
})

onUnmounted(() => {
  document.removeEventListener('click', handleLangClick, { capture: true })
})
</script>

<template>
  <RouterView />
</template>

<style>
/* Global app styles are in main.css */
</style>
