<!--
  HandoffReceiver.vue – Portable receiver banner for KodiniTools cross-tool handoff.

  INTEGRATION GUIDE (for other KodiniTools):
  ==========================================
  1. Copy this file + /src/lib/core/handoff.ts into your project
  2. Add the i18n keys from the `handoff` section (see locale files)
  3. Mount this component in your app's main page:

     <HandoffReceiver @accept="handleHandoffAccept" />

  4. Implement the accept handler to import images into your tool's store:

     function handleHandoffAccept(images: HandoffImage[]) {
       for (const img of images) {
         const canvas = await handoffImageToCanvas(img)
         // Add canvas to your tool's image store
       }
     }
-->
<template>
  <Transition name="handoff-banner">
    <div v-if="handoff" class="handoff-banner">
      <div class="handoff-inner">
        <div class="handoff-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
            <circle cx="8.5" cy="8.5" r="1.5"/>
            <polyline points="21 15 16 10 5 21"/>
          </svg>
        </div>

        <div class="handoff-text">
          <strong>{{ t('handoff.title', { count: handoff.images.length }) }}</strong>
          <span class="handoff-source">{{ t('handoff.from', { tool: sourceLabel }) }}</span>
        </div>

        <div class="handoff-thumbs">
          <div
            v-for="(img, i) in previewImages"
            :key="i"
            class="handoff-thumb"
          >
            <img :src="img.dataUrl" :alt="img.name" />
          </div>
          <span v-if="handoff.images.length > 4" class="handoff-more">
            +{{ handoff.images.length - 4 }}
          </span>
        </div>

        <div class="handoff-actions">
          <button class="btn-accept" @click="handleAccept">
            {{ t('handoff.accept') }}
          </button>
          <button class="btn-dismiss" @click="handleDismiss">
            {{ t('handoff.dismiss') }}
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  checkHandoff,
  consumeHandoff,
  dismissHandoff,
  type HandoffPayload,
  type HandoffImage
} from '@/lib/core/handoff'

const { t } = useI18n()

const handoff = ref<HandoffPayload | null>(null)

const emit = defineEmits<{
  accept: [images: HandoffImage[]]
}>()

const SOURCE_LABELS: Record<string, string> = {
  'bilder-batchbearbeitung': 'Bilder-Batchbearbeitung',
  'bildkonverter': 'Bildkonverter',
  'collagemaker': 'Collage Maker',
  'color-extractor': 'Color Extractor'
}

const sourceLabel = computed(() =>
  handoff.value ? (SOURCE_LABELS[handoff.value.source] || handoff.value.source) : ''
)

const previewImages = computed(() =>
  handoff.value ? handoff.value.images.slice(0, 4) : []
)

function handleAccept() {
  const images = consumeHandoff()
  if (images) {
    emit('accept', images)
  }
  handoff.value = null
}

function handleDismiss() {
  dismissHandoff()
  handoff.value = null
}

onMounted(() => {
  handoff.value = checkHandoff()
})
</script>

<style scoped>
.handoff-banner {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1050;
  padding: var(--space-2, 10px) var(--space-3, 14px);
  background: linear-gradient(
    135deg,
    color-mix(in oklab, var(--accent, #014f99) 15%, var(--panel, #fff)),
    color-mix(in oklab, var(--secondary, #c9984d) 8%, var(--panel, #fff))
  );
  border-bottom: 1px solid var(--glass-border, rgba(0,0,0,0.1));
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.12);
}

.handoff-inner {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  gap: var(--space-3, 14px);
  flex-wrap: wrap;
}

.handoff-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: var(--radius-md, 12px);
  background: color-mix(in oklab, var(--accent, #014f99) 12%, transparent);
  color: var(--accent, #014f99);
  flex-shrink: 0;
}

.handoff-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  min-width: 0;
}

.handoff-text strong {
  font-size: 0.9rem;
  color: var(--text, #0C0C10);
}

.handoff-source {
  font-size: 0.8rem;
  color: var(--muted, #5E5F69);
}

.handoff-thumbs {
  display: flex;
  align-items: center;
  gap: 6px;
}

.handoff-thumb {
  width: 36px;
  height: 36px;
  border-radius: var(--radius-sm, 8px);
  overflow: hidden;
  border: 1px solid var(--glass-border, rgba(0,0,0,0.1));
}

.handoff-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.handoff-more {
  font-size: 0.8rem;
  color: var(--muted, #5E5F69);
  font-weight: 600;
  padding-left: 4px;
}

.handoff-actions {
  display: flex;
  gap: var(--space-2, 10px);
  flex-shrink: 0;
}

.btn-accept {
  padding: 6px 16px;
  border-radius: var(--radius-md, 12px);
  background: var(--accent, #014f99);
  color: var(--accent-text, #F5F4D6);
  font-size: 0.85rem;
  font-weight: 600;
  transition: all 0.2s;
}

.btn-accept:hover {
  background: var(--accent-hover, #003971);
  transform: translateY(-1px);
}

.btn-dismiss {
  padding: 6px 12px;
  border-radius: var(--radius-md, 12px);
  background: transparent;
  color: var(--muted, #5E5F69);
  font-size: 0.85rem;
  transition: all 0.2s;
}

.btn-dismiss:hover {
  background: color-mix(in oklab, var(--text, #0C0C10) 8%, transparent);
  color: var(--text, #0C0C10);
}

/* Transition */
.handoff-banner-enter-active {
  transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s;
}

.handoff-banner-leave-active {
  transition: transform 0.25s ease, opacity 0.25s ease;
}

.handoff-banner-enter-from {
  transform: translateY(-100%);
  opacity: 0;
}

.handoff-banner-leave-to {
  transform: translateY(-100%);
  opacity: 0;
}

/* Responsive */
@media (max-width: 640px) {
  .handoff-inner {
    gap: var(--space-2, 10px);
  }

  .handoff-thumbs {
    display: none;
  }

  .handoff-actions {
    width: 100%;
    justify-content: flex-end;
  }
}
</style>
