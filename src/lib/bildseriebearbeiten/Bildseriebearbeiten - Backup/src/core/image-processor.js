// src/core/image-processor.js
// Bildverarbeitungs-Modul für Canvas-Operationen und Format-Konvertierungen

/**
 * Zentrale Klasse für alle Bildverarbeitungsoperationen
 */
export class ImageProcessor {
  
  /**
   * Verfügbare Export-Formate
   */
  static availableFormats = [
    { name: 'PNG',  mimeType: 'image/png',  ext: 'png'  },
    { name: 'JPEG', mimeType: 'image/jpeg', ext: 'jpg'  },
    { name: 'WebP', mimeType: 'image/webp', ext: 'webp' },
    { name: 'BMP',  mimeType: 'image/bmp',  ext: 'bmp'  },
    { name: 'GIF',  mimeType: 'image/gif',  ext: 'gif'  }
  ];

  /**
   * Prüft ob ein Format vom Browser unterstützt wird
   * @param {string} mimeType MIME-Type des Formats
   * @returns {boolean} True wenn unterstützt
   */
  static supportsFormat(mimeType) {
    if (mimeType === 'image/png') return true;
    const canvas = document.createElement('canvas');
    canvas.width = 1; 
    canvas.height = 1;
    try {
      const dataURL = canvas.toDataURL(mimeType);
      return dataURL.startsWith('data:' + mimeType);
    } catch (e) { 
      return false; 
    }
  }

  /**
   * Verarbeitet eine Datei und erstellt ein Image-Objekt
   * @param {File} file Die zu verarbeitende Bilddatei
   * @param {Function} callback Callback-Funktion bei Fertigstellung
   * @returns {Promise<Object|null>} Image-Objekt oder null bei Fehler
   */
  static async processFile(file, callback) {
    if (!file.type.match('image.*')) {
      alert('Nur Bilddateien werden unterstützt');
      callback && callback(null);
      return null;
    }

    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const image = new Image();
        image.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            alert('Canvas 2D Kontext nicht verfügbar.');
            callback && callback(null);
            resolve(null);
            return;
          }

          canvas.width = image.width;
          canvas.height = image.height;
          ctx.drawImage(image, 0, 0);

          const imageObj = {
            id: Date.now() + Math.random(),
            file,
            image,
            canvas,
            ctx,
            originalWidth: image.width,
            originalHeight: image.height,
            selected: false,
            outputName: this.getFileNameWithoutExtension(file.name)
          };

          callback && callback(imageObj);
          resolve(imageObj);
        };
        image.onerror = () => {
          console.error('Fehler beim Laden:', file.name);
          alert(`Die Datei ${file.name} konnte nicht geladen werden.`);
          callback && callback(null);
          resolve(null);
        };
        image.src = String(ev.target?.result || '');
      };
      reader.onerror = () => {
        console.error('Lesefehler:', file.name);
        alert(`Die Datei ${file.name} konnte nicht gelesen werden.`);
        callback && callback(null);
        resolve(null);
      };
      reader.readAsDataURL(file);
    });
  }

  /**
   * Ändert die Größe eines Bildes
   * @param {Object} imageObj Das Bild-Objekt
   * @param {number} newWidth Neue Breite
   * @param {number} newHeight Neue Höhe
   * @param {boolean} keepAspect Seitenverhältnis beibehalten
   */
  static resizeImage(imageObj, newWidth, newHeight, keepAspect = false) {
    const canvas = imageObj.canvas;
    const ctx = imageObj.ctx;
    if (!canvas || !ctx) return;

    let targetW = newWidth;
    let targetH = newHeight;
    
    if (keepAspect) {
      const aspect = imageObj.originalWidth / imageObj.originalHeight;
      if (newWidth / newHeight > aspect) {
        targetW = Math.round(newHeight * aspect);
      } else {
        targetH = Math.round(newWidth / aspect);
      }
    }

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = targetW;
    tempCanvas.height = targetH;
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return;

    tempCtx.drawImage(canvas, 0, 0, canvas.width, canvas.height, 0, 0, targetW, targetH);

    canvas.width = targetW;
    canvas.height = targetH;
    ctx.clearRect(0, 0, targetW, targetH);
    ctx.drawImage(tempCanvas, 0, 0);
  }

  /**
   * Konvertiert ein Bild in ein bestimmtes Format
   * @param {Object} imageObj Das Bild-Objekt
   * @param {Object} format Format-Objekt mit mimeType und ext
   * @param {number} quality Qualität (0-1, nur für JPEG)
   * @returns {Promise<Blob>} Blob des konvertierten Bildes
   */
  static async convertToFormat(imageObj, format, quality = 0.95) {
    const canvas = imageObj.canvas;
    
    return new Promise((resolve, reject) => {
      if (canvas.toBlob) {
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Blob konnte nicht erzeugt werden.'));
          }
        }, format.mimeType, quality);
      } else {
        try {
          const dataURL = canvas.toDataURL(format.mimeType, quality);
          const blob = this.dataURLtoBlob(dataURL);
          resolve(blob);
        } catch (err) {
          reject(err);
        }
      }
    });
  }

  /**
   * Konvertiert Data URL zu Blob
   * @param {string} dataURL Data URL String
   * @returns {Blob} Blob-Objekt
   */
  static dataURLtoBlob(dataURL) {
    const parts = dataURL.split(',');
    const meta = parts[0];
    const base64 = parts[1];
    const mime = meta.match(/data:(.*?);base64/)?.[1] || 'application/octet-stream';
    const binStr = atob(base64);
    const len = binStr.length;
    const arr = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      arr[i] = binStr.charCodeAt(i);
    }
    return new Blob([arr], { type: mime });
  }

  /**
   * Erstellt eine Vorschau-Canvas mit begrenzter Größe
   * @param {Object} imageObj Das Bild-Objekt
   * @param {number} maxWidth Maximale Breite
   * @param {number} maxHeight Maximale Höhe
   * @returns {HTMLCanvasElement} Vorschau-Canvas
   */
  static createPreview(imageObj, maxWidth = 300, maxHeight = 300) {
    const previewCanvas = document.createElement('canvas');
    const ctx = previewCanvas.getContext('2d');
    if (!ctx) return previewCanvas;

    const scale = Math.min(maxWidth / imageObj.canvas.width, maxHeight / imageObj.canvas.height, 1);
    previewCanvas.width = Math.floor(imageObj.canvas.width * scale);
    previewCanvas.height = Math.floor(imageObj.canvas.height * scale);

    ctx.drawImage(imageObj.canvas, 0, 0, previewCanvas.width, previewCanvas.height);
    return previewCanvas;
  }

  /**
   * Rotiert ein Bild um gegebene Grad
   * @param {Object} imageObj Das Bild-Objekt
   * @param {number} degrees Grad der Rotation (90, -90, 180)
   */
  static rotateImage(imageObj, degrees) {
    const canvas = imageObj.canvas;
    const ctx = imageObj.ctx;
    if (!canvas || !ctx) return;

    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return;

    const w = canvas.width;
    const h = canvas.height;

    if (Math.abs(degrees) === 90) {
      tempCanvas.width = h;
      tempCanvas.height = w;
      tempCtx.translate(h / 2, w / 2);
      tempCtx.rotate(degrees * Math.PI / 180);
      tempCtx.drawImage(canvas, -w / 2, -h / 2);
      canvas.width = h;
      canvas.height = w;
    } else { // 180 Grad
      tempCanvas.width = w;
      tempCanvas.height = h;
      tempCtx.translate(w / 2, h / 2);
      tempCtx.rotate(degrees * Math.PI / 180);
      tempCtx.drawImage(canvas, -w / 2, -h / 2);
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(tempCanvas, 0, 0);
  }

  /**
   * Spiegelt ein Bild horizontal oder vertikal
   * @param {Object} imageObj Das Bild-Objekt
   * @param {string} direction 'horizontal' oder 'vertical'
   */
  static flipImage(imageObj, direction) {
    const canvas = imageObj.canvas;
    const ctx = imageObj.ctx;
    if (!canvas || !ctx) return;

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return;

    tempCtx.save();
    if (direction === 'horizontal') {
      tempCtx.scale(-1, 1);
      tempCtx.drawImage(canvas, -canvas.width, 0);
    } else { // vertical
      tempCtx.scale(1, -1);
      tempCtx.drawImage(canvas, 0, -canvas.height);
    }
    tempCtx.restore();

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(tempCanvas, 0, 0);
  }

  /**
   * Hilfsfunktion: Extrahiert Dateiname ohne Erweiterung
   * @param {string} fileName Vollständiger Dateiname
   * @returns {string} Dateiname ohne Erweiterung
   */
  static getFileNameWithoutExtension(fileName) {
    const dotIndex = fileName.lastIndexOf('.');
    return dotIndex > 0 ? fileName.substring(0, dotIndex) : fileName;
  }

  /**
   * Hilfsfunktion: Extrahiert Dateierweiterung
   * @param {string} fileName Vollständiger Dateiname
   * @returns {string} Dateierweiterung
   */
  static getFileExtension(fileName) {
    const dot = fileName.lastIndexOf('.');
    return dot > -1 ? fileName.substring(dot + 1) : '';
  }

  /**
   * Bereinigt einen Dateinamen für sicheren Export
   * @param {string} name Der zu bereinigende Name
   * @returns {string} Bereinigter Dateiname
   */
  static safeBaseName(name) {
    return (name || '').replace(/[\\\/:*?"<>|]+/g, '_').trim() || 'Unbenannt';
  }

  /**
   * Löst den finalen Basisnamen für Export auf
   * @param {Object} imageObj Das Bild-Objekt
   * @returns {string} Finaler Basisname
   */
  static resolveBaseName(imageObj) {
    const orig = this.getFileNameWithoutExtension(imageObj.file.name);
    return this.safeBaseName(imageObj.outputName || orig);
  }

  /**
   * Formatiert Dateigröße in lesbarem Format
   * @param {number} bytes Größe in Bytes
   * @returns {string} Formatierte Größe
   */
  static formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    const units = ['KB', 'MB', 'GB', 'TB'];
    let u = -1;
    do {
      bytes /= 1024;
      ++u;
    } while (bytes >= 1024 && u < units.length - 1);
    return bytes.toFixed(1) + ' ' + units[u];
  }
}
