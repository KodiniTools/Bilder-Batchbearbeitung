<template>
  <Teleport to="#modal-portal">
    <Transition name="confirm">
      <div v-if="request" class="confirm-overlay" @mousedown.self="settle(false)">
        <div
          class="confirm-dialog"
          role="alertdialog"
          aria-modal="true"
          :aria-labelledby="request.title ? 'confirm-title' : undefined"
          aria-describedby="confirm-message"
        >
          <h2 v-if="request.title" id="confirm-title" class="confirm-title">
            {{ request.title }}
          </h2>
          <p id="confirm-message" class="confirm-message">{{ request.message }}</p>
          <div class="confirm-actions">
            <button
              v-if="!request.alertOnly"
              type="button"
              class="confirm-btn confirm-btn--secondary"
              @click="settle(false)"
            >
              {{ request.cancelLabel || t('dialog.cancel') }}
            </button>
            <button
              ref="confirmButton"
              type="button"
              :class="[
                'confirm-btn',
                request.danger ? 'confirm-btn--danger' : 'confirm-btn--primary',
              ]"
              @click="settle(true)"
            >
              {{ request.confirmLabel || t(request.alertOnly ? 'dialog.ok' : 'dialog.confirm') }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useConfirm } from '@/composables/useConfirm'

/** Rendert die Dialoge aus useConfirm(); einmal in der App einbinden. */
const { t } = useI18n()
const { request, settle } = useConfirm()
const confirmButton = ref<HTMLButtonElement | null>(null)
let previousFocus: HTMLElement | null = null

watch(request, (req, prev) => {
  if (req && !prev) previousFocus = document.activeElement as HTMLElement | null
  if (req) nextTick(() => confirmButton.value?.focus())
  else previousFocus?.focus?.()
})

// Capture-Phase: Esc/Enter gehören dem Dialog, nicht dem Designer darunter
function onKeyDown(event: KeyboardEvent) {
  if (!request.value) return
  if (event.key === 'Escape') {
    event.preventDefault()
    event.stopImmediatePropagation()
    settle(false)
  } else if (event.key === 'Enter' && document.activeElement?.tagName !== 'BUTTON') {
    event.preventDefault()
    event.stopImmediatePropagation()
    settle(true)
  } else if (event.key !== 'Tab' && event.key !== 'Enter' && event.key !== ' ') {
    // Andere Kürzel (Entf, Strg+Z …) nicht an die App durchreichen
    event.stopImmediatePropagation()
  }
}

onMounted(() => document.addEventListener('keydown', onKeyDown, true))
onUnmounted(() => document.removeEventListener('keydown', onKeyDown, true))
</script>

<style scoped>
.confirm-overlay {
  position: fixed;
  inset: 0;
  z-index: 10050;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-5);
  background: rgba(0, 0, 0, 0.5);
}

.confirm-dialog {
  width: 100%;
  max-width: 420px;
  padding: var(--space-5);
  background: var(--bg);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  box-shadow: var(--ds-shadow-overlay);
  color: var(--text);
}

.confirm-title {
  margin: 0 0 var(--space-2) 0;
  font-size: 1.1rem;
  font-weight: 600;
}

.confirm-message {
  margin: 0;
  font-size: 0.95rem;
  line-height: 1.5;
  white-space: pre-line;
}

.confirm-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-2);
  margin-top: var(--space-5);
}

.confirm-btn {
  padding: var(--space-2) var(--space-4);
  border-radius: var(--radius-md);
  border: 1px solid var(--border-color);
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition:
    background 0.2s,
    border-color 0.2s,
    color 0.2s;
}

.confirm-btn:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.confirm-btn--secondary {
  background: var(--panel);
  color: var(--text);
}

.confirm-btn--secondary:hover {
  border-color: var(--accent);
}

.confirm-btn--primary {
  background: var(--accent);
  border-color: transparent;
  color: var(--accent-text);
}

.confirm-btn--danger {
  background: var(--red);
  border-color: transparent;
  color: white;
}

.confirm-btn--primary:hover,
.confirm-btn--danger:hover {
  opacity: 0.9;
}

.confirm-enter-active,
.confirm-leave-active {
  transition: opacity 0.15s ease;
}

.confirm-enter-from,
.confirm-leave-to {
  opacity: 0;
}
</style>
