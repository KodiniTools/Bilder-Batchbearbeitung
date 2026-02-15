# Bewertung: Migrations-Workflow Vue SPA → Astro + Vue Islands

## Anwendbarkeit auf Bilder-Batchbearbeitung

**Gesamtbewertung: Gut anwendbar — mit projektspezifischen Anpassungen**

Der Workflow aus dem Referenzprojekt passt strukturell auf die Bilder-Batchbearbeitung. Beide Projekte teilen das gleiche Muster: eine Vue 3 SPA mit Marketing-Seiten + einer interaktiven App-Seite, eingebettet in eine KodiniTools-Site via SSI. Die Unterschiede liegen im Detail — insbesondere bei den Browser-APIs und dem Routing.

---

## Phase-für-Phase Bewertung

### Phase 1 — Vorbereitung

| Schritt | Anwendbar? | Anmerkungen |
|---------|-----------|-------------|
| Astro-Projekt aufsetzen | **Ja** | Standardprozedur, identisch |
| `base` setzen | **Ja** | Wird `/bilderseriebearbeiten/` (statt aktuell in `vite.config.ts`) |
| `appEntrypoint` für Pinia + i18n | **Ja** | Exakt das gleiche Muster — `createPinia()` + `createI18n()` aus `main.ts` wandern in `_app.ts` |

**Besonderheit:** vue-router wird in der Astro-Version vermutlich **nicht mehr benötigt**. Das Routing übernimmt Astro (Dateisystem-basiert). Details dazu in Phase 3.

### Phase 2 — Komponenten umziehen

| Schritt | Anwendbar? | Anmerkungen |
|---------|-----------|-------------|
| `src/components/` verschieben | **Ja** | 16 Komponenten → `src/components/vue/bilderseriebearbeiten/` |
| `src/composables/` verschieben | **Ja** | 1 Composable (`useToast.ts`) |
| `src/stores/` verschieben | **Ja** | 1 Store (`imageStore.ts`) |
| `src/locales/` verschieben | **Ja** | 2 JSON-Dateien (de.json, en.json) |
| Import-Pfade anpassen | **Ja** | `@/`-Aliase auf relative Pfade umstellen |

**Zusätzlich zu verschieben:**
- `src/lib/` (core + features) — Die framework-unabhängige Kernlogik (`image-processor.ts`, `export-pdf.ts`, `export-zip.ts`, `export-svg.ts`, `types.ts`) muss ebenfalls mit umziehen, da die Vue-Komponenten diese importieren.
- `src/types/` — Zusätzliche Typdefinitionen.

**Nicht verschieben:**
- `src/views/` — Diese werden durch Astro-Seiten ersetzt (Phase 3). Die View-Komponenten selbst werden aufgelöst.

### Phase 3 — Astro-Seiten erstellen

| Schritt | Anwendbar? | Anmerkungen |
|---------|-----------|-------------|
| Landing-Page als `index.astro` | **Ja, sehr gut** | `LandingPage.vue` ist reines Marketing-HTML (Hero, Features, FAQ-Teaser, Donate) — idealer Kandidat für statisches HTML |
| App-Page als `app.astro` | **Ja** | `AppPage.vue` als Vue Island mit `client:only="vue"` |

**Dieses Projekt hat 5 Routen, nicht nur 2.** Die vollständige Seitenstruktur wird:

| Aktuelle Route | Astro-Seite | Rendering |
|---------------|-------------|-----------|
| `/` (LandingPage) | `src/pages/index.astro` | **Statisches HTML** — Inhalte kommen aus i18n-JSON, werden zur Build-Zeit gerendert oder via `data-i18n` + Vanilla JS |
| `/app` (AppPage) | `src/pages/app.astro` | **Vue Island** mit `client:only="vue"` — die gesamte interaktive App |
| `/faq` (FaqPage) | `src/pages/faq.astro` | **Statisches HTML** — `<details>/<summary>` braucht kein Vue |
| `/blog` (BlogPage) | `src/pages/blog.astro` | **Statisches HTML** — Langer Inhalt mit sticky ToC, braucht maximal minimales Vanilla JS für Scroll-Spy |
| `/learn` (LearnPage) | `src/pages/learn.astro` | **Statisches HTML** — Tutorial-Inhalte mit Code-Blöcken, Toggle via Vanilla JS |

**Ergebnis:** vue-router entfällt komplett. Astro übernimmt das Routing. Nur `/app` bleibt als Vue Island.

**Wichtig — `client:only="vue"` ist Pflicht:** Die App nutzt massiv Canvas API, File API, DragEvent, und localStorage. SSR ist ausgeschlossen.

### Phase 4 — Integration

| Schritt | Anwendbar? | Anmerkungen |
|---------|-----------|-------------|
| `language-changed` Event | **Ja, bereits vorhanden!** | Die App hört schon auf `window.addEventListener('language-changed', ...)` — das SSI-Event-System ist identisch |
| `theme-changed` Event | **Ja, bereits vorhanden!** | Theme wird via `data-theme` auf `<html>` gesetzt — gleiches Muster |
| CSS migrieren | **Ja** | `main.css` als globaler Import. Die Warnung vor Astro-Scoping gilt auch hier |

**Besonderheit:** Die App nutzt `window.matchMedia('(prefers-color-scheme: dark)')` als Fallback — das funktioniert weiterhin im Vue Island.

### Phase 5 — Build & Deployment

| Schritt | Anwendbar? | Anmerkungen |
|---------|-----------|-------------|
| Build-Script anpassen | **Ja** | `base: '/bilderseriebearbeiten/'` → gleicher `_astro`-Pfad-Fix nötig |
| Nginx-Config anpassen | **Ja** | Identisches Setup — `root`, `/_astro` location, `ssi on;` |

**Zusätzlich:**
- Backend-Integration prüfen: Die NGINX-Config muss weiterhin `/bilderseriebearbeiten/api` an den FastAPI-Backend-Service (Port 9003) proxyen. Das ist unabhängig von Astro und bleibt unverändert.

### Phase 6 — Aufräumen

| Zu entfernen | Anwendbar? | Anmerkungen |
|-------------|-----------|-------------|
| `vite.config.ts` | **Ja** | Astro übernimmt Vite |
| `index.html` | **Ja** | Ersetzt durch `index.astro` — die SEO-Meta-Tags und JSON-LD Blöcke müssen in das Astro-Layout übernommen werden |
| `src/main.ts` | **Ja** | Ersetzt durch `_app.ts` |
| `src/router/` | **Ja** | Astro-Dateisystem-Routing ersetzt vue-router |
| `src/views/LandingPage.vue` | **Ja** | Wird zu `index.astro` (statisches HTML) |
| `src/views/FaqPage.vue` | **Ja** | Wird zu `faq.astro` (statisches HTML) |
| `src/views/BlogPage.vue` | **Ja** | Wird zu `blog.astro` (statisches HTML) |
| `src/views/LearnPage.vue` | **Ja** | Wird zu `learn.astro` (statisches HTML) |
| `src/views/AppPage.vue` | **Teilweise** | Die Logik bleibt als Vue-Komponente erhalten, wird aber in `app.astro` eingebunden |
| vue-router (Dependency) | **Ja** | Kann aus `package.json` entfernt werden |

---

## Projektspezifische Fallstricke

| Fallstrick | Relevanz | Lösung |
|-----------|----------|--------|
| **Canvas/File API + SSR** | **Hoch** | `client:only="vue"` ist zwingend — die App speichert `HTMLCanvasElement` und `CanvasRenderingContext2D` direkt im Pinia Store |
| **Astro Scoped CSS bricht Vue-Styles** | **Hoch** | Globalen CSS-Import (`main.css`) im Astro-Layout verwenden, nicht in `<style>` im `.astro`-File |
| **`_astro/`-Ordner Pfad** | **Mittel** | Build-Script mit `mv dist/_astro dist/bilderseriebearbeiten/_astro` nachkorrigieren |
| **SEO-Meta-Tags aus index.html** | **Mittel** | 3 JSON-LD Blöcke + Open Graph Tags müssen ins Astro-Layout übertragen werden |
| **Font Awesome (lokal geladen)** | **Niedrig** | `<link>`-Tags aus `index.html` ins Astro-Layout übernehmen — funktioniert unverändert |
| **Custom Fonts (10 Variable Fonts)** | **Niedrig** | `fonts.css` wird als globaler Import weiterhin funktionieren |
| **i18n auf statischen Seiten** | **Mittel** | Landing/FAQ/Blog/Learn brauchen `data-i18n` + Vanilla JS statt vue-i18n. Alternative: Astro i18n-Integration mit statischer Generierung pro Sprache |
| **Pinia Store hält DOM-Referenzen** | **Mittel** | `ImageObject` enthält `HTMLCanvasElement`, `HTMLImageElement`, `CanvasRenderingContext2D` — nicht serialisierbar, kein SSR möglich. Kein Problem mit `client:only` |
| **Legacy-Code in `src/lib/bildseriebearbeiten/`** | **Niedrig** | Alter Vanilla-JS-Backup — kann bei der Migration komplett entfernt werden |
| **i18next (nicht vue-i18n) in Dependencies** | **Niedrig** | `i18next`, `i18next-browser-languagedetector`, `i18next-http-backend` sind installiert aber unbenutzt — bei Migration entfernen |

---

## Konkreter Migrationsplan für dieses Projekt

### Was statisch wird (Astro rendert HTML)
- **LandingPage** — Hero, Feature-Cards, Donate-Section → reines HTML + CSS
- **FaqPage** — `<details>/<summary>` Accordion → natives HTML
- **BlogPage** — Langer Artikel mit ToC → HTML + optionales Vanilla JS für Scroll-Spy
- **LearnPage** — Tutorial-Inhalte mit Code-Blöcken → HTML + Vanilla JS für Toggle

### Was als Vue Island bleibt
- **AppPage** — Die gesamte interaktive Bildbearbeitungs-App:
  - DropZone (Drag & Drop Upload)
  - ImageGrid + ImageCard (Bildergalerie mit Selektion)
  - ImageEditor (Filter, Transformationen)
  - BatchEditPanel (Massenbearbeitung)
  - ExportSettingsModal + FrontPageDesigner + CommentPageDesigner (PDF-Export)
  - StatusBar (Aktions-Toolbar)
  - LoadingIndicator, ToastContainer

### Was entfällt
- vue-router (+ `src/router/`)
- `vite.config.ts`
- `index.html`
- `src/main.ts`
- Alle View-Dateien in `src/views/` (werden zu `.astro`-Seiten)
- Unbenutzte i18next-Dependencies

---

## Empfehlung

Der Workflow ist **direkt anwendbar** mit folgenden Anpassungen:

1. **5 statt 2 Seiten** — Der Referenz-Workflow hatte nur Landing + App. Hier kommen FAQ, Blog und Learn dazu, die alle ebenfalls statisch werden können.

2. **vue-router entfällt komplett** — Im Referenzprojekt wurde es vielleicht noch teilweise genutzt. Hier kann es vollständig durch Astro-Routing ersetzt werden.

3. **i18n auf statischen Seiten** — Die 4 statischen Seiten (Landing, FAQ, Blog, Learn) verwenden aktuell vue-i18n via `{{ t('key') }}`. Diese müssen entweder:
   - (a) per `data-i18n` + Vanilla JS Listener gelöst werden (wie im Workflow beschrieben), oder
   - (b) statisch pro Sprache generiert werden (`/de/`, `/en/` Unterordner via Astro i18n)

4. **Backend-Proxy bleibt unverändert** — Die NGINX-Konfiguration für `/api` → FastAPI muss nicht angepasst werden.

5. **SEO-Overhead** — Die aktuelle `index.html` enthält umfangreiche SEO-Meta-Tags (Open Graph, Twitter Cards, 3x JSON-LD). Diese müssen sorgfältig ins Astro-Layout übertragen werden.

**Fazit:** Die Architektur der Bilder-Batchbearbeitung passt ideal zum Island-Muster. Es gibt eine klare Trennung: 4 Seiten sind rein statisch (Marketing/Inhalt), 1 Seite ist hochgradig interaktiv (die eigentliche App). Die SSI-Integration und das Event-System (`language-changed`, `theme-changed`) sind bereits vorhanden und kompatibel. Der Migrations-Aufwand liegt hauptsächlich in der Konvertierung der 4 Content-Seiten von Vue zu statischem HTML und der i18n-Strategie für diese Seiten.
