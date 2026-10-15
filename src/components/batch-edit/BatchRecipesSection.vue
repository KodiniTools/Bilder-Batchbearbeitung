<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRecipeStore } from '@/stores/recipes'
import { useToast } from '@/composables/useToast'
import { useConfirm } from '@/composables/useConfirm'
import { pickSaveFile, saveToTarget, SAVE_FILE_TYPES } from '@/lib/features/save-file'
import {
  createRecipe,
  parseRecipeFile,
  serializeRecipes,
  RECIPE_NAME_MAX,
  type Recipe,
  type RecipeRenameSettings,
  type RecipeResize,
} from '@/lib/core/recipes'
import type { ImageFilters, ImageTransforms, WatermarkSettings } from '@/lib/core/types'
import { defaultFilters, defaultTransforms } from '@/lib/core/types'

const props = defineProps<{
  /** Aktueller Zustand des Panels; wird beim Speichern ins Rezept übernommen */
  filters: ImageFilters
  transforms: ImageTransforms
  watermark: WatermarkSettings
  resize: RecipeResize
}>()

const emit = defineEmits<{
  apply: [recipe: Recipe]
}>()

const { t } = useI18n()
const toast = useToast()
const dialog = useConfirm()
const recipeStore = useRecipeStore()

const newName = ref('')
const importInput = ref<HTMLInputElement | null>(null)

const recipes = computed(() => recipeStore.recipes)

function countDiffs<T extends object>(current: T, defaults: T): number {
  return (Object.keys(defaults) as Array<keyof T>).filter((k) => current[k] !== defaults[k]).length
}

/** Erster Dateiname nach dem Umbenennen (vereinfachte Vorschau wie im Dialog) */
function renamePreview(r: RecipeRenameSettings): string {
  const name = `${r.baseName}${r.separator}${r.startNumber}`
  return r.lowercase ? name.toLowerCase() : name
}

/** Kurze Merkmale eines Rezepts für die Liste */
function summary(recipe: Recipe): string[] {
  const chips: string[] = []
  const filterCount = countDiffs(recipe.filters, defaultFilters)
  if (filterCount > 0) chips.push(t('batchEdit.recipes.chips.filters', { count: filterCount }))
  if (countDiffs(recipe.transforms, defaultTransforms) > 0) {
    chips.push(t('batchEdit.recipes.chips.transforms'))
  }
  if (recipe.watermark.enabled) chips.push(t('batchEdit.recipes.chips.watermark'))
  if (recipe.resize) chips.push(`${recipe.resize.width}×${recipe.resize.height}`)
  const format = recipe.export.format.toUpperCase()
  chips.push(recipe.export.format === 'png' ? format : `${format} ${recipe.export.quality} %`)
  if (recipe.export.targetSizeEnabled && recipe.export.format !== 'png') {
    chips.push(`≤ ${recipe.export.targetSizeKb} KB`)
  }
  chips.push(renamePreview(recipe.rename))
  return chips
}

/** Export- und Umbenennen-Werte, die beim Speichern übernommen werden */
const capturedHint = computed(() => {
  const e = recipeStore.lastExport
  const r = recipeStore.lastRename
  return t('batchEdit.recipes.capturedHint', {
    format: e.format.toUpperCase(),
    quality: e.quality,
    rename: renamePreview(r),
  })
})

async function save() {
  const name = newName.value.trim()
  if (!name) return
  const existing = recipeStore.findByName(name)
  if (existing) {
    const ok = await dialog.confirm({
      message: t('batchEdit.recipes.confirmOverwrite', { name: existing.name }),
      confirmLabel: t('batchEdit.recipes.overwrite'),
    })
    if (!ok) return
  }
  const recipe = createRecipe(name, {
    filters: props.filters,
    transforms: props.transforms,
    watermark: props.watermark,
    resize: props.resize,
    export: recipeStore.lastExport,
    rename: recipeStore.lastRename,
  })
  if (!recipeStore.saveRecipe(recipe)) {
    toast.error(t('batchEdit.recipes.storageFull'))
    return
  }
  newName.value = ''
  toast.success(t('batchEdit.recipes.saved', { name: recipe.name }))
}

function apply(recipe: Recipe) {
  emit('apply', recipe)
}

async function remove(recipe: Recipe) {
  const ok = await dialog.confirm({
    message: t('batchEdit.recipes.confirmDelete', { name: recipe.name }),
    confirmLabel: t('dialog.delete'),
    danger: true,
  })
  if (!ok) return
  if (!recipeStore.removeRecipe(recipe.id)) toast.error(t('batchEdit.recipes.storageFull'))
}

async function exportFile() {
  if (recipes.value.length === 0) return
  const target = await pickSaveFile('bilderserie-rezepte.json', SAVE_FILE_TYPES.json)
  if (!target) return
  try {
    const blob = new Blob([serializeRecipes(recipes.value)], { type: 'application/json' })
    await saveToTarget(target, blob)
  } catch (error) {
    console.error('Rezept-Export fehlgeschlagen:', error)
    toast.error(t('toast.exportError'))
  }
}

async function importFile(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  try {
    const imported = parseRecipeFile(await file.text())
    if (!recipeStore.importRecipes(imported)) {
      toast.error(t('batchEdit.recipes.storageFull'))
      return
    }
    toast.success(t('batchEdit.recipes.imported', { count: imported.length }))
  } catch (error) {
    console.warn('Rezept-Import fehlgeschlagen:', error)
    toast.error(t('batchEdit.recipes.importError'))
  }
}
</script>

<template>
  <div class="recipes">
    <p class="recipes__intro">{{ t('batchEdit.recipes.intro') }}</p>

    <ul v-if="recipes.length > 0" class="recipe-list">
      <li
        v-for="recipe in recipes"
        :key="recipe.id"
        class="recipe"
        :class="{ 'recipe--active': recipe.id === recipeStore.activeId }"
      >
        <div class="recipe__main">
          <span class="recipe__name">{{ recipe.name }}</span>
          <span class="recipe__chips">
            <span v-for="chip in summary(recipe)" :key="chip" class="recipe__chip">{{ chip }}</span>
          </span>
        </div>
        <div class="recipe__actions">
          <button
            type="button"
            class="recipe__btn recipe__btn--primary"
            :title="t('batchEdit.recipes.applyHint')"
            @click="apply(recipe)"
          >
            {{ t('batchEdit.recipes.apply') }}
          </button>
          <button
            type="button"
            class="recipe__btn recipe__btn--icon"
            :title="t('dialog.delete')"
            :aria-label="t('batchEdit.recipes.deleteNamed', { name: recipe.name })"
            @click="remove(recipe)"
          >
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>
      </li>
    </ul>
    <p v-else class="recipes__empty">{{ t('batchEdit.recipes.empty') }}</p>

    <form class="recipes__save" @submit.prevent="save">
      <span class="block-label">{{ t('batchEdit.recipes.saveTitle') }}</span>
      <div class="recipes__row">
        <input
          v-model="newName"
          type="text"
          class="recipes__input"
          :maxlength="RECIPE_NAME_MAX"
          :placeholder="t('batchEdit.recipes.namePlaceholder')"
          :aria-label="t('batchEdit.recipes.namePlaceholder')"
        />
        <button type="submit" class="recipe__btn recipe__btn--primary" :disabled="!newName.trim()">
          {{ t('batchEdit.recipes.save') }}
        </button>
      </div>
      <span class="recipes__hint">{{ capturedHint }}</span>
    </form>

    <div class="recipes__file">
      <button
        type="button"
        class="recipes__link"
        :disabled="recipes.length === 0"
        @click="exportFile"
      >
        <i class="fa-solid fa-file-export"></i>
        {{ t('batchEdit.recipes.export') }}
      </button>
      <button type="button" class="recipes__link" @click="importInput?.click()">
        <i class="fa-solid fa-file-import"></i>
        {{ t('batchEdit.recipes.import') }}
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

<style scoped>
.recipes {
  display: flex;
  flex-direction: column;
  gap: var(--ds-space-4);
}

.recipes__intro,
.recipes__empty,
.recipes__hint {
  margin: 0;
  font-size: var(--ds-text-sm);
  color: var(--ds-text-2);
  line-height: var(--ds-leading);
}

.recipes__hint {
  font-size: var(--ds-text-xs);
  color: var(--ds-text-3);
}

.block-label {
  font-size: var(--ds-text-xs);
  color: var(--ds-text-2);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-weight: var(--ds-weight-semibold);
}

.recipe-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--ds-space-2);
}

.recipe {
  display: flex;
  align-items: center;
  gap: var(--ds-space-3);
  padding: var(--ds-space-3);
  border: var(--ds-border-width) solid var(--ds-border);
  border-radius: var(--ds-radius-md);
  background: var(--ds-surface-1);
}

.recipe--active {
  border-color: var(--ds-accent);
  background: var(--ds-accent-soft);
}

.recipe__main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: var(--ds-space-1);
}

.recipe__name {
  font-size: var(--ds-text-sm);
  font-weight: var(--ds-weight-semibold);
  color: var(--ds-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.recipe__chips {
  display: flex;
  flex-wrap: wrap;
  gap: var(--ds-space-1);
}

.recipe__chip {
  padding: 1px var(--ds-space-2);
  border-radius: var(--ds-radius-full);
  background: var(--ds-surface-2);
  color: var(--ds-text-2);
  font-size: var(--ds-text-xs);
  white-space: nowrap;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
}

.recipe__actions {
  display: flex;
  gap: var(--ds-space-1);
  flex-shrink: 0;
}

.recipe__btn {
  height: var(--ds-control-sm);
  padding: 0 var(--ds-space-3);
  border: var(--ds-border-width) solid var(--ds-border);
  border-radius: var(--ds-radius-sm);
  background: var(--ds-surface-0);
  color: var(--ds-text);
  font-size: var(--ds-text-sm);
  font-weight: var(--ds-weight-medium);
  cursor: pointer;
  transition:
    color var(--ds-duration) var(--ds-ease),
    background-color var(--ds-duration) var(--ds-ease),
    border-color var(--ds-duration) var(--ds-ease);
}

.recipe__btn:hover:not(:disabled) {
  border-color: var(--ds-accent);
  color: var(--ds-accent);
}

.recipe__btn--primary {
  background: var(--ds-accent);
  border-color: var(--ds-accent);
  color: var(--ds-on-accent);
}

.recipe__btn--primary:hover:not(:disabled) {
  background: var(--ds-accent-hover);
  border-color: var(--ds-accent-hover);
  color: var(--ds-on-accent);
}

.recipe__btn--icon {
  width: var(--ds-control-sm);
  padding: 0;
}

.recipe__btn--icon:hover:not(:disabled) {
  border-color: var(--ds-danger);
  color: var(--ds-danger);
}

.recipe__btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.recipe__btn:focus-visible,
.recipes__input:focus-visible,
.recipes__link:focus-visible {
  outline: none;
  box-shadow: var(--ds-focus-ring);
}

.recipes__save {
  display: flex;
  flex-direction: column;
  gap: var(--ds-space-2);
  padding-top: var(--ds-space-4);
  border-top: var(--ds-border-width) solid var(--ds-border);
}

.recipes__row {
  display: flex;
  gap: var(--ds-space-2);
}

.recipes__input {
  flex: 1;
  min-width: 0;
  height: var(--ds-control-sm);
  padding: 0 var(--ds-space-3);
  border: var(--ds-border-width) solid var(--ds-border);
  border-radius: var(--ds-radius-sm);
  background: var(--ds-surface-0);
  color: var(--ds-text);
  font-size: var(--ds-text-sm);
}

.recipes__file {
  display: flex;
  justify-content: space-between;
  gap: var(--ds-space-2);
}

.recipes__link {
  display: inline-flex;
  align-items: center;
  gap: var(--ds-space-2);
  padding: var(--ds-space-1) 0;
  border: none;
  background: none;
  color: var(--ds-link);
  font-size: var(--ds-text-sm);
  cursor: pointer;
  transition: color var(--ds-duration) var(--ds-ease);
}

.recipes__link:hover:not(:disabled) {
  color: var(--ds-accent-hover);
}

.recipes__link:disabled {
  color: var(--ds-text-3);
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
