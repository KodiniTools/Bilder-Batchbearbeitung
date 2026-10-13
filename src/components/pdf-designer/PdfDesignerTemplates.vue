<template>
  <div class="tool-section">
    <h3>{{ t('commentPageDesigner.templates.title') }}</h3>

    <div class="tpl-row">
      <select
        v-model="selectedId"
        class="tpl-select"
        :aria-label="t('commentPageDesigner.templates.choose')"
      >
        <option value="" disabled>{{ t('commentPageDesigner.templates.choose') }}</option>
        <optgroup :label="t('commentPageDesigner.templates.builtIn')">
          <option v-for="tpl in builtIns" :key="tpl.id" :value="tpl.id">{{ tpl.name }}</option>
        </optgroup>
        <optgroup v-if="ownTemplates.length > 0" :label="t('commentPageDesigner.templates.own')">
          <option v-for="tpl in ownTemplates" :key="tpl.id" :value="tpl.id">{{ tpl.name }}</option>
        </optgroup>
      </select>
    </div>

    <div class="tpl-row">
      <button type="button" class="tpl-btn tpl-btn--primary" :disabled="!selected" @click="apply">
        {{ t('commentPageDesigner.templates.apply') }}
      </button>
      <button
        v-if="selected && !selected.builtIn"
        type="button"
        class="tpl-btn tpl-btn--danger"
        @click="remove"
      >
        {{ t('dialog.delete') }}
      </button>
    </div>

    <form class="tpl-save" @submit.prevent="save">
      <input
        v-model="newName"
        type="text"
        maxlength="80"
        class="tpl-input"
        :placeholder="t('commentPageDesigner.templates.namePlaceholder')"
        :aria-label="t('commentPageDesigner.templates.namePlaceholder')"
      />
      <button
        type="submit"
        class="tpl-btn"
        :disabled="!newName.trim() || elements.length === 0"
        :title="t('commentPageDesigner.templates.saveHint')"
      >
        {{ t('commentPageDesigner.templates.save') }}
      </button>
    </form>

    <div class="tpl-row tpl-row--small">
      <button
        type="button"
        class="tpl-link"
        :disabled="allUserTemplates.length === 0"
        @click="exportFile"
      >
        {{ t('commentPageDesigner.templates.export') }}
      </button>
      <button type="button" class="tpl-link" @click="importInput?.click()">
        {{ t('commentPageDesigner.templates.import') }}
      </button>
      <input
        ref="importInput"
        type="file"
        accept="application/json,.json"
        class="visually-hidden"
        tabindex="-1"
        @change="importFile"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { PdfElement } from '@/lib/features/export-pdf'
import { pickSaveFile, saveToTarget, SAVE_FILE_TYPES } from '@/lib/features/save-file'
import { useToast } from '@/composables/useToast'
import { useConfirm } from '@/composables/useConfirm'
import { generateId } from '@/composables/usePdfPages'
import {
  builtInTemplates,
  createTemplate,
  instantiateTemplate,
  loadUserTemplates,
  parseTemplateFile,
  saveUserTemplates,
  serializeTemplates,
  type PdfTemplate,
  type TemplateMode,
} from '@/lib/designer/templates'

const { t } = useI18n()
const toast = useToast()
const dialog = useConfirm()

const props = defineProps<{
  mode: TemplateMode
  pageWidth: number
  pageHeight: number
  /** Elemente der aktuellen Seite (für „Als Vorlage speichern“) */
  elements: PdfElement[]
}>()

const emit = defineEmits<{
  /** Neue Elemente für die aktuelle Seite; der Designer fragt vor dem Ersetzen */
  apply: [elements: PdfElement[]]
}>()

const allUserTemplates = ref<PdfTemplate[]>(loadUserTemplates())
const selectedId = ref('')
const newName = ref('')
const importInput = ref<HTMLInputElement | null>(null)

const builtIns = computed(() =>
  builtInTemplates({
    names: {
      photobook: t('commentPageDesigner.templates.names.photobook'),
      report: t('commentPageDesigner.templates.names.report'),
      portfolio: t('commentPageDesigner.templates.names.portfolio'),
      note: t('commentPageDesigner.templates.names.note'),
      columns: t('commentPageDesigner.templates.names.columns'),
    },
    heading: t('commentPageDesigner.templates.sample.heading'),
    body: t('commentPageDesigner.templates.sample.body'),
    images: t('commentPageDesigner.templates.sample.images'),
  }).filter((tpl) => tpl.mode === props.mode)
)
const ownTemplates = computed(() => allUserTemplates.value.filter((tpl) => tpl.mode === props.mode))
const selected = computed(
  () =>
    [...builtIns.value, ...ownTemplates.value].find((tpl) => tpl.id === selectedId.value) ?? null
)

function persist(next: PdfTemplate[]): boolean {
  try {
    saveUserTemplates(next)
    allUserTemplates.value = next
    return true
  } catch (error) {
    console.error('Vorlagen konnten nicht gespeichert werden:', error)
    toast.error(t('commentPageDesigner.templates.storageFull'))
    return false
  }
}

function apply() {
  if (!selected.value) return
  const page = { width: props.pageWidth, height: props.pageHeight }
  emit('apply', instantiateTemplate(selected.value, page, generateId))
}

function save() {
  const name = newName.value.trim()
  if (!name || props.elements.length === 0) return
  const page = { width: props.pageWidth, height: props.pageHeight }
  const template = createTemplate(name, props.mode, page, props.elements, generateId())
  if (persist([...allUserTemplates.value, template])) {
    newName.value = ''
    selectedId.value = template.id
    toast.success(t('commentPageDesigner.templates.saved', { name }))
  }
}

async function remove() {
  const tpl = selected.value
  if (!tpl || tpl.builtIn) return
  const ok = await dialog.confirm({
    message: t('commentPageDesigner.templates.confirmDelete', { name: tpl.name }),
    confirmLabel: t('dialog.delete'),
    danger: true,
  })
  if (!ok) return
  if (persist(allUserTemplates.value.filter((x) => x.id !== tpl.id))) selectedId.value = ''
}

async function exportFile() {
  if (allUserTemplates.value.length === 0) return
  const blob = new Blob([serializeTemplates(allUserTemplates.value)], {
    type: 'application/json',
  })
  const target = await pickSaveFile('pdf-vorlagen.json', SAVE_FILE_TYPES.json)
  if (!target) return
  try {
    await saveToTarget(target, blob)
  } catch (error) {
    console.error('Vorlagen-Export fehlgeschlagen:', error)
    toast.error(t('toast.exportError'))
  }
}

async function importFile(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  try {
    const imported = parseTemplateFile(await file.text())
    // Gleiche ids nicht überschreiben: Importe bekommen neue ids
    const fresh = imported.map((tpl) => ({ ...tpl, id: generateId() }))
    if (persist([...allUserTemplates.value, ...fresh])) {
      toast.success(t('commentPageDesigner.templates.imported', { count: fresh.length }))
    }
  } catch (error) {
    console.error('Vorlagen-Import fehlgeschlagen:', error)
    toast.error(t('commentPageDesigner.templates.importError'))
  }
}
</script>

<style scoped>
.tool-section {
  background: var(--bg);
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 1px 3px var(--shadow-color);
  border: 1px solid var(--border-color);
}

.tool-section h3 {
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
  margin: 0 0 12px 0;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--border-color);
}

.tpl-row {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
}

.tpl-row--small {
  justify-content: space-between;
  margin: 4px 0 0;
}

.tpl-select,
.tpl-input {
  flex: 1;
  min-width: 0;
  padding: 8px 10px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--panel);
  color: var(--text);
  font-size: 13px;
}

.tpl-select:focus,
.tpl-input:focus {
  outline: none;
  border-color: var(--accent);
}

.tpl-save {
  display: flex;
  gap: 8px;
  margin: 12px 0 4px;
  padding-top: 12px;
  border-top: 1px solid var(--border-color);
}

.tpl-btn {
  flex: 1;
  padding: 8px 10px;
  border: 1px solid var(--border-color);
  background: var(--bg);
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  color: var(--text);
  cursor: pointer;
  transition: all 0.2s;
}

.tpl-save .tpl-btn {
  flex: 0 0 auto;
}

.tpl-btn:hover:not(:disabled) {
  background: var(--panel);
  border-color: var(--accent);
  color: var(--accent);
}

.tpl-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.tpl-btn--primary {
  background: var(--accent);
  border-color: var(--accent);
  color: var(--accent-text);
}

.tpl-btn--primary:hover:not(:disabled) {
  background: color-mix(in oklab, var(--accent) 85%, black);
  color: var(--accent-text);
}

.tpl-btn--danger {
  flex: 0 0 auto;
  color: var(--red);
}

.tpl-btn--danger:hover:not(:disabled) {
  border-color: var(--red);
  color: var(--red);
}

.tpl-link {
  padding: 4px 0;
  border: none;
  background: none;
  font-size: 12px;
  color: var(--muted);
  cursor: pointer;
  text-decoration: underline;
}

.tpl-link:hover:not(:disabled) {
  color: var(--accent);
}

.tpl-link:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
}
</style>
