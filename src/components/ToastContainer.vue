<script setup lang="ts">
import { useToast } from '@/composables/useToast'

const { toasts, removeToast } = useToast()

const getIcon = (type: string) => {
  switch (type) {
    case 'success':
      return 'fa-circle-check'
    case 'error':
      return 'fa-circle-xmark'
    case 'warning':
      return 'fa-triangle-exclamation'
    case 'info':
    default:
      return 'fa-circle-info'
  }
}
</script>

<template>
  <Teleport to="body">
    <div class="toast-container" aria-live="polite">
      <TransitionGroup name="toast">
        <div
          v-for="toast in toasts"
          :key="toast.id"
          class="toast"
          :class="[`toast--${toast.type}`]"
          role="alert"
          @click="removeToast(toast.id)"
        >
          <i :class="['fas', getIcon(toast.type)]" class="toast-icon"></i>
          <span class="toast-message">{{ toast.message }}</span>
          <button
            type="button"
            class="toast-close"
            @click.stop="removeToast(toast.id)"
            aria-label="Schließen"
          >
            <i class="fas fa-times"></i>
          </button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<style scoped>
.toast-container {
  position: fixed;
  bottom: var(--space-5);
  right: var(--space-5);
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  max-width: 420px;
  width: 100%;
  pointer-events: none;
}

@media (max-width: 480px) {
  .toast-container {
    left: var(--space-3);
    right: var(--space-3);
    bottom: var(--space-3);
    max-width: none;
  }
}

.toast {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-4) var(--space-5);
  background: var(--glass-bg);
  backdrop-filter: blur(16px);
  border-radius: var(--radius-xl);
  box-shadow:
    0 8px 32px rgba(0, 0, 0, 0.15),
    0 4px 12px rgba(0, 0, 0, 0.1);
  border: 1px solid var(--glass-border);
  cursor: pointer;
  pointer-events: auto;
  transition: all 0.3s var(--ease-smooth);
}

.toast:hover {
  transform: translateX(-4px);
  box-shadow:
    0 12px 40px rgba(0, 0, 0, 0.2),
    0 6px 16px rgba(0, 0, 0, 0.12);
}

.toast-icon {
  font-size: 1.25rem;
  flex-shrink: 0;
}

.toast-message {
  flex: 1;
  font-size: 0.95rem;
  font-weight: 500;
  color: var(--text);
  line-height: 1.4;
}

.toast-close {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: transparent;
  border: none;
  color: var(--muted);
  cursor: pointer;
  display: grid;
  place-items: center;
  transition: all 0.2s var(--ease-smooth);
  flex-shrink: 0;
}

.toast-close:hover {
  background: color-mix(in oklab, var(--border-color) 50%, transparent);
  color: var(--text);
}

/* Toast-Typen */
.toast--success {
  border-left: 4px solid var(--green);
}

.toast--success .toast-icon {
  color: var(--green);
}

.toast--error {
  border-left: 4px solid #ef4444;
}

.toast--error .toast-icon {
  color: #ef4444;
}

.toast--warning {
  border-left: 4px solid #f59e0b;
}

.toast--warning .toast-icon {
  color: #f59e0b;
}

.toast--info {
  border-left: 4px solid var(--accent);
}

.toast--info .toast-icon {
  color: var(--accent);
}

/* Animationen */
.toast-enter-active {
  animation: toastIn 0.4s var(--ease-spring);
}

.toast-leave-active {
  animation: toastOut 0.3s var(--ease-smooth);
}

.toast-move {
  transition: transform 0.3s var(--ease-smooth);
}

@keyframes toastIn {
  0% {
    opacity: 0;
    transform: translateX(100%) scale(0.9);
  }
  100% {
    opacity: 1;
    transform: translateX(0) scale(1);
  }
}

@keyframes toastOut {
  0% {
    opacity: 1;
    transform: translateX(0) scale(1);
  }
  100% {
    opacity: 0;
    transform: translateX(100%) scale(0.9);
  }
}
</style>
