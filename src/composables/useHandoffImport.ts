import { useI18n } from 'vue-i18n'
import { useImageStore } from '@/stores/imageStore'
import { useToast } from '@/composables/useToast'
import { handoffImageToFile, type HandoffImage } from '@/lib/core/handoff'

/**
 * Übernimmt Bilder aus einer KodiniTools-Übergabe (z. B. aus der Bildergalerie)
 * in die Bilderliste und meldet das Ergebnis per Toast.
 */
export function useHandoffImport() {
  const imageStore = useImageStore()
  const toast = useToast()
  const { t } = useI18n()

  /** Liefert die Anzahl der tatsächlich hinzugefügten Bilder. */
  async function importHandoffImages(images: HandoffImage[]): Promise<number> {
    const files: File[] = []
    for (const img of images) {
      try {
        files.push(handoffImageToFile(img))
      } catch (error) {
        console.error(`[Handoff] Bild ${img.name} konnte nicht umgewandelt werden:`, error)
      }
    }

    const before = imageStore.imageCount
    if (files.length) await imageStore.addImages(files)
    const added = imageStore.imageCount - before

    if (added > 0) toast.success(t('handoff.imported', added))
    else toast.error(t('handoff.importFailed'))
    return added
  }

  return { importHandoffImages }
}
