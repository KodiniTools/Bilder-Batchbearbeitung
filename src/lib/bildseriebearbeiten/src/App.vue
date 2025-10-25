<script setup lang="ts">
import { ref, onMounted } from 'vue'
import AppHeader from '@/components/AppHeader.vue'
import StatusBar from '@/components/StatusBar.vue'
import DropZone from '@/components/DropZone.vue'
import ImageGrid from '@/components/ImageGrid.vue'
import LoadingIndicator from '@/components/LoadingIndicator.vue'
import ImageEditor from '@/components/ImageEditor.vue'
import { useImageStore } from '@/stores/imageStore'
import type { ImageObject } from '@/lib/core/types'

const imageStore = useImageStore()
const theme = ref<'light' | 'dark'>('light')

const isEditorOpen = ref(false)
const editingImage = ref<ImageObject | null>(null)

function openEditor(image: ImageObject) {
  editingImage.value = image
  isEditorOpen.value = true
}

function closeEditor() {
  isEditorOpen.value = false
  editingImage.value = null
}

function saveEditorChanges(image: ImageObject) {
  // Update the image in store which triggers re-render
  imageStore.updateImage(image)
}

const applyTheme = (newTheme: 'light' | 'dark') => {
  theme.value = newTheme
  document.documentElement.dataset.theme = newTheme
  localStorage.setItem('theme', newTheme)
}

const toggleTheme = () => {
  applyTheme(theme.value === 'dark' ? 'light' : 'dark')
}

onMounted(() => {
  const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  applyTheme(savedTheme || (prefersDark ? 'dark' : 'light'))
})
</script>

<template>
  <div class="app">
    <AppHeader :theme="theme" @toggle-theme="toggleTheme" />
    
    <main class="container">
      <StatusBar v-if="imageStore.hasImages" />
      
      <DropZone />
      
      <div v-if="!imageStore.hasImages" class="empty-state">
        <div style="font-size:34px">
          <i class="fa-regular fa-image"></i>
        </div>
        <div>
          <strong>{{ $t('emptyState.title') }}</strong>
          <span>{{ $t('emptyState.text') }}</span>
        </div>
      </div>
      
      <ImageGrid v-else @open-editor="openEditor" />
      
      <section class="faq-section">
        <h2>{{ $t('faq.title') }}</h2>
        
        <div class="privacy-notice">
          <i class="fa-solid fa-shield-halved"></i>
          <div>
            <strong>{{ $t('faq.privacy.title') }}</strong>
            <p>{{ $t('faq.privacy.text') }}</p>
          </div>
        </div>
        
        <div class="faq-list">
          <details v-for="i in 8" :key="i">
            <summary>{{ $t(`faq.q${i}.question`) }}</summary>
            <p v-html="$t(`faq.q${i}.answer`)"></p>
          </details>
        </div>
      </section>
    </main>
    
    <LoadingIndicator />
    
    <ImageEditor
      :image="editingImage"
      :is-open="isEditorOpen"
      @close="closeEditor"
      @save="saveEditorChanges"
    />
  </div>
</template>

<style scoped>
.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: var(--space-6) var(--space-5);
  margin-top: var(--space-7);
  flex: 1;
  width: 100%;
}

.empty-state {
  display: grid;
  place-items: center;
  gap: var(--space-4);
  text-align: center;
  color: var(--muted);
  padding: var(--space-6);
  border: 2px dashed color-mix(in oklab, var(--border-color) 40%, transparent);
  border-radius: var(--radius-2xl);
  background: linear-gradient(135deg, 
    color-mix(in oklab, var(--panel) 30%, transparent) 0%,
    color-mix(in oklab, var(--panel) 10%, transparent) 100%);
  margin-bottom: var(--space-7);
}

.faq-section {
  margin-top: var(--space-6);
  padding: var(--space-6);
  background: var(--glass-bg);
  backdrop-filter: blur(16px);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-2xl);
  position: relative;
  overflow: hidden;
}

.faq-section h2 {
  text-align: center;
  margin-top: 0;
  margin-bottom: var(--space-5);
  font-size: 1.8rem;
  font-weight: 700;
  background: linear-gradient(135deg, var(--text), var(--accent));
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.privacy-notice {
  display: flex;
  align-items: flex-start;
  gap: var(--space-4);
  padding: var(--space-5);
  background: linear-gradient(135deg, 
    color-mix(in oklab, var(--accent) 8%, transparent) 0%,
    color-mix(in oklab, var(--green) 6%, transparent) 100%);
  border-radius: var(--radius-2xl);
  border: 1px solid color-mix(in oklab, var(--accent) 25%, transparent);
  margin-bottom: var(--space-5);
}

.privacy-notice i {
  font-size: 2rem;
  color: var(--accent);
  margin-top: 4px;
}

.privacy-notice strong {
  display: block;
  margin-bottom: var(--space-2);
  color: var(--text);
  font-size: 1.1rem;
}

.privacy-notice p {
  margin: 0;
  color: var(--muted);
  font-size: 0.95rem;
  line-height: 1.6;
}

.faq-list details {
  border-bottom: 1px solid var(--glass-border);
  padding: var(--space-4) 0;
  transition: all 0.3s var(--ease-smooth);
}

.faq-list details:first-of-type {
  border-top: 1px solid var(--glass-border);
}

.faq-list summary {
  font-weight: 600;
  cursor: pointer;
  list-style: none;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-2);
  border-radius: var(--radius-md);
  transition: all 0.3s var(--ease-smooth);
}

.faq-list summary::after {
  content: '+';
  font-size: 1.5rem;
  font-weight: 300;
  color: var(--accent);
  transition: all 0.3s var(--ease-spring);
  width: 24px;
  height: 24px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: color-mix(in oklab, var(--accent) 10%, transparent);
}

.faq-list details[open] summary::after {
  transform: rotate(45deg);
  background: var(--accent);
  color: white;
}

.faq-list p {
  margin-top: var(--space-4);
  color: var(--muted);
  line-height: 1.7;
  padding-left: var(--space-4);
  border-left: 3px solid color-mix(in oklab, var(--accent) 20%, transparent);
}

@media (max-width: 768px) {
  .container {
    padding: var(--space-4) var(--space-3);
  }
  
  .faq-section {
    padding: var(--space-4);
  }
  
  .privacy-notice {
    flex-direction: column;
    text-align: center;
  }
}
</style>
