import { computed, shallowRef } from 'vue'

export interface ConfirmOptions {
  message: string
  title?: string
  confirmLabel?: string
  cancelLabel?: string
  /** Bestätigen-Button rot (Löschen, Leeren …) */
  danger?: boolean
  /** Nur Hinweis mit einem OK-Button (Ersatz für alert) */
  alertOnly?: boolean
}

interface ConfirmRequest extends ConfirmOptions {
  resolve: (ok: boolean) => void
}

// Ein Dialog für die ganze App (ConfirmDialog.vue rendert ihn)
const current = shallowRef<ConfirmRequest | null>(null)

/**
 * App-Dialoge statt window.confirm/alert. `confirm()` liefert true bei
 * Bestätigung, false bei Abbrechen/Esc/Klick daneben. Öffnet sich ein neuer
 * Dialog, während einer offen ist, gilt der alte als abgebrochen.
 */
export function useConfirm() {
  function confirm(options: ConfirmOptions | string): Promise<boolean> {
    const opts = typeof options === 'string' ? { message: options } : options
    current.value?.resolve(false)
    return new Promise((resolve) => {
      current.value = { ...opts, resolve }
    })
  }

  /** Hinweis mit OK-Button; wartet, bis er geschlossen ist. */
  async function alert(options: Omit<ConfirmOptions, 'alertOnly'> | string): Promise<void> {
    const opts = typeof options === 'string' ? { message: options } : options
    await confirm({ ...opts, alertOnly: true })
  }

  function settle(ok: boolean) {
    const req = current.value
    if (!req) return
    current.value = null
    req.resolve(ok)
  }

  return {
    request: computed(() => current.value),
    isOpen: computed(() => current.value !== null),
    confirm,
    alert,
    settle,
  }
}
