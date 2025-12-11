# SVG-Konvertierung Backend - Installationsanleitung

## Voraussetzungen

- Ubuntu 24.04 LTS
- Python 3.10 oder höher
- Sudo-Rechte

## Installation auf dem VPS

### 1. Python und pip installieren (falls nicht vorhanden)

```bash
sudo apt update
sudo apt install python3 python3-pip python3-venv -y
```

### 2. Backend-Dateien kopieren

Kopiere den `backend`-Ordner nach `/var/www/kodinitools.com/bilderseriebearbeiten/`:

```bash
# Falls du das Projekt auf dem VPS geclont hast:
cp -r /pfad/zum/repo/backend /var/www/kodinitools.com/bilderseriebearbeiten/

# Oder manuell die Dateien kopieren:
# - main.py
# - requirements.txt
# - bilderseriebearbeiten-api.service
```

### 3. Virtual Environment erstellen

```bash
cd /var/www/kodinitools.com/bilderseriebearbeiten/backend

# Virtual Environment erstellen
python3 -m venv venv

# Aktivieren
source venv/bin/activate

# Abhängigkeiten installieren
pip install -r requirements.txt
```

### 4. Service installieren

```bash
# Service-Datei kopieren
sudo cp bilderseriebearbeiten-api.service /etc/systemd/system/

# Systemd neu laden
sudo systemctl daemon-reload

# Service aktivieren (startet automatisch beim Boot)
sudo systemctl enable bilderseriebearbeiten-api

# Service starten
sudo systemctl start bilderseriebearbeiten-api

# Status prüfen
sudo systemctl status bilderseriebearbeiten-api
```

### 5. Berechtigungen setzen

```bash
# Dem www-data User Zugriff geben
sudo chown -R www-data:www-data /var/www/kodinitools.com/bilderseriebearbeiten/backend
```

## NGINX-Konfiguration

Die NGINX-Konfiguration ist bereits vorhanden und sollte funktionieren:

```nginx
location ^~ /bilderseriebearbeiten/api/ {
    include /etc/nginx/snippets/kodini-proxy-common.conf;
    rewrite ^/bilderseriebearbeiten/(.*)$ /$1 break;
    proxy_pass http://127.0.0.1:9003/;
    # ... CORS headers
}
```

Falls nicht vorhanden, füge diese Location-Blöcke hinzu und starte NGINX neu:

```bash
sudo nginx -t  # Konfiguration testen
sudo systemctl reload nginx
```

## Testen

### Health-Check

```bash
curl http://localhost:9003/health
# Erwartete Antwort: {"status":"healthy","service":"svg-converter"}
```

### Über NGINX (von außen)

```bash
curl https://kodinitools.com/bilderseriebearbeiten/health
```

### Test-Konvertierung

```bash
# Einzelnes Bild konvertieren
curl -X POST http://localhost:9003/api/convert-svg \
  -F "file=@test.png" \
  -F "colormode=color" \
  -o output.svg
```

## Logs einsehen

```bash
# Live-Logs
sudo journalctl -u bilderseriebearbeiten-api -f

# Letzte 100 Zeilen
sudo journalctl -u bilderseriebearbeiten-api -n 100
```

## Fehlerbehebung

### Service startet nicht

```bash
# Detaillierte Logs anzeigen
sudo journalctl -u bilderseriebearbeiten-api -e

# Manuell testen
cd /var/www/kodinitools.com/bilderseriebearbeiten/backend
source venv/bin/activate
python main.py
```

### Port bereits belegt

```bash
# Prüfen welcher Prozess Port 9003 verwendet
sudo lsof -i :9003

# Falls nötig, Prozess beenden
sudo kill -9 <PID>
```

### Abhängigkeiten fehlen

```bash
cd /var/www/kodinitools.com/bilderseriebearbeiten/backend
source venv/bin/activate
pip install --upgrade -r requirements.txt
```

## Service-Befehle

```bash
# Starten
sudo systemctl start bilderseriebearbeiten-api

# Stoppen
sudo systemctl stop bilderseriebearbeiten-api

# Neustarten
sudo systemctl restart bilderseriebearbeiten-api

# Status
sudo systemctl status bilderseriebearbeiten-api

# Logs
sudo journalctl -u bilderseriebearbeiten-api -f
```

## Konfiguration anpassen

Die API läuft standardmäßig auf Port 9003 mit 2 Worker-Prozessen. Um dies zu ändern, editiere die Service-Datei:

```bash
sudo nano /etc/systemd/system/bilderseriebearbeiten-api.service
```

Nach Änderungen:

```bash
sudo systemctl daemon-reload
sudo systemctl restart bilderseriebearbeiten-api
```
