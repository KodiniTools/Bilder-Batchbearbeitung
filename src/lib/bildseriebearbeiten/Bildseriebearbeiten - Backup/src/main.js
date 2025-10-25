// main.js
console.log('=== MAIN.JS STARTET ===');

import { ImageProcessor } from './core/image-processor.js';
import { openEditorOverlay } from './features/single-editor.js';
import { exportMultipleImagesAsPdf } from './features/export-pdf.js';

console.log('exportMultipleImagesAsPdf imported:', typeof exportMultipleImagesAsPdf);

console.log('=== IMPORTS ERFOLGREICH ===');

(() => {
  'use strict';

  console.log('=== IIFE STARTET ===');

  // =============================
  // Selektoren & App-State
  // =============================
  const els = {
    upload: document.getElementById('upload'),
    uploadBtn: document.getElementById('uploadBtn'),
    dropArea: document.getElementById('dropArea'),
    imageContainer: document.getElementById('imageContainer'),
    emptyState: document.getElementById('emptyState'),
    statusBar: document.getElementById('statusBar'),
    imageCount: document.getElementById('imageCount'),
    selectedCount: document.getElementById('selectedCount'),
    selectAllButton: document.getElementById('selectAllButton'),
    saveAllButton: document.getElementById('saveAllButton'),
    downloadZipButton: document.getElementById('downloadZipButton'),
    exportPdfButton: document.getElementById('exportPdfButton'),
    exportSelectedPdfButton: document.getElementById('exportSelectedPdfButton'),
    deleteSelectedButton: document.getElementById('deleteSelectedButton'),
    previewOverlay: document.getElementById('previewOverlay'),
    previewCanvas: document.getElementById('previewCanvas'),
    previewClose: document.getElementById('previewClose'),
    loadingIndicator: document.getElementById('loadingIndicator'),
    browserWarning: document.getElementById('browserWarning'),
    pdfSettingsModal: document.getElementById('pdfSettingsModal'),
    modalClose: document.getElementById('modalClose'),
    cancelPdfExport: document.getElementById('cancelPdfExport'),
    confirmPdfExport: document.getElementById('confirmPdfExport'),
    formatSelectionModal: document.getElementById('formatSelectionModal'),
    formatModalClose: document.getElementById('formatModalClose'),
    cancelFormatSelection: document.getElementById('cancelFormatSelection'),
    confirmFormatSelection: document.getElementById('confirmFormatSelection'),
    formatCheckboxes: document.getElementById('formatCheckboxes'),
    // NEU: Image Picker Modal Elemente
    imagePickerModal: document.getElementById('imagePickerModal'),
    imagePickerGrid: document.getElementById('imagePickerGrid'),
    imagePickerCloseBtn: document.getElementById('imagePickerCloseBtn'),
  };

  const state = {
    images: [],
    currentImageIndex: 0,
    pdfExportMode: 'all'
  };
  
  window.appState = state;

  // =============================
  // Utilities
  // =============================
  function showLoading(message) {
    if (!els.loadingIndicator) return;
    const loadingText = els.loadingIndicator.querySelector('.loading-text');
    if (loadingText && message) loadingText.textContent = message;
    els.loadingIndicator.classList.add('active');
  }

  function hideLoading() {
    els.loadingIndicator && els.loadingIndicator.classList.remove('active');
  }
  
  async function saveBlobWithPicker(blob, suggestedName) {
    if ('showSaveFilePicker' in window) {
      try {
        const handle = await window.showSaveFilePicker({
          suggestedName,
          types: [{
            description: 'Datei',
            accept: { [blob.type]: [`.${suggestedName.split('.').pop()}`] },
          }],
        });
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
        return;
      } catch (err) {
        if (err.name === 'AbortError') return;
        console.error('Fehler beim Speichern mit Picker:', err);
      }
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = suggestedName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function startAnalytics() {
    try {
      if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
        window.gtag('event', 'app_init', { event_category: 'app', event_label: 'main_init' });
      }
      if (typeof window !== 'undefined' && typeof window.plausible === 'function') {
        window.plausible('app_init');
      }
      if (typeof window !== 'undefined' && window.posthog && typeof window.posthog.capture === 'function') {
        window.posthog.capture('app_init');
      }
    } catch (e) {
      console.debug('[analytics] skipped:', e);
    }
  }

  // =============================
  // Delete Functions
  // =============================
  function deleteSelectedImages() {
    const selectedImages = state.images.filter(img => img.selected);
    if (selectedImages.length === 0) {
      alert('Keine Bilder ausgewählt.');
      return;
    }
    const confirmMessage = `Möchten Sie wirklich ${selectedImages.length} ausgewählte Bilder löschen?\n\nDiese Aktion kann nicht rückgängig gemacht werden.`;
    if (!confirm(confirmMessage)) return;

    selectedImages.forEach(selectedImg => {
      const index = state.images.findIndex(img => img.id === selectedImg.id);
      if (index !== -1) state.images.splice(index, 1);
      const card = document.querySelector(`[data-id="${selectedImg.id}"]`);
      if (card) card.remove();
    });
    updateUI();
  }

  // =============================
  // Dateien einlesen & verarbeiten
  // =============================
  function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = dt && dt.files;
    if (files) handleFiles(files);
  }

  function handleFiles(files) {
    if (!files || files.length === 0) return;
    showLoading('Bilder werden geladen...');
    const arr = Array.from(files);
    let done = 0;
    const total = arr.length;

    arr.forEach(async (file) => {
      await ImageProcessor.processFile(file, (result) => {
        if (result) {
          state.images.push(result);
          createImageCard(result);
          updateUI();
        }
        done++;
        if (done === total) hideLoading();
      });
    });
  }

  // =============================
  // UI-Aufbau
  // =============================
  function createImageCard(imageObj) {
    const card = document.createElement('div');
    card.className = 'image-card';
    card.dataset.id = String(imageObj.id);

    const preview = document.createElement('div');
    preview.className = 'image-preview';
    preview.appendChild(imageObj.canvas);

    const info = document.createElement('div');
    info.className = 'image-info';
    info.textContent = `${ImageProcessor.resolveBaseName(imageObj)}.${ImageProcessor.getFileExtension(imageObj.file.name)}`;

    const actions = document.createElement('div');
    actions.className = 'image-actions';

    const removeButton = document.createElement('button');
    removeButton.type = 'button';
    removeButton.className = 'image-action-btn remove-btn';
    removeButton.innerHTML = '<i class="fas fa-times"></i>';
    removeButton.title = 'Bild entfernen';
    removeButton.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      removeImage(imageObj);
      card.remove();
      updateUI();
    });

    const overlayButton = document.createElement('button');
    overlayButton.type = 'button';
    overlayButton.className = 'image-action-btn overlay-btn';
    overlayButton.title = 'Bearbeiten & Exportieren';
    overlayButton.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i>';
    overlayButton.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      window.dispatchEvent(new CustomEvent('open-editor', { detail: { id: imageObj.id } }));
    });

    actions.append(removeButton, overlayButton);
    card.append(preview, info, actions);

    preview.addEventListener('click', () => showLargePreview(imageObj));
    els.imageContainer && els.imageContainer.appendChild(card);
  }

  function removeImage(imageObj) {
    const idx = state.images.findIndex(i => i.id === imageObj.id);
    if (idx !== -1) state.images.splice(idx, 1);
  }

  function showLargePreview(imageObj) {
    if (!els.previewOverlay || !els.previewCanvas) return;
    const maxW = window.innerWidth * 0.9;
    const maxH = window.innerHeight * 0.9;
    const scale = Math.min(maxW / imageObj.canvas.width, maxH / imageObj.canvas.height, 1);
    els.previewCanvas.width = Math.floor(imageObj.canvas.width * scale);
    els.previewCanvas.height = Math.floor(imageObj.canvas.height * scale);
    const ctx = els.previewCanvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(imageObj.canvas, 0, 0, els.previewCanvas.width, els.previewCanvas.height);
    els.previewOverlay.classList.remove('hidden');
    els.previewOverlay.classList.add('active');
  }

  // =============================
  // Export: Bilder & ZIP
  // =============================
  async function downloadImage(imageObj, format) {
    const fileBase = ImageProcessor.resolveBaseName(imageObj);
    const fileName = `${fileBase}.${format.ext}`;
    try {
      const blob = await ImageProcessor.convertToFormat(imageObj, format);
      await saveBlobWithPicker(blob, fileName);
    } catch (error) {
      console.error('Download-Fehler:', error);
      alert('Fehler beim Erstellen des Bildes: ' + error.message);
    }
  }

  function createAndDownloadZip(imagesToZip) {
    try {
      if (typeof JSZip !== 'function') {
        alert('ZIP-Funktion nicht verfügbar.');
        return;
      }
      if (imagesToZip.length === 0) {
        alert('Keine Bilder zum Herunterladen ausgewählt.');
        return;
      }

      showLoading('Bereite ZIP-Datei vor...');
      const zip = new JSZip();
      const tasks = [];

      imagesToZip.forEach((img, index) => {
        const p = new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            let fileName = `${ImageProcessor.resolveBaseName(img)}.${ImageProcessor.getFileExtension(img.file.name)}`;
            if (zip.file(fileName)) {
              const dot = fileName.lastIndexOf('.');
              const base = dot > -1 ? fileName.substring(0, dot) : fileName;
              const ext = dot > -1 ? fileName.substring(dot) : '';
              fileName = `${base}_${index}${ext}`;
            }
            zip.file(fileName, e.target.result);
            resolve();
          };
          reader.onerror = () => resolve();
          reader.readAsArrayBuffer(img.file);
        });
        tasks.push(p);
      });

      Promise.all(tasks).then(() => zip.generateAsync({ type: 'blob' }))
        .then(async (content) => {
          const zipName = `bilder_export_${new Date().toISOString().slice(0, 10)}.zip`;
          await saveBlobWithPicker(content, zipName);
          hideLoading();
        })
        .catch((err) => {
          console.error('ZIP-Fehler:', err);
          alert('Fehler beim Erstellen der ZIP-Datei: ' + err.message);
          hideLoading();
        });
    } catch (err) {
      console.error('ZIP-Fehler:', err);
      alert('Fehler beim Erstellen der ZIP-Datei: ' + err.message);
      hideLoading();
    }
  }

  // =============================
  // Auswahl & Toolbar
  // =============================
  function updateSelectionUI() {
    const selectedCount = state.images.filter(i => i.selected).length;
    if (els.imageCount) els.imageCount.textContent = state.images.length;
    if (els.selectedCount) els.selectedCount.textContent = selectedCount;

    const anySelected = selectedCount > 0;
    if (els.exportSelectedPdfButton) els.exportSelectedPdfButton.disabled = !anySelected;
    if (els.deleteSelectedButton) els.deleteSelectedButton.disabled = !anySelected;
  }

  function updateUI() {
    if (!els.imageContainer) return;
    const hasImages = state.images.length > 0;

    if (els.emptyState) els.emptyState.style.display = hasImages ? 'none' : 'block';
    if (els.statusBar) els.statusBar.style.display = hasImages ? 'flex' : 'none';

    document.querySelectorAll('.image-card').forEach((card) => {
      const id = card.dataset.id;
      const imageObj = state.images.find(i => String(i.id) === String(id));
      if (!imageObj) return;
      card.classList.toggle('selected', !!imageObj.selected);
    });

    updateSelectionUI();
  }

  // =============================
  // PDF Settings Modal
  // =============================
  function showPdfSettingsModal(mode) {
    state.pdfExportMode = mode;
    if (els.pdfSettingsModal) {
      els.pdfSettingsModal.classList.remove('hidden');
      els.pdfSettingsModal.classList.add('active');
    }
  }

  function hidePdfSettingsModal() {
    if (els.pdfSettingsModal) {
      els.pdfSettingsModal.classList.add('hidden');
      els.pdfSettingsModal.classList.remove('active');
    }
  }
  
  // =============================
  // PDF Export
  // =============================
  async function startPdfExport() {
    const pdfTitle = document.getElementById('pdfTitle');
    const pdfAuthor = document.getElementById('pdfAuthor');
    const includeTitlePage = document.getElementById('includeTitlePage');
    const includeCommentPage = document.getElementById('includeCommentPage');
    const includeFileName = document.getElementById('includeFileName');
    const optimizeSize = document.getElementById('optimizeSize');
    const pdfOrientation = document.getElementById('pdfOrientation');
  
    const settings = {
      title: pdfTitle?.value || 'Bilder-Sammlung',
      author: pdfAuthor?.value || '',
      includeTitlePage: includeTitlePage?.checked ?? true,
      includeCommentPage: includeCommentPage?.checked ?? false,
      includeFileName: includeFileName?.checked ?? true,
      optimizeSize: optimizeSize?.checked ?? true,
      orientation: pdfOrientation?.value || 'auto',
      commentText: '',
      commentImageData: null,
      hasCommentImage: false,
    };
  
    // Daten aus der globalen Funktion holen
    if (settings.includeCommentPage && typeof window.getPdfCommentData === 'function') {
        const commentData = window.getPdfCommentData();
        settings.commentText = commentData.comment;
        settings.commentImageData = commentData.imageData;
        settings.hasCommentImage = commentData.hasImage;
    }

    const imagesToExport = state.pdfExportMode === 'selected' ?
      state.images.filter(i => i.selected) : [...state.images];
  
    const hasContent = imagesToExport.length > 0 || 
                       (settings.includeCommentPage && (settings.commentText.trim() || settings.hasCommentImage));

    if (!hasContent) {
      alert('Keine Inhalte zum Exportieren vorhanden.');
      return;
    }
  
    hidePdfSettingsModal();
    showLoading('Erstelle PDF...');
    try {
      await exportMultipleImagesAsPdf(imagesToExport, settings);
    } catch (err) {
      console.error("PDF Export-Fehler:", err);
      alert("PDF konnte nicht erstellt werden: " + err.message);
    } finally {
      hideLoading();
    }
  }

  // =============================
  // Image Picker Modal (NEU)
  // =============================
  function openImagePicker() {
    if (!els.imagePickerModal || !els.imagePickerGrid) return;

    els.imagePickerGrid.innerHTML = '';
    if (state.images.length === 0) {
      els.imagePickerGrid.innerHTML = '<p style="text-align: center; color: var(--muted);">Keine Bilder in der Galerie zum Auswählen.</p>';
    } else {
      state.images.forEach(img => {
        const item = document.createElement('div');
        item.className = 'picker-image-item';
        item.dataset.imageId = img.id;
        
        const previewImg = new Image();
        previewImg.src = img.canvas.toDataURL();
        item.appendChild(previewImg);
        
        item.addEventListener('click', () => {
          window.dispatchEvent(new CustomEvent('commentImageSelected', { detail: img }));
          closeImagePicker();
        });
        
        els.imagePickerGrid.appendChild(item);
      });
    }

    els.imagePickerModal.classList.remove('hidden');
    els.imagePickerModal.classList.add('active');
  }

  function closeImagePicker() {
    if (els.imagePickerModal) {
      els.imagePickerModal.classList.add('hidden');
      els.imagePickerModal.classList.remove('active');
    }
  }

  // =============================
  // Mehrfachformate Modal
  // =============================
  async function downloadImagesInFormats(images, selectedFormats) {
    if (images.length === 0) {
      alert('Keine Bilder zum Speichern vorhanden.');
      return;
    }
    if (selectedFormats.length === 0) {
      alert('Bitte mindestens ein Format auswählen.');
      return;
    }
    showLoading('Bereite Downloads vor...');
    try {
      for (const img of images) {
        for (const fmt of selectedFormats) {
          await downloadImage(img, fmt);
        }
      }
    } finally {
      hideLoading();
    }
  }

  function showFormatSelectionModal() {
    if (!els.formatSelectionModal || !els.formatCheckboxes) return;

    els.formatCheckboxes.innerHTML = '';
    ImageProcessor.availableFormats.forEach((fmt, idx) => {
      const id = `fmt-${idx}`;
      const wrap = document.createElement('div');
      wrap.className = 'format-checkbox';

      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.id = id;
      cb.value = fmt.name;
      cb.checked = idx === 0;

      const label = document.createElement('label');
      label.setAttribute('for', id);
      label.textContent = fmt.name;

      if (!ImageProcessor.supportsFormat(fmt.mimeType)) {
        cb.disabled = true;
        label.title = 'Dieses Format wird von Ihrem Browser nicht unterstützt';
      }

      wrap.append(cb, label);
      els.formatCheckboxes.appendChild(wrap);
    });

    els.formatSelectionModal.classList.remove('hidden');
    els.formatSelectionModal.classList.add('active');
  }

  function hideFormatSelectionModal() {
    if (els.formatSelectionModal) {
      els.formatSelectionModal.classList.add('hidden');
      els.formatSelectionModal.classList.remove('active');
    }
  }

  function getSelectedFormats() {
    if (!els.formatCheckboxes) return [];
    const cbs = els.formatCheckboxes.querySelectorAll('input[type="checkbox"]:checked');
    const names = Array.from(cbs).map(cb => cb.value);
    return ImageProcessor.availableFormats.filter(f => names.includes(f.name));
  }

  // =============================
  // Browser-Kompatibilität
  // =============================
  function checkBrowserCompatibility() {
    const warnings = [];
    if (!window.File || !window.FileReader || !window.FileList || !window.Blob) {
      warnings.push('Die Datei-API wird nicht vollständig unterstützt.');
    }
    const c = document.createElement('canvas');
    if (!c.getContext || !c.getContext('2d')) {
      warnings.push('Canvas wird nicht unterstützt.');
    }
    if (typeof JSZip !== 'function') {
      warnings.push('JSZip für ZIP-Downloads konnte nicht geladen werden.');
    }
    if (typeof window.jspdf === 'undefined') {
      warnings.push('jsPDF für PDF-Export konnte nicht geladen werden.');
    }

    if (warnings.length > 0 && els.browserWarning) {
      els.browserWarning.innerHTML = warnings.map(w =>
        `<div class="warning-item"><i class="fas fa-exclamation-triangle"></i> ${w}</div>`
      ).join('');
      els.browserWarning.style.display = 'block';
    }
  }

  // =============================
  // Globale Events & Init
  // =============================
  function bindGlobalClickCloseHandlers() {
    document.addEventListener('click', (e) => {
      const isDropdown = (e.target && e.target.closest('.format-dropdown'));
      if (!isDropdown) {
        document.querySelectorAll('.format-dropdown.active').forEach(d => d.classList.remove('active'));
      }
    });

    if (els.previewOverlay) {
      els.previewOverlay.addEventListener('click', (ev) => {
        if (ev.target === els.previewOverlay) {
          els.previewOverlay.classList.add('hidden');
          els.previewOverlay.classList.remove('active');
        }
      });
    }

    if (els.pdfSettingsModal) {
      els.pdfSettingsModal.addEventListener('click', (ev) => {
        if (ev.target === els.pdfSettingsModal) {
          hidePdfSettingsModal();
        }
      });
    }

    if (els.formatSelectionModal) {
      els.formatSelectionModal.addEventListener('click', (ev) => {
        if (ev.target === els.formatSelectionModal) {
          hideFormatSelectionModal();
        }
      });
    }
    
    if (els.imagePickerModal) {
        els.imagePickerModal.addEventListener('click', (e) => {
            if (e.target === els.imagePickerModal) closeImagePicker();
        });
    }
  }

  function initScrollIndicator() {
    const container = document.querySelector('.images-scroll-container');
    if (!container) return;
    container.addEventListener('scroll', () => {
      if (container.scrollTop > 10) {
        container.classList.add('scrolled');
      } else {
        container.classList.remove('scrolled');
      }
    });
  }

  function init() {
    checkBrowserCompatibility();

    if (els.upload) {
      els.upload.addEventListener('change', (e) => {
        const files = e.target.files;
        if (files) handleFiles(files);
      });
    }

    if (els.uploadBtn && els.upload) {
      els.uploadBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        els.upload.click();
      });
    }

    if (els.dropArea) {
      els.dropArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        els.dropArea.classList.add('highlight');
      });
      els.dropArea.addEventListener('dragleave', () => els.dropArea.classList.remove('highlight'));
      els.dropArea.addEventListener('drop', (e) => {
        e.preventDefault();
        els.dropArea.classList.remove('highlight');
        handleDrop(e);
      });
      els.dropArea.addEventListener('click', () => {
        if (els.upload) els.upload.click();
      });
    }

    if (els.imageContainer) {
      els.imageContainer.addEventListener('click', (e) => {
        const card = e.target && e.target.closest('.image-card');
        if (!card) return;
        if (e.target.closest('.image-action-btn') || e.target.closest('.format-dropdown')) return;

        const id = card.dataset.id;
        const imageObj = state.images.find(i => String(i.id) === String(id));
        if (!imageObj) return;

        imageObj.selected = !imageObj.selected;
        card.classList.toggle('selected', imageObj.selected);
        updateSelectionUI();
      });
    }

    if (els.confirmPdfExport) {
      console.log('PDF Export Button gefunden, füge Event Listener hinzu');
      els.confirmPdfExport.addEventListener('click', startPdfExport);
    } else {
      console.error('PDF Export Button NICHT gefunden! (confirmPdfExport)');
    }

    if (els.modalClose) els.modalClose.addEventListener('click', hidePdfSettingsModal);
    if (els.cancelPdfExport) els.cancelPdfExport.addEventListener('click', hidePdfSettingsModal);
    if (els.formatModalClose) els.formatModalClose.addEventListener('click', hideFormatSelectionModal);
    if (els.cancelFormatSelection) els.cancelFormatSelection.addEventListener('click', hideFormatSelectionModal);
    if (els.confirmFormatSelection) {
      els.confirmFormatSelection.addEventListener('click', async () => {
        const formats = getSelectedFormats();
        const images = state.images.filter(i => i.selected);
        if (images.length === 0) {
          alert('Bitte wählen Sie die Bilder zum Herunterladen aus.');
          return;
        }
        await downloadImagesInFormats(images, formats);
        hideFormatSelectionModal();
      });
    }

    if (els.selectAllButton) {
      els.selectAllButton.addEventListener('click', () => {
        const allSelected = state.images.length > 0 && state.images.every(i => i.selected);
        state.images.forEach(i => { i.selected = !allSelected; });
        document.querySelectorAll('.image-card').forEach(card =>
          card.classList.toggle('selected', !allSelected)
        );
        updateSelectionUI();
      });
    }

    if (els.saveAllButton) {
      els.saveAllButton.addEventListener('click', () => {
        const selectedImages = state.images.filter(i => i.selected);
        if (state.images.length === 0) {
          alert('Keine Bilder zum Speichern vorhanden.');
          return;
        }
        if (selectedImages.length === 0) {
          alert('Bitte wählen Sie die Bilder zum Herunterladen aus.');
          return;
        }
        showFormatSelectionModal();
      });
    }

    if (els.downloadZipButton) {
      els.downloadZipButton.addEventListener('click', () => {
        const selectedImages = state.images.filter(i => i.selected);
        if (state.images.length === 0) {
          alert('Keine Bilder zum Herunterladen vorhanden.');
          return;
        }
        if (selectedImages.length === 0) {
          alert('Bitte wählen Sie die Bilder zum Herunterladen aus.');
          return;
        }
        createAndDownloadZip(selectedImages);
      });
    }

    if (els.exportPdfButton) els.exportPdfButton.addEventListener('click', () => showPdfSettingsModal('all'));
    if (els.exportSelectedPdfButton) els.exportSelectedPdfButton.addEventListener('click', () => showPdfSettingsModal('selected'));
    if (els.deleteSelectedButton) els.deleteSelectedButton.addEventListener('click', deleteSelectedImages);
    if (els.previewClose) {
      els.previewClose.addEventListener('click', () => {
        els.previewOverlay.classList.add('hidden');
        els.previewOverlay.classList.remove('active');
      });
    }
    
    // NEU: Event-Listener für Image Picker
    if (els.imagePickerCloseBtn) {
      els.imagePickerCloseBtn.addEventListener('click', closeImagePicker);
    }
    window.addEventListener('openImagePicker', openImagePicker);


    window.addEventListener('open-editor', (ev) => {
      const id = ev.detail?.id;
      const im = state.images.find(i => String(i.id) === String(id));
      if (im) openEditorOverlay(im);
    });

    window.addEventListener('images-updated', () => {
      document.querySelectorAll('.image-card').forEach(card => {
        const id = card.dataset.id;
        const img = state.images.find(i => String(i.id) === String(id));
        if (!img) return;
        const label = card.querySelector('.image-info');
        if (label) {
          label.textContent = `${ImageProcessor.resolveBaseName(img)}.${ImageProcessor.getFileExtension(img.file.name)}`;
        }
      });
    });

    bindGlobalClickCloseHandlers();
    updateUI();
    startAnalytics();
    initScrollIndicator();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }

})();

