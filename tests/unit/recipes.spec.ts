import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import { createI18n } from 'vue-i18n'
import de from '@/locales/de.json'
import {
  createRecipe,
  defaultRecipeExport,
  defaultRecipeRename,
  loadRecipes,
  mergeRecipes,
  parseRecipeFile,
  sanitizeRecipe,
  saveRecipes,
  serializeRecipes,
  type Recipe,
} from '@/lib/core/recipes'
import { defaultFilters, defaultTransforms, defaultWatermark } from '@/lib/core/types'
import { useRecipeStore } from '@/stores/recipes'
import { useConfirm } from '@/composables/useConfirm'
import BatchRecipesSection from '@/components/batch-edit/BatchRecipesSection.vue'

const i18n = createI18n({ legacy: false, locale: 'de', messages: { de } })

function recipe(name: string, patch: Partial<Recipe> = {}): Recipe {
  return {
    ...createRecipe(name, {
      filters: { ...defaultFilters, brightness: 120 },
      transforms: { ...defaultTransforms },
      watermark: { ...defaultWatermark, enabled: true, text: '© Shop' },
      resize: { width: 1200, height: 800, keepAspect: true },
      export: { ...defaultRecipeExport, format: 'webp', quality: 80 },
      rename: { ...defaultRecipeRename, baseName: 'produkt' },
    }),
    ...patch,
  }
}

beforeEach(() => {
  localStorage.clear()
  setActivePinia(createPinia())
})

describe('sanitizeRecipe', () => {
  it('ergänzt fehlende Werte und begrenzt Wertebereiche', () => {
    const r = sanitizeRecipe({
      name: '  Shop  ',
      filters: { brightness: 999, blur: -5, hue: 'rot' },
      transforms: { borderColor: 'red', borderWidth: 10 },
      watermark: { position: 'irgendwo', fontSize: 5, text: 'x' },
      export: { format: 'gif', quality: 0 },
      rename: { separator: '/', startNumber: 3.6 },
      resize: { width: 'gross' },
    })
    expect(r).not.toBeNull()
    expect(r?.name).toBe('Shop')
    expect(r?.filters).toMatchObject({ brightness: 200, blur: 0, hue: 0 })
    expect(r?.transforms).toMatchObject({ borderColor: '#000000', borderWidth: 10 })
    expect(r?.watermark).toMatchObject({ position: 'center', fontSize: 10, text: 'x' })
    expect(r?.export).toMatchObject({ format: 'png', quality: 1 })
    expect(r?.rename).toMatchObject({ separator: '-', startNumber: 4 })
    expect(r?.resize).toBeNull()
  })

  it('übernimmt und begrenzt die Zielgröße, ältere Rezepte bekommen Standardwerte', () => {
    const r = sanitizeRecipe({
      name: 'Web',
      export: {
        format: 'jpg',
        targetSizeEnabled: true,
        targetSizeKb: 3,
        targetSizeDownscale: 'ja',
      },
    })
    expect(r?.export).toMatchObject({
      targetSizeEnabled: true,
      targetSizeKb: 10,
      targetSizeDownscale: false,
    })
    expect(sanitizeRecipe({ name: 'Alt', export: { format: 'jpg' } })?.export).toMatchObject({
      targetSizeEnabled: false,
      targetSizeKb: 500,
      targetSizeDownscale: false,
    })
  })

  it('verwirft Einträge ohne Namen', () => {
    expect(sanitizeRecipe({ name: '   ' })).toBeNull()
    expect(sanitizeRecipe('kaputt')).toBeNull()
  })
})

describe('Speichern, Laden und JSON', () => {
  it('überlebt localStorage und JSON-Datei unverändert', () => {
    const list = [recipe('Shop'), recipe('Blog')]
    saveRecipes(list)
    expect(loadRecipes()).toEqual(list)
    expect(parseRecipeFile(serializeRecipes(list))).toEqual(list)
  })

  it('lehnt fremde Dateien ab', () => {
    expect(() => parseRecipeFile('{"format":"andere","recipes":[]}')).toThrow()
    expect(() => parseRecipeFile('{"format":"bilderserie-rezepte","recipes":[{}]}')).toThrow()
    expect(() => parseRecipeFile('kein json')).toThrow()
  })

  it('liefert bei kaputtem Speicher eine leere Liste', () => {
    localStorage.setItem('bilderserie-recipes', '{kaputt')
    expect(loadRecipes()).toEqual([])
  })
})

describe('mergeRecipes', () => {
  it('ersetzt gleichnamige Rezepte und behält deren ID', () => {
    const shop = recipe('Shop')
    const updated = recipe('shop', { export: { ...defaultRecipeExport, format: 'jpg' } })
    const merged = mergeRecipes([shop], [updated])
    expect(merged).toHaveLength(1)
    expect(merged[0].id).toBe(shop.id)
    expect(merged[0].export.format).toBe('jpg')
  })

  it('vergibt eine neue ID, wenn eine fremde ID schon belegt ist', () => {
    const shop = recipe('Shop')
    const merged = mergeRecipes([shop], [recipe('Blog', { id: shop.id })])
    expect(merged).toHaveLength(2)
    expect(merged[1].id).not.toBe(shop.id)
  })
})

describe('useRecipeStore', () => {
  it('merkt sich das angewendete Rezept und löst es beim Löschen', () => {
    const store = useRecipeStore()
    const shop = recipe('Shop')
    expect(store.saveRecipe(shop)).toBe(true)
    store.markApplied(shop.id)
    expect(store.activeRecipe?.name).toBe('Shop')
    expect(store.applyCount).toBe(1)
    store.removeRecipe(shop.id)
    expect(store.activeRecipe).toBeNull()
    expect(loadRecipes()).toEqual([])
  })

  it('übernimmt zuletzt verwendete Einstellungen bereinigt', () => {
    const store = useRecipeStore()
    store.rememberExport({ format: 'jpg', quality: 75, zipName: 'x', svgQuality: 'high' })
    expect(store.lastExport).toEqual({
      ...defaultRecipeExport,
      format: 'jpg',
      quality: 75,
      zipName: 'x',
    })
    store.rememberRename({ baseName: 'a', startNumber: 5, separator: '_', lowercase: false })
    expect(store.lastRename).toEqual({
      baseName: 'a',
      startNumber: 5,
      separator: '_',
      lowercase: false,
    })
  })
})

describe('BatchRecipesSection', () => {
  afterEach(() => useConfirm().settle(false))

  function mountSection() {
    return mount(BatchRecipesSection, {
      props: {
        filters: { ...defaultFilters, contrast: 140 },
        transforms: { ...defaultTransforms, borderWidth: 4 },
        watermark: { ...defaultWatermark },
        resize: { width: 800, height: 600, keepAspect: false },
      },
      global: { plugins: [i18n] },
    })
  }

  it('speichert den Panel-Zustand samt Export- und Umbenennen-Werten', async () => {
    const store = useRecipeStore()
    store.rememberExport({ format: 'webp', quality: 70 })
    const wrapper = mountSection()
    await wrapper.find('.recipes__input').setValue('Mein Rezept')
    await wrapper.find('form').trigger('submit')
    await nextTick()

    expect(store.recipes).toHaveLength(1)
    const saved = store.recipes[0]
    expect(saved.name).toBe('Mein Rezept')
    expect(saved.filters.contrast).toBe(140)
    expect(saved.transforms.borderWidth).toBe(4)
    expect(saved.resize).toEqual({ width: 800, height: 600, keepAspect: false })
    expect(saved.export).toMatchObject({ format: 'webp', quality: 70 })
    expect(wrapper.findAll('.recipe')).toHaveLength(1)
  })

  it('fragt vor dem Überschreiben eines gleichnamigen Rezepts', async () => {
    const store = useRecipeStore()
    store.saveRecipe(recipe('Shop'))
    const wrapper = mountSection()
    await wrapper.find('.recipes__input').setValue('shop')
    await wrapper.find('form').trigger('submit')
    expect(useConfirm().isOpen.value).toBe(true)
    useConfirm().settle(true)
    await new Promise((r) => setTimeout(r, 0))
    expect(store.recipes).toHaveLength(1)
    expect(store.recipes[0].filters.contrast).toBe(140)
  })

  it('meldet „Anwenden“ mit dem Rezept', async () => {
    const store = useRecipeStore()
    const shop = recipe('Shop')
    store.saveRecipe(shop)
    const wrapper = mountSection()
    await wrapper.find('.recipe__btn--primary').trigger('click')
    expect(wrapper.emitted('apply')?.[0]).toEqual([shop])
  })
})
