import { ref, readonly } from 'vue'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

export interface Toast {
  id: number
  message: string
  type: ToastType
  duration: number
}

const toasts = ref<Toast[]>([])
let toastId = 0

export function useToast() {
  const addToast = (message: string, type: ToastType = 'info', duration: number = 4000) => {
    const id = ++toastId
    const toast: Toast = { id, message, type, duration }

    toasts.value.push(toast)

    // Auto-remove nach duration
    if (duration > 0) {
      setTimeout(() => {
        removeToast(id)
      }, duration)
    }

    return id
  }

  const removeToast = (id: number) => {
    const index = toasts.value.findIndex(t => t.id === id)
    if (index > -1) {
      toasts.value.splice(index, 1)
    }
  }

  const success = (message: string, duration?: number) => {
    return addToast(message, 'success', duration)
  }

  const error = (message: string, duration?: number) => {
    return addToast(message, 'error', duration ?? 6000)
  }

  const info = (message: string, duration?: number) => {
    return addToast(message, 'info', duration)
  }

  const warning = (message: string, duration?: number) => {
    return addToast(message, 'warning', duration ?? 5000)
  }

  const clearAll = () => {
    toasts.value = []
  }

  return {
    toasts: readonly(toasts),
    addToast,
    removeToast,
    success,
    error,
    info,
    warning,
    clearAll
  }
}
