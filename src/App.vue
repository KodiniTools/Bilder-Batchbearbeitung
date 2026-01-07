<script setup lang="ts">
import { onMounted } from 'vue'

onMounted(() => {
  // Apply saved theme on app mount
  const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  const theme = savedTheme || (prefersDark ? 'dark' : 'light')
  document.documentElement.dataset.theme = theme
})
</script>

<template>
  <RouterView />
</template>

<style>
/* Global app styles are in main.css */
</style>
