# Deployment

Produktions-Deployment von **Bilderserie Bearbeiten** auf den VPS
(`kodinitools.com`).

## Überblick

| Zweck             | Pfad                                                             |
| ----------------- | ---------------------------------------------------------------- |
| Quellcode / Build | `/opt/bilderseriebearbeiten`                                     |
| Web-Root (SPA)    | `/var/www/kodinitools.com/bilderseriebearbeiten`                 |
| Backend (API)     | `/var/www/kodinitools.com/bilderseriebearbeiten/backend`         |
| systemd-Service   | `bilderseriebearbeiten-api` (Port 9003)                          |
| Favicon           | `/var/www/kodinitools.com/public/favicon.ico` (→ `/favicon.ico`) |

Der **Quellcode-Ordner** (Klon + Build, unter `/opt`) und das **Web-Root**
(unter `/var/www`, das NGINX ausliefert) sind bewusst getrennt: `deploy.sh`
baut im Quell-Ordner und synchronisiert nur das fertige `dist/` ins Web-Root.

## Erstinstallation

Einmalig auf dem Server ausführen – legt Ordner an, klont das Repo und
deployt:

```bash
curl -fsSL https://raw.githubusercontent.com/KodiniTools/Bilder-Batchbearbeitung/main/setup-server.sh | bash
```

Oder manuell:

```bash
sudo mkdir -p /opt/bilderseriebearbeiten
sudo chown "$USER":"$USER" /opt/bilderseriebearbeiten
git clone https://github.com/KodiniTools/Bilder-Batchbearbeitung.git \
  /opt/bilderseriebearbeiten
cd /opt/bilderseriebearbeiten
./setup-server.sh
```

Voraussetzungen (Ubuntu/Debian):

```bash
sudo apt update && sudo apt install -y git nodejs npm python3 python3-venv rsync curl
```

> **Node ≥ 22.13.0** erforderlich (siehe `engines` in `package.json` /
> `.nvmrc`). Ältere 22.x-Versionen bauen zwar, erzeugen aber
> `EBADENGINE`-Warnungen. Aktuelle LTS installieren:
>
> ```bash
> curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash - && sudo apt install -y nodejs
> # oder per nvm (nutzt .nvmrc):
> nvm install && nvm use
> ```

## Laufende Deployments

Nach jedem Merge in `main`:

```bash
cd /opt/bilderseriebearbeiten
./deploy.sh
```

`deploy.sh` holt `main`, baut das Frontend, veröffentlicht es ins Web-Root
(ohne den `backend/`-Ordner zu löschen), aktualisiert das Backend-`venv`
und startet den API-Service neu.

Optionen:

| Befehl                        | Wirkung                                 |
| ----------------------------- | --------------------------------------- |
| `./deploy.sh`                 | Frontend + Backend                      |
| `./deploy.sh --frontend-only` | nur das SPA                             |
| `./deploy.sh --backend-only`  | nur Backend + Service-Neustart          |
| `./deploy.sh --no-git`        | aktuellen Checkout deployen (kein Pull) |

Überschreibbare Variablen (Env): `DEPLOY_DIR`, `SRC_DIR`, `DEPLOY_BRANCH`,
`DEPLOY_SERVICE`, `DEPLOY_WEB_USER`, `DEPLOY_WEB_GROUP`, `DEPLOY_HEALTH_URL`.

## NGINX

Die Location-Blöcke für `/bilderseriebearbeiten/` (statisches SPA) und den
API-Proxy auf `127.0.0.1:9003` sind bereits konfiguriert. Das `alias`-Ziel
muss auf das Web-Root oben zeigen. Nach Änderungen:

```bash
sudo nginx -t && sudo systemctl reload nginx
```

### Sprach-/routenspezifisches HTML für Crawler (`?lang=en`)

Der Build erzeugt neben `index.html` je Route und Sprache eine Datei
`seo/<route>.<lang>.html` (`home`, `app`, `faq`, `blog`, `articles` ×
`de`, `en`). Darin stehen `<html lang>`, `<title>`, Description, Canonical,
hreflang sowie `og:`/`twitter:`-Titel und -Beschreibung bereits fertig, damit
Google und KI-Crawler ohne JavaScript z. B. unter `/faq?lang=en` die englische
Seite sehen. Quelle: `vite-plugins/localized-html.ts`.

Ohne NGINX-Anpassung ändert sich nichts (es wird weiter `index.html`
ausgeliefert). Aktivieren:

1. Im `http { }`-Kontext (z. B. `/etc/nginx/conf.d/bilderseriebearbeiten-seo.conf`):

   ```nginx
   map $arg_lang $bsb_lang {
       default  de;
       en       en;
   }

   map $uri $bsb_page {
       default                                home;
       ~^/bilderseriebearbeiten/app/?$        app;
       ~^/bilderseriebearbeiten/faq/?$        faq;
       ~^/bilderseriebearbeiten/blog/?$       blog;
       ~^/bilderseriebearbeiten/artikel/?$    articles;
   }
   ```

2. Im bestehenden `location /bilderseriebearbeiten/ { … }` die
   `try_files`-Zeile ersetzen (`alias` und `ssi on` bleiben wie sie sind):

   ```nginx
   try_files $uri /bilderseriebearbeiten/seo/$bsb_page.$bsb_lang.html /bilderseriebearbeiten/index.html;
   ```

   - `$uri/` entfällt bewusst: sonst würde `/bilderseriebearbeiten/` über
     die `index`-Direktive immer die deutsche `index.html` liefern.
   - Die `seo/`-Datei wird direkt ausgeliefert (kein interner Redirect), SSI
     (`nav`, `footer`, `cookie-banner`) greift wie bisher.
   - Fehlt `seo/` (z. B. älterer Build), greift weiter `index.html`.
   - Gelten für `index.html` eigene Cache-Header (eigener `location`-Block),
     dieselben Header auch für `/bilderseriebearbeiten/seo/` setzen.

3. `sudo nginx -t && sudo systemctl reload nginx`, dann prüfen:

   ```bash
   curl -s 'https://kodinitools.com/bilderseriebearbeiten/?lang=en' | grep -E '<html|<title>|canonical'
   curl -s 'https://kodinitools.com/bilderseriebearbeiten/faq?lang=en' | grep -E '<html|<title>|canonical'
   curl -s 'https://kodinitools.com/bilderseriebearbeiten/faq' | grep -E '<html|<title>|canonical'
   ```

   Erwartet: `lang="en"`, englischer Titel, Canonical mit `?lang=en` bzw.
   `/faq` für die deutsche FAQ.

## Prüfen

```bash
curl https://kodinitools.com/bilderseriebearbeiten/health   # Backend
curl -I https://kodinitools.com/bilderseriebearbeiten/       # Frontend
sudo systemctl status bilderseriebearbeiten-api             # Service
```
