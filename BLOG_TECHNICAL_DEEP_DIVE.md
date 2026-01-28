# Web Audio API, Vue.js 3 & Moderne Browser-Technologien

> Eine umfassende Lernressource für Entwickler, die moderne Webtechnologien verstehen und anwenden möchten.

---

## Inhaltsverzeichnis

1. [Web Audio API](#1-web-audio-api)
2. [Vue.js 3 Composition API](#2-vuejs-3-composition-api)
3. [Canvas API für Bildverarbeitung](#3-canvas-api-für-bildverarbeitung)
4. [File API & Blob-Handling](#4-file-api--blob-handling)
5. [TypeScript in Vue 3](#5-typescript-in-vue-3)
6. [State Management mit Pinia](#6-state-management-mit-pinia)
7. [Web Workers für Performance](#7-web-workers-für-performance)
8. [Performance-Optimierung](#8-performance-optimierung)
9. [Sicherheit in Webanwendungen](#9-sicherheit-in-webanwendungen)
10. [Praktische Übungen](#10-praktische-übungen)

---

## Voraussetzungen

- Grundlegende JavaScript-Kenntnisse (ES6+)
- HTML und CSS Grundlagen
- Node.js und npm installiert

---

## 1. Web Audio API

Die Web Audio API ist eine leistungsstarke Browser-API für die Audioverarbeitung und -synthese. Sie ermöglicht komplexe Audioeffekte, Visualisierungen und Echtzeit-Audiomanipulation.

### 1.1 Grundkonzepte

Die Web Audio API basiert auf einem modularen Routing-System. Audio-Nodes werden miteinander verbunden und bilden einen Verarbeitungsgraphen.

| Konzept | Beschreibung |
|---------|-------------|
| **AudioContext** | Der zentrale Koordinator für alle Audio-Operationen. Verwaltet den Audio-Graph und die Zeitsteuerung. |
| **AudioNode** | Bausteine der Audio-Verarbeitung: Sources, Effects, Analyser und Destination. |
| **AudioBuffer** | Container für Audio-Daten im Speicher. Ermöglicht effiziente Wiedergabe und Manipulation. |
| **AudioParam** | Automatisierbare Parameter für präzise Steuerung von Lautstärke, Frequenz und mehr. |

### 1.2 Grundlegende Audio-Wiedergabe

```javascript
// AudioContext erstellen
const audioContext = new AudioContext();

// Audio-Datei laden und abspielen
async function playAudio(url) {
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

  // Source-Node erstellen
  const source = audioContext.createBufferSource();
  source.buffer = audioBuffer;

  // Gain-Node für Lautstärke
  const gainNode = audioContext.createGain();
  gainNode.gain.value = 0.5;

  // Nodes verbinden: Source -> Gain -> Destination
  source.connect(gainNode);
  gainNode.connect(audioContext.destination);

  // Abspielen
  source.start();
}

// Oszillator für Töne erzeugen
function playTone(frequency, duration) {
  const oscillator = audioContext.createOscillator();
  oscillator.type = 'sine'; // sine, square, sawtooth, triangle
  oscillator.frequency.value = frequency;

  const gainNode = audioContext.createGain();
  gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(
    0.001, audioContext.currentTime + duration
  );

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  oscillator.start();
  oscillator.stop(audioContext.currentTime + duration);
}
```

### 1.3 Audio-Analyse und Visualisierung

Mit dem AnalyserNode können Sie Frequenz- und Zeitbereichsdaten extrahieren und für Visualisierungen verwenden.

```javascript
// AnalyserNode für Frequenzanalyse
const analyser = audioContext.createAnalyser();
analyser.fftSize = 2048;
const bufferLength = analyser.frequencyBinCount;
const dataArray = new Uint8Array(bufferLength);

// Audio-Source mit Analyser verbinden
source.connect(analyser);
analyser.connect(audioContext.destination);

// Visualisierung mit Canvas
function visualize(canvas) {
  const ctx = canvas.getContext('2d');
  const width = canvas.width;
  const height = canvas.height;

  function draw() {
    requestAnimationFrame(draw);

    // Frequenzdaten abrufen
    analyser.getByteFrequencyData(dataArray);

    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, width, height);

    const barWidth = (width / bufferLength) * 2.5;
    let x = 0;

    for (let i = 0; i < bufferLength; i++) {
      const barHeight = (dataArray[i] / 255) * height;

      // Farbverlauf basierend auf Frequenz
      const hue = (i / bufferLength) * 360;
      ctx.fillStyle = `hsl(${hue}, 70%, 50%)`;

      ctx.fillRect(x, height - barHeight, barWidth, barHeight);
      x += barWidth + 1;
    }
  }

  draw();
}
```

### 1.4 Audio-Effekte

```javascript
// Biquad Filter für EQ
const filter = audioContext.createBiquadFilter();
filter.type = 'lowpass'; // lowpass, highpass, bandpass, etc.
filter.frequency.value = 1000;
filter.Q.value = 1;

// Convolver für Hall-Effekte
const convolver = audioContext.createConvolver();
// Impulse Response laden
const impulseResponse = await fetch('/impulse.wav');
const impulseBuffer = await audioContext.decodeAudioData(
  await impulseResponse.arrayBuffer()
);
convolver.buffer = impulseBuffer;

// Delay-Effekt
const delay = audioContext.createDelay(5.0);
delay.delayTime.value = 0.5;

// Verkettung: Source -> Filter -> Delay -> Convolver -> Destination
source.connect(filter);
filter.connect(delay);
delay.connect(convolver);
convolver.connect(audioContext.destination);
```

> **Tipp:** AudioContext muss durch eine Benutzerinteraktion gestartet werden (z.B. Klick), da Browser Autoplay blockieren.

---

## 2. Vue.js 3 Composition API

Vue.js 3 bringt die Composition API, die eine flexiblere und besser wiederverwendbare Codeorganisation ermöglicht.

### 2.1 Options API vs. Composition API

| Options API | Composition API |
|-------------|-----------------|
| Klassischer Ansatz mit `data`, `methods`, `computed` | Moderner Ansatz mit `setup()`, `ref()`, `reactive()` |
| Gut für einfache Komponenten | Ideal für komplexe Logik und Wiederverwendung |
| Logik nach Optionstyp gruppiert | Logik nach Feature gruppiert |

### 2.2 Reaktivitätssystem

Vue 3 verwendet ein Proxy-basiertes Reaktivitätssystem, das automatisch Abhängigkeiten trackt und Updates auslöst.

```vue
<script setup lang="ts">
import { ref, reactive, computed, watch, watchEffect } from 'vue'

// ref() für primitive Werte
const count = ref(0)
const name = ref('Vue')

// reactive() für Objekte
const user = reactive({
  name: 'Max',
  age: 25,
  settings: {
    theme: 'dark',
    notifications: true
  }
})

// computed() für berechnete Werte
const doubleCount = computed(() => count.value * 2)
const greeting = computed(() => `Hallo, ${user.name}!`)

// watch() für spezifische Reaktionen
watch(count, (newValue, oldValue) => {
  console.log(`Count: ${oldValue} -> ${newValue}`)
})

// watchEffect() für automatisches Tracking
watchEffect(() => {
  console.log(`User: ${user.name}, Theme: ${user.settings.theme}`)
})

// Methoden
const increment = () => count.value++
const updateUser = (newName: string) => user.name = newName
</script>

<template>
  <div>
    <p>Count: {{ count }} (Double: {{ doubleCount }})</p>
    <p>{{ greeting }}</p>
    <button @click="increment">+1</button>
  </div>
</template>
```

### 2.3 Composables erstellen

Composables sind wiederverwendbare Funktionen, die reaktive Logik kapseln. Sie folgen der Konvention `use*` im Namen.

```typescript
// composables/useAudio.ts
import { ref, onUnmounted } from 'vue'

export function useAudio() {
  const audioContext = ref<AudioContext | null>(null)
  const isPlaying = ref(false)
  const volume = ref(0.5)

  const initContext = () => {
    if (!audioContext.value) {
      audioContext.value = new AudioContext()
    }
    return audioContext.value
  }

  const playSound = async (url: string) => {
    const ctx = initContext()
    const response = await fetch(url)
    const buffer = await ctx.decodeAudioData(await response.arrayBuffer())

    const source = ctx.createBufferSource()
    const gainNode = ctx.createGain()

    source.buffer = buffer
    gainNode.gain.value = volume.value

    source.connect(gainNode)
    gainNode.connect(ctx.destination)

    source.start()
    isPlaying.value = true

    source.onended = () => {
      isPlaying.value = false
    }
  }

  const setVolume = (value: number) => {
    volume.value = Math.max(0, Math.min(1, value))
  }

  onUnmounted(() => {
    audioContext.value?.close()
  })

  return {
    isPlaying,
    volume,
    playSound,
    setVolume
  }
}
```

**Verwendung in einer Komponente:**

```vue
<script setup lang="ts">
import { useAudio } from '@/composables/useAudio'

const { isPlaying, volume, playSound, setVolume } = useAudio()
</script>
```

### 2.4 Lifecycle Hooks

| Hook | Beschreibung |
|------|-------------|
| `onMounted` | DOM ist bereit, externe APIs initialisieren |
| `onUpdated` | Nach jedem reaktiven Update |
| `onUnmounted` | Aufräumen, Event-Listener entfernen |
| `onBeforeMount` | Bevor das DOM erstellt wird |
| `onBeforeUpdate` | Vor dem Re-render |
| `onBeforeUnmount` | Vor dem Entfernen der Komponente |

```typescript
import { onMounted, onUnmounted } from 'vue'

onMounted(() => {
  console.log('Komponente wurde gemountet')
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  console.log('Komponente wird entfernt')
  window.removeEventListener('resize', handleResize)
})
```

---

## 3. Canvas API für Bildverarbeitung

Die Canvas API ermöglicht pixelgenaue Bildmanipulation direkt im Browser. Ideal für Filter, Transformationen und Echtzeit-Effekte.

### 3.1 Grundlagen

| Feature | Beschreibung |
|---------|-------------|
| **2D-Zeichnung** | Formen, Linien, Text und komplexe Pfade zeichnen |
| **Bildmanipulation** | Bilder laden, transformieren und pixelweise bearbeiten |
| **Filter & Effekte** | Helligkeit, Kontrast, Graustufen und mehr |
| **Export** | Als PNG, JPEG oder WebP exportieren |

### 3.2 Bildverarbeitung

```javascript
// Canvas für Bildverarbeitung
function processImage(image) {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')

  canvas.width = image.width
  canvas.height = image.height

  // Bild zeichnen
  ctx.drawImage(image, 0, 0)

  // Pixeldaten abrufen
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const data = imageData.data

  // Graustufenkonvertierung
  for (let i = 0; i < data.length; i += 4) {
    const avg = (data[i] + data[i + 1] + data[i + 2]) / 3
    data[i] = avg     // R
    data[i + 1] = avg // G
    data[i + 2] = avg // B
    // data[i + 3] ist Alpha, unverändert
  }

  // Verarbeitete Daten zurückschreiben
  ctx.putImageData(imageData, 0, 0)

  // Als Data-URL exportieren
  return canvas.toDataURL('image/png')
}
```

### 3.3 Bild-Transformationen

```javascript
// Bild drehen
function rotateImage(image, degrees) {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')

  const radians = (degrees * Math.PI) / 180
  const sin = Math.abs(Math.sin(radians))
  const cos = Math.abs(Math.cos(radians))

  // Neue Dimensionen berechnen
  canvas.width = image.width * cos + image.height * sin
  canvas.height = image.width * sin + image.height * cos

  // Ursprung zum Zentrum verschieben
  ctx.translate(canvas.width / 2, canvas.height / 2)
  ctx.rotate(radians)
  ctx.drawImage(image, -image.width / 2, -image.height / 2)

  return canvas.toDataURL('image/png')
}

// Bild spiegeln
function flipImage(image, horizontal = true) {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')

  canvas.width = image.width
  canvas.height = image.height

  if (horizontal) {
    ctx.translate(canvas.width, 0)
    ctx.scale(-1, 1)
  } else {
    ctx.translate(0, canvas.height)
    ctx.scale(1, -1)
  }

  ctx.drawImage(image, 0, 0)
  return canvas.toDataURL('image/png')
}
```

### 3.4 Filter-Implementierungen

```javascript
// Helligkeits- und Kontrastanpassung
function adjustBrightnessContrast(imageData, brightness, contrast) {
  const data = imageData.data
  const factor = (259 * (contrast + 255)) / (255 * (259 - contrast))

  for (let i = 0; i < data.length; i += 4) {
    for (let j = 0; j < 3; j++) {
      let value = data[i + j]
      // Helligkeit
      value += brightness
      // Kontrast
      value = factor * (value - 128) + 128
      // Clipping
      data[i + j] = Math.max(0, Math.min(255, value))
    }
  }

  return imageData
}

// Sättigung anpassen
function adjustSaturation(imageData, saturation) {
  const data = imageData.data
  const factor = (saturation + 100) / 100

  for (let i = 0; i < data.length; i += 4) {
    const gray = 0.2989 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]

    data[i] = Math.max(0, Math.min(255, gray + factor * (data[i] - gray)))
    data[i + 1] = Math.max(0, Math.min(255, gray + factor * (data[i + 1] - gray)))
    data[i + 2] = Math.max(0, Math.min(255, gray + factor * (data[i + 2] - gray)))
  }

  return imageData
}

// Weichzeichnung (Box Blur)
function applyBlur(imageData, radius) {
  const data = imageData.data
  const width = imageData.width
  const height = imageData.height
  const output = new Uint8ClampedArray(data)

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let r = 0, g = 0, b = 0, count = 0

      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const nx = x + dx
          const ny = y + dy

          if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
            const idx = (ny * width + nx) * 4
            r += data[idx]
            g += data[idx + 1]
            b += data[idx + 2]
            count++
          }
        }
      }

      const idx = (y * width + x) * 4
      output[idx] = r / count
      output[idx + 1] = g / count
      output[idx + 2] = b / count
    }
  }

  imageData.data.set(output)
  return imageData
}
```

> **Achtung:** Bei großen Bildern kann die Canvas-Verarbeitung den Hauptthread blockieren. Erwägen Sie Web Workers für intensive Operationen.

---

## 4. File API & Blob-Handling

Die File API ermöglicht den Zugriff auf vom Benutzer ausgewählte Dateien. Zusammen mit Blob und URL.createObjectURL bildet sie das Fundament für dateibasierte Webanwendungen.

### 4.1 Kern-APIs

| API | Beschreibung |
|-----|-------------|
| `File` | Repräsentiert eine Datei mit Metadaten wie Name, Größe und MIME-Type |
| `FileReader` | Liest Dateiinhalte als Text, ArrayBuffer oder Data-URL |
| `Blob` | Rohdaten-Container für binäre Daten beliebiger Art |
| `URL.createObjectURL()` | Erstellt eine temporäre URL für Blob-Objekte zur Anzeige oder Download |

### 4.2 Datei-Handling

```javascript
// Dateien per Drag & Drop oder Input laden
function handleFileInput(event) {
  const input = event.target
  const files = input.files

  if (files) {
    Array.from(files).forEach(processFile)
  }
}

// Drag & Drop Handler
function handleDrop(event) {
  event.preventDefault()
  const files = event.dataTransfer?.files

  if (files) {
    Array.from(files).forEach(processFile)
  }
}

// Datei verarbeiten
async function processFile(file) {
  console.log('Name:', file.name)
  console.log('Typ:', file.type)
  console.log('Größe:', file.size, 'Bytes')

  // Bild als Data-URL laden
  if (file.type.startsWith('image/')) {
    const dataUrl = await readAsDataURL(file)
    displayImage(dataUrl)
  }

  // Audio-Datei laden
  if (file.type.startsWith('audio/')) {
    const arrayBuffer = await readAsArrayBuffer(file)
    await playAudio(arrayBuffer)
  }
}
```

### 4.3 FileReader Promises

```javascript
// FileReader als Promise
function readAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function readAsArrayBuffer(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsArrayBuffer(file)
  })
}

function readAsText(file, encoding = 'UTF-8') {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsText(file, encoding)
  })
}
```

### 4.4 Blob erstellen und herunterladen

```javascript
// Blob erstellen und herunterladen
function downloadBlob(data, filename, type) {
  const blob = new Blob(data, { type })
  const url = URL.createObjectURL(blob)

  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()

  // Speicher freigeben
  URL.revokeObjectURL(url)
}

// JSON-Datei exportieren
function exportJSON(data, filename) {
  const json = JSON.stringify(data, null, 2)
  downloadBlob([json], filename, 'application/json')
}

// Canvas als Blob exportieren
function canvasToBlob(canvas, type = 'image/png', quality = 0.92) {
  return new Promise((resolve) => {
    canvas.toBlob(resolve, type, quality)
  })
}
```

### 4.5 Drag & Drop in Vue 3

```vue
<script setup lang="ts">
import { ref } from 'vue'

const isDragging = ref(false)
const files = ref<File[]>([])

const handleDragOver = (e: DragEvent) => {
  e.preventDefault()
  isDragging.value = true
}

const handleDragLeave = () => {
  isDragging.value = false
}

const handleDrop = (e: DragEvent) => {
  e.preventDefault()
  isDragging.value = false

  const droppedFiles = e.dataTransfer?.files
  if (droppedFiles) {
    files.value = [...files.value, ...Array.from(droppedFiles)]
  }
}
</script>

<template>
  <div
    class="dropzone"
    :class="{ 'is-dragging': isDragging }"
    @dragover="handleDragOver"
    @dragleave="handleDragLeave"
    @drop="handleDrop"
  >
    <p>Dateien hierher ziehen oder klicken</p>
    <input type="file" multiple @change="handleFileInput" />
  </div>
</template>
```

---

## 5. TypeScript in Vue 3

TypeScript bietet statische Typisierung für JavaScript und verbessert die Entwicklererfahrung durch bessere Autovervollständigung, Refactoring und Fehlererkennung.

### 5.1 Vorteile

| Vorteil | Beschreibung |
|---------|-------------|
| **Typsicherheit** | Fehler werden zur Compile-Zeit erkannt |
| **IDE-Unterstützung** | Bessere Autovervollständigung und Refactoring |
| **Selbstdokumentierend** | Typen dienen als Dokumentation |
| **Sicheres Refactoring** | Änderungen werden überall propagiert |

### 5.2 Typdefinitionen

```typescript
// types/image.ts - Typdefinitionen
export interface ImageFile {
  id: string
  name: string
  originalName: string
  size: number
  type: string
  dataUrl: string
  width: number
  height: number
  selected: boolean
  transformations: ImageTransformations
  filters: ImageFilters
}

export interface ImageTransformations {
  rotation: 0 | 90 | 180 | 270
  flipHorizontal: boolean
  flipVertical: boolean
  scale: number
}

export interface ImageFilters {
  brightness: number  // -100 to 100
  contrast: number    // -100 to 100
  saturation: number  // -100 to 100
  blur: number        // 0 to 20
}

export type ExportFormat = 'png' | 'jpeg' | 'webp' | 'bmp'

export interface ExportOptions {
  format: ExportFormat
  quality: number     // 0.1 to 1.0
  maxWidth?: number
  maxHeight?: number
}
```

### 5.3 Props und Emits typisieren

```vue
<script setup lang="ts">
import type { ImageFile, ExportOptions } from '@/types/image'

// Props typisieren
interface Props {
  image: ImageFile
  options?: ExportOptions
  onSave?: (dataUrl: string) => void
}

const props = withDefaults(defineProps<Props>(), {
  options: () => ({ format: 'png', quality: 0.92 })
})

// Emits typisieren
const emit = defineEmits<{
  (e: 'update', image: ImageFile): void
  (e: 'delete', id: string): void
  (e: 'select', id: string, selected: boolean): void
}>()

// Verwendung
const handleUpdate = () => {
  emit('update', props.image)
}
</script>
```

### 5.4 Generics und Type Guards

```typescript
// Generics für flexible Funktionen
function processImages<T extends ImageFile>(
  images: T[],
  processor: (img: T) => T
): T[] {
  return images.map(processor)
}

// Type Guards
function isImageFile(obj: unknown): obj is ImageFile {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'dataUrl' in obj &&
    typeof (obj as ImageFile).dataUrl === 'string'
  )
}

// Verwendung
function handleData(data: unknown) {
  if (isImageFile(data)) {
    // TypeScript weiß jetzt, dass data ein ImageFile ist
    console.log(data.name, data.width, data.height)
  }
}
```

### 5.5 Utility Types

```typescript
// Partial - alle Properties optional
type PartialImage = Partial<ImageFile>

// Pick - nur bestimmte Properties
type ImagePreview = Pick<ImageFile, 'id' | 'name' | 'dataUrl'>

// Omit - Properties ausschließen
type ImageWithoutTransforms = Omit<ImageFile, 'transformations' | 'filters'>

// Record - Object mit bestimmten Keys
type ImageCollection = Record<string, ImageFile>

// Required - alle Properties erforderlich
type RequiredOptions = Required<ExportOptions>
```

---

## 6. State Management mit Pinia

Pinia ist die offizielle State-Management-Lösung für Vue 3. Es bietet eine intuitive API, vollständige TypeScript-Unterstützung und DevTools-Integration.

### 6.1 Vorteile

| Feature | Beschreibung |
|---------|-------------|
| **Leichtgewichtig** | Minimaler Overhead |
| **TypeScript-first** | Volle Typisierung ohne Workarounds |
| **DevTools-Integration** | Time-travel debugging |
| **Modulare Stores** | Einfache Aufteilung nach Domäne |

### 6.2 Store Definition

```typescript
// stores/imageStore.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { ImageFile, ImageTransformations } from '@/types/image'

export const useImageStore = defineStore('images', () => {
  // State
  const images = ref<ImageFile[]>([])
  const isLoading = ref(false)

  // Getters
  const selectedImages = computed(() =>
    images.value.filter(img => img.selected)
  )

  const selectedCount = computed(() => selectedImages.value.length)

  const totalSize = computed(() =>
    images.value.reduce((sum, img) => sum + img.size, 0)
  )

  // Actions
  function addImage(image: ImageFile) {
    images.value.push(image)
  }

  function addImages(newImages: ImageFile[]) {
    images.value.push(...newImages)
  }

  function removeImage(id: string) {
    const index = images.value.findIndex(img => img.id === id)
    if (index !== -1) {
      images.value.splice(index, 1)
    }
  }

  function toggleSelection(id: string) {
    const image = images.value.find(img => img.id === id)
    if (image) {
      image.selected = !image.selected
    }
  }

  function selectAll() {
    images.value.forEach(img => img.selected = true)
  }

  function deselectAll() {
    images.value.forEach(img => img.selected = false)
  }

  function applyTransformation(
    id: string,
    transform: Partial<ImageTransformations>
  ) {
    const image = images.value.find(img => img.id === id)
    if (image) {
      Object.assign(image.transformations, transform)
    }
  }

  function applyToSelected(transform: Partial<ImageTransformations>) {
    selectedImages.value.forEach(img => {
      Object.assign(img.transformations, transform)
    })
  }

  function reorderImages(fromIndex: number, toIndex: number) {
    const [moved] = images.value.splice(fromIndex, 1)
    images.value.splice(toIndex, 0, moved)
  }

  function clearAll() {
    images.value = []
  }

  return {
    // State
    images,
    isLoading,
    // Getters
    selectedImages,
    selectedCount,
    totalSize,
    // Actions
    addImage,
    addImages,
    removeImage,
    toggleSelection,
    selectAll,
    deselectAll,
    applyTransformation,
    applyToSelected,
    reorderImages,
    clearAll
  }
})
```

### 6.3 Store in Komponenten verwenden

```vue
<script setup lang="ts">
import { useImageStore } from '@/stores/imageStore'
import { storeToRefs } from 'pinia'

const store = useImageStore()

// Reaktive Refs aus Store extrahieren
const { images, selectedCount, isLoading } = storeToRefs(store)

// Actions direkt verwenden (nicht destrukturieren mit storeToRefs!)
const handleSelect = (id: string) => store.toggleSelection(id)
const handleDelete = (id: string) => store.removeImage(id)
const handleSelectAll = () => store.selectAll()
</script>

<template>
  <div>
    <p>{{ selectedCount }} von {{ images.length }} ausgewählt</p>
    <button @click="handleSelectAll">Alle auswählen</button>

    <div v-for="image in images" :key="image.id">
      <img :src="image.dataUrl" :alt="image.name" />
      <button @click="handleSelect(image.id)">
        {{ image.selected ? 'Abwählen' : 'Auswählen' }}
      </button>
      <button @click="handleDelete(image.id)">Löschen</button>
    </div>
  </div>
</template>
```

---

## 7. Web Workers für Performance

Web Workers ermöglichen die Ausführung von JavaScript in Hintergrund-Threads, ohne den Hauptthread zu blockieren. Ideal für intensive Berechnungen.

### 7.1 Worker-Typen

| Typ | Beschreibung |
|-----|-------------|
| **Web Worker** | Eigener Thread für rechenintensive Aufgaben wie Bildverarbeitung |
| **Shared Worker** | Kann von mehreren Browsing-Contexts geteilt werden |
| **Service Worker** | Für Offline-Funktionalität, Caching und Push-Benachrichtigungen |

### 7.2 Web Worker für Bildverarbeitung

```typescript
// workers/imageProcessor.worker.ts
self.onmessage = async (event: MessageEvent) => {
  const { type, payload } = event.data

  switch (type) {
    case 'PROCESS_IMAGE':
      const result = await processImageData(payload)
      self.postMessage({ type: 'PROCESSED', payload: result })
      break

    case 'BATCH_PROCESS':
      const results = await processBatch(payload)
      self.postMessage({ type: 'BATCH_COMPLETE', payload: results })
      break
  }
}

async function processImageData(data: {
  imageData: ImageData
  filters: { brightness: number; contrast: number }
}) {
  const { imageData, filters } = data
  const pixels = imageData.data

  // Intensive Berechnung im Worker
  for (let i = 0; i < pixels.length; i += 4) {
    // Helligkeit
    pixels[i] = Math.min(255, pixels[i] + filters.brightness)
    pixels[i + 1] = Math.min(255, pixels[i + 1] + filters.brightness)
    pixels[i + 2] = Math.min(255, pixels[i + 2] + filters.brightness)

    // Kontrast
    const factor = (259 * (filters.contrast + 255)) / (255 * (259 - filters.contrast))
    pixels[i] = Math.min(255, Math.max(0, factor * (pixels[i] - 128) + 128))
    pixels[i + 1] = Math.min(255, Math.max(0, factor * (pixels[i + 1] - 128) + 128))
    pixels[i + 2] = Math.min(255, Math.max(0, factor * (pixels[i + 2] - 128) + 128))
  }

  return imageData
}

async function processBatch(images: ImageData[]) {
  const results = []
  for (let i = 0; i < images.length; i++) {
    // Fortschritt melden
    self.postMessage({
      type: 'PROGRESS',
      payload: { current: i + 1, total: images.length }
    })

    results.push(await processImageData({
      imageData: images[i],
      filters: { brightness: 10, contrast: 10 }
    }))
  }
  return results
}
```

### 7.3 Worker in Vue 3 verwenden

```typescript
// composables/useImageWorker.ts
import { ref, shallowRef, onUnmounted } from 'vue'

export function useImageWorker() {
  const worker = shallowRef<Worker | null>(null)
  const isProcessing = ref(false)
  const progress = ref(0)

  const initWorker = () => {
    if (!worker.value) {
      worker.value = new Worker(
        new URL('@/workers/imageProcessor.worker.ts', import.meta.url),
        { type: 'module' }
      )

      worker.value.onmessage = (event) => {
        const { type, payload } = event.data

        if (type === 'PROCESSED') {
          isProcessing.value = false
        }

        if (type === 'PROGRESS') {
          progress.value = (payload.current / payload.total) * 100
        }

        if (type === 'BATCH_COMPLETE') {
          isProcessing.value = false
          progress.value = 100
        }
      }

      worker.value.onerror = (error) => {
        console.error('Worker error:', error)
        isProcessing.value = false
      }
    }
    return worker.value
  }

  const processImage = (imageData: ImageData, filters: object) => {
    const w = initWorker()
    isProcessing.value = true
    progress.value = 0
    w.postMessage({
      type: 'PROCESS_IMAGE',
      payload: { imageData, filters }
    })
  }

  const processBatch = (images: ImageData[]) => {
    const w = initWorker()
    isProcessing.value = true
    progress.value = 0
    w.postMessage({
      type: 'BATCH_PROCESS',
      payload: images
    })
  }

  onUnmounted(() => {
    worker.value?.terminate()
  })

  return { isProcessing, progress, processImage, processBatch }
}
```

> **Tipp:** Verwenden Sie Transferable Objects für große Datenpuffer, um Kopierkosten zu vermeiden.

```javascript
// Transferable Objects verwenden
const buffer = imageData.data.buffer
worker.postMessage({ imageData }, [buffer]) // buffer wird transferiert, nicht kopiert
```

---

## 8. Performance-Optimierung

Eine schnelle Anwendung verbessert die Benutzererfahrung erheblich. Diese Techniken helfen, Vue-Anwendungen zu optimieren.

### 8.1 Optimierungstechniken

| Technik | Beschreibung |
|---------|-------------|
| **Lazy Loading** | Komponenten und Routen erst bei Bedarf laden |
| **Virtual Scrolling** | Nur sichtbare Elemente in langen Listen rendern |
| **Memoization** | Teure Berechnungen cachen mit `computed()` und `v-memo` |
| **Debouncing** | Häufige Events zusammenfassen für weniger Updates |

### 8.2 Code-Beispiele

```typescript
// Lazy Loading von Komponenten
const ImageEditor = defineAsyncComponent(() =>
  import('@/components/ImageEditor.vue')
)

// Route-basiertes Code-Splitting
const routes = [
  {
    path: '/editor',
    component: () => import('@/views/EditorView.vue')
  }
]
```

```typescript
// Debounce für häufige Events
function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>

  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => fn(...args), delay)
  }
}

// Throttle für regelmäßige Events
function throttle<T extends (...args: any[]) => any>(
  fn: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false

  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      fn(...args)
      inThrottle = true
      setTimeout(() => inThrottle = false, limit)
    }
  }
}

// Verwendung
const handleResize = debounce((width: number, height: number) => {
  // Resize-Logik
}, 150)

const handleScroll = throttle(() => {
  // Scroll-Logik
}, 100)
```

```vue
<!-- shallowRef für große Objekte -->
<script setup lang="ts">
import { shallowRef } from 'vue'

// Nur Referenz-Änderungen werden getrackt, nicht tiefe Änderungen
const imageData = shallowRef<ImageData | null>(null)

// Bei Änderung muss Referenz ersetzt werden
function updateImageData(newData: ImageData) {
  imageData.value = newData // Trigger Reaktivität
}
</script>

<!-- v-memo für bedingte Re-renders -->
<template>
  <div
    v-for="image in images"
    :key="image.id"
    v-memo="[image.selected, image.dataUrl]"
  >
    <ImageCard :image="image" />
  </div>
</template>
```

### 8.3 Intersection Observer für Lazy Loading

```typescript
// composables/useLazyLoad.ts
import { ref, onMounted, onUnmounted } from 'vue'

export function useLazyLoad(callback: () => void, options = {}) {
  const targetRef = ref<HTMLElement | null>(null)
  let observer: IntersectionObserver | null = null

  onMounted(() => {
    if (!targetRef.value) return

    observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        callback()
        observer?.disconnect()
      }
    }, { threshold: 0.1, ...options })

    observer.observe(targetRef.value)
  })

  onUnmounted(() => {
    observer?.disconnect()
  })

  return targetRef
}
```

### 8.4 Virtuelles Scrollen

```vue
<script setup lang="ts">
import { ref, computed } from 'vue'

const items = ref<Item[]>([]) // 10.000+ Items
const containerHeight = 600
const itemHeight = 50
const scrollTop = ref(0)

const visibleItems = computed(() => {
  const startIndex = Math.floor(scrollTop.value / itemHeight)
  const endIndex = Math.min(
    startIndex + Math.ceil(containerHeight / itemHeight) + 1,
    items.value.length
  )

  return items.value.slice(startIndex, endIndex).map((item, index) => ({
    ...item,
    style: {
      position: 'absolute',
      top: `${(startIndex + index) * itemHeight}px`,
      height: `${itemHeight}px`
    }
  }))
})

const totalHeight = computed(() => items.value.length * itemHeight)
</script>

<template>
  <div
    class="virtual-list"
    :style="{ height: `${containerHeight}px`, overflow: 'auto' }"
    @scroll="scrollTop = $event.target.scrollTop"
  >
    <div :style="{ height: `${totalHeight}px`, position: 'relative' }">
      <div
        v-for="item in visibleItems"
        :key="item.id"
        :style="item.style"
      >
        {{ item.name }}
      </div>
    </div>
  </div>
</template>
```

---

## 9. Sicherheit in Webanwendungen

Sicherheit ist ein kritischer Aspekt jeder Webanwendung. Diese Best Practices helfen, gängige Schwachstellen zu vermeiden.

### 9.1 Sicherheitspraktiken

| Praxis | Beschreibung |
|--------|-------------|
| **Content Security Policy** | HTTP-Header zur Kontrolle erlaubter Ressourcen |
| **XSS-Prävention** | Vue escaped automatisch, aber `v-html` erfordert Vorsicht |
| **CORS verstehen** | Cross-Origin Requests richtig konfigurieren |
| **Datenschutz** | Daten lokal verarbeiten, wenn möglich |

### 9.2 Input-Validierung

```typescript
// Input-Validierung
function validateImageFile(file: File): boolean {
  // Erlaubte MIME-Types
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

  if (!allowedTypes.includes(file.type)) {
    throw new Error('Ungültiger Dateityp')
  }

  // Maximale Dateigröße (10 MB)
  const maxSize = 10 * 1024 * 1024
  if (file.size > maxSize) {
    throw new Error('Datei zu groß')
  }

  return true
}

// Dateinamen bereinigen
function sanitizeFilename(name: string): string {
  return name
    .replace(/[^\w\s.-]/g, '') // Nur sichere Zeichen
    .replace(/\s+/g, '_')       // Leerzeichen ersetzen
    .substring(0, 255)          // Maximale Länge
}
```

### 9.3 Sichere URL-Erstellung

```typescript
// Sichere URL-Erstellung
function createSafeObjectURL(blob: Blob): string {
  const url = URL.createObjectURL(blob)

  // URL nach Verwendung freigeben
  setTimeout(() => URL.revokeObjectURL(url), 60000)

  return url
}

// URL-Validierung
function isValidUrl(string: string): boolean {
  try {
    const url = new URL(string)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}
```

### 9.4 XSS-Schutz

```typescript
// XSS-Schutz: Niemals unsanitized HTML rendern
// Vue's v-html nur mit sanitierten Daten verwenden
import DOMPurify from 'dompurify'

const sanitizedHtml = computed(() =>
  DOMPurify.sanitize(userInput.value)
)

// Alternativ: Text escapen
function escapeHtml(text: string): string {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}
```

### 9.5 Client-seitige Verarbeitung

```typescript
// Client-seitige Verarbeitung = Maximale Privatsphäre
// Keine Daten werden an Server gesendet
function processLocally(image: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = () => {
      // Alles passiert im Browser
      const result = processImage(reader.result as string)
      resolve(result)
    }
    reader.readAsDataURL(image)
  })
}
```

> **Maximale Privatsphäre:** Durch lokale Datenverarbeitung verlassen keine Daten den Browser. Keine Server-Uploads erforderlich.

---

## 10. Praktische Übungen

Setzen Sie das Gelernte in die Praxis um. Diese Übungen helfen Ihnen, die Konzepte zu festigen.

### 10.1 Einsteiger: Audio-Player mit Visualisierung

Erstellen Sie einen einfachen Audio-Player mit Frequenz-Visualisierung.

**Aufgaben:**
1. AudioContext und AnalyserNode einrichten
2. Canvas-Visualisierung implementieren
3. Play/Pause und Lautstärke-Kontrolle hinzufügen

**Hinweise:**
- Verwenden Sie `createBufferSource()` für die Wiedergabe
- `getByteFrequencyData()` liefert die Frequenzdaten
- Canvas `fillRect()` für die Balkenanzeige

### 10.2 Fortgeschritten: Bildergalerie mit Filtern

Eine Vue 3 Komponente für Bildanzeige mit Canvas-Filtern.

**Aufgaben:**
1. Drag & Drop Upload implementieren
2. Canvas-Filter (Helligkeit, Kontrast) hinzufügen
3. Pinia Store für Bildverwaltung erstellen

**Hinweise:**
- Verwenden Sie `reactive()` für die Filterwerte
- `computed()` für die gefilterte Vorschau
- Web Worker für intensive Filteroperationen

### 10.3 Experte: Echtzeit Audio-Visualizer

Kombinieren Sie Web Audio API mit Canvas für beeindruckende Visualisierungen.

**Aufgaben:**
1. Mikrofon-Input per `getUserMedia()` erfassen
2. FFT-Daten für Spektrumanalyse nutzen
3. Verschiedene Visualisierungsmodi implementieren (Bars, Waveform, Circular)

**Hinweise:**
- `navigator.mediaDevices.getUserMedia({ audio: true })`
- `MediaStreamAudioSourceNode` für Mikrofon-Input
- Experimentieren Sie mit verschiedenen `fftSize`-Werten

---

## Weiterführende Ressourcen

- [Vue.js 3 Official Guide](https://vuejs.org/guide/)
- [MDN Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
- [MDN Canvas API](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [Pinia State Management](https://pinia.vuejs.org/)
- [Vite Build Tool](https://vitejs.dev/)

---

## Zusammenfassung

Sie haben nun einen umfassenden Überblick über moderne Webtechnologien erhalten:

- **Web Audio API** für Audio-Verarbeitung und Visualisierung
- **Vue.js 3 Composition API** für reaktive Benutzeroberflächen
- **Canvas API** für Bildmanipulation
- **TypeScript** für Typsicherheit
- **Pinia** für State Management
- **Web Workers** für Performance
- **Sicherheits-Best-Practices** für robuste Anwendungen

Diese Konzepte bilden die Grundlage für leistungsfähige Browser-Anwendungen wie diese Bild-Batchbearbeitung.

---

*Diese Lernressource wird kontinuierlich erweitert und aktualisiert.*
