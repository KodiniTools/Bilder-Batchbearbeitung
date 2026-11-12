import { onMounted, onUnmounted, ref, type Ref } from 'vue'
import type { Theme } from '@/utils/theme'

/** Liest das aktuelle Theme aus html[data-theme]; alles außer 'dark' gilt als Light. */
function readDocumentTheme(): Theme {
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'
}

/**
 * Reaktives Theme aus html[data-theme].
 * Folgt auch Umschaltungen außerhalb von Vue (Theme-Schalter im SSI-Partial).
 */
export function useDocumentTheme(): Ref<Theme> {
  const theme = ref<Theme>(readDocumentTheme())
  let observer: MutationObserver | null = null

  onMounted(() => {
    theme.value = readDocumentTheme()
    observer = new MutationObserver(() => {
      theme.value = readDocumentTheme()
    })
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    })
  })

  onUnmounted(() => {
    observer?.disconnect()
    observer = null
  })

  return theme
}
