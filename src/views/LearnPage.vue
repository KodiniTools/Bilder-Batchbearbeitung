<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'

const { locale, t } = useI18n()
const router = useRouter()
const activeSection = ref<string | null>(null)
const expandedCode = ref<string | null>(null)

const goToHome = () => {
  router.push('/')
}

const goToApp = () => {
  router.push('/app')
}

const scrollToSection = (id: string) => {
  const element = document.getElementById(id)
  if (element) {
    element.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}

const toggleCode = (id: string) => {
  expandedCode.value = expandedCode.value === id ? null : id
}

onMounted(() => {
  // Theme-Initialisierung als Fallback (SSI nav.html setzt Theme primär)
  if (!document.documentElement.getAttribute('data-theme')) {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const theme = savedTheme || (prefersDark ? 'dark' : 'light')
    document.documentElement.dataset.theme = theme
    localStorage.setItem('theme', theme)
  }

  const savedLang = localStorage.getItem('language')
  if (savedLang) {
    locale.value = savedLang
  }
})

const sections = [
  'webaudio', 'vue3', 'canvas', 'fileapi', 'typescript',
  'pinia', 'workers', 'performance', 'security', 'practice'
]
</script>

<template>
  <div class="learn-page">
    <!-- Navigation -->
    <nav class="learn-nav">
      <div class="nav-container">
        <button class="nav-brand" @click="goToHome">
          <i class="fa-solid fa-images"></i>
          <span>{{ t('landing.brand') }}</span>
        </button>
        <div class="nav-links">
          <button class="nav-link" @click="goToHome">
            <i class="fa-solid fa-home"></i>
            {{ t('landing.nav.home') }}
          </button>
          <button class="nav-link primary" @click="goToApp">
            <i class="fa-solid fa-rocket"></i>
            {{ t('landing.nav.app') }}
          </button>
        </div>
        <!-- Theme & Language Switcher sind jetzt in der globalen SSI Navigation -->
      </div>
    </nav>

    <!-- Hero -->
    <header class="learn-hero">
      <div class="hero-container">
        <div class="hero-badge">
          <i class="fa-solid fa-graduation-cap"></i>
          {{ t('learn.badge') }}
        </div>
        <h1>{{ t('learn.title') }}</h1>
        <p class="hero-subtitle">{{ t('learn.subtitle') }}</p>
        <div class="hero-tags">
          <span class="tag"><i class="fa-brands fa-vuejs"></i> Vue.js 3</span>
          <span class="tag"><i class="fa-solid fa-wave-square"></i> Web Audio API</span>
          <span class="tag"><i class="fa-solid fa-code"></i> TypeScript</span>
          <span class="tag"><i class="fa-solid fa-paint-brush"></i> Canvas API</span>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="learn-content">
      <div class="learn-container">
        <!-- Table of Contents -->
        <aside class="toc">
          <h3>{{ t('learn.toc') }}</h3>
          <nav>
            <button
              v-for="(section, index) in sections"
              :key="section"
              @click="scrollToSection(section)"
              class="toc-link"
            >
              {{ index + 1 }}. {{ t(`learn.sections.${section}.title`) }}
            </button>
          </nav>
        </aside>

        <!-- Article -->
        <article class="article">
          <!-- Introduction -->
          <section class="intro-section">
            <p>{{ t('learn.intro.p1') }}</p>
            <p>{{ t('learn.intro.p2') }}</p>
            <div class="prereq-box">
              <h4><i class="fa-solid fa-list-check"></i> {{ t('learn.intro.prereqTitle') }}</h4>
              <ul>
                <li>{{ t('learn.intro.prereq1') }}</li>
                <li>{{ t('learn.intro.prereq2') }}</li>
                <li>{{ t('learn.intro.prereq3') }}</li>
              </ul>
            </div>
          </section>

          <!-- Section 1: Web Audio API -->
          <section id="webaudio" class="content-section">
            <h2><span class="section-number">1</span> {{ t('learn.sections.webaudio.title') }}</h2>
            <p>{{ t('learn.sections.webaudio.intro') }}</p>

            <h3>{{ t('learn.sections.webaudio.basics.title') }}</h3>
            <p>{{ t('learn.sections.webaudio.basics.text') }}</p>

            <div class="concept-grid">
              <div class="concept-card">
                <div class="concept-icon"><i class="fa-solid fa-diagram-project"></i></div>
                <h4>AudioContext</h4>
                <p>{{ t('learn.sections.webaudio.concepts.context') }}</p>
              </div>
              <div class="concept-card">
                <div class="concept-icon"><i class="fa-solid fa-cube"></i></div>
                <h4>AudioNode</h4>
                <p>{{ t('learn.sections.webaudio.concepts.node') }}</p>
              </div>
              <div class="concept-card">
                <div class="concept-icon"><i class="fa-solid fa-waveform-lines"></i></div>
                <h4>AudioBuffer</h4>
                <p>{{ t('learn.sections.webaudio.concepts.buffer') }}</p>
              </div>
              <div class="concept-card">
                <div class="concept-icon"><i class="fa-solid fa-sliders"></i></div>
                <h4>AudioParam</h4>
                <p>{{ t('learn.sections.webaudio.concepts.param') }}</p>
              </div>
            </div>

            <div class="code-block">
              <div class="code-header">
                <span><i class="fa-brands fa-js"></i> Web Audio API Grundlagen</span>
                <button @click="toggleCode('webaudio1')" class="code-toggle">
                  {{ expandedCode === 'webaudio1' ? t('learn.hideCode') : t('learn.showCode') }}
                </button>
              </div>
              <pre v-show="expandedCode === 'webaudio1'"><code>// AudioContext erstellen
const audioContext = new AudioContext();

// Audio-Datei laden und abspielen
async function playAudio(url: string) {
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
function playTone(frequency: number, duration: number) {
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
}</code></pre>
            </div>

            <h3>{{ t('learn.sections.webaudio.analyser.title') }}</h3>
            <p>{{ t('learn.sections.webaudio.analyser.text') }}</p>

            <div class="code-block">
              <div class="code-header">
                <span><i class="fa-brands fa-js"></i> Audio-Visualisierung</span>
                <button @click="toggleCode('webaudio2')" class="code-toggle">
                  {{ expandedCode === 'webaudio2' ? t('learn.hideCode') : t('learn.showCode') }}
                </button>
              </div>
              <pre v-show="expandedCode === 'webaudio2'"><code>// AnalyserNode für Frequenzanalyse
const analyser = audioContext.createAnalyser();
analyser.fftSize = 2048;
const bufferLength = analyser.frequencyBinCount;
const dataArray = new Uint8Array(bufferLength);

// Audio-Source mit Analyser verbinden
source.connect(analyser);
analyser.connect(audioContext.destination);

// Visualisierung mit Canvas
function visualize(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
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
      ctx.fillStyle = \`hsl(\${hue}, 70%, 50%)\`;

      ctx.fillRect(x, height - barHeight, barWidth, barHeight);
      x += barWidth + 1;
    }
  }

  draw();
}</code></pre>
            </div>

            <div class="tip-box">
              <i class="fa-solid fa-lightbulb"></i>
              <div>
                <strong>{{ t('learn.tip') }}:</strong>
                {{ t('learn.sections.webaudio.tip') }}
              </div>
            </div>
          </section>

          <!-- Section 2: Vue.js 3 Composition API -->
          <section id="vue3" class="content-section">
            <h2><span class="section-number">2</span> {{ t('learn.sections.vue3.title') }}</h2>
            <p>{{ t('learn.sections.vue3.intro') }}</p>

            <div class="comparison-box">
              <div class="comparison-item">
                <h4><i class="fa-solid fa-code"></i> Options API</h4>
                <p>{{ t('learn.sections.vue3.optionsApi') }}</p>
              </div>
              <div class="vs-divider">VS</div>
              <div class="comparison-item highlight">
                <h4><i class="fa-solid fa-puzzle-piece"></i> Composition API</h4>
                <p>{{ t('learn.sections.vue3.compositionApi') }}</p>
              </div>
            </div>

            <h3>{{ t('learn.sections.vue3.reactivity.title') }}</h3>
            <p>{{ t('learn.sections.vue3.reactivity.text') }}</p>

            <div class="code-block">
              <div class="code-header">
                <span><i class="fa-brands fa-vuejs"></i> Reaktivität in Vue 3</span>
                <button @click="toggleCode('vue1')" class="code-toggle">
                  {{ expandedCode === 'vue1' ? t('learn.hideCode') : t('learn.showCode') }}
                </button>
              </div>
              <pre v-show="expandedCode === 'vue1'"><code>&lt;script setup lang="ts"&gt;
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
&lt;/script&gt;

&lt;template&gt;
  &lt;div&gt;
    &lt;p&gt;Count: {{ count }} (Double: {{ doubleCount }})&lt;/p&gt;
    &lt;p&gt;{{ greeting }}&lt;/p&gt;
    &lt;button @click="increment"&gt;+1&lt;/button&gt;
  &lt;/div&gt;
&lt;/template&gt;</code></pre>
            </div>

            <h3>{{ t('learn.sections.vue3.composables.title') }}</h3>
            <p>{{ t('learn.sections.vue3.composables.text') }}</p>

            <div class="code-block">
              <div class="code-header">
                <span><i class="fa-brands fa-vuejs"></i> Eigene Composables</span>
                <button @click="toggleCode('vue2')" class="code-toggle">
                  {{ expandedCode === 'vue2' ? t('learn.hideCode') : t('learn.showCode') }}
                </button>
              </div>
              <pre v-show="expandedCode === 'vue2'"><code>// composables/useAudio.ts
import { ref, onUnmounted } from 'vue'

export function useAudio() {
  const audioContext = ref&lt;AudioContext | null&gt;(null)
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

// Verwendung in einer Komponente
&lt;script setup lang="ts"&gt;
import { useAudio } from '@/composables/useAudio'

const { isPlaying, volume, playSound, setVolume } = useAudio()
&lt;/script&gt;</code></pre>
            </div>

            <h3>{{ t('learn.sections.vue3.lifecycle.title') }}</h3>
            <div class="lifecycle-grid">
              <div class="lifecycle-item">
                <code>onMounted</code>
                <span>{{ t('learn.sections.vue3.lifecycle.mounted') }}</span>
              </div>
              <div class="lifecycle-item">
                <code>onUpdated</code>
                <span>{{ t('learn.sections.vue3.lifecycle.updated') }}</span>
              </div>
              <div class="lifecycle-item">
                <code>onUnmounted</code>
                <span>{{ t('learn.sections.vue3.lifecycle.unmounted') }}</span>
              </div>
              <div class="lifecycle-item">
                <code>onBeforeMount</code>
                <span>{{ t('learn.sections.vue3.lifecycle.beforeMount') }}</span>
              </div>
            </div>
          </section>

          <!-- Section 3: Canvas API -->
          <section id="canvas" class="content-section">
            <h2><span class="section-number">3</span> {{ t('learn.sections.canvas.title') }}</h2>
            <p>{{ t('learn.sections.canvas.intro') }}</p>

            <div class="feature-grid">
              <div class="feature-box">
                <i class="fa-solid fa-draw-polygon"></i>
                <h4>{{ t('learn.sections.canvas.features.draw') }}</h4>
                <p>{{ t('learn.sections.canvas.features.drawDesc') }}</p>
              </div>
              <div class="feature-box">
                <i class="fa-solid fa-image"></i>
                <h4>{{ t('learn.sections.canvas.features.image') }}</h4>
                <p>{{ t('learn.sections.canvas.features.imageDesc') }}</p>
              </div>
              <div class="feature-box">
                <i class="fa-solid fa-filter"></i>
                <h4>{{ t('learn.sections.canvas.features.filter') }}</h4>
                <p>{{ t('learn.sections.canvas.features.filterDesc') }}</p>
              </div>
              <div class="feature-box">
                <i class="fa-solid fa-download"></i>
                <h4>{{ t('learn.sections.canvas.features.export') }}</h4>
                <p>{{ t('learn.sections.canvas.features.exportDesc') }}</p>
              </div>
            </div>

            <div class="code-block">
              <div class="code-header">
                <span><i class="fa-brands fa-js"></i> Bildverarbeitung mit Canvas</span>
                <button @click="toggleCode('canvas1')" class="code-toggle">
                  {{ expandedCode === 'canvas1' ? t('learn.hideCode') : t('learn.showCode') }}
                </button>
              </div>
              <pre v-show="expandedCode === 'canvas1'"><code>// Canvas für Bildverarbeitung
function processImage(image: HTMLImageElement): string {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')!

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

// Bild drehen
function rotateImage(image: HTMLImageElement, degrees: number): string {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')!

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

// Helligkeits- und Kontrastanpassung
function adjustBrightnessContrast(
  imageData: ImageData,
  brightness: number, // -100 bis 100
  contrast: number    // -100 bis 100
): ImageData {
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
}</code></pre>
            </div>

            <div class="warning-box">
              <i class="fa-solid fa-triangle-exclamation"></i>
              <div>
                <strong>{{ t('learn.warning') }}:</strong>
                {{ t('learn.sections.canvas.warning') }}
              </div>
            </div>
          </section>

          <!-- Section 4: File API -->
          <section id="fileapi" class="content-section">
            <h2><span class="section-number">4</span> {{ t('learn.sections.fileapi.title') }}</h2>
            <p>{{ t('learn.sections.fileapi.intro') }}</p>

            <div class="api-list">
              <div class="api-item">
                <h4><code>File</code></h4>
                <p>{{ t('learn.sections.fileapi.file') }}</p>
              </div>
              <div class="api-item">
                <h4><code>FileReader</code></h4>
                <p>{{ t('learn.sections.fileapi.reader') }}</p>
              </div>
              <div class="api-item">
                <h4><code>Blob</code></h4>
                <p>{{ t('learn.sections.fileapi.blob') }}</p>
              </div>
              <div class="api-item">
                <h4><code>URL.createObjectURL()</code></h4>
                <p>{{ t('learn.sections.fileapi.objecturl') }}</p>
              </div>
            </div>

            <div class="code-block">
              <div class="code-header">
                <span><i class="fa-brands fa-js"></i> Datei-Handling</span>
                <button @click="toggleCode('file1')" class="code-toggle">
                  {{ expandedCode === 'file1' ? t('learn.hideCode') : t('learn.showCode') }}
                </button>
              </div>
              <pre v-show="expandedCode === 'file1'"><code>// Dateien per Drag & Drop oder Input laden
function handleFileInput(event: Event) {
  const input = event.target as HTMLInputElement
  const files = input.files

  if (files) {
    Array.from(files).forEach(processFile)
  }
}

// Drag & Drop Handler
function handleDrop(event: DragEvent) {
  event.preventDefault()
  const files = event.dataTransfer?.files

  if (files) {
    Array.from(files).forEach(processFile)
  }
}

// Datei verarbeiten
async function processFile(file: File) {
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

// FileReader Promises
function readAsDataURL(file: File): Promise&lt;string&gt; {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function readAsArrayBuffer(file: File): Promise&lt;ArrayBuffer&gt; {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as ArrayBuffer)
    reader.onerror = reject
    reader.readAsArrayBuffer(file)
  })
}

// Blob erstellen und herunterladen
function downloadBlob(data: BlobPart[], filename: string, type: string) {
  const blob = new Blob(data, { type })
  const url = URL.createObjectURL(blob)

  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()

  // Speicher freigeben
  URL.revokeObjectURL(url)
}</code></pre>
            </div>
          </section>

          <!-- Section 5: TypeScript -->
          <section id="typescript" class="content-section">
            <h2><span class="section-number">5</span> {{ t('learn.sections.typescript.title') }}</h2>
            <p>{{ t('learn.sections.typescript.intro') }}</p>

            <div class="benefits-grid">
              <div class="benefit-card">
                <i class="fa-solid fa-shield-check"></i>
                <h4>{{ t('learn.sections.typescript.benefits.safety') }}</h4>
              </div>
              <div class="benefit-card">
                <i class="fa-solid fa-brain"></i>
                <h4>{{ t('learn.sections.typescript.benefits.intellisense') }}</h4>
              </div>
              <div class="benefit-card">
                <i class="fa-solid fa-book"></i>
                <h4>{{ t('learn.sections.typescript.benefits.docs') }}</h4>
              </div>
              <div class="benefit-card">
                <i class="fa-solid fa-rotate"></i>
                <h4>{{ t('learn.sections.typescript.benefits.refactor') }}</h4>
              </div>
            </div>

            <div class="code-block">
              <div class="code-header">
                <span><i class="fa-brands fa-js"></i> TypeScript mit Vue 3</span>
                <button @click="toggleCode('ts1')" class="code-toggle">
                  {{ expandedCode === 'ts1' ? t('learn.hideCode') : t('learn.showCode') }}
                </button>
              </div>
              <pre v-show="expandedCode === 'ts1'"><code>// types/image.ts - Typdefinitionen
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

// Props mit defineProps typisieren
&lt;script setup lang="ts"&gt;
import type { ImageFile, ExportOptions } from '@/types/image'

interface Props {
  image: ImageFile
  options?: ExportOptions
  onSave?: (dataUrl: string) => void
}

const props = withDefaults(defineProps&lt;Props&gt;(), {
  options: () => ({ format: 'png', quality: 0.92 })
})

// Emits typisieren
const emit = defineEmits&lt;{
  (e: 'update', image: ImageFile): void
  (e: 'delete', id: string): void
  (e: 'select', id: string, selected: boolean): void
}&gt;()

// Generics für flexible Funktionen
function processImages&lt;T extends ImageFile&gt;(
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
&lt;/script&gt;</code></pre>
            </div>
          </section>

          <!-- Section 6: Pinia State Management -->
          <section id="pinia" class="content-section">
            <h2><span class="section-number">6</span> {{ t('learn.sections.pinia.title') }}</h2>
            <p>{{ t('learn.sections.pinia.intro') }}</p>

            <div class="pinia-features">
              <div class="pinia-feature">
                <i class="fa-solid fa-feather"></i>
                <span>{{ t('learn.sections.pinia.features.lightweight') }}</span>
              </div>
              <div class="pinia-feature">
                <i class="fa-solid fa-code"></i>
                <span>{{ t('learn.sections.pinia.features.typescript') }}</span>
              </div>
              <div class="pinia-feature">
                <i class="fa-solid fa-plug"></i>
                <span>{{ t('learn.sections.pinia.features.devtools') }}</span>
              </div>
              <div class="pinia-feature">
                <i class="fa-solid fa-puzzle-piece"></i>
                <span>{{ t('learn.sections.pinia.features.modular') }}</span>
              </div>
            </div>

            <div class="code-block">
              <div class="code-header">
                <span><i class="fa-brands fa-vuejs"></i> Pinia Store</span>
                <button @click="toggleCode('pinia1')" class="code-toggle">
                  {{ expandedCode === 'pinia1' ? t('learn.hideCode') : t('learn.showCode') }}
                </button>
              </div>
              <pre v-show="expandedCode === 'pinia1'"><code>// stores/imageStore.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { ImageFile, ImageTransformations } from '@/types/image'

export const useImageStore = defineStore('images', () => {
  // State
  const images = ref&lt;ImageFile[]&gt;([])
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
    transform: Partial&lt;ImageTransformations&gt;
  ) {
    const image = images.value.find(img => img.id === id)
    if (image) {
      Object.assign(image.transformations, transform)
    }
  }

  function applyToSelected(
    transform: Partial&lt;ImageTransformations&gt;
  ) {
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

// Verwendung in Komponenten
&lt;script setup lang="ts"&gt;
import { useImageStore } from '@/stores/imageStore'
import { storeToRefs } from 'pinia'

const store = useImageStore()

// Reaktive Refs aus Store extrahieren
const { images, selectedCount, isLoading } = storeToRefs(store)

// Actions direkt verwenden
const handleSelect = (id: string) => store.toggleSelection(id)
const handleDelete = (id: string) => store.removeImage(id)
&lt;/script&gt;</code></pre>
            </div>
          </section>

          <!-- Section 7: Web Workers -->
          <section id="workers" class="content-section">
            <h2><span class="section-number">7</span> {{ t('learn.sections.workers.title') }}</h2>
            <p>{{ t('learn.sections.workers.intro') }}</p>

            <div class="worker-types">
              <div class="worker-type">
                <h4><i class="fa-solid fa-cog"></i> Web Worker</h4>
                <p>{{ t('learn.sections.workers.types.dedicated') }}</p>
              </div>
              <div class="worker-type">
                <h4><i class="fa-solid fa-share-nodes"></i> Shared Worker</h4>
                <p>{{ t('learn.sections.workers.types.shared') }}</p>
              </div>
              <div class="worker-type">
                <h4><i class="fa-solid fa-cloud"></i> Service Worker</h4>
                <p>{{ t('learn.sections.workers.types.service') }}</p>
              </div>
            </div>

            <div class="code-block">
              <div class="code-header">
                <span><i class="fa-brands fa-js"></i> Web Worker für Bildverarbeitung</span>
                <button @click="toggleCode('worker1')" class="code-toggle">
                  {{ expandedCode === 'worker1' ? t('learn.hideCode') : t('learn.showCode') }}
                </button>
              </div>
              <pre v-show="expandedCode === 'worker1'"><code>// workers/imageProcessor.worker.ts
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

// Hauptthread: Worker verwenden
// composables/useImageWorker.ts
import { ref, shallowRef, onUnmounted } from 'vue'

export function useImageWorker() {
  const worker = shallowRef&lt;Worker | null&gt;(null)
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
          // Verarbeitetes Bild verwenden
        }

        if (type === 'PROGRESS') {
          progress.value = payload
        }
      }
    }
    return worker.value
  }

  const processImage = (imageData: ImageData, filters: object) => {
    const w = initWorker()
    isProcessing.value = true
    w.postMessage({
      type: 'PROCESS_IMAGE',
      payload: { imageData, filters }
    })
  }

  onUnmounted(() => {
    worker.value?.terminate()
  })

  return { isProcessing, progress, processImage }
}</code></pre>
            </div>

            <div class="tip-box">
              <i class="fa-solid fa-lightbulb"></i>
              <div>
                <strong>{{ t('learn.tip') }}:</strong>
                {{ t('learn.sections.workers.tip') }}
              </div>
            </div>
          </section>

          <!-- Section 8: Performance -->
          <section id="performance" class="content-section">
            <h2><span class="section-number">8</span> {{ t('learn.sections.performance.title') }}</h2>
            <p>{{ t('learn.sections.performance.intro') }}</p>

            <div class="perf-techniques">
              <div class="perf-item">
                <div class="perf-icon good"><i class="fa-solid fa-check"></i></div>
                <div class="perf-content">
                  <h4>{{ t('learn.sections.performance.techniques.lazy.title') }}</h4>
                  <p>{{ t('learn.sections.performance.techniques.lazy.desc') }}</p>
                </div>
              </div>
              <div class="perf-item">
                <div class="perf-icon good"><i class="fa-solid fa-check"></i></div>
                <div class="perf-content">
                  <h4>{{ t('learn.sections.performance.techniques.virtual.title') }}</h4>
                  <p>{{ t('learn.sections.performance.techniques.virtual.desc') }}</p>
                </div>
              </div>
              <div class="perf-item">
                <div class="perf-icon good"><i class="fa-solid fa-check"></i></div>
                <div class="perf-content">
                  <h4>{{ t('learn.sections.performance.techniques.memo.title') }}</h4>
                  <p>{{ t('learn.sections.performance.techniques.memo.desc') }}</p>
                </div>
              </div>
              <div class="perf-item">
                <div class="perf-icon good"><i class="fa-solid fa-check"></i></div>
                <div class="perf-content">
                  <h4>{{ t('learn.sections.performance.techniques.debounce.title') }}</h4>
                  <p>{{ t('learn.sections.performance.techniques.debounce.desc') }}</p>
                </div>
              </div>
            </div>

            <div class="code-block">
              <div class="code-header">
                <span><i class="fa-brands fa-vuejs"></i> Performance-Optimierungen</span>
                <button @click="toggleCode('perf1')" class="code-toggle">
                  {{ expandedCode === 'perf1' ? t('learn.hideCode') : t('learn.showCode') }}
                </button>
              </div>
              <pre v-show="expandedCode === 'perf1'"><code>// Lazy Loading von Komponenten
const ImageEditor = defineAsyncComponent(() =>
  import('@/components/ImageEditor.vue')
)

// Debounce für häufige Events
function debounce&lt;T extends (...args: any[]) => any&gt;(
  fn: T,
  delay: number
): (...args: Parameters&lt;T&gt;) => void {
  let timeoutId: ReturnType&lt;typeof setTimeout&gt;

  return (...args: Parameters&lt;T&gt;) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => fn(...args), delay)
  }
}

// Verwendung
const handleResize = debounce((width: number, height: number) => {
  // Resize-Logik
}, 150)

// shallowRef für große Objekte
import { shallowRef } from 'vue'

// Nur Referenz-Änderungen werden getrackt, nicht tiefe Änderungen
const imageData = shallowRef&lt;ImageData | null&gt;(null)

// Bei Änderung muss Referenz ersetzt werden
function updateImageData(newData: ImageData) {
  imageData.value = newData // Trigger Reaktivität
}

// v-memo für bedingte Re-renders
&lt;template&gt;
  &lt;div v-for="image in images" :key="image.id" v-memo="[image.selected, image.dataUrl]"&gt;
    &lt;ImageCard :image="image" /&gt;
  &lt;/div&gt;
&lt;/template&gt;

// Intersection Observer für Lazy Loading
function useLazyLoad(callback: () => void) {
  const targetRef = ref&lt;HTMLElement | null&gt;(null)

  onMounted(() => {
    if (!targetRef.value) return

    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        callback()
        observer.disconnect()
      }
    }, { threshold: 0.1 })

    observer.observe(targetRef.value)

    onUnmounted(() => observer.disconnect())
  })

  return targetRef
}</code></pre>
            </div>
          </section>

          <!-- Section 9: Security -->
          <section id="security" class="content-section">
            <h2><span class="section-number">9</span> {{ t('learn.sections.security.title') }}</h2>
            <p>{{ t('learn.sections.security.intro') }}</p>

            <div class="security-grid">
              <div class="security-item">
                <div class="security-icon"><i class="fa-solid fa-shield-halved"></i></div>
                <h4>{{ t('learn.sections.security.practices.csp.title') }}</h4>
                <p>{{ t('learn.sections.security.practices.csp.desc') }}</p>
              </div>
              <div class="security-item">
                <div class="security-icon"><i class="fa-solid fa-code"></i></div>
                <h4>{{ t('learn.sections.security.practices.xss.title') }}</h4>
                <p>{{ t('learn.sections.security.practices.xss.desc') }}</p>
              </div>
              <div class="security-item">
                <div class="security-icon"><i class="fa-solid fa-lock"></i></div>
                <h4>{{ t('learn.sections.security.practices.cors.title') }}</h4>
                <p>{{ t('learn.sections.security.practices.cors.desc') }}</p>
              </div>
              <div class="security-item">
                <div class="security-icon"><i class="fa-solid fa-user-shield"></i></div>
                <h4>{{ t('learn.sections.security.practices.privacy.title') }}</h4>
                <p>{{ t('learn.sections.security.practices.privacy.desc') }}</p>
              </div>
            </div>

            <div class="code-block">
              <div class="code-header">
                <span><i class="fa-brands fa-js"></i> Sicherheits-Best-Practices</span>
                <button @click="toggleCode('sec1')" class="code-toggle">
                  {{ expandedCode === 'sec1' ? t('learn.hideCode') : t('learn.showCode') }}
                </button>
              </div>
              <pre v-show="expandedCode === 'sec1'"><code>// Input-Validierung
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

  // Dateiname sanitizen
  const safeName = sanitizeFilename(file.name)

  return true
}

// Dateinamen bereinigen
function sanitizeFilename(name: string): string {
  return name
    .replace(/[^\w\s.-]/g, '') // Nur sichere Zeichen
    .replace(/\s+/g, '_')       // Leerzeichen ersetzen
    .substring(0, 255)          // Maximale Länge
}

// Sichere URL-Erstellung
function createSafeObjectURL(blob: Blob): string {
  const url = URL.createObjectURL(blob)

  // URL nach Verwendung freigeben
  setTimeout(() => URL.revokeObjectURL(url), 60000)

  return url
}

// XSS-Schutz: Niemals unsanitized HTML rendern
// Vue's v-html nur mit sanitierten Daten verwenden
import DOMPurify from 'dompurify'

const sanitizedHtml = computed(() =>
  DOMPurify.sanitize(userInput.value)
)

// Client-seitige Verarbeitung = Maximale Privatsphäre
// Keine Daten werden an Server gesendet
function processLocally(image: File): Promise&lt;string&gt; {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = () => {
      // Alles passiert im Browser
      const result = processImage(reader.result as string)
      resolve(result)
    }
    reader.readAsDataURL(image)
  })
}</code></pre>
            </div>

            <div class="privacy-highlight">
              <i class="fa-solid fa-shield-halved"></i>
              <div>
                <h4>{{ t('learn.sections.security.clientSide.title') }}</h4>
                <p>{{ t('learn.sections.security.clientSide.text') }}</p>
              </div>
            </div>
          </section>

          <!-- Section 10: Practice -->
          <section id="practice" class="content-section">
            <h2><span class="section-number">10</span> {{ t('learn.sections.practice.title') }}</h2>
            <p>{{ t('learn.sections.practice.intro') }}</p>

            <div class="exercise-list">
              <div class="exercise-card">
                <div class="exercise-level beginner">{{ t('learn.sections.practice.levels.beginner') }}</div>
                <h4>{{ t('learn.sections.practice.exercises.audio.title') }}</h4>
                <p>{{ t('learn.sections.practice.exercises.audio.desc') }}</p>
                <ul>
                  <li>{{ t('learn.sections.practice.exercises.audio.task1') }}</li>
                  <li>{{ t('learn.sections.practice.exercises.audio.task2') }}</li>
                  <li>{{ t('learn.sections.practice.exercises.audio.task3') }}</li>
                </ul>
              </div>

              <div class="exercise-card">
                <div class="exercise-level intermediate">{{ t('learn.sections.practice.levels.intermediate') }}</div>
                <h4>{{ t('learn.sections.practice.exercises.gallery.title') }}</h4>
                <p>{{ t('learn.sections.practice.exercises.gallery.desc') }}</p>
                <ul>
                  <li>{{ t('learn.sections.practice.exercises.gallery.task1') }}</li>
                  <li>{{ t('learn.sections.practice.exercises.gallery.task2') }}</li>
                  <li>{{ t('learn.sections.practice.exercises.gallery.task3') }}</li>
                </ul>
              </div>

              <div class="exercise-card">
                <div class="exercise-level advanced">{{ t('learn.sections.practice.levels.advanced') }}</div>
                <h4>{{ t('learn.sections.practice.exercises.visualizer.title') }}</h4>
                <p>{{ t('learn.sections.practice.exercises.visualizer.desc') }}</p>
                <ul>
                  <li>{{ t('learn.sections.practice.exercises.visualizer.task1') }}</li>
                  <li>{{ t('learn.sections.practice.exercises.visualizer.task2') }}</li>
                  <li>{{ t('learn.sections.practice.exercises.visualizer.task3') }}</li>
                </ul>
              </div>
            </div>

            <div class="resources-box">
              <h4><i class="fa-solid fa-book-open"></i> {{ t('learn.sections.practice.resources.title') }}</h4>
              <ul>
                <li><a href="https://vuejs.org/guide/" target="_blank">Vue.js 3 Official Guide</a></li>
                <li><a href="https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API" target="_blank">MDN Web Audio API</a></li>
                <li><a href="https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API" target="_blank">MDN Canvas API</a></li>
                <li><a href="https://www.typescriptlang.org/docs/" target="_blank">TypeScript Documentation</a></li>
                <li><a href="https://pinia.vuejs.org/" target="_blank">Pinia State Management</a></li>
              </ul>
            </div>
          </section>

          <!-- Conclusion -->
          <section class="conclusion-section">
            <h2>{{ t('learn.conclusion.title') }}</h2>
            <p>{{ t('learn.conclusion.text') }}</p>
            <div class="conclusion-grid">
              <div class="conclusion-item">
                <i class="fa-solid fa-check-circle"></i>
                <span>{{ t('learn.conclusion.items.webaudio') }}</span>
              </div>
              <div class="conclusion-item">
                <i class="fa-solid fa-check-circle"></i>
                <span>{{ t('learn.conclusion.items.vue') }}</span>
              </div>
              <div class="conclusion-item">
                <i class="fa-solid fa-check-circle"></i>
                <span>{{ t('learn.conclusion.items.canvas') }}</span>
              </div>
              <div class="conclusion-item">
                <i class="fa-solid fa-check-circle"></i>
                <span>{{ t('learn.conclusion.items.typescript') }}</span>
              </div>
              <div class="conclusion-item">
                <i class="fa-solid fa-check-circle"></i>
                <span>{{ t('learn.conclusion.items.performance') }}</span>
              </div>
              <div class="conclusion-item">
                <i class="fa-solid fa-check-circle"></i>
                <span>{{ t('learn.conclusion.items.security') }}</span>
              </div>
            </div>
            <button class="cta-button" @click="goToApp">
              <i class="fa-solid fa-rocket"></i>
              {{ t('learn.conclusion.cta') }}
            </button>
          </section>
        </article>
      </div>
    </main>

    <!-- Footer -->
    <footer class="learn-footer">
      <div class="footer-container">
        <p>{{ t('learn.footer.text') }}</p>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.learn-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--body-gradient);
  background-attachment: fixed;
}

/* Navigation */
.learn-nav {
  position: sticky;
  top: 0;
  z-index: 100;
  backdrop-filter: saturate(1.8) blur(24px);
  background: var(--glass-bg);
  border-bottom: 1px solid var(--glass-border);
}

.nav-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: var(--space-3) var(--space-5);
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--space-4);
}

.nav-brand {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-weight: 700;
  font-size: 1.1rem;
  color: var(--text);
  background: none;
  border: none;
  cursor: pointer;
}

.nav-brand:hover { color: var(--accent); }
.nav-brand i { color: var(--accent); font-size: 1.3rem; }

.nav-links {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.nav-link {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-4);
  border-radius: var(--radius-lg);
  border: 1px solid transparent;
  background: transparent;
  color: var(--text);
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s var(--ease-spring);
}

.nav-link:hover {
  background: var(--btn);
  border-color: var(--border-color);
}

.nav-link.primary {
  background: var(--accent);
  color: var(--accent-text);
}

.nav-link.primary:hover {
  background: var(--accent-hover);
  box-shadow: 0 4px 12px color-mix(in oklab, var(--accent) 30%, transparent);
}

/* Hero */
.learn-hero {
  padding-top: var(--space-7);
  padding-bottom: var(--space-7);
  text-align: center;
  background: var(--panel);
  border-bottom: 1px solid var(--glass-border);
}

.hero-container {
  max-width: 900px;
  margin: 0 auto;
  padding: 0 var(--space-5);
}

.hero-badge {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-4);
  background: color-mix(in oklab, var(--accent) 15%, transparent);
  border: 1px solid color-mix(in oklab, var(--accent) 30%, transparent);
  border-radius: var(--radius-xl);
  color: var(--accent);
  font-weight: 600;
  font-size: 0.9rem;
  margin-bottom: var(--space-4);
}

.learn-hero h1 {
  font-size: clamp(2rem, 5vw, 3rem);
  font-weight: 800;
  margin: 0 0 var(--space-4);
  background: linear-gradient(135deg, var(--text), var(--accent));
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  line-height: 1.2;
}

.hero-subtitle {
  font-size: 1.15rem;
  color: var(--muted);
  line-height: 1.7;
  margin-bottom: var(--space-5);
}

.hero-tags {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: var(--space-3);
}

.tag {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-4);
  background: var(--btn);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-lg);
  font-size: 0.9rem;
  color: var(--text);
}

.tag i { color: var(--accent); }

/* Content Layout */
.learn-content {
  flex: 1;
  padding: var(--space-6) 0;
}

.learn-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 var(--space-5);
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: var(--space-6);
}

/* TOC */
.toc {
  position: sticky;
  top: var(--space-4);
  height: fit-content;
  background: var(--glass-bg);
  backdrop-filter: blur(16px);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-xl);
  padding: var(--space-4);
}

.toc h3 {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--muted);
  margin: 0 0 var(--space-3);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.toc nav {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.toc-link {
  text-align: left;
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-md);
  border: none;
  background: transparent;
  color: var(--text);
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s var(--ease-smooth);
}

.toc-link:hover {
  background: var(--btn);
  color: var(--accent);
}

/* Article */
.article {
  background: var(--glass-bg);
  backdrop-filter: blur(16px);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-2xl);
  padding: var(--space-6);
}

.intro-section {
  font-size: 1.1rem;
  line-height: 1.8;
  color: var(--text);
  padding-bottom: var(--space-6);
  border-bottom: 1px solid var(--glass-border);
  margin-bottom: var(--space-6);
}

.intro-section p { margin: 0 0 var(--space-4); }

.prereq-box {
  background: color-mix(in oklab, var(--accent) 8%, transparent);
  border: 1px solid color-mix(in oklab, var(--accent) 20%, transparent);
  border-radius: var(--radius-lg);
  padding: var(--space-4);
  margin-top: var(--space-4);
}

.prereq-box h4 {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin: 0 0 var(--space-3);
  color: var(--text);
}

.prereq-box h4 i { color: var(--accent); }

.prereq-box ul {
  margin: 0;
  padding-left: var(--space-5);
}

.prereq-box li {
  color: var(--text);
  line-height: 1.7;
  margin-bottom: var(--space-2);
}

.content-section {
  padding-bottom: var(--space-6);
  margin-bottom: var(--space-6);
  border-bottom: 1px solid var(--glass-border);
}

.content-section h2 {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text);
  margin: 0 0 var(--space-4);
}

.section-number {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--accent);
  color: var(--accent-text);
  font-size: 1rem;
  font-weight: 700;
}

.content-section h3 {
  font-size: 1.2rem;
  font-weight: 600;
  color: var(--text);
  margin: var(--space-5) 0 var(--space-3);
}

.content-section p {
  color: var(--text);
  line-height: 1.7;
  margin: 0 0 var(--space-4);
}

/* Concept Grid */
.concept-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--space-4);
  margin: var(--space-5) 0;
}

.concept-card {
  background: var(--btn);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-lg);
  padding: var(--space-4);
  text-align: center;
}

.concept-icon {
  width: 50px;
  height: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: color-mix(in oklab, var(--accent) 15%, transparent);
  border-radius: 50%;
  margin: 0 auto var(--space-3);
}

.concept-icon i {
  font-size: 1.3rem;
  color: var(--accent);
}

.concept-card h4 {
  font-size: 1rem;
  font-weight: 600;
  color: var(--text);
  margin: 0 0 var(--space-2);
  font-family: var(--font-mono);
}

.concept-card p {
  font-size: 0.9rem;
  color: var(--muted);
  margin: 0;
  line-height: 1.5;
}

/* Code Block */
.code-block {
  background: var(--panel);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-lg);
  margin: var(--space-4) 0;
  overflow: hidden;
}

.code-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-3) var(--space-4);
  background: var(--btn);
  border-bottom: 1px solid var(--glass-border);
}

.code-header span {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: 0.9rem;
  color: var(--muted);
}

.code-header span i { color: var(--accent); }

.code-toggle {
  padding: var(--space-2) var(--space-3);
  background: var(--accent);
  color: var(--accent-text);
  border: none;
  border-radius: var(--radius-md);
  font-size: 0.8rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.code-toggle:hover {
  background: var(--accent-hover);
}

.code-block pre {
  margin: 0;
  padding: var(--space-4);
  overflow-x: auto;
  background: var(--panel);
}

.code-block code {
  font-family: var(--font-mono);
  font-size: 0.85rem;
  line-height: 1.6;
  color: var(--text);
}

/* Tip & Warning Boxes */
.tip-box, .warning-box {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
  padding: var(--space-4);
  border-radius: var(--radius-lg);
  margin: var(--space-4) 0;
}

.tip-box {
  background: color-mix(in oklab, var(--green) 10%, transparent);
  border: 1px solid color-mix(in oklab, var(--green) 25%, transparent);
}

.tip-box > i { color: var(--green); font-size: 1.2rem; }

.warning-box {
  background: color-mix(in oklab, var(--orange) 10%, transparent);
  border: 1px solid color-mix(in oklab, var(--orange) 25%, transparent);
}

.warning-box > i { color: var(--orange); font-size: 1.2rem; }

.tip-box div, .warning-box div {
  flex: 1;
  color: var(--text);
  font-size: 0.95rem;
  line-height: 1.6;
}

/* Comparison Box */
.comparison-box {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: var(--space-4);
  align-items: stretch;
  margin: var(--space-5) 0;
}

.comparison-item {
  background: var(--btn);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-lg);
  padding: var(--space-4);
}

.comparison-item.highlight {
  background: color-mix(in oklab, var(--accent) 10%, transparent);
  border-color: color-mix(in oklab, var(--accent) 30%, transparent);
}

.comparison-item h4 {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin: 0 0 var(--space-2);
  color: var(--text);
}

.comparison-item h4 i { color: var(--accent); }

.comparison-item p {
  margin: 0;
  color: var(--muted);
  font-size: 0.9rem;
  line-height: 1.6;
}

.vs-divider {
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  color: var(--muted);
  font-size: 0.9rem;
}

/* Lifecycle Grid */
.lifecycle-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: var(--space-3);
  margin-top: var(--space-4);
}

.lifecycle-item {
  background: var(--btn);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-md);
  padding: var(--space-3);
}

.lifecycle-item code {
  display: block;
  font-family: var(--font-mono);
  color: var(--accent);
  font-size: 0.9rem;
  margin-bottom: var(--space-1);
}

.lifecycle-item span {
  font-size: 0.85rem;
  color: var(--muted);
}

/* Feature Grid */
.feature-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--space-4);
  margin: var(--space-4) 0;
}

.feature-box {
  padding: var(--space-4);
  background: var(--btn);
  border-radius: var(--radius-lg);
  border: 1px solid var(--glass-border);
  text-align: center;
}

.feature-box i {
  font-size: 1.5rem;
  color: var(--accent);
  margin-bottom: var(--space-2);
}

.feature-box h4 {
  font-size: 1rem;
  font-weight: 600;
  color: var(--text);
  margin: 0 0 var(--space-2);
}

.feature-box p {
  font-size: 0.9rem;
  color: var(--muted);
  margin: 0;
  line-height: 1.5;
}

/* API List */
.api-list {
  display: grid;
  gap: var(--space-3);
  margin: var(--space-4) 0;
}

.api-item {
  padding: var(--space-4);
  background: var(--btn);
  border-radius: var(--radius-lg);
  border-left: 4px solid var(--accent);
}

.api-item h4 {
  margin: 0 0 var(--space-2);
}

.api-item h4 code {
  font-family: var(--font-mono);
  color: var(--accent);
  font-size: 1rem;
}

.api-item p {
  margin: 0;
  color: var(--muted);
  font-size: 0.9rem;
  line-height: 1.6;
}

/* Benefits Grid */
.benefits-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: var(--space-3);
  margin: var(--space-4) 0;
}

.benefit-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-4);
  background: var(--btn);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-lg);
  text-align: center;
}

.benefit-card i {
  font-size: 1.5rem;
  color: var(--accent);
}

.benefit-card h4 {
  margin: 0;
  font-size: 0.9rem;
  color: var(--text);
}

/* Pinia Features */
.pinia-features {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
  margin: var(--space-4) 0;
}

.pinia-feature {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-4);
  background: var(--btn);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-lg);
  color: var(--text);
  font-size: 0.9rem;
}

.pinia-feature i { color: var(--accent); }

/* Worker Types */
.worker-types {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--space-4);
  margin: var(--space-4) 0;
}

.worker-type {
  padding: var(--space-4);
  background: var(--btn);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-lg);
}

.worker-type h4 {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin: 0 0 var(--space-2);
  color: var(--text);
}

.worker-type h4 i { color: var(--accent); }

.worker-type p {
  margin: 0;
  color: var(--muted);
  font-size: 0.9rem;
  line-height: 1.5;
}

/* Performance Techniques */
.perf-techniques {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  margin: var(--space-4) 0;
}

.perf-item {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
  padding: var(--space-3);
  background: var(--btn);
  border-radius: var(--radius-lg);
}

.perf-icon {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  flex-shrink: 0;
}

.perf-icon.good {
  background: color-mix(in oklab, var(--green) 20%, transparent);
  color: var(--green);
}

.perf-content h4 {
  margin: 0 0 var(--space-1);
  color: var(--text);
  font-size: 0.95rem;
}

.perf-content p {
  margin: 0;
  color: var(--muted);
  font-size: 0.9rem;
}

/* Security Grid */
.security-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: var(--space-4);
  margin: var(--space-4) 0;
}

.security-item {
  padding: var(--space-4);
  background: var(--btn);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-lg);
}

.security-icon {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: color-mix(in oklab, var(--accent) 15%, transparent);
  border-radius: 50%;
  margin-bottom: var(--space-3);
}

.security-icon i {
  font-size: 1.2rem;
  color: var(--accent);
}

.security-item h4 {
  margin: 0 0 var(--space-2);
  color: var(--text);
  font-size: 0.95rem;
}

.security-item p {
  margin: 0;
  color: var(--muted);
  font-size: 0.9rem;
  line-height: 1.5;
}

/* Privacy Highlight */
.privacy-highlight {
  display: flex;
  align-items: flex-start;
  gap: var(--space-4);
  padding: var(--space-5);
  background: linear-gradient(135deg,
    color-mix(in oklab, var(--green) 10%, transparent),
    color-mix(in oklab, var(--accent) 5%, transparent));
  border-radius: var(--radius-xl);
  margin: var(--space-4) 0;
}

.privacy-highlight > i {
  font-size: 2rem;
  color: var(--green);
}

.privacy-highlight h4 {
  margin: 0 0 var(--space-2);
  color: var(--text);
}

.privacy-highlight p {
  margin: 0;
  color: var(--muted);
}

/* Exercise List */
.exercise-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  margin: var(--space-4) 0;
}

.exercise-card {
  background: var(--btn);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-lg);
  padding: var(--space-4);
}

.exercise-level {
  display: inline-block;
  padding: var(--space-1) var(--space-3);
  border-radius: var(--radius-md);
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  margin-bottom: var(--space-3);
}

.exercise-level.beginner {
  background: color-mix(in oklab, var(--green) 20%, transparent);
  color: var(--green);
}

.exercise-level.intermediate {
  background: color-mix(in oklab, var(--orange) 20%, transparent);
  color: var(--orange);
}

.exercise-level.advanced {
  background: color-mix(in oklab, var(--red) 20%, transparent);
  color: var(--red);
}

.exercise-card h4 {
  margin: 0 0 var(--space-2);
  color: var(--text);
  font-size: 1.1rem;
}

.exercise-card > p {
  margin: 0 0 var(--space-3);
  color: var(--muted);
  font-size: 0.95rem;
}

.exercise-card ul {
  margin: 0;
  padding-left: var(--space-5);
}

.exercise-card li {
  color: var(--text);
  font-size: 0.9rem;
  line-height: 1.6;
  margin-bottom: var(--space-1);
}

/* Resources Box */
.resources-box {
  background: color-mix(in oklab, var(--accent) 8%, transparent);
  border: 1px solid color-mix(in oklab, var(--accent) 20%, transparent);
  border-radius: var(--radius-lg);
  padding: var(--space-4);
  margin-top: var(--space-5);
}

.resources-box h4 {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin: 0 0 var(--space-3);
  color: var(--text);
}

.resources-box h4 i { color: var(--accent); }

.resources-box ul {
  margin: 0;
  padding-left: var(--space-5);
}

.resources-box li {
  margin-bottom: var(--space-2);
}

.resources-box a {
  color: var(--accent);
  text-decoration: none;
  transition: color 0.2s;
}

.resources-box a:hover {
  color: var(--accent-hover);
  text-decoration: underline;
}

/* Conclusion */
.conclusion-section {
  text-align: center;
  padding-top: var(--space-6);
}

.conclusion-section h2 {
  font-size: 1.5rem;
  margin: 0 0 var(--space-4);
  color: var(--text);
}

.conclusion-section > p {
  color: var(--muted);
  max-width: 600px;
  margin: 0 auto var(--space-5);
  line-height: 1.7;
}

.conclusion-grid {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: var(--space-3);
  margin-bottom: var(--space-5);
}

.conclusion-item {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-4);
  background: var(--btn);
  border-radius: var(--radius-lg);
  font-size: 0.9rem;
  color: var(--text);
}

.conclusion-item i { color: var(--green); }

.cta-button {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-4) var(--space-6);
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--accent-text);
  background: linear-gradient(135deg, var(--accent), color-mix(in oklab, var(--accent) 80%, var(--secondary)));
  border: none;
  border-radius: var(--radius-xl);
  cursor: pointer;
  transition: all 0.3s var(--ease-spring);
  box-shadow: 0 4px 16px color-mix(in oklab, var(--accent) 30%, transparent);
}

.cta-button:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 24px color-mix(in oklab, var(--accent) 40%, transparent);
}

/* Footer */
.learn-footer {
  padding: var(--space-5) 0;
  background: var(--panel);
  border-top: 1px solid var(--glass-border);
  text-align: center;
}

.footer-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 var(--space-5);
}

.learn-footer p {
  margin: 0;
  color: var(--muted);
  font-size: 0.9rem;
}

/* Responsive */
@media (max-width: 900px) {
  .learn-container {
    grid-template-columns: 1fr;
  }

  .toc {
    position: static;
    order: -1;
  }

  .toc nav {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: var(--space-2);
  }

  .comparison-box {
    grid-template-columns: 1fr;
  }

  .vs-divider {
    padding: var(--space-2) 0;
  }
}

@media (max-width: 768px) {
  .nav-container { flex-wrap: wrap; }

  .nav-links {
    order: 3;
    width: 100%;
    justify-content: center;
    margin-top: var(--space-3);
    padding-top: var(--space-3);
    border-top: 1px solid var(--glass-border);
  }

  .nav-brand span { display: none; }

  .article { padding: var(--space-4); }

  .concept-grid,
  .feature-grid,
  .security-grid,
  .worker-types {
    grid-template-columns: 1fr;
  }

  .privacy-highlight {
    flex-direction: column;
    text-align: center;
    align-items: center;
  }

  .hero-tags {
    flex-direction: column;
    align-items: center;
  }
}
</style>
