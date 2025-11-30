<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const isVisible = ref(false)
const message = ref('')
const currentProgress = ref(0)
const totalProgress = ref(0)
const showProgress = ref(false)

const progressPercent = computed(() => {
  if (totalProgress.value === 0) return 0
  return Math.round((currentProgress.value / totalProgress.value) * 100)
})

const progressText = computed(() => {
  if (!showProgress.value || totalProgress.value === 0) return ''
  return `${currentProgress.value} / ${totalProgress.value}`
})

const show = (msg?: string) => {
  isVisible.value = true
  message.value = msg || t('loading.text')
  showProgress.value = false
  currentProgress.value = 0
  totalProgress.value = 0
}

const showWithProgress = (msg: string, total: number) => {
  isVisible.value = true
  message.value = msg
  showProgress.value = true
  currentProgress.value = 0
  totalProgress.value = total
}

const updateProgress = (current: number, newMessage?: string) => {
  currentProgress.value = current
  if (newMessage) {
    message.value = newMessage
  }
}

const hide = () => {
  isVisible.value = false
  message.value = ''
  showProgress.value = false
  currentProgress.value = 0
  totalProgress.value = 0
}

defineExpose({
  show,
  showWithProgress,
  updateProgress,
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
      <div class="loading-content">
        <div class="loading-text">{{ message }}</div>

        <!-- Fortschrittsanzeige -->
        <div v-if="showProgress" class="progress-container">
          <div class="progress-bar">
            <div
              class="progress-fill"
              :style="{ width: `${progressPercent}%` }"
            ></div>
          </div>
          <div class="progress-info">
            <span class="progress-count">{{ progressText }}</span>
            <span class="progress-percent">{{ progressPercent }}%</span>
          </div>
        </div>
      </div>
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
  align-items: flex-start;
  gap: 20px;
  padding: 28px 36px;
  background: var(--glass-bg);
  backdrop-filter: blur(20px);
  border-radius: var(--radius-2xl);
  box-shadow: var(--surface-elevation);
  border: 1px solid var(--glass-border);
  min-width: 320px;
  max-width: 420px;
}

.spinner {
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  background: conic-gradient(from 0deg, var(--accent), var(--green), var(--purple), var(--accent));
  border-radius: 50%;
  position: relative;
  animation: spinGlow 2s linear infinite;
}

.spinner::before {
  content: '';
  position: absolute;
  inset: 5px;
  background: var(--panel);
  border-radius: 50%;
}

.loading-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.loading-text {
  font-weight: 500;
  color: var(--text);
  font-size: 1rem;
  line-height: 1.4;
}

/* Fortschrittsbalken */
.progress-container {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.progress-bar {
  height: 8px;
  background: color-mix(in oklab, var(--border-color) 50%, transparent);
  border-radius: 999px;
  overflow: hidden;
  position: relative;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--accent), var(--green));
  border-radius: 999px;
  transition: width 0.3s var(--ease-smooth);
  position: relative;
}

.progress-fill::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(255, 255, 255, 0.3),
    transparent
  );
  animation: shimmer 1.5s infinite;
}

@keyframes shimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}

.progress-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.85rem;
}

.progress-count {
  color: var(--muted);
}

.progress-percent {
  color: var(--accent);
  font-weight: 600;
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
