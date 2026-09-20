<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { getBlogArticles, formatArticleDate } from '@/data/blogArticles'

const { locale, t } = useI18n()
const router = useRouter()

const goToHome = () => {
  router.push('/')
}

const goToApp = () => {
  router.push('/app')
}

/** Artikel in der aktiven Sprache, neueste zuerst (reagiert auf Sprachwechsel) */
const articles = computed(() => getBlogArticles(locale.value))

onMounted(() => {
  // Theme-Initialisierung als Fallback (SSI nav.html setzt Theme primär)
  if (!document.documentElement.getAttribute('data-theme')) {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const theme = savedTheme || (prefersDark ? 'dark' : 'light')
    document.documentElement.dataset.theme = theme
    localStorage.setItem('theme', theme)
  }

  const savedLang = localStorage.getItem('locale')
  if (savedLang) {
    locale.value = savedLang
  }
})
</script>

<template>
  <div class="articles-page">
    <!-- Navigation -->
    <nav class="articles-nav">
      <div class="nav-container">
        <div class="nav-links">
          <button class="nav-link" @click="goToHome">{{ t('landing.nav.home') }}</button>
          <button class="nav-link primary" @click="goToApp">{{ t('landing.nav.app') }}</button>
        </div>
        <!-- Theme & Language Switcher sind in der globalen SSI Navigation -->
      </div>
    </nav>

    <!-- Main Content -->
    <main class="articles-content">
      <div class="articles-container">
        <header class="articles-header">
          <h1>{{ t('articles.title') }}</h1>
          <p class="articles-subtitle">{{ t('articles.subtitle') }}</p>
        </header>

        <div class="articles-panel">
          <div class="articles-grid">
            <a
              v-for="article in articles"
              :key="article.id"
              :href="article.url"
              class="article-card"
              target="_blank"
              rel="noopener"
            >
              <div class="article-media">
                <img :src="article.image" alt="" width="640" height="360" loading="lazy" />
              </div>
              <div class="article-body">
                <div class="article-meta">
                  <span class="article-tag">{{ article.tag }}</span>
                  <span class="article-date">
                    {{ formatArticleDate(article.date, locale) }} ·
                    {{ t('articles.minutes', { count: article.minutes }) }}
                  </span>
                </div>
                <h2>{{ article.title }}</h2>
                <p>{{ article.description }}</p>
                <div class="article-arrow">
                  {{ t('articles.readArticle') }}
                  <i class="fa-solid fa-arrow-right" aria-hidden="true"></i>
                </div>
              </div>
            </a>
          </div>
        </div>

        <!-- CTA -->
        <div class="articles-cta">
          <h2>{{ t('landing.app.title') }}</h2>
          <p>{{ t('landing.app.subtitle') }}</p>
          <button class="cta-button" @click="goToApp">
            <i class="fa-solid fa-rocket"></i>
            {{ t('landing.hero.cta') }}
          </button>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
.articles-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--body-gradient);
  background-attachment: fixed;
}

/* Navigation (identisch zu FAQ-/Funktionen-Seite) */
.articles-nav {
  position: sticky;
  top: 0;
  z-index: 100;
  backdrop-filter: saturate(1.8) blur(24px);
  background: var(--glass-bg);
  border-bottom: 1px solid var(--glass-border);
  transition: all 0.3s var(--ease-smooth);
}

.nav-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: var(--space-3) var(--space-5);
  display: flex;
  justify-content: center;
  align-items: center;
  gap: var(--space-4);
}

.nav-links {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.nav-link {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-4);
  border-radius: var(--radius-lg);
  border: 1px solid transparent;
  background: transparent;
  color: var(--text);
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s var(--ease-spring);
}

.nav-link:hover {
  background: var(--btn);
  border-color: var(--border-color);
  transform: translateY(-1px);
}

.nav-link.primary {
  background: var(--accent);
  color: var(--accent-text);
  border-color: var(--accent);
}

.nav-link.primary:hover {
  background: var(--accent-hover);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px color-mix(in oklab, var(--accent) 30%, transparent);
}

/* Main Content */
.articles-content {
  flex: 1;
  padding-top: var(--space-7);
  padding-bottom: var(--space-7);
}

.articles-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 0 var(--space-5);
}

.articles-header {
  text-align: center;
  margin-bottom: var(--space-6);
}

.articles-header h1 {
  font-size: clamp(1.8rem, 4vw, 2.5rem);
  font-weight: 800;
  margin: 0 0 var(--space-3);
  line-height: 1.2;
  background: linear-gradient(135deg, var(--text), var(--accent));
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.articles-subtitle {
  margin: 0 auto;
  max-width: 520px;
  color: var(--muted);
  font-size: 1rem;
  line-height: 1.6;
}

/* Panel um die Karten, wie auf kodinitools.com/blog */
.articles-panel {
  background: var(--glass-bg);
  backdrop-filter: blur(16px);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-2xl);
  padding: clamp(1.25rem, 4vw, 2.25rem);
}

.articles-grid {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

/* Karte: Bild links, Text rechts */
.article-card {
  display: grid;
  grid-template-columns: minmax(200px, 320px) 1fr;
  background: var(--panel);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  overflow: hidden;
  text-decoration: none;
  color: inherit;
  transition:
    border-color 0.2s var(--ease-smooth),
    box-shadow 0.2s var(--ease-smooth),
    transform 0.2s var(--ease-smooth);
}

.article-card:hover,
.article-card:focus-visible {
  border-color: var(--accent);
  box-shadow: var(--surface-hover);
  transform: translateY(-2px);
  text-decoration: none;
}

.article-media {
  min-height: 180px;
  background: var(--btn);
}

.article-media img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.article-body {
  padding: var(--space-5) var(--space-5);
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.article-meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--space-2) var(--space-3);
  margin-bottom: var(--space-2);
}

.article-tag {
  font-size: 0.72rem;
  font-weight: 700;
  padding: 0.2rem 0.6rem;
  border-radius: 999px;
  color: var(--accent);
  background: color-mix(in oklab, var(--accent) 10%, transparent);
}

.article-date {
  font-size: 0.78rem;
  color: var(--muted);
}

.article-body h2 {
  font-size: 1.15rem;
  font-weight: 800;
  line-height: 1.3;
  margin: 0 0 var(--space-2);
  color: var(--text);
}

.article-body p {
  margin: 0;
  font-size: 0.88rem;
  line-height: 1.6;
  color: var(--muted);
}

.article-arrow {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--space-1);
  margin-top: var(--space-3);
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--accent);
}

/* CTA (wie FAQ-Seite) */
.articles-cta {
  margin-top: var(--space-7);
  padding: var(--space-6);
  text-align: center;
  background: var(--glass-bg);
  backdrop-filter: blur(16px);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-2xl);
}

.articles-cta h2 {
  margin: 0 0 var(--space-2);
  font-size: 1.5rem;
  color: var(--text);
}

.articles-cta p {
  margin: 0 0 var(--space-5);
  color: var(--muted);
}

.cta-button {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-6);
  border: none;
  border-radius: var(--radius-lg);
  background: var(--accent);
  color: var(--accent-text);
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s var(--ease-spring);
}

.cta-button:hover {
  background: var(--accent-hover);
  transform: translateY(-2px);
  box-shadow: 0 6px 20px color-mix(in oklab, var(--accent) 35%, transparent);
}

@media (max-width: 640px) {
  .articles-container {
    padding: 0 var(--space-3);
  }

  .articles-panel {
    padding: var(--space-3);
    border-radius: var(--radius-xl);
  }

  .article-card {
    grid-template-columns: 1fr;
  }

  .article-media {
    min-height: 160px;
  }

  .article-body {
    padding: var(--space-4);
  }
}
</style>
