# Migrations-Leitfaden: Vanilla JS → Vue 3

Dieser Leitfaden beschreibt die Konvertierung der Bildbearbeitungs-App von Vanilla JavaScript zu Vue 3 mit TypeScript.

## 🎯 Migrations-Übersicht

### Vorher (Vanilla JS)

- **index.html**: Monolithische HTML-Datei mit allem Code
- **main.js**: Ein großes JavaScript-File mit globalem State
- **Keine TypeScript-Unterstützung**
- **Keine State Management Library**
- **Manuelle DOM-Manipulation**
- **Inline Event Handlers**

### Nachher (Vue 3)

- **Komponentenbasierte Architektur**
- **TypeScript für Typsicherheit**
- **Pinia für State Management**
- **Reaktive Datenbindung**
- **Deklarative Templates**
- **Hot Module Replacement (HMR)**

## 📁 Dateistruktur-Mapping

### HTML → Vue Komponenten

| Vorher (HTML)                   | Nachher (Vue)                     |
| ------------------------------- | --------------------------------- |
| `<header class="app-header">`   | `AppHeader.vue`                   |
| `<div id="statusBar">`          | `StatusBar.vue`                   |
| `<section id="dropArea">`       | `DropZone.vue`                    |
| `<section id="imageContainer">` | `ImageGrid.vue` + `ImageCard.vue` |
| `<div id="loadingIndicator">`   | `LoadingIndicator.vue`            |

### JavaScript → TypeScript Module

| Vorher (JS)                   | Nachher (TS)                       |
| ----------------------------- | ---------------------------------- |
| `src/core/image-processor.js` | `src/lib/core/image-processor.ts`  |
| `src/features/export-pdf.js`  | `src/lib/features/export-pdf.ts`   |
| `src/features/export-zip.js`  | `src/lib/features/export-zip.ts`   |
| Globaler `state` Object       | `src/stores/imageStore.ts` (Pinia) |

## 🔄 Code-Migrations-Beispiele

### 1. State Management

**Vorher (Vanilla JS):**

```javascript
const state = {
  images: [],
  currentImageIndex: 0,
}

function addImage(imageObj) {
  state.images.push(imageObj)
}
```

**Nachher (Vue 3 + Pinia):**

```typescript
// stores/imageStore.ts
import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useImageStore = defineStore('images', () => {
  const images = ref<ImageObject[]>([])

  async function addImage(file: File) {
    const imageObj = await ImageProcessor.processFile(file)
    if (imageObj) images.value.push(imageObj)
  }

  return { images, addImage }
})
```

### 2. DOM-Manipulation → Reaktive Templates

**Vorher (Vanilla JS):**

```javascript
function createImageCard(imageObj) {
  const card = document.createElement('div')
  card.className = 'image-card'
  card.innerHTML = `
    <div class="image-preview">...</div>
    <div class="image-info">${imageObj.file.name}</div>
  `
  document.getElementById('imageContainer').appendChild(card)
}
```

**Nachher (Vue 3):**

```vue
<!-- ImageCard.vue -->
<template>
  <div class="image-card" :class="{ selected: image.selected }">
    <div class="image-preview">
      <canvas ref="previewCanvas" />
    </div>
    <div class="image-info">{{ displayName }}</div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{ image: ImageObject }>()
const displayName = computed(() => /* ... */)
</script>
```

### 3. Event Handling

**Vorher (Vanilla JS):**

```javascript
document.getElementById('selectAllButton').addEventListener('click', () => {
  state.images.forEach((img) => {
    img.selected = !allSelected
  })
  updateUI()
})
```

**Nachher (Vue 3):**

```vue
<template>
  <button @click="handleSelectAll">
    {{ t('statusBar.buttons.selectAll') }}
  </button>
</template>

<script setup lang="ts">
import { useImageStore } from '@/stores/imageStore'

const imageStore = useImageStore()

const handleSelectAll = () => {
  imageStore.selectAllImages()
}
</script>
```

### 4. Internationalisierung (i18n)

**Vorher (Vanilla JS):**

```javascript
// i18n.js
async function initializeI18n() {
  await i18next.init({
    lng: 'de',
    resources: { de, en },
  })
  updateContent()
}

function updateContent() {
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    el.textContent = i18next.t(el.getAttribute('data-i18n'))
  })
}
```

**Nachher (Vue 3 + vue-i18n):**

```typescript
// main.ts
import { createI18n } from 'vue-i18n'
import de from './locales/de.json'
import en from './locales/en.json'

const i18n = createI18n({
  locale: 'de',
  messages: { de, en },
})

app.use(i18n)
```

```vue
<!-- Komponente -->
<template>
  <h1>{{ t('header.title') }}</h1>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
const { t } = useI18n()
</script>
```

### 5. File Upload

**Vorher (Vanilla JS):**

```javascript
function handleFiles(files) {
  showLoading('Bilder werden geladen...')
  const arr = Array.from(files)
  arr.forEach((file) => {
    ImageProcessor.processFile(file, (result) => {
      if (result) {
        state.images.push(result)
        createImageCard(result)
        updateUI()
      }
    })
  })
  hideLoading()
}
```

**Nachher (Vue 3):**

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { useImageStore } from '@/stores/imageStore'

const imageStore = useImageStore()
const isLoading = ref(false)

const handleFiles = async (files: FileList | null) => {
  if (!files) return

  isLoading.value = true
  try {
    const fileArray = Array.from(files)
    await imageStore.addImages(fileArray)
  } finally {
    isLoading.value = false
  }
}
</script>
```

## 🏗️ Architektur-Änderungen

### 1. Wiederverwendbare Module in `src/lib/`

Die Core-Funktionalität wurde in `src/lib/` ausgelagert:

```
src/lib/
├── core/
│   ├── types.ts              # Alle TypeScript-Typen
│   └── image-processor.ts    # Bildverarbeitungslogik
└── features/
    ├── export-pdf.ts         # PDF-Export
    └── export-zip.ts         # ZIP-Export
```

**Vorteile:**

- ✅ Wiederverwendbar in anderen Projekten
- ✅ Unabhängig von Vue
- ✅ Einfach zu testen
- ✅ Klare Trennung von UI und Logik

### 2. State Management mit Pinia

**Vorteile:**

- ✅ Zentraler, typsicherer State
- ✅ DevTools-Integration
- ✅ Time-Travel Debugging
- ✅ Hot Module Replacement

### 3. Composition API

**Vorteile:**

- ✅ Bessere TypeScript-Integration
- ✅ Logik-Wiederverwendung durch Composables
- ✅ Klarere Code-Organisation
- ✅ Bessere Performance

## 🎨 Styling-Migration

### CSS-Variablen bleiben gleich

Alle CSS-Variablen und das Theme-System wurden beibehalten:

```css
:root {
  --accent: #005cda;
  --bg: #f0f0f0;
  /* ... */
}

:root[data-theme='dark'] {
  --accent: #6ea8fe;
  --bg: #0a0a0a;
  /* ... */
}
```

### Scoped Styles in Komponenten

```vue
<style scoped>
.image-card {
  /* Component-specific styles */
}
</style>
```

## 🚀 Build & Development

### Vorher

- **Kein Build-Prozess**
- Direkte Nutzung von HTML/JS/CSS
- Manuelle Dateiverkettung

### Nachher

- **Vite Build-Tool**
- Hot Module Replacement
- Optimierte Production Builds
- Code Splitting
- TypeScript Compilation

```bash
# Development
npm run dev

# Production Build
npm run build

# Preview Production Build
npm run preview
```

## 📝 TypeScript-Migration

### Typdefinitionen hinzugefügt

```typescript
// types.ts
export interface ImageObject {
  id: string
  file: File
  image: HTMLImageElement
  canvas: HTMLCanvasElement
  ctx: CanvasRenderingContext2D
  originalWidth: number
  originalHeight: number
  selected: boolean
  outputName: string
}
```

### Verwendung in Komponenten

```vue
<script setup lang="ts">
import type { ImageObject } from '@/lib/core/types'

const props = defineProps<{
  image: ImageObject
}>()
</script>
```

## 🔧 API-Kompatibilität

### ImageProcessor API bleibt gleich

Die `ImageProcessor`-Klasse behält ihre API:

```typescript
// Beide Versionen unterstützen:
ImageProcessor.processFile(file)
ImageProcessor.rotateImage(imageObj, 90)
ImageProcessor.resizeImage(imageObj, 800, 600)
ImageProcessor.convertToFormat(imageObj, format)
```

### PDF-Export API bleibt gleich

```typescript
// Beide Versionen unterstützen:
exportMultipleImagesAsPdf(images, settings)
```

## ✅ Checkliste für neue Features

Wenn Sie ein neues Feature hinzufügen:

- [ ] TypeScript-Typen definieren in `src/lib/core/types.ts`
- [ ] Core-Logik in `src/lib/` implementieren
- [ ] Pinia Store Actions hinzufügen (falls nötig)
- [ ] Vue-Komponenten erstellen
- [ ] i18n-Übersetzungen hinzufügen
- [ ] Tests schreiben (falls vorhanden)

## 🎓 Lernressourcen

- [Vue 3 Dokumentation](https://vuejs.org/)
- [Pinia Dokumentation](https://pinia.vuejs.org/)
- [TypeScript Handbuch](https://www.typescriptlang.org/docs/)
- [Vite Guide](https://vitejs.dev/guide/)
- [Vue I18n](https://vue-i18n.intlify.dev/)

## 💡 Best Practices

1. **Komponenten klein halten**: Eine Komponente = Eine Verantwortlichkeit
2. **TypeScript nutzen**: Typsicherheit vermeidet Bugs
3. **Composables für Logik**: Wiederverwendbare Logik in Composables auslagern
4. **Props typisieren**: Immer TypeScript-Interfaces für Props verwenden
5. **Computed für berechnete Werte**: Nutze `computed()` statt Methoden
6. **Async/Await**: Verwende moderne async/await Syntax

## 🐛 Häufige Probleme

### Problem: "Cannot find module '@/...'"

**Lösung**: Prüfe die `vite.config.ts` Alias-Konfiguration:

```typescript
resolve: {
  alias: {
    '@': fileURLToPath(new URL('./src', import.meta.url))
  }
}
```

### Problem: TypeScript-Fehler bei imports

**Lösung**: Stelle sicher, dass alle `.ts`/`.vue` Dateien in `tsconfig.json` inkludiert sind.

### Problem: i18n-Übersetzungen werden nicht geladen

**Lösung**: Prüfe, ob die JSON-Dateien korrekt in `main.ts` importiert werden.

---

## 🎉 Ergebnis

Die Migration zu Vue 3 bietet:

- ✅ **Bessere Developer Experience** durch HMR und DevTools
- ✅ **Typsicherheit** durch TypeScript
- ✅ **Wartbarer Code** durch Komponenten-Architektur
- ✅ **Bessere Performance** durch Reaktivität
- ✅ **Einfachere Tests** durch klare Trennung
- ✅ **Zukunftssicher** durch moderne Standards

Die Core-Funktionalität bleibt vollständig erhalten, während die Entwicklererfahrung deutlich verbessert wurde!
