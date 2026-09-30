<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useImageStore } from '@/stores/imageStore'

const props = withDefaults(
  defineProps<{
    /** Anzahl der aktuell angezeigten Treffer (kann gefiltert sein). */
    matchCount: number
    /** Gesamtzahl der durchsuchten Bilder. */
    totalCount: number
  }>(),
  {}
)

const { t } = useI18n()
const imageStore = useImageStore()
const inputEl = ref<HTMLInputElement | null>(null)

const query = computed({
  get: () => imageStore.searchQuery,
  set: (value: string) => imageStore.setSearchQuery(value),
})

const hasQuery = computed(() => imageStore.isSearchActive)
const allMatchesSelected = computed(
  () => props.matchCount > 0 && imageStore.filteredImages.every((img) => img.selected)
)

function clear() {
  imageStore.setSearchQuery('')
  inputEl.value?.focus()
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && query.value) {
    event.stopPropagation()
    clear()
  }
}
</script>

<template>
  <div class="image-search" role="search">
    <div class="search-field">
      <i class="fa-solid fa-magnifying-glass search-icon" aria-hidden="true"></i>
      <input
        ref="inputEl"
        v-model="query"
        type="search"
        class="search-input"
        :placeholder="t('imageSearch.placeholder')"
        :aria-label="t('imageSearch.label')"
        autocomplete="off"
        spellcheck="false"
        @keydown="handleKeydown"
      />
      <button
        v-if="query"
        type="button"
        class="search-clear"
        :title="t('imageSearch.clear')"
        :aria-label="t('imageSearch.clear')"
        @click="clear"
      >
        <i class="fa-solid fa-xmark"></i>
      </button>
    </div>

    <template v-if="hasQuery">
      <span class="search-count" aria-live="polite">
        {{ t('imageSearch.results', { count: matchCount, total: totalCount }) }}
      </span>
      <button
        type="button"
        class="search-select"
        :disabled="matchCount === 0 || allMatchesSelected"
        :title="t('imageSearch.selectMatchesTooltip')"
        @click="imageStore.selectFilteredImages()"
      >
        <i class="fa-solid fa-check-double"></i>
        {{ t('imageSearch.selectMatches') }}
      </button>
    </template>
  </div>
</template>

<style scoped>
.image-search {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-3);
  margin-bottom: var(--space-4);
}

.search-field {
  position: relative;
  flex: 0 1 360px;
  min-width: 220px;
}

.search-icon {
  position: absolute;
  left: var(--space-3);
  top: 50%;
  transform: translateY(-50%);
  color: var(--muted);
  font-size: 0.9rem;
  pointer-events: none;
}

.search-input {
  width: 100%;
  padding: var(--space-2) calc(var(--space-3) + 28px) var(--space-2) calc(var(--space-3) + 24px);
  height: 40px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  background: var(--panel);
  color: var(--text);
  font-size: 0.95rem;
  transition:
    border-color 0.2s,
    box-shadow 0.2s;
}

/* Browser-eigenen Löschen-Button ausblenden (eigener Button vorhanden) */
.search-input::-webkit-search-cancel-button {
  appearance: none;
}

.search-input:focus {
  outline: none;
  border-color: var(--accent);
  box-shadow: 0 0 0 3px color-mix(in oklab, var(--accent) 20%, transparent);
}

.search-clear {
  position: absolute;
  right: var(--space-2);
  top: 50%;
  transform: translateY(-50%);
  width: 28px;
  height: 28px;
  display: grid;
  place-items: center;
  border: none;
  border-radius: var(--radius-md);
  background: none;
  color: var(--muted);
  cursor: pointer;
}

.search-clear:hover {
  background: var(--btn-hover);
  color: var(--text);
}

.search-count {
  font-size: 0.9rem;
  color: var(--muted);
  font-variant-numeric: tabular-nums;
}

.search-select {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  height: 40px;
  padding: 0 var(--space-3);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  background: var(--btn);
  color: var(--text);
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
}

.search-select:hover:not(:disabled) {
  background: var(--btn-hover);
}

.search-select:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

@media (max-width: 480px) {
  .search-field {
    flex: 1 1 100%;
  }
}
</style>
