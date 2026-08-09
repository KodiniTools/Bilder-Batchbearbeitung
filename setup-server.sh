#!/usr/bin/env bash
#
# setup-server.sh – Erstinstallation auf dem Server (VPS)
# ---------------------------------------------------------------------------
# Richtet die Server-Ordner ein, klont das Repository und führt anschließend
# das erste Deployment über deploy.sh aus.
#
#   SRC_DIR    Klon-Ort des Repos (Quellcode/Build)  – NICHT das Web-Root
#   DEPLOY_DIR Web-Root, das NGINX ausliefert         – hier landet das SPA
#
# Ausführen auf dem Server (einmalig):
#   curl -fsSL https://raw.githubusercontent.com/KodiniTools/Bilder-Batchbearbeitung/main/setup-server.sh | bash
# oder nach manuellem Klonen:
#   ./setup-server.sh
#
# Wiederholbar: bei erneutem Aufruf wird der bestehende Klon aktualisiert.
# Voraussetzungen: git, node/npm, python3+venv, rsync, curl, sudo.
# ---------------------------------------------------------------------------

set -euo pipefail

# ─── Konfiguration ─────────────────────────────────────────────────────────
REPO_URL="${REPO_URL:-https://github.com/KodiniTools/Bilder-Batchbearbeitung.git}"
BRANCH="${DEPLOY_BRANCH:-main}"
SRC_DIR="${SRC_DIR:-/var/www/kodinitools.com/src/bilderseriebearbeiten}"
DEPLOY_DIR="${DEPLOY_DIR:-/var/www/kodinitools.com/bilderseriebearbeiten}"

log()  { printf '\033[1;34m▶ %s\033[0m\n' "$*"; }
ok()   { printf '\033[1;32m✔ %s\033[0m\n' "$*"; }
warn() { printf '\033[1;33m! %s\033[0m\n' "$*"; }
die()  { printf '\033[1;31m✖ %s\033[0m\n' "$*" >&2; exit 1; }

# ─── 0. Voraussetzungen prüfen ─────────────────────────────────────────────
log "Prüfe benötigte Programme…"
MISSING=()
for cmd in git node npm python3 rsync curl; do
  command -v "$cmd" >/dev/null 2>&1 || MISSING+=("$cmd")
done
python3 -c 'import venv' >/dev/null 2>&1 || MISSING+=("python3-venv")
if [[ ${#MISSING[@]} -gt 0 ]]; then
  warn "Fehlende Programme: ${MISSING[*]}"
  warn "Installieren (Ubuntu/Debian): sudo apt update && sudo apt install -y git nodejs npm python3 python3-venv rsync curl"
  die  "Bitte zuerst die Voraussetzungen installieren."
fi
ok "Alle Voraussetzungen vorhanden."

# ─── 1. Ordner anlegen ─────────────────────────────────────────────────────
CURRENT_USER="$(id -un)"
CURRENT_GROUP="$(id -gn)"

log "Lege Ordner an…"
sudo mkdir -p "$DEPLOY_DIR"
sudo mkdir -p "$(dirname "$SRC_DIR")"
# Klon-Ordner gehört dem ausführenden User (git-Operationen ohne sudo).
sudo chown "${CURRENT_USER}:${CURRENT_GROUP}" "$(dirname "$SRC_DIR")"
ok "Ordner vorbereitet: ${SRC_DIR} (Quelle) / ${DEPLOY_DIR} (Web-Root)."

# ─── 2. Repository klonen oder aktualisieren ───────────────────────────────
if [[ -d "$SRC_DIR/.git" ]]; then
  log "Repo existiert bereits – aktualisiere ${BRANCH}…"
  git -C "$SRC_DIR" fetch origin "$BRANCH"
  git -C "$SRC_DIR" checkout "$BRANCH"
  git -C "$SRC_DIR" pull --ff-only origin "$BRANCH"
else
  log "Klone ${REPO_URL} → ${SRC_DIR}…"
  git clone --branch "$BRANCH" "$REPO_URL" "$SRC_DIR"
fi
ok "Quellcode bereit ($(git -C "$SRC_DIR" rev-parse --short HEAD))."

# ─── 3. Deployen ───────────────────────────────────────────────────────────
log "Starte Deployment…"
cd "$SRC_DIR"
chmod +x ./deploy.sh
# git-Schritt in deploy.sh überspringen – wir sind hier bereits aktuell.
DEPLOY_DIR="$DEPLOY_DIR" DEPLOY_BRANCH="$BRANCH" ./deploy.sh --no-git

ok "Server-Setup abgeschlossen."
echo
echo "  Quelle : ${SRC_DIR}"
echo "  Web-Root: ${DEPLOY_DIR}"
echo "  URL     : https://kodinitools.com/bilderseriebearbeiten/"
echo
echo "  Künftige Deployments:  cd ${SRC_DIR} && ./deploy.sh"
