# CONTEXT.md - Bilder-Batchbearbeitung

## Projektbeschreibung

Eine moderne, datenschutzfreundliche Webanwendung zur Batch-Bearbeitung von Bildern. Die gesamte Bildverarbeitung erfolgt client-seitig im Browser - keine Bilder werden auf Server hochgeladen (mit Ausnahme der optionalen SVG-Konvertierung).

---

## Tech-Stack

### Frontend

| Technologie | Version | Zweck |
|-------------|---------|-------|
| Vue 3 | ^3.4.0 | UI-Framework (Composition API) |
| Vite | ^5.0.0 | Build-Tool & Dev-Server |
| TypeScript | ^5.3.0 | Typsicherheit |
| Pinia | ^2.1.7 | State Management |
| Vue Router | ^4.2.5 | Client-Side Routing |
| vue-i18n | ^9.8.0 | Internationalisierung (DE/EN) |
| jsPDF | ^2.5.2 | PDF-Generierung im Browser |
| JSZip | ^3.10.1 | ZIP-Komprimierung |

### Backend (Optional - nur für SVG-Konvertierung)

| Technologie | Version | Zweck |
|-------------|---------|-------|
| FastAPI | 0.109.2 | REST API Framework |
| Uvicorn | 0.27.1 | ASGI Server |
| vtracer | 0.6.10 | Raster-zu-SVG Konvertierung |
| Pillow | 10.2.0 | Bildverarbeitung |
| Python | 3.10+ | Runtime |

### Deployment

- **Service Manager:** Systemd
- **Web Server:** NGINX (Reverse Proxy)
- **Target OS:** Ubuntu 24.04 LTS

---

## Ordnerstruktur

```
/home/user/Bilder-Batchbearbeitung/
├── index.html                    # HTML Entry Point mit SEO Meta-Tags
├── vite.config.ts                # Vite Build-Konfiguration
├── package.json                  # NPM Dependencies & Scripts
├── README.md                     # Projektdokumentation
├── CONTEXT.md                    # Diese Datei
│
├── src/                          # Frontend Source Code
│   ├── main.ts                   # Vue App Initialisierung
│   ├── App.vue                   # Root-Komponente (Theme-Detection)
│   │
│   ├── router/
│   │   └── index.ts              # Route-Definitionen (/, /app, /faq, /blog)
│   │
│   ├── stores/
│   │   └── imageStore.ts         # Pinia Store (Bildverwaltung, Transformationen)
│   │
│   ├── components/               # 16 Vue-Komponenten
│   │   ├── AppHeader.vue         # Header mit Sprach-/Theme-Toggle
│   │   ├── StatusBar.vue         # Aktions-Buttons und Status
│   │   ├── ToastContainer.vue    # Toast-Benachrichtigungen
│   │   ├── DropZone.vue          # Drag-and-Drop Upload
│   │   ├── ImageGrid.vue         # Bild-Grid Layout
│   │   ├── ImageCard.vue         # Einzelne Bildkarte
│   │   ├── ImagePreview.vue      # Bildvorschau (Vollbild)
│   │   ├── ImageEditor.vue       # Haupteditor für Bildbearbeitung
│   │   ├── BatchEditPanel.vue    # Batch-Operationen Panel
│   │   ├── BulkRenameModal.vue   # Massen-Umbenennung Dialog
│   │   ├── FrontPageDesigner.vue # PDF-Titelseiten Designer
│   │   ├── CommentPageDesigner.vue    # Kommentarseiten Designer
│   │   ├── CommentPagePreview.vue     # Kommentarseiten Vorschau
│   │   ├── MultiCommentSystem.vue     # Multi-Page Kommentarsystem
│   │   ├── ExportSettingsModal.vue    # PDF-Export Einstellungen
│   │   └── LoadingIndicator.vue       # Ladeanimation
│   │
│   ├── views/                    # 4 Hauptseiten
│   │   ├── LandingPage.vue       # Marketing/Landing Page
│   │   ├── AppPage.vue           # Hauptanwendung (Editor)
│   │   ├── BlogPage.vue          # Blog-Artikel
│   │   └── FaqPage.vue           # FAQ-Seite
│   │
│   ├── composables/
│   │   └── useToast.ts           # Toast-Notification Composable
│   │
│   ├── lib/
│   │   ├── core/                 # Framework-unabhängige Kernlogik
│   │   │   ├── image-processor.ts    # Bildverarbeitung (Canvas API)
│   │   │   └── types.ts              # TypeScript Typdefinitionen
│   │   │
│   │   └── features/             # Wiederverwendbare Module
│   │       ├── export-pdf.ts     # PDF-Export (jsPDF)
│   │       ├── export-svg.ts     # SVG-Export (Backend-Integration)
│   │       └── export-zip.ts     # ZIP-Download (JSZip)
│   │
│   ├── types/
│   │   └── image.ts              # Zusätzliche Typdefinitionen
│   │
│   ├── locales/                  # Übersetzungen
│   │   ├── de.json               # Deutsch (Hauptsprache)
│   │   └── en.json               # Englisch
│   │
│   └── assets/
│       └── styles/
│           └── main.css          # Globale Styles (CSS Variables, Themes)
│
└── backend/                      # Optionaler SVG-Konvertierungsservice
    ├── main.py                   # FastAPI Anwendung
    ├── requirements.txt          # Python Dependencies
    ├── bilderseriebearbeiten-api.service  # Systemd Service
    └── INSTALL.md                # Deployment-Anleitung
```

---

## Datenbankschema

### Status: Keine Datenbank

Diese Anwendung verwendet **keine traditionelle Datenbank**. Das Design ist bewusst client-seitig:

| Aspekt | Beschreibung |
|--------|--------------|
| **Datenverarbeitung** | Vollständig im Browser (Canvas API) |
| **Datenspeicherung** | Keine - Bilder bleiben lokal beim Nutzer |
| **Persistenz** | Keine server-seitige Speicherung |
| **Backend-Verarbeitung** | Stateless (temporäre Verarbeitung in `/tmp/`) |

### Datenfluss

```
1. Upload       → Bilder werden im Browser-Speicher gehalten
2. Bearbeitung  → Canvas API für Transformationen
3. Export       → Download auf Nutzergerät (PDF, ZIP, PNG, etc.)
4. SVG-Export   → Optional: Temporäre Backend-Verarbeitung (keine Speicherung)
```

### In-Memory Datenstruktur (Pinia Store)

```typescript
// src/stores/imageStore.ts
interface ImageObject {
  id: string;
  name: string;
  originalName: string;
  file: File;
  url: string;
  width: number;
  height: number;
  rotation: number;
  flipX: boolean;
  flipY: boolean;
  filters: ImageFilters;
  crop?: CropArea;
  selected: boolean;
}

interface ImageFilters {
  brightness: number;    // 0-200 (100 = normal)
  contrast: number;      // 0-200 (100 = normal)
  saturation: number;    // 0-200 (100 = normal)
  grayscale: number;     // 0-100
  sepia: number;         // 0-100
  blur: number;          // 0-10 px
  hueRotate: number;     // 0-360 degrees
}

// Unterstützte Bildformate
type ImageFormat = 'png' | 'jpeg' | 'webp' | 'bmp' | 'gif';

// PDF-Export Einstellungen
interface PdfSettings {
  pageSize: 'a4' | 'a3' | 'letter' | 'legal';
  orientation: 'portrait' | 'landscape';
  imagesPerPage: 1 | 2 | 4 | 6 | 9;
  quality: number;       // 0.1 - 1.0
  includeFilenames: boolean;
  title?: string;
  author?: string;
}
```

---

## API Endpunkte (Backend)

| Methode | Endpunkt | Beschreibung |
|---------|----------|--------------|
| GET | `/health` | Health Check |
| POST | `/api/convert-svg` | Einzelbild zu SVG konvertieren |
| POST | `/api/convert-svg-batch` | Batch SVG-Konvertierung (ZIP) |

### Limits

- Max. Dateigröße: 20 MB pro Datei
- Max. Batch-Größe: 100 Dateien
- Unterstützte Formate: PNG, JPEG, WebP, BMP, GIF

---

## Build & Development

```bash
# Development Server
npm run dev          # Port 3000

# Production Build
npm run build        # Output: dist/

# Type Check
npm run type-check

# Backend starten (optional)
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python main.py       # Port 9003
```

### Konfiguration

- **Base URL:** `/bilderseriebearbeiten/`
- **Dev Port:** 3000
- **Backend Port:** 9003
- **Theme:** Dark/Light (System-Präferenz + localStorage)
- **Sprachen:** Deutsch (Standard), Englisch

---

## Architektur-Highlights

- **Privacy-First:** Keine Server-Uploads, alles lokal
- **Offline-fähig:** Kernfunktionen ohne Backend nutzbar
- **Modular:** Framework-unabhängige Bibliotheken in `/lib/`
- **Type-Safe:** Durchgehend TypeScript
- **Lazy Loading:** Code-Splitting für optimale Performance
- **Responsive:** Mobile-First CSS Design
