<script setup lang="ts">
/**
 * Statische Editor-Vorschau im Landingpage-Hero (Screenshot im Browserfenster).
 */
import { useI18n } from 'vue-i18n'
import previewSrc from '@/assets/images/landing/bilderserie.webp'

const { t } = useI18n()
</script>

<template>
  <figure class="hero-preview">
    <div class="hero-preview__window">
      <div class="hero-preview__bar" aria-hidden="true">
        <span class="hero-preview__dot hero-preview__dot--red"></span>
        <span class="hero-preview__dot hero-preview__dot--yellow"></span>
        <span class="hero-preview__dot hero-preview__dot--green"></span>
        <span class="hero-preview__url">
          <i class="fa-solid fa-lock"></i>
          kodinitools.com/bilderseriebearbeiten
        </span>
      </div>
      <img
        class="hero-preview__image"
        :src="previewSrc"
        :alt="t('landing.hero.previewAlt')"
        width="1600"
        height="901"
        decoding="async"
        fetchpriority="high"
      />
    </div>
  </figure>
</template>

<style scoped>
.hero-preview {
  margin: 0 auto var(--ds-space-8);
  max-width: 1100px;
  container-type: inline-size;
}

.hero-preview__window {
  border: var(--ds-border-width) solid var(--ds-border);
  border-radius: var(--ds-radius-lg);
  overflow: hidden;
  background: var(--ds-surface-0);
  box-shadow: var(--ds-shadow-overlay);
}

.hero-preview__bar {
  display: flex;
  align-items: center;
  gap: 0.5cqw;
  height: 2.75cqw;
  padding: 0 1.1cqw;
  background: var(--ds-surface-2);
  border-bottom: var(--ds-border-width) solid var(--ds-border);
}

.hero-preview__dot {
  width: 0.75cqw;
  height: 0.75cqw;
  border-radius: var(--ds-radius-full);
}

.hero-preview__dot--red {
  background: #ff5f57;
}

.hero-preview__dot--yellow {
  background: #febc2e;
}

.hero-preview__dot--green {
  background: #28c840;
}

.hero-preview__url {
  display: inline-flex;
  align-items: center;
  gap: 0.45cqw;
  width: 33%;
  height: 1.75cqw;
  margin-left: 1.4cqw;
  padding: 0 0.8cqw;
  border: var(--ds-border-width) solid var(--ds-border);
  border-radius: var(--ds-radius-sm);
  background: var(--ds-surface-0);
  color: var(--ds-text-3);
  font-size: 0.9cqw;
  white-space: nowrap;
  overflow: hidden;
}

.hero-preview__image {
  display: block;
  width: 100%;
  height: auto;
}
</style>
