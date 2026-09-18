<template>
  <button class="section-toggle" type="button" @click="emit('update:open', !open)">
    <i :class="['fa-solid', icon]"></i>
    <span>{{ title }}</span>
    <i :class="['fa-solid', open ? 'fa-chevron-up' : 'fa-chevron-down']" class="toggle-icon"></i>
  </button>

  <div v-show="open" class="section-body">
    <slot />
  </div>
</template>

<script setup lang="ts">
/** Auf-/zuklappbarer Abschnitt im Stapelbearbeitungs-Panel */
defineProps<{
  /** Font-Awesome-Klasse des Icons, z. B. 'fa-stamp' */
  icon: string
  title: string
  open: boolean
}>()

const emit = defineEmits<{
  'update:open': [open: boolean]
}>()
</script>

<style scoped>
.section-toggle {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  width: 100%;
  padding: var(--space-3);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  background: var(--btn);
  color: var(--text);
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s var(--ease-smooth);
}

.section-toggle:hover {
  background: var(--btn-hover);
  border-color: var(--accent);
}

.section-toggle i:first-child {
  color: var(--accent);
}

.section-toggle .toggle-icon {
  margin-left: auto;
  font-size: 0.75rem;
  color: var(--muted);
}

.section-body {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  margin-top: var(--space-3);
}
</style>
