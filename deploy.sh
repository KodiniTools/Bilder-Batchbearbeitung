#!/usr/bin/env bash
#
# deploy.sh – Deployment für "Bilderserie Bearbeiten"
# ---------------------------------------------------------------------------
# Baut das Frontend aus dem aktuellen main-Branch und veröffentlicht es im
# Server-Ordner /var/www/kodinitools.com/bilderseriebearbeiten. Optional wird
# auch das Python-Backend (FastAPI, Port 9003) aktualisiert und der zugehörige
# systemd-Service neu gestartet.
#
# Ausführen auf dem Server (dort wo dieses Repo geklont ist):
#   ./deploy.sh                 # Frontend + Backend deployen
#   ./deploy.sh --frontend-only # nur das SPA deployen
#   ./deploy.sh --no-git        # aktuellen Checkout deployen, ohne git pull
#
# Voraussetzungen: git, node/npm, rsync, sudo-Rechte für systemctl/chown.
# ---------------------------------------------------------------------------

set -euo pipefail

# ─── Konfiguration ─────────────────────────────────────────────────────────
BRANCH="${DEPLOY_BRANCH:-main}"
DEPLOY_DIR="${DEPLOY_DIR:-/var/www/kodinitools.com/bilderseriebearbeiten}"
BACKEND_DIR="${DEPLOY_DIR}/backend"
SERVICE_NAME="${DEPLOY_SERVICE:-bilderseriebearbeiten-api}"
WEB_USER="${DEPLOY_WEB_USER:-www-data}"
WEB_GROUP="${DEPLOY_WEB_GROUP:-www-data}"
HEALTH_URL="${DEPLOY_HEALTH_URL:-http://127.0.0.1:9003/health}"

# Verzeichnis dieses Scripts = Repo-Wurzel
REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ─── Optionen ──────────────────────────────────────────────────────────────
DO_GIT=1
DO_BACKEND=1

for arg in "$@"; do
  case "$arg" in
    --no-git)         DO_GIT=0 ;;
    --frontend-only)  DO_BACKEND=0 ;;
    --backend-only)   DO_BACKEND=1; FRONTEND_ONLY_SKIP=1 ;;
    -h|--help)
      grep '^#' "$0" | sed 's/^# \{0,1\}//'
      exit 0 ;;
    *)
      echo "Unbekannte Option: $arg" >&2
      exit 1 ;;
  esac
done

log()  { printf '\033[1;34m▶ %s\033[0m\n' "$*"; }
ok()   { printf '\033[1;32m✔ %s\033[0m\n' "$*"; }
warn() { printf '\033[1;33m! %s\033[0m\n' "$*"; }
die()  { printf '\033[1;31m✖ %s\033[0m\n' "$*" >&2; exit 1; }

cd "$REPO_DIR"

# ─── 1. Quellstand aktualisieren ───────────────────────────────────────────
if [[ "$DO_GIT" -eq 1 ]]; then
  log "Aktualisiere Quellcode aus '${BRANCH}'…"
  if [[ -n "$(git status --porcelain)" ]]; then
    die "Arbeitsverzeichnis ist nicht sauber. Bitte committen/stashen oder mit --no-git deployen."
  fi
  git fetch origin "$BRANCH"
  git checkout "$BRANCH"
  git pull --ff-only origin "$BRANCH"
  ok "Auf $(git rev-parse --short HEAD) aktualisiert."
else
  warn "git-Schritt übersprungen (--no-git). Deploye aktuellen Checkout."
fi

# ─── 2. Frontend bauen ─────────────────────────────────────────────────────
if [[ "${FRONTEND_ONLY_SKIP:-0}" -ne 1 ]]; then
  log "Installiere npm-Abhängigkeiten…"
  if [[ -f package-lock.json ]]; then
    npm ci
  else
    npm install
  fi

  log "Baue Frontend (vite build)…"
  npm run build
  [[ -f dist/index.html ]] || die "Build fehlgeschlagen: dist/index.html nicht gefunden."
  ok "Build erstellt."

  # ─── 3. Frontend veröffentlichen ─────────────────────────────────────────
  log "Veröffentliche Frontend nach ${DEPLOY_DIR}…"
  sudo mkdir -p "$DEPLOY_DIR"
  # dist/ synchronisieren; Backend-Ordner NICHT löschen (--exclude /backend/).
  sudo rsync -a --delete \
    --exclude '/backend/' \
    dist/ "$DEPLOY_DIR/"
  ok "Frontend veröffentlicht."
fi

# ─── 4. Backend deployen ───────────────────────────────────────────────────
if [[ "$DO_BACKEND" -eq 1 ]]; then
  log "Aktualisiere Backend-Code in ${BACKEND_DIR}…"
  sudo mkdir -p "$BACKEND_DIR"
  # venv NICHT überschreiben – nur Quellcode/Abhängigkeitslisten kopieren.
  sudo rsync -a --delete \
    --exclude 'venv/' \
    --exclude '__pycache__/' \
    "$REPO_DIR/backend/" "$BACKEND_DIR/"

  # venv anlegen, falls noch nicht vorhanden (Erstdeploy).
  if [[ ! -x "$BACKEND_DIR/venv/bin/python" ]]; then
    log "Erstelle Python-Virtualenv…"
    sudo python3 -m venv "$BACKEND_DIR/venv"
  fi

  log "Installiere Python-Abhängigkeiten…"
  sudo "$BACKEND_DIR/venv/bin/pip" install --upgrade pip
  sudo "$BACKEND_DIR/venv/bin/pip" install -r "$BACKEND_DIR/requirements.txt"
  ok "Backend aktualisiert."
fi

# ─── 5. Berechtigungen ─────────────────────────────────────────────────────
log "Setze Berechtigungen (${WEB_USER}:${WEB_GROUP})…"
sudo chown -R "${WEB_USER}:${WEB_GROUP}" "$DEPLOY_DIR"
ok "Berechtigungen gesetzt."

# ─── 6. Backend-Service neu starten ────────────────────────────────────────
if [[ "$DO_BACKEND" -eq 1 ]]; then
  # systemd-Unit installieren, falls noch nicht vorhanden.
  if [[ ! -f "/etc/systemd/system/${SERVICE_NAME}.service" ]]; then
    log "Installiere systemd-Service ${SERVICE_NAME}…"
    sudo cp "$BACKEND_DIR/${SERVICE_NAME}.service" "/etc/systemd/system/${SERVICE_NAME}.service"
    sudo systemctl daemon-reload
    sudo systemctl enable "$SERVICE_NAME"
  fi

  log "Starte Service ${SERVICE_NAME} neu…"
  sudo systemctl restart "$SERVICE_NAME"

  # Kurzer Health-Check.
  sleep 2
  if curl -fsS "$HEALTH_URL" >/dev/null 2>&1; then
    ok "Backend läuft (Health-Check OK)."
  else
    warn "Health-Check fehlgeschlagen: ${HEALTH_URL}"
    warn "Logs: sudo journalctl -u ${SERVICE_NAME} -n 50"
  fi
fi

ok "Deployment abgeschlossen → ${DEPLOY_DIR}"
