<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const isVisible = ref(false)
const message = ref('')

const show = (msg?: string) => {
  isVisible.value = true
  message.value = msg || t('loading.text')
}

const hide = () => {
  isVisible.value = false
  message.value = ''
}

defineExpose({
  show,
  hide
})
</script>

<template>
  <div
    v-if="isVisible"
    class="loading-indicator active"
    role="status"
    aria-live="assertive"
  >
    <div class="box">
      <div class="spinner" aria-hidden="true"></div>
      <div class="loading-text">{{ message }}</div>
    </div>
  </div>
</template>

<style scoped>
.loading-indicator {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: grid;
  place-items: center;
  background: color-mix(in oklab, black 40%, transparent);
  backdrop-filter: blur(8px);
  opacity: 0;
  pointer-events: none;
  transition: all 0.4s var(--ease-smooth);
}

.loading-indicator.active {
  opacity: 1;
  pointer-events: auto;
}

.box {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 24px 32px;
  background: var(--glass-bg);
  backdrop-filter: blur(20px);
  border-radius: var(--radius-2xl);
  box-shadow: var(--surface-elevation);
  border: 1px solid var(--glass-border);
}

.spinner {
  width: 32px;
  height: 32px;
  background: conic-gradient(from 0deg, var(--accent), var(--green), var(--purple), var(--accent));
  border-radius: 50%;
  position: relative;
  animation: spinGlow 2s linear infinite;
}

.spinner::before {
  content: '';
  position: absolute;
  inset: 4px;
  background: var(--panel);
  border-radius: 50%;
}

.loading-text {
  font-weight: 500;
  color: var(--text);
  position: relative;
}

@keyframes spinGlow {
  0% {
    transform: rotate(0deg);
    filter: hue-rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
    filter: hue-rotate(360deg);
  }
}
</style>
