<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const props = withDefaults(
  defineProps<{
    /** Scroll-Distanz in px, ab der der Button erscheint. */
    threshold?: number
  }>(),
  {
    threshold: 400
  }
)

const isVisible = ref(false)

function handleScroll() {
  isVisible.value = window.scrollY > props.threshold
}

function scrollToTop() {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  window.scrollTo({
    top: 0,
    behavior: prefersReducedMotion ? 'auto' : 'smooth'
  })
}

onMounted(() => {
  window.addEventListener('scroll', handleScroll, { passive: true })
  handleScroll()
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
})
</script>

<template>
  <Transition name="scroll-top-fade">
    <button
      v-show="isVisible"
      type="button"
      class="scroll-to-top"
      :aria-label="t('accessibility.scrollToTop')"
      :title="t('accessibility.scrollToTop')"
      @click="scrollToTop"
    >
      <i class="fa-solid fa-arrow-up" aria-hidden="true"></i>
    </button>
  </Transition>
</template>

<style scoped>
.scroll-to-top {
  position: fixed;
  right: var(--space-5);
  bottom: var(--space-5);
  z-index: 90;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  padding: 0;
  border: 1px solid var(--glass-border);
  border-radius: 50%;
  background: var(--glass-bg);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  color: var(--text);
  font-size: 0.95rem;
  cursor: pointer;
  box-shadow: var(--surface-elevation);
  opacity: 0.72;
  transition:
    opacity 0.25s var(--ease-smooth, ease),
    transform 0.25s var(--ease-smooth, ease),
    background 0.25s var(--ease-smooth, ease),
    color 0.25s var(--ease-smooth, ease);
}

.scroll-to-top:hover {
  opacity: 1;
  transform: translateY(-2px);
  background: var(--accent);
  color: var(--accent-text);
  box-shadow: var(--surface-hover);
}

.scroll-to-top:focus-visible {
  opacity: 1;
  outline: 2px solid var(--accent);
  outline-offset: 3px;
}

.scroll-to-top:active {
  transform: translateY(0);
  box-shadow: var(--surface-active);
}

/* Ein-/Ausblenden */
.scroll-top-fade-enter-active,
.scroll-top-fade-leave-active {
  transition:
    opacity 0.25s var(--ease-smooth, ease),
    transform 0.25s var(--ease-smooth, ease);
}

.scroll-top-fade-enter-from,
.scroll-top-fade-leave-to {
  opacity: 0;
  transform: translateY(12px);
}

@media (max-width: 480px) {
  .scroll-to-top {
    right: var(--space-3);
    bottom: var(--space-3);
    width: 40px;
    height: 40px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .scroll-to-top,
  .scroll-top-fade-enter-active,
  .scroll-top-fade-leave-active {
    transition-duration: 0.01ms;
  }

  .scroll-to-top:hover {
    transform: none;
  }
}
</style>
