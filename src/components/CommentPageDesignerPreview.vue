<template>
  <Teleport to="body">
    <Transition name="preview-fade">
      <div v-if="modelValue" class="preview-overlay" @click.self="close">
        <div class="preview-modal">
          <div class="preview-header">
            <div class="preview-title">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                <circle cx="12" cy="12" r="3"></circle>
              </svg>
              Vorschau — Kommentarseiten
              <span class="orientation-badge" :class="orientation">
                {{ orientation === 'landscape' ? '⬛ Querformat' : '▯ Hochformat' }}
              </span>
            </div>

            <!-- Seitennavigation in Vorschau -->
            <div class="preview-page-nav">
              <button :disabled="previewPageIndex === 0" class="preview-nav-btn" @click="previewPageIndex--">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="15 18 9 12 15 6"></polyline>
                </svg>
              </button>
              <span class="preview-page-info">Seite {{ previewPageIndex + 1 }} von {{ pages.length }}</span>
              <button :disabled="previewPageIndex === pages.length - 1" class="preview-nav-btn" @click="previewPageIndex++">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
              </button>
            </div>

            <button class="preview-close-btn" @click="close">
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          <div class="preview-body">
            <div class="preview-page-wrapper">
              <div
                class="preview-canvas"
                :style="{
                  width: pageWidth + 'px',
                  height: pageHeight + 'px',
                  transform: `scale(${previewScale})`,
                  transformOrigin: 'top center'
                }"
              >
                <!-- Elemente der aktuellen Vorschauseite -->
                <template v-for="element in previewElements" :key="element.id">
                  <!-- Text -->
                  <div
                    v-if="element.type === 'text'"
                    class="preview-element"
                    :style="{
                      position: 'absolute',
                      left: element.x + 'px',
                      top: element.y + 'px',
                      width: element.width ? element.width + 'px' : 'auto',
                      height: element.height ? element.height + 'px' : 'auto',
                      fontSize: element.fontSize + 'px',
                      fontFamily: (element.fontFamily || 'Helvetica') + ', Arial, sans-serif',
                      color: element.color,
                      textAlign: element.align,
                      fontWeight: element.bold ? 'bold' : 'normal',
                      fontStyle: element.italic ? 'italic' : 'normal'
                    }"
                  >
                    <div class="preview-text-content">{{ element.content }}</div>
                  </div>
                  <!-- Bild -->
                  <div
                    v-else-if="element.type === 'image'"
                    class="preview-element"
                    :style="{
                      position: 'absolute',
                      left: element.x + 'px',
                      top: element.y + 'px',
                      width: element.width + 'px',
                      opacity: element.opacity
                    }"
                  >
                    <img :src="element.src" class="preview-image-content" draggable="false">
                  </div>
                </template>

                <!-- Footer-Vorschau wie im Editor -->
                <div class="canvas-footer-preview">
                  {{ new Date().toLocaleDateString('de-DE') }} · Kommentarseite {{ previewPageIndex + 1 }}{{ pages.length > 1 ? ` von ${pages.length}` : '' }}
                </div>
              </div>
              <div class="preview-page-shadow" :style="{ width: pageWidth * previewScale + 'px', height: pageHeight * previewScale + 'px' }"></div>
            </div>
          </div>

          <!-- Seiten-Dots -->
          <div v-if="pages.length > 1" class="preview-dots">
            <button
              v-for="(page, i) in pages"
              :key="page.id"
              :class="['preview-dot', { active: i === previewPageIndex }]"
              :title="`Seite ${i + 1}`"
              @click="previewPageIndex = i"
            ></button>
          </div>

          <div class="preview-footer">
            <button class="btn-secondary" @click="close">Schließen &amp; weiter bearbeiten</button>
            <button class="btn-primary" @click="save">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
              Speichern
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { CanvasElement } from '@/lib/features/export-pdf'
import type { CommentPage } from '@/composables/useCommentPages'

const props = defineProps<{
  modelValue: boolean
  pages: CommentPage[]
  pageWidth: number
  pageHeight: number
  orientation: string
  /** Page to show first when the preview opens. */
  initialPage: number
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  save: []
}>()

const previewPageIndex = ref(0)

// Jump to the requested page each time the preview is opened
watch(
    () => props.modelValue,
    (isOpen) => {
      if (isOpen) previewPageIndex.value = props.initialPage
    },
)

const previewScale = computed(() => {
  const maxW = window.innerWidth * 0.75
  const maxH = window.innerHeight * 0.68
  return Math.min(maxW / props.pageWidth, maxH / props.pageHeight, 1)
})

const previewElements = computed<CanvasElement[]>(
    () => props.pages[previewPageIndex.value]?.elements || [],
)

function close() {
  emit('update:modelValue', false)
}

function save() {
  emit('update:modelValue', false)
  emit('save')
}
</script>

<style scoped>
.orientation-badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  background: var(--accent);
  color: white;
  white-space: nowrap;
}

/* PDF Footer Preview — matches renderSingleCommentPage footer */
.canvas-footer-preview {
  position: absolute;
  bottom: 30px;
  left: 0;
  right: 0;
  text-align: center;
  font-family: Helvetica, Arial, sans-serif;
  font-size: 9px;
  line-height: 1;
  color: rgb(150, 150, 150);
  pointer-events: none;
  user-select: none;
}

.preview-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.78);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(4px);
}

.preview-modal {
  background: var(--panel, #1e1e2e);
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  max-width: 95vw;
  max-height: 95vh;
  overflow: hidden;
  box-shadow: 0 24px 64px rgba(0,0,0,0.55);
}

.preview-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 20px;
  border-bottom: 1px solid var(--border-color, #333);
  gap: 12px;
  flex-wrap: wrap;
}

.preview-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: 600;
  font-size: 1rem;
  color: var(--text, #fff);
}

.preview-page-nav {
  display: flex;
  align-items: center;
  gap: 10px;
}

.preview-nav-btn {
  background: none;
  border: 1px solid var(--border-color, #444);
  border-radius: 6px;
  cursor: pointer;
  color: var(--text, #fff);
  padding: 4px 8px;
  display: flex;
  transition: background 0.15s;
}
.preview-nav-btn:hover:not(:disabled) { background: var(--bg, #111); }
.preview-nav-btn:disabled { opacity: 0.3; cursor: not-allowed; }

.preview-page-info {
  font-size: 0.875rem;
  color: var(--muted, #aaa);
  white-space: nowrap;
}

.preview-close-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--muted, #888);
  padding: 4px;
  border-radius: 6px;
  display: flex;
  transition: color 0.15s;
}
.preview-close-btn:hover { color: var(--text, #fff); }

.preview-body {
  flex: 1;
  overflow: auto;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 24px;
}

.preview-page-wrapper {
  position: relative;
}

.preview-canvas {
  background: white;
  position: relative;
  overflow: hidden;
  box-shadow: 0 8px 32px rgba(0,0,0,0.3);
}

.preview-page-shadow {
  position: absolute;
  top: 5px;
  left: 5px;
  background: rgba(0,0,0,0.18);
  border-radius: 2px;
  z-index: -1;
  pointer-events: none;
}

.preview-element {
  pointer-events: none;
  user-select: none;
}

.preview-text-content {
  width: 100%;
  height: 100%;
  overflow: hidden;
  white-space: pre-wrap;
  word-break: break-word;
  padding: 8px;
  box-sizing: border-box;
  line-height: 1.5;
}

.preview-image-content {
  width: 100%;
  height: auto;
  display: block;
}

.preview-dots {
  display: flex;
  justify-content: center;
  gap: 8px;
  padding: 10px 0 4px;
}

.preview-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  border: none;
  background: var(--border-color, #444);
  cursor: pointer;
  padding: 0;
  transition: background 0.2s, transform 0.2s;
}
.preview-dot.active {
  background: var(--accent);
  transform: scale(1.3);
}

.preview-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 14px 20px;
  border-top: 1px solid var(--border-color, #333);
}

.btn-secondary,
.btn-primary {
  padding: 10px 24px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn-secondary {
  background: var(--bg);
  border: 1px solid var(--border-color);
  color: var(--text);
}

.btn-secondary:hover {
  background: var(--panel);
  border-color: var(--muted);
}

.btn-primary {
  background: linear-gradient(135deg, var(--accent) 0%, var(--accent-hover) 100%);
  border: none;
  color: var(--accent-text);
  font-weight: 600;
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px color-mix(in oklab, var(--accent) 40%, transparent);
}

.preview-fade-enter-active,
.preview-fade-leave-active {
  transition: opacity 0.2s;
}
.preview-fade-enter-from,
.preview-fade-leave-to {
  opacity: 0;
}
</style>
