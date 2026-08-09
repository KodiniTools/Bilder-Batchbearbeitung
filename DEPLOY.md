# Deployment

Produktions-Deployment von **Bilderserie Bearbeiten** auf den VPS
(`kodinitools.com`).

## Überblick

| Zweck            | Pfad                                                  |
| ---------------- | ----------------------------------------------------- |
| Quellcode / Build | `/opt/bilderseriebearbeiten`                          |
| Web-Root (SPA)    | `/var/www/kodinitools.com/bilderseriebearbeiten`      |
| Backend (API)     | `/var/www/kodinitools.com/bilderseriebearbeiten/backend` |
| systemd-Service   | `bilderseriebearbeiten-api` (Port 9003)               |
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

| Befehl                      | Wirkung                                  |
| --------------------------- | ---------------------------------------- |
| `./deploy.sh`               | Frontend + Backend                       |
| `./deploy.sh --frontend-only` | nur das SPA                            |
| `./deploy.sh --backend-only`  | nur Backend + Service-Neustart         |
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

## Prüfen

```bash
curl https://kodinitools.com/bilderseriebearbeiten/health   # Backend
curl -I https://kodinitools.com/bilderseriebearbeiten/       # Frontend
sudo systemctl status bilderseriebearbeiten-api             # Service
```
