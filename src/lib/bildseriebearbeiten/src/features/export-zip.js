// src/features/export-zip.js
import { saveBlob } from '../core/utils.js';

export async function createAndDownloadZip(images, zipName = 'bilder.zip') {
  const JSZip = window.JSZip || (await import('jszip')).default;
  const zip = new JSZip();

  // Alle Canvas in Blobs umwandeln
  const tasks = images.map((im, idx) => canvasToBlob(im.canvas).then((blob) => {
    const base = (im.outputName || im.file?.name || `bild_${idx+1}`).replace(/\.[^.]+$/, '');
    const safe = base.replace(/[^\p{L}\p{N}_-]+/gu, '_') || `bild_${idx+1}`;
    zip.file(`${safe}.png`, blob);
  }));

  await Promise.all(tasks);
  const blob = await zip.generateAsync({ type: 'blob' });
  saveBlob(blob, zipName);
}

function canvasToBlob(canvas) {
  return new Promise((resolve) => {
    canvas.toBlob((b) => resolve(b), 'image/png', 0.95);
  });
}
