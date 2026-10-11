<template>
  <span
    v-for="(run, index) in runs"
    :key="index"
    :class="{ 'rich-bold': run.bold, 'rich-italic': run.italic }"
  >
    {{ run.text }}
  </span>
</template>

<script setup lang="ts">
// Zeigt **fett** / *kursiv* innerhalb eines Designer-Texts an (ohne v-html).
import { computed } from 'vue'
import { parseRichText } from '@/lib/designer/rich-text'

const props = defineProps<{ content: string }>()

const runs = computed(() => parseRichText(props.content))
</script>

<style scoped>
.rich-bold {
  font-weight: bold;
}

.rich-italic {
  font-style: italic;
}
</style>
