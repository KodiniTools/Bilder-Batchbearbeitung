<template>
  <Teleport to="body">
    <Transition name="wizard">
      <div v-if="isOpen" class="wizard-overlay" @click.self="handleClose">
        <div class="wizard-content">
          <!-- Success Header -->
          <div class="wizard-header">
            <div class="success-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
            </div>
            <h2 class="wizard-title">{{ t('wizard.title') }}</h2>
            <p class="wizard-summary">{{ getSummaryText() }}</p>
            <button class="close-btn" @click="handleClose" :title="t('buttons.close')">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          <!-- Action Cards -->
          <div class="wizard-body">
            <p class="wizard-question">{{ t('wizard.question') }}</p>

            <div class="action-grid">
              <!-- Continue Editing -->
              <button class="action-card action-continue" @click="handleClose">
                <div class="action-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                </div>
                <span class="action-label">{{ t('wizard.actions.continue') }}</span>
                <span class="action-hint">{{ t('wizard.actions.continueHint') }}</span>
              </button>

              <!-- New Project -->
              <button class="action-card action-new" @click="handleNewProject">
                <div class="action-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="12" y1="5" x2="12" y2="19"/>
                    <line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                </div>
                <span class="action-label">{{ t('wizard.actions.newProject') }}</span>
                <span class="action-hint">{{ t('wizard.actions.newProjectHint') }}</span>
              </button>
            </div>

            <!-- KodiniTools Cross-Navigation -->
            <div class="tools-divider">
              <span>{{ t('wizard.toolsTitle') }}</span>
            </div>

            <div class="tools-grid">
              <button
                class="tool-card"
                @click="handleToolNavigation('bildkonverter')"
              >
                <div class="tool-icon tool-icon-converter">
                  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="16 3 21 3 21 8"/>
                    <line x1="4" y1="20" x2="21" y2="3"/>
                    <polyline points="21 16 21 21 16 21"/>
                    <line x1="15" y1="15" x2="21" y2="21"/>
                    <line x1="4" y1="4" x2="9" y2="9"/>
                  </svg>
                </div>
                <div class="tool-info">
                  <span class="tool-name">{{ t('wizard.tools.converter.title') }}</span>
                  <span class="tool-desc">{{ t('wizard.tools.converter.description') }}</span>
                </div>
                <span class="tool-badge" v-if="imageStore.imageCount > 0">
                  {{ t('wizard.sendImages', { count: imageStore.imageCount }) }}
                </span>
                <span class="tool-arrow">&rarr;</span>
              </button>

              <button
                class="tool-card"
                @click="handleToolNavigation('collagemaker')"
              >
                <div class="tool-icon tool-icon-collage">
                  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="3" width="7" height="7"/>
                    <rect x="14" y="3" width="7" height="7"/>
                    <rect x="14" y="14" width="7" height="7"/>
                    <rect x="3" y="14" width="7" height="7"/>
                  </svg>
                </div>
                <div class="tool-info">
                  <span class="tool-name">{{ t('wizard.tools.collage.title') }}</span>
                  <span class="tool-desc">{{ t('wizard.tools.collage.description') }}</span>
                </div>
                <span class="tool-badge" v-if="imageStore.imageCount > 0">
                  {{ t('wizard.sendImages', { count: imageStore.imageCount }) }}
                </span>
                <span class="tool-arrow">&rarr;</span>
              </button>

              <button
                class="tool-card"
                @click="handleToolNavigation('color-extractor')"
              >
                <div class="tool-icon tool-icon-color">
                  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="13.5" cy="6.5" r="2.5"/>
                    <circle cx="17.5" cy="10.5" r="2.5"/>
                    <circle cx="8.5" cy="7.5" r="2.5"/>
                    <circle cx="6.5" cy="12.5" r="2.5"/>
                    <path d="M12 22C6.5 22 2 17.5 2 12S6.5 2 12 2s10 4.5 10 10-1.5 5-3 5c-1 0-2-.5-2-2 0-.5.1-1 .3-1.5"/>
                  </svg>
                </div>
                <div class="tool-info">
                  <span class="tool-name">{{ t('wizard.tools.colorExtractor.title') }}</span>
                  <span class="tool-desc">{{ t('wizard.tools.colorExtractor.description') }}</span>
                </div>
                <span class="tool-badge" v-if="imageStore.imageCount > 0">
                  {{ t('wizard.sendImages', { count: imageStore.imageCount }) }}
                </span>
                <span class="tool-arrow">&rarr;</span>
              </button>
            </div>
          </div>

          <!-- Footer -->
          <div class="wizard-footer">
            <button class="btn-home" @click="handleGoHome">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                <polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
              {{ t('wizard.backHome') }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useImageStore } from '@/stores/imageStore'
import { prepareHandoff, type HandoffTarget } from '@/lib/core/handoff'

const { t } = useI18n()
const router = useRouter()
const imageStore = useImageStore()

interface Props {
  isOpen: boolean
  exportType: 'pdf' | 'zip' | 'svg' | 'save' | null
  exportCount: number
}

const props = defineProps<Props>()
const emit = defineEmits<{
  close: []
  newProject: []
}>()

function getSummaryText(): string {
  if (!props.exportType) return ''
  return t(`wizard.summary.${props.exportType}`, { count: props.exportCount })
}

function handleClose() {
  emit('close')
}

function handleNewProject() {
  emit('newProject')
}

function handleGoHome() {
  emit('close')
  router.push('/')
}

function handleToolNavigation(target: HandoffTarget) {
  const canvases = imageStore.images.map(img => ({
    name: img.outputName || img.file.name,
    canvas: img.canvas
  }))

  const url = prepareHandoff(canvases, target)

  if (url) {
    window.open(url, '_blank', 'noopener')
  } else {
    // Fallback: open without handoff data
    const fallbackUrls: Record<HandoffTarget, string> = {
      'bildkonverter': 'https://kodinitools.com/bildkonverter/',
      'collagemaker': 'https://kodinitools.com/collagemaker/',
      'color-extractor': 'https://kodinitools.com/kodini-color-extractor/'
    }
    window.open(fallbackUrls[target], '_blank', 'noopener')
  }
}
</script>

<style scoped>
.wizard-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1100;
  padding: 20px;
}

.wizard-content {
  background: var(--bg);
  border-radius: var(--radius-2xl);
  width: 100%;
  max-width: 560px;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow:
    0 24px 48px -12px rgba(0, 0, 0, 0.25),
    0 0 0 1px var(--glass-border);
}

/* Header */
.wizard-header {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: var(--space-6) var(--space-5) var(--space-4);
  text-align: center;
  background: linear-gradient(
    180deg,
    color-mix(in oklab, var(--green) 8%, transparent) 0%,
    transparent 100%
  );
  border-bottom: 1px solid var(--glass-border);
}

.success-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--green), color-mix(in oklab, var(--green) 70%, var(--cyan)));
  color: white;
  margin-bottom: var(--space-3);
  animation: successPop 0.5s var(--ease-spring) both;
}

@keyframes successPop {
  from {
    transform: scale(0);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}

.wizard-title {
  margin: 0 0 var(--space-2);
  font-size: 1.35rem;
  font-weight: 700;
  color: var(--text);
}

.wizard-summary {
  margin: 0;
  font-size: 0.95rem;
  color: var(--muted);
  line-height: 1.5;
}

.close-btn {
  position: absolute;
  top: var(--space-3);
  right: var(--space-3);
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: var(--radius-md);
  color: var(--muted);
  transition: all 0.2s;
}

.close-btn:hover {
  background: var(--panel);
  color: var(--text);
}

/* Body */
.wizard-body {
  padding: var(--space-4) var(--space-5);
  overflow-y: auto;
  flex: 1;
}

.wizard-question {
  margin: 0 0 var(--space-4);
  font-size: 1rem;
  font-weight: 600;
  color: var(--text);
  text-align: center;
}

/* Action Grid */
.action-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-3);
  margin-bottom: var(--space-4);
}

.action-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-4);
  border-radius: var(--radius-lg);
  border: 1px solid var(--glass-border);
  background: var(--glass-bg);
  transition: all 0.3s var(--ease-spring);
  text-align: center;
}

.action-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--surface-elevation);
}

.action-continue:hover {
  border-color: color-mix(in oklab, var(--accent) 40%, var(--glass-border));
}

.action-new:hover {
  border-color: color-mix(in oklab, var(--green) 40%, var(--glass-border));
}

.action-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: var(--radius-md);
  color: var(--accent);
}

.action-continue .action-icon {
  background: color-mix(in oklab, var(--accent) 10%, transparent);
  color: var(--accent);
}

.action-new .action-icon {
  background: color-mix(in oklab, var(--green) 10%, transparent);
  color: var(--green);
}

.action-label {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--text);
}

.action-hint {
  font-size: 0.8rem;
  color: var(--muted);
  line-height: 1.4;
}

/* Tools Divider */
.tools-divider {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  margin-bottom: var(--space-4);
}

.tools-divider::before,
.tools-divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--glass-border);
}

.tools-divider span {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--muted);
  white-space: nowrap;
  letter-spacing: 0.02em;
}

/* Tools Grid */
.tools-grid {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.tool-card {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3);
  border-radius: var(--radius-lg);
  border: 1px solid var(--glass-border);
  background: var(--glass-bg);
  text-decoration: none;
  text-align: left;
  color: inherit;
  width: 100%;
  transition: all 0.3s var(--ease-spring);
}

.tool-card:hover {
  transform: translateX(4px);
  border-color: color-mix(in oklab, var(--accent) 30%, var(--glass-border));
  box-shadow: var(--surface-elevation);
}

.tool-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  border-radius: var(--radius-md);
  flex-shrink: 0;
}

.tool-icon-converter {
  background: color-mix(in oklab, var(--accent) 12%, transparent);
  color: var(--accent);
}

.tool-icon-collage {
  background: color-mix(in oklab, var(--purple) 12%, transparent);
  color: var(--purple);
}

.tool-icon-color {
  background: color-mix(in oklab, var(--secondary) 12%, transparent);
  color: var(--secondary);
}

.tool-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  min-width: 0;
}

.tool-name {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text);
}

.tool-desc {
  font-size: 0.8rem;
  color: var(--muted);
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.tool-badge {
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--accent);
  background: color-mix(in oklab, var(--accent) 10%, transparent);
  padding: 2px 8px;
  border-radius: 10px;
  white-space: nowrap;
  flex-shrink: 0;
}

.tool-arrow {
  font-size: 1.1rem;
  color: var(--muted);
  flex-shrink: 0;
  transition: transform 0.2s;
}

.tool-card:hover .tool-arrow {
  transform: translateX(4px);
  color: var(--accent);
}

/* Footer */
.wizard-footer {
  display: flex;
  justify-content: center;
  padding: var(--space-3) var(--space-5);
  border-top: 1px solid var(--glass-border);
}

.btn-home {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-4);
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--muted);
  border-radius: var(--radius-md);
  transition: all 0.2s;
}

.btn-home:hover {
  color: var(--text);
  background: var(--panel);
}

/* Transitions */
.wizard-enter-active {
  transition: opacity 0.3s var(--ease-smooth);
}

.wizard-enter-active .wizard-content {
  transition: transform 0.4s var(--ease-spring), opacity 0.3s var(--ease-smooth);
}

.wizard-leave-active {
  transition: opacity 0.25s var(--ease-smooth);
}

.wizard-leave-active .wizard-content {
  transition: transform 0.25s var(--ease-smooth), opacity 0.25s var(--ease-smooth);
}

.wizard-enter-from {
  opacity: 0;
}

.wizard-enter-from .wizard-content {
  transform: scale(0.92) translateY(20px);
  opacity: 0;
}

.wizard-leave-to {
  opacity: 0;
}

.wizard-leave-to .wizard-content {
  transform: scale(0.95);
  opacity: 0;
}

/* Responsive */
@media (max-width: 640px) {
  .wizard-overlay {
    padding: 10px;
  }

  .wizard-content {
    max-height: 95vh;
  }

  .wizard-header {
    padding: var(--space-5) var(--space-4) var(--space-3);
  }

  .wizard-body {
    padding: var(--space-3) var(--space-4);
  }

  .success-icon {
    width: 52px;
    height: 52px;
  }

  .success-icon svg {
    width: 26px;
    height: 26px;
  }
}

@media (max-width: 480px) {
  .wizard-overlay {
    padding: 0;
  }

  .wizard-content {
    max-height: 100dvh;
    border-radius: 0;
  }

  .action-grid {
    grid-template-columns: 1fr;
  }

  .wizard-body {
    padding: var(--space-3);
  }
}
</style>
