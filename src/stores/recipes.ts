// src/stores/recipes.ts
// Eigene Rezepte (Stapelbearbeitung + Export + Umbenennen) und die zuletzt
// verwendeten Export-/Umbenennen-Einstellungen, aus denen ein neues Rezept
// gespeichert wird.

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import {
  defaultRecipeExport,
  defaultRecipeRename,
  loadRecipes,
  mergeRecipes,
  saveRecipes,
  sanitizeExportSettings,
  sanitizeRenameSettings,
  type Recipe,
  type RecipeExportSettings,
  type RecipeRenameSettings,
} from '@/lib/core/recipes'

export const useRecipeStore = defineStore('recipes', () => {
  const recipes = ref<Recipe[]>(loadRecipes())

  /** Zuletzt angewendetes Rezept; belegt Export- und Umbenennen-Dialog vor */
  const activeId = ref<string | null>(null)
  const activeRecipe = computed(() => recipes.value.find((r) => r.id === activeId.value) ?? null)

  /** Steigt bei jedem Anwenden, damit Dialoge auch dasselbe Rezept erneut übernehmen */
  const applyCount = ref(0)

  const lastExport = ref<RecipeExportSettings>({ ...defaultRecipeExport })
  const lastRename = ref<RecipeRenameSettings>({ ...defaultRecipeRename })

  /** Schreibt in localStorage; `false` bei vollem Speicher (Zustand bleibt unverändert) */
  function persist(next: Recipe[]): boolean {
    try {
      saveRecipes(next)
      recipes.value = next
      return true
    } catch (error) {
      console.error('Rezepte konnten nicht gespeichert werden:', error)
      return false
    }
  }

  function findByName(name: string): Recipe | undefined {
    const key = name.trim().toLowerCase()
    return recipes.value.find((r) => r.name.toLowerCase() === key)
  }

  /** Speichert ein Rezept; ein gleichnamiges wird ersetzt (Nachfrage übernimmt die UI). */
  function saveRecipe(recipe: Recipe): boolean {
    return persist(mergeRecipes(recipes.value, [recipe]))
  }

  function removeRecipe(id: string): boolean {
    const ok = persist(recipes.value.filter((r) => r.id !== id))
    if (ok && activeId.value === id) activeId.value = null
    return ok
  }

  function importRecipes(list: Recipe[]): boolean {
    return persist(mergeRecipes(recipes.value, list))
  }

  function markApplied(id: string): void {
    activeId.value = id
    applyCount.value++
  }

  function rememberExport(settings: unknown): void {
    lastExport.value = sanitizeExportSettings(settings)
  }

  function rememberRename(settings: unknown): void {
    lastRename.value = sanitizeRenameSettings(settings)
  }

  return {
    recipes,
    activeId,
    activeRecipe,
    applyCount,
    lastExport,
    lastRename,
    findByName,
    saveRecipe,
    removeRecipe,
    importRecipes,
    markApplied,
    rememberExport,
    rememberRename,
  }
})
