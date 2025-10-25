// ./src/features/export-pdf.js

async function getJsPDF() {
  if (window.jspdf?.jsPDF) return window.jspdf.jsPDF;
  try {
    const mod = await import('jspdf');
    return mod.jsPDF;
  } catch {
    throw new Error('jsPDF nicht geladen. Bitte das UMD-Script einbinden.');
  }
}

export async function exportMultipleImagesAsPdf(images, settings = {}) {
  const jsPDF = await getJsPDF();
  const imgs = Array.isArray(images) ? images.filter(Boolean) : [];

  const hasImages = imgs.length > 0;
  const hasComment = settings.includeCommentPage && (settings.commentText?.trim() || settings.hasCommentImage);

  if (!hasImages && !hasComment) {
    alert("Keine Inhalte zum Exportieren vorhanden.");
    return;
  }

  let orientation = settings.orientation || 'auto';
  if (orientation === 'auto' && hasImages) {
    const landscapeCount = imgs.filter(im => (im.canvas?.width || 0) > (im.canvas?.height || 0)).length;
    orientation = landscapeCount > (imgs.length / 2) ? 'landscape' : 'portrait';
  } else if (orientation === 'auto') {
    orientation = 'portrait';
  }

  const pdf = new jsPDF({ orientation, unit: 'mm' });

  try {
    pdf.setProperties({
      title: settings.title || 'Bilder',
      subject: 'Bild-Sammlung',
      creator: 'Bild-Bearbeitung App',
      author: settings.author || ''
    });
  } catch { /* optional */ }

  let pageAdded = false;

  if (settings.includeTitlePage) {
    createPdfTitlePage(pdf, {
      title: settings.title || 'Bilder',
      author: settings.author || '',
      count: imgs.length
    });
    pageAdded = true;
  }

  if (hasComment) {
    if (pageAdded) pdf.addPage();
    // Übergeben der neuen Daten an die Funktion
    createPdfCommentPage(pdf, {
      commentText: settings.commentText || '',
      commentImageData: settings.commentImageData || null,
      hasCommentImage: settings.hasCommentImage || false
    });
    pageAdded = true;
  }

  if (hasImages) {
    // Prüfen, ob nach der (möglicherweise mehrseitigen) Kommentarseite eine neue Seite benötigt wird.
    // Die createPdfCommentPage fügt ihre eigenen Seiten hinzu, aber die letzte Seite könnte voll sein.
    // Zur Sicherheit fügen wir hier immer eine neue Seite hinzu, wenn bereits Inhalt da war.
    if (pageAdded) {
       // Setzt den Cursor auf eine neue Seite, falls die Kommentarseite nicht bereits eine leere neue Seite am Ende hinzugefügt hat.
       // Dies ist eine Vereinfachung, um leere Seiten zu vermeiden, falls die Kommentarseite exakt am Seitenende aufhört.
       if(pdf.internal.pages.length > 1 && pdf.page > 1) {
          // Annahme, dass createPdfCommentPage uns auf der letzten Seite des Kommentars zurücklässt.
       }
       pdf.addPage();
    }
    
    imgs.forEach((im, idx) => {
      addImageToPdf(pdf, im, settings.includeFileName !== false, {
        optimizeSize: settings.optimizeSize !== false
      });
      if (idx < imgs.length - 1) pdf.addPage();
    });
  }

  const fileName = `${(settings.title || 'bilder').toString().replace(/[^\p{L}\p{N}_-]+/gu,'_')}_${new Date().toISOString().slice(0,10)}.pdf`;
  pdf.save(fileName);
}

export async function exportSingleImageAsPdf(image, settings = {}) {
  return exportMultipleImagesAsPdf([image], { 
    ...settings, 
    includeTitlePage: false, 
    includeCommentPage: false 
  });
}

// =============================
// Hilfsfunktionen
// =============================

function addImageToPdf(pdf, imageObj, showFilename = true, opts = {}) {
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const margin = 10;
  const footerSpace = showFilename ? 10 : 0;
  const availW = pageW - margin * 2;
  const availH = pageH - margin * 2 - footerSpace;

  const mmPerPx = 0.264583;
  const imgWmm = (imageObj.canvas.width) * mmPerPx;
  const imgHmm = (imageObj.canvas.height) * mmPerPx;

  const scale = Math.min(availW / imgWmm, availH / imgHmm, 1);
  const w = imgWmm * scale;
  const h = imgHmm * scale;
  const x = margin + (availW - w) / 2;
  const y = margin + (availH - h) / 2;

  const q = opts.optimizeSize ? 0.9 : 1.0;
  const dataUrl = imageObj.canvas.toDataURL('image/jpeg', q);
  pdf.addImage(dataUrl, 'JPEG', x, y, w, h);

  if (showFilename) {
    const fn = imageObj.outputName || imageObj.file?.name || '';
    pdf.setFontSize(10);
    pdf.setTextColor(100, 100, 100);
    const textX = (pageW - pdf.getTextWidth(fn)) / 2;
    pdf.text(fn, textX, pageH - margin);
  }
}

function createPdfTitlePage(pdf, { title, author, count }) {
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();

  // Titel
  pdf.setFontSize(24);
  pdf.setTextColor(0, 0, 0);
  const tW = pdf.getTextWidth(title);
  pdf.text(title, (pageW - tW) / 2, pageH / 3);

  // Datum
  const dateStr = new Date().toLocaleDateString('de-DE');
  pdf.setFontSize(12);
  pdf.setTextColor(100, 100, 100);
  const dateText = `Erstellt am: ${dateStr}`;
  pdf.text(dateText, (pageW - pdf.getTextWidth(dateText)) / 2, pageH / 3 + 20);

  // Bildanzahl
  const countText = `Enthält ${count} Bild${count === 1 ? '' : 'er'}`;
  pdf.text(countText, (pageW - pdf.getTextWidth(countText)) / 2, pageH / 3 + 30);

  // Autor
  if (author) {
    pdf.setFontSize(14);
    pdf.setTextColor(80, 80, 80);
    const aText = `Autor: ${author}`;
    pdf.text(aText, (pageW - pdf.getTextWidth(aText)) / 2, pageH / 3 + 45);
  }

  // Footer
  pdf.setFontSize(10);
  pdf.setTextColor(150, 150, 150);
  const footer = 'Erstellt mit Bild-Bearbeitung App';
  pdf.text(footer, (pageW - pdf.getTextWidth(footer)) / 2, pageH - 20);
}

/**
 * Erstellt eine Kommentarseite im PDF mit professionellem Layout 
 * und automatischem Seitenumbruch für lange Texte.
 * @param {Object} pdf - jsPDF Instanz
 * @param {Object} options - Optionen für die Kommentarseite
 */
function createPdfCommentPage(pdf, options = {}) {
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const margin = 20;
  const footerMargin = 25; // Mehr Platz für den Footer
  const printableHeight = pageH - footerMargin;

  let cursorY = margin;

  // --- Hilfsfunktion für den Footer ---
  const addFooter = () => {
    pdf.setFontSize(9);
    pdf.setTextColor(150, 150, 150);
    const dateStr = new Date().toLocaleDateString('de-DE');
    const footerText = `Kommentar vom ${dateStr}`;
    pdf.text(footerText, (pageW - pdf.getTextWidth(footerText)) / 2, pageH - 15);
  };

  // --- Seiten-Header (für erste Seite) ---
  pdf.setFontSize(18);
  pdf.setTextColor(0, 0, 0);
  const title = "Kommentar";
  pdf.text(title, (pageW - pdf.getTextWidth(title)) / 2, cursorY);
  cursorY += 5;
  pdf.setDrawColor(180, 180, 180);
  pdf.line(margin, cursorY, pageW - margin, cursorY);
  cursorY += 10;

  // --- Bild (zentriert, nur auf der ersten Seite) ---
  if (options.hasCommentImage && options.commentImageData) {
    try {
      const imgProps = pdf.getImageProperties(options.commentImageData);
      const maxImgWidth = 80;
      const maxImgHeight = 80;
      const imgAspectRatio = imgProps.width / imgProps.height;
      let imgWidth = maxImgWidth;
      let imgHeight = imgWidth / imgAspectRatio;

      if (imgHeight > maxImgHeight) {
        imgHeight = maxImgHeight;
        imgWidth = imgHeight * imgAspectRatio;
      }
      
      if (cursorY + imgHeight < printableHeight) {
        const imgX = (pageW - imgWidth) / 2;
        pdf.addImage(options.commentImageData, 'PNG', imgX, cursorY, imgWidth, imgHeight);
        cursorY += imgHeight + 10;
      }
    } catch (error) {
      console.warn('Fehler beim Einfügen des Kommentarbildes:', error);
    }
  }

  // --- Text mit manuellem Seitenumbruch ---
  if (options.commentText && options.commentText.trim()) {
    pdf.setFontSize(12);
    pdf.setTextColor(50, 50, 50);
    const textWidth = pageW - margin * 2;
    const textLines = pdf.splitTextToSize(options.commentText, textWidth);
    const lineHeight = 7; // mm, passend für Schriftgröße 12

    textLines.forEach(line => {
      // Prüfen, ob die nächste Zeile über den Rand hinausgeht
      if (cursorY + lineHeight > printableHeight) {
        addFooter(); // Footer auf der vollen Seite hinzufügen
        pdf.addPage();
        cursorY = margin; // Cursor für die neue Seite zurücksetzen
        
        // Header für Folgeseiten
        pdf.setFontSize(10);
        pdf.setTextColor(150, 150, 150);
        pdf.text("Kommentar (Fortsetzung)", margin, cursorY - 5);
        pdf.setFontSize(12);
        pdf.setTextColor(50, 50, 50);
      }
      
      pdf.text(line, margin, cursorY);
      cursorY += lineHeight;
    });
  }

  // --- Footer für die letzte Seite hinzufügen ---
  addFooter();
}

