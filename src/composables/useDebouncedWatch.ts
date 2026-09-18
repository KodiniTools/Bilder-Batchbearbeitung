import { watch, onUnmounted, type WatchSource } from 'vue'

/**
 * Deep-Watch auf `source`, dessen Callback debounced ausgeführt wird.
 * Mehrere Änderungen innerhalb von `delayMs` lösen nur einen Aufruf aus
 * (z. B. für flüssige Slider-Bewegungen). Der laufende Timer wird beim
 * Unmount der aufrufenden Komponente aufgeräumt.
 */
export function useDebouncedWatch<T>(
  source: WatchSource<T>,
  callback: () => void,
  delayMs = 16
): void {
  let timer: ReturnType<typeof setTimeout> | null = null

  watch(
    source,
    () => {
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => {
        timer = null
        callback()
      }, delayMs)
    },
    { deep: true }
  )

  onUnmounted(() => {
    if (timer) clearTimeout(timer)
  })
}
