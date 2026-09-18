# Batch-Bildbearbeitungs-App JPEG, PNG, WEBp, ZIP, PDF

Eine moderne, leistungsstarke Bildbearbeitungsanwendung, die vollständig im Browser läuft. Gebaut mit Vue 3, TypeScript, Pinia und Vite.

## ✨ Features

- 🖼️ Mehrere Bilder gleichzeitig bearbeiten
- 🔄 Transformationen (Drehen, Spiegeln, Umbennenen, Größe ändern)
- 📄 PDF-Export (einzeln oder als Sammlung)
- 🗜️ ZIP-Download
- 🎨 Multiple Export-Formate (PNG, JPEG, WebP)
- 🌓 Dark/Light Mode
- 🌍 Mehrsprachig (Deutsch/Englisch)
- 🔒 Vollständig im Browser, keine Server, alle Daten bleiben lokal
- ⚡ Schnell und performant

## 🏗️ Projektstruktur

```
vue-image-editor/
├── src/
│   ├── lib/                      # Wiederverwendbare Bibliotheken
│   │   ├── core/                 # Kern-Funktionalität
│   │   │   ├── types.ts          # TypeScript Typdefinitionen
│   │   │   └── image-processor.ts # Bildverarbeitungslogik
│   │   └── features/             # Feature-Module
│   │       ├── export-pdf.ts     # PDF-Export
│   │       └── export-zip.ts     # ZIP-Export (optional)
│   │
│   ├── stores/                   # Pinia State Management
│   │   └── imageStore.ts         # Bild-State-Verwaltung
│   │
│   ├── components/               # Vue-Komponenten
│   │   ├── AppHeader.vue         # Header mit Sprach-/Theme-Toggle
│   │   ├── StatusBar.vue         # Statusleiste mit Aktionsbuttons
│   │   ├── DropZone.vue          # Datei-Upload-Bereich
│   │   ├── ImageGrid.vue         # Grid-Layout für Bilder
│   │   ├── ImageCard.vue         # Einzelne Bildkarte
│   │   └── LoadingIndicator.vue  # Lade-Anzeige
│   │
│   ├── locales/                  # i18n Übersetzungen
│   │   ├── de.json               # Deutsche Übersetzungen
│   │   └── en.json               # Englische Übersetzungen
│   │
│   ├── assets/                   # Statische Assets
│   │   └── styles/
│   │       └── main.css          # Globale Styles
│   │
│   ├── App.vue                   # Haupt-App-Komponente
│   └── main.ts                   # Einstiegspunkt
│
├── index.html                    # HTML-Template
├── vite.config.ts                # Vite-Konfiguration
├── tsconfig.json                 # TypeScript-Konfiguration
└── package.json                  # Dependencies

```

## 🚀 Installation und Start

### Voraussetzungen

- Node.js >= 18
- npm oder yarn

### Installation

```bash
# Dependencies installieren
npm install

# Development Server starten
npm run dev

# Production Build erstellen
npm run build

# Production Build testen
npm run preview
```

## 📦 Die `src/lib/` Struktur

Die `src/lib/` Ordnerstruktur enthält die wiederverwendbaren Core-Module, die unabhängig von Vue funktionieren:

### `src/lib/core/`

- **image-processor.ts**: Zentrale Bildverarbeitungsklasse mit allen Canvas-Operationen
- **types.ts**: TypeScript-Typdefinitionen für die gesamte App

### `src/lib/features/`

- **export-pdf.ts**: PDF-Export-Funktionalität mit jsPDF
- **export-zip.ts**: ZIP-Download-Funktionalität mit JSZip

Diese Module können auch in anderen Projekten wiederverwendet werden!

## 🎨 Komponenten-Architektur

### State Management mit Pinia

Der `imageStore` verwaltet den gesamten Bild-State:

```typescript
import { useImageStore } from '@/stores/imageStore'

const imageStore = useImageStore()

// Bilder hinzufügen
await imageStore.addImage(file)
await imageStore.addImages([file1, file2])

// Auswahl verwalten
imageStore.toggleImageSelection(id)
imageStore.selectAllImages()

// Bilder entfernen
imageStore.removeImage(id)
imageStore.removeSelectedImages()
```

### Komponenten-Hierarchie

```
App.vue
├── AppHeader.vue
├── StatusBar.vue
├── DropZone.vue
├── ImageGrid.vue
│   └── ImageCard.vue (mehrfach)
└── LoadingIndicator.vue
```

## 🌍 Internationalisierung (i18n)

Die App unterstützt mehrere Sprachen mit vue-i18n:

```typescript
import { useI18n } from 'vue-i18n'

const { t, locale } = useI18n()

// Übersetzung verwenden
const title = t('header.title')

// Sprache wechseln
locale.value = 'de' // oder 'en'
```

Übersetzungen befinden sich in `src/locales/`.

## 🎨 Theming

Dark/Light Mode wird über CSS-Variablen gesteuert:

```typescript
// Theme setzen
document.documentElement.dataset.theme = 'dark' // oder 'light'
```

Alle Theme-Variablen sind in `src/assets/styles/main.css` definiert.

## 🔧 Verwendung der Bildverarbeitung

```typescript
import { ImageProcessor } from '@/lib/core/image-processor'
import type { ImageObject } from '@/lib/core/types'

// Datei verarbeiten
const imageObj = await ImageProcessor.processFile(file)

// Transformationen
ImageProcessor.rotateImage(imageObj, 90)
ImageProcessor.flipImage(imageObj, 'horizontal')
ImageProcessor.resizeImage(imageObj, 800, 600, true)

// Export
const format = { name: 'PNG', mimeType: 'image/png', ext: 'png' }
const blob = await ImageProcessor.convertToFormat(imageObj, format)
```

## 📄 PDF-Export

```typescript
import { exportMultipleImagesAsPdf } from '@/lib/features/export-pdf'

const settings = {
  title: 'Meine Bilder',
  author: 'Max Mustermann',
  includeTitlePage: true,
  includeCommentPage: true,
  includeFileName: true,
  optimizeSize: true,
  orientation: 'auto', // 'auto' | 'portrait' | 'landscape'
}

await exportMultipleImagesAsPdf(images, settings)
```

## 🛠️ Erweiterungen

### Neue Komponente hinzufügen

1. Erstelle eine neue `.vue` Datei in `src/components/`
2. Importiere und verwende sie in einer Parent-Komponente
3. Nutze den `imageStore` für State-Zugriff

### Neues Feature in `src/lib/` hinzufügen

1. Erstelle eine neue `.ts` Datei in `src/lib/features/`
2. Exportiere Funktionen, die unabhängig von Vue sind
3. Importiere und verwende sie in Vue-Komponenten

### Neue Übersetzung hinzufügen

1. Füge neue Keys zu `src/locales/de.json` und `src/locales/en.json` hinzu
2. Verwende `t('key.path')` in Komponenten

## 🎯 Best Practices

1. **Typsicherheit**: Verwende TypeScript-Typen aus `src/lib/core/types.ts`
2. **State Management**: Nutze Pinia für globalen State
3. **Komponenten-Komposition**: Halte Komponenten klein und fokussiert
4. **Wiederverwendbarkeit**: Lagere wiederverwendbare Logik in `src/lib/` aus
5. **Performance**: Nutze `computed` für berechnete Werte
6. **Accessibility**: Verwende semantic HTML und ARIA-Attribute

## 📝 TypeScript-Typen

Alle wichtigen Typen sind in `src/lib/core/types.ts` definiert:

```typescript
interface ImageObject {
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

interface PdfSettings {
  title: string
  author: string
  includeTitlePage: boolean
  includeCommentPage: boolean
  includeFileName: boolean
  optimizeSize: boolean
  orientation: 'auto' | 'portrait' | 'landscape'
  // ...
}
```

## 🤝 Beitragen

Contributions sind willkommen! Bitte erstelle einen Pull Request mit:

1. Klarer Beschreibung der Änderungen
2. Tests (falls zutreffend)
3. Aktualisierter Dokumentation

## 📄 Lizenz

MIT License

## 🙏 Danksagungen

- Vue.js Team
- Pinia Team
- jsPDF
- JSZip
- Font Awesome

---

Entwickelt mit ❤️ und Vue 3

## 💝 Unterstützen

Wenn dir dieses Projekt gefällt und du die Entwicklung unterstützen möchtest, freue ich mich über eine Spende:

[![PayPal Spenden](https://www.paypalobjects.com/de_DE/CH/i/btn/btn_donate_LG.gif)](https://www.paypal.com/donate/?hosted_button_id=8RGLGQ2BFMHU6)

---

Autor: Dinko Ramić - Kodini Tools - kodinitools.com
