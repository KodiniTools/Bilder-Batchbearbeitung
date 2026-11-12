<script setup lang="ts">
/**
 * Animierte Editor-Vorschau im Landingpage-Hero.
 * Drei Szenen (Screenshots der App) blenden nacheinander über, die Hinweise
 * erscheinen passend zur Szene. Sprache und Theme bestimmen die Screenshots.
 * Bei `prefers-reduced-motion` bleibt die letzte Szene mit allen Hinweisen stehen.
 */
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useDocumentTheme } from '@/composables/useDocumentTheme'

/** Anzeigedauer je Szene in ms (Szene 1: Auswahl + Export, 2: Preset, 3: Wasserzeichen) */
const SCENE_DURATIONS = [4000, 4500, 5500] as const
const SCENE_COUNT = SCENE_DURATIONS.length
const LAST_SCENE = SCENE_COUNT - 1

/** Hinweise: Szene, ab der sie sichtbar sind, und Position in % des Rahmens */
const HINTS = [
  { key: 'rotate', scene: 0, style: { left: '57.95%', top: '3.39%' } },
  { key: 'export', scene: 0, style: { right: '1.36%', top: '32.54%' } },
  { key: 'local', scene: 0, style: { right: '6.82%', bottom: '2.54%' } },
  { key: 'filters', scene: 1, style: { left: '1.7%', top: '39.83%' } },
  { key: 'transforms', scene: 2, small: true, style: { left: '1.48%', top: '49.32%' } },
  { key: 'watermark', scene: 2, small: true, style: { left: '1.48%', top: '55.59%' } },
  { key: 'recipes', scene: 2, small: true, style: { left: '1.48%', top: '61.86%' } },
] as const

const sceneFiles = import.meta.glob<string>('@/assets/images/landing/hero/*.webp', {
  eager: true,
  import: 'default',
})

const { t, locale } = useI18n()
const theme = useDocumentTheme()

const scenes = computed(() => {
  const lang = locale.value === 'en' ? 'en' : 'de'
  return Array.from({ length: SCENE_COUNT }, (_, i) => {
    const name = `scene-${i + 1}-${lang}-${theme.value}.webp`
    const entry = Object.entries(sceneFiles).find(([path]) => path.endsWith(`/${name}`))
    return entry?.[1] ?? ''
  })
})

const step = ref(0)
const root = ref<HTMLElement | null>(null)
let timer: ReturnType<typeof setTimeout> | null = null
let inView = true
let reducedMotion = false
let observer: IntersectionObserver | null = null
let motionQuery: MediaQueryList | null = null

function clearTimer() {
  if (timer !== null) {
    clearTimeout(timer)
    timer = null
  }
}

function schedule() {
  clearTimer()
  if (reducedMotion || !inView || document.hidden) return
  timer = setTimeout(() => {
    step.value = (step.value + 1) % SCENE_COUNT
    schedule()
  }, SCENE_DURATIONS[step.value])
}

function applyMotionPreference() {
  reducedMotion = motionQuery?.matches ?? false
  if (reducedMotion) {
    clearTimer()
    step.value = LAST_SCENE
  } else {
    schedule()
  }
}

function onVisibilityChange() {
  schedule()
}

onMounted(() => {
  motionQuery =
    typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-reduced-motion: reduce)')
      : null
  motionQuery?.addEventListener('change', applyMotionPreference)
  document.addEventListener('visibilitychange', onVisibilityChange)

  // Nur animieren, solange die Vorschau sichtbar ist
  if (typeof IntersectionObserver !== 'undefined' && root.value) {
    observer = new IntersectionObserver(([entry]) => {
      inView = entry?.isIntersecting ?? true
      schedule()
    })
    observer.observe(root.value)
  }

  applyMotionPreference()
})

onUnmounted(() => {
  clearTimer()
  observer?.disconnect()
  observer = null
  motionQuery?.removeEventListener('change', applyMotionPreference)
  document.removeEventListener('visibilitychange', onVisibilityChange)
})

defineExpose({ step })
</script>

<template>
  <figure ref="root" class="hero-preview" role="img" :aria-label="t('landing.hero.previewAlt')">
    <div class="hero-preview__window" aria-hidden="true">
      <div class="hero-preview__bar">
        <span class="hero-preview__dot hero-preview__dot--red"></span>
        <span class="hero-preview__dot hero-preview__dot--yellow"></span>
        <span class="hero-preview__dot hero-preview__dot--green"></span>
        <span class="hero-preview__url">
          <i class="fa-solid fa-lock"></i>
          kodinitools.com/bilderseriebearbeiten
        </span>
      </div>
      <div class="hero-preview__screen">
        <img
          v-for="(src, i) in scenes"
          :key="i"
          class="hero-preview__scene"
          :class="{ 'is-active': step === i }"
          :src="src"
          alt=""
          width="1600"
          height="1000"
          decoding="async"
          :fetchpriority="i === 0 ? 'high' : 'auto'"
        />
      </div>
    </div>

    <span
      v-for="(hint, i) in HINTS"
      :key="hint.key"
      class="hero-preview__hint"
      :class="{ 'is-visible': step >= hint.scene, 'hero-preview__hint--small': 'small' in hint }"
      :style="hint.style"
      aria-hidden="true"
    >
      <b>{{ i + 1 }}</b>
      <span>
        <em v-if="'small' in hint">{{ t(`landing.hero.preview.${hint.key}.label`) }}:</em>
        {{ t(`landing.hero.preview.${hint.key}.text`) }}
      </span>
    </span>
  </figure>
</template>

<style scoped>
.hero-preview {
  position: relative;
  margin: 0 auto var(--ds-space-8);
  max-width: 1100px;
  aspect-ratio: 1760 / 1180;
  container-type: inline-size;
}

.hero-preview__window {
  position: absolute;
  left: 4.545%;
  top: 5.085%;
  width: 90.909%;
  border: var(--ds-border-width) solid var(--ds-border);
  border-radius: var(--ds-radius-lg);
  overflow: hidden;
  background: var(--ds-surface-0);
  box-shadow: var(--ds-shadow-overlay);
}

.hero-preview__bar {
  display: flex;
  align-items: center;
  gap: 0.45cqw;
  height: 2.5cqw;
  padding: 0 1cqw;
  background: var(--ds-surface-2);
  border-bottom: var(--ds-border-width) solid var(--ds-border);
}

.hero-preview__dot {
  width: 0.68cqw;
  height: 0.68cqw;
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
  gap: 0.4cqw;
  width: 30%;
  height: 1.6cqw;
  margin-left: 1.3cqw;
  padding: 0 0.7cqw;
  border: var(--ds-border-width) solid var(--ds-border);
  border-radius: var(--ds-radius-sm);
  background: var(--ds-surface-0);
  color: var(--ds-text-3);
  font-size: 0.8cqw;
  white-space: nowrap;
  overflow: hidden;
}

.hero-preview__screen {
  position: relative;
  aspect-ratio: 1600 / 1000;
}

.hero-preview__scene {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  transition: opacity 0.7s var(--ds-ease);
}

.hero-preview__scene.is-active {
  opacity: 1;
}

/* Hinweise */
.hero-preview__hint {
  position: absolute;
  display: inline-flex;
  align-items: center;
  gap: 0.57cqw;
  padding: 0.68cqw 1.02cqw;
  border-radius: var(--ds-radius-full);
  background: var(--ds-text);
  color: var(--ds-surface-0);
  font-size: 1.08cqw;
  font-weight: var(--ds-weight-semibold);
  line-height: 1.2;
  white-space: nowrap;
  box-shadow: var(--ds-shadow-overlay);
  opacity: 0;
  transform: translateY(0.4cqw);
  transition:
    opacity 0.5s var(--ds-ease),
    transform 0.5s var(--ds-ease);
}

.hero-preview__hint.is-visible {
  opacity: 1;
  transform: none;
}

.hero-preview__hint b {
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: 1.6cqw;
  height: 1.6cqw;
  border-radius: var(--ds-radius-full);
  background: var(--ds-accent);
  color: var(--ds-on-accent);
  font-size: 0.85cqw;
  font-weight: var(--ds-weight-bold);
}

.hero-preview__hint--small {
  gap: 0.45cqw;
  padding: 0.45cqw 0.8cqw 0.45cqw 0.45cqw;
  font-size: 0.91cqw;
}

.hero-preview__hint--small b {
  width: 1.36cqw;
  height: 1.36cqw;
  font-size: 0.74cqw;
}

.hero-preview__hint em {
  font-style: normal;
  font-weight: var(--ds-weight-bold);
}

/* Auf kleinen Breiten wären die Hinweise unlesbar */
@container (max-width: 640px) {
  .hero-preview__hint {
    display: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .hero-preview__scene,
  .hero-preview__hint {
    transition: none;
  }
}
</style>
