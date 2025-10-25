// src/features/files.js
import { state } from '../core/state.js';
import {
  sanitizeFileName,
  getFileNameWithoutExtension,
  showLoading,
  hideLoading,
} from '../core/utils.js';

/** Drop-Handler */
export function handleDrop(e, els, onEach) {
  const dt = e.dataTransfer;
  const files = dt && dt.files;
  if (files) handleFiles(files, els, onEach);
}

/** Liste von Dateien verarbeiten */
export function handleFiles(files, els, onEach) {
  if (!files || !files.length) return;

  showLoading(els, 'Bilder werden geladen …');

  const list = Array.from(files);
  let done = 0;

  list.forEach((file) =>
    processFile(
      file,
      (imageObj) => {
        // pro Bild: optionaler Callback (z.B. updateUI)
        try { onEach && onEach(imageObj); } catch {}
        // 🔔 Event senden, damit main.js sicher die UI aktualisiert
        try { window.dispatchEvent(new CustomEvent('images-updated', { detail: { id: imageObj?.id } })); } catch {}
        // Abschluss
        if (++done === list.length) {
          hideLoading(els);
          // 🔔 Nach dem letzten Bild zur Sicherheit nochmals feuern
          try { window.dispatchEvent(new Event('images-updated')); } catch {}
        }
      },
      els,
    ),
  );
}

/** Eine einzelne Bilddatei lesen und in den State pushen */
export function processFile(file, callback, els) {
  if (!(file instanceof File)) { callback?.(); return; }
  if (!file.type || !file.type.startsWith('image/')) { callback?.(); return; }

  const reader = new FileReader();

  reader.onload = (ev) => {
    const dataUrl = String(ev.target?.result || '');
    const img = new Image();

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.width; canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Canvas 2D Kontext nicht verfügbar');
        ctx.drawImage(img, 0, 0);

        const id =
          Date.now().toString(36) + '-' +
          (state.currentImageIndex ?? 0).toString(36) + '-' +
          Math.random().toString(36).slice(2, 7);

        const baseName = sanitizeFileName(
          getFileNameWithoutExtension(file.name || 'bild'),
        );

        const imageObj = {
          id, file, image: img, canvas, ctx,
          originalWidth: img.width, originalHeight: img.height,
          selected: false, outputName: baseName || 'bild',
        };

        if (typeof state.currentImageIndex === 'number') {
          state.currentImageIndex++;
        } else {
          state.currentImageIndex = 1;
        }

        if (!Array.isArray(state.images)) state.images = [];
        state.images.push(imageObj);

        callback?.(imageObj);
      } catch (err) {
        console.error('Fehler beim Verarbeiten:', file.name, err);
        alert(`Das Bild "${file.name}" konnte nicht verarbeitet werden.`);
        callback?.();
      }
    };

    img.onerror = () => {
      console.error('Bild konnte nicht geladen werden:', file.name);
      alert(`Das Bild "${file.name}" konnte nicht geladen werden.`);
      callback?.();
    };

    img.src = dataUrl;
  };

  reader.onerror = () => {
    console.error('Lesefehler bei Datei:', file.name);
    alert(`Die Datei "${file.name}" konnte nicht gelesen werden.`);
    callback?.();
  };

  reader.readAsDataURL(file);
}
