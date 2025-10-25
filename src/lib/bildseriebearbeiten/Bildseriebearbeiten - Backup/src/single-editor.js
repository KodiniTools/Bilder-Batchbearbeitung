// src/features/single-editor.js
// Einzelbild-Editor als Overlay

import { ImageProcessor } from '../../image-processor.js';
// Module-level variable to hold the single overlay element
let editorOverlayNode = null;

/**
 * Ensures the overlay exists in the DOM and returns it.
 * Creates the element if it doesn't exist yet.
 * @returns {HTMLElement} The overlay element.
 */
function getOverlay() {
    if (!editorOverlayNode) {
        editorOverlayNode = document.getElementById('editorOverlay');
        if (!editorOverlayNode) {
            editorOverlayNode = createEditorOverlay();
            document.body.appendChild(editorOverlayNode);
        }
    }
    return editorOverlayNode;
}


/**
 * Opens the editor overlay for a specific image.
 * @param {Object} imageObj The image object to edit.
 */
export function openEditorOverlay(imageObj) {
  if (!imageObj) return;

  const overlay = getOverlay();
  
  // Populate the editor with the image data
  populateEditor(overlay, imageObj);
  
  // Make the overlay visible
  overlay.classList.remove('hidden');
  overlay.classList.add('active');
}

/**
 * Closes the editor overlay.
 */
function closeEditor() {
    const overlay = getOverlay();
    overlay.classList.add('hidden');
    overlay.classList.remove('active');
}

/**
 * Creates the HTML structure for the editor overlay.
 * @returns {HTMLElement} The created overlay element.
 */
function createEditorOverlay() {
  const overlay = document.createElement('div');
  overlay.id = 'editorOverlay';
  overlay.className = 'modal-overlay hidden';
  
  overlay.innerHTML = `
    <div class="modal-container editor-container">
      <div class="modal-header">
        <div class="modal-title">Bild bearbeiten</div>
        <button id="editorClose" class="image-action-btn" aria-label="Schließen">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>
      
      <div class="modal-body editor-body">
        <div class="editor-sections">
          
          <!-- Preview Section -->
          <div class="editor-section">
            <h3>Vorschau</h3>
            <div class="preview-container">
              <canvas id="editorPreview" class="editor-preview-canvas"></canvas>
            </div>
            <div class="image-info">
              <span id="editorImageDimensions">0 × 0 px</span>
              <span id="editorImageSize">0 KB</span>
            </div>
          </div>

          <!-- Filename Section -->
          <div class="editor-section">
            <h3>Dateiname</h3>
            <div class="input-group">
              <label for="editorFileName">Neuer Name:</label>
              <input type="text" id="editorFileName" placeholder="Dateiname ohne Erweiterung">
              <small class="help-text">Der Name wird beim Speichern verwendet</small>
            </div>
          </div>

          <!-- Transformations Section -->
          <div class="editor-section">
            <h3>Transformationen</h3>
            <div class="transform-controls">
              <div class="control-group">
                <label>Drehen:</label>
                <div class="button-group">
                  <button type="button" class="btn btn-sm" id="rotateLeft" title="90° nach links">
                    <i class="fa-solid fa-rotate-left"></i> 90°
                  </button>
                  <button type="button" class="btn btn-sm" id="rotate180" title="180°">
                    <i class="fa-solid fa-arrow-rotate-right"></i> 180°
                  </button>
                  <button type="button" class="btn btn-sm" id="rotateRight" title="90° nach rechts">
                    <i class="fa-solid fa-rotate-right"></i> 90°
                  </button>
                </div>
              </div>
              
              <div class="control-group">
                <label>Spiegeln:</label>
                <div class="button-group">
                  <button type="button" class="btn btn-sm" id="flipHorizontal" title="Horizontal spiegeln">
                    <i class="fa-solid fa-left-right"></i> Horizontal
                  </button>
                  <button type="button" class="btn btn-sm" id="flipVertical" title="Vertikal spiegeln">
                    <i class="fa-solid fa-up-down"></i> Vertikal
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Resize Section -->
          <div class="editor-section">
            <h3>Größe ändern</h3>
            <div class="resize-controls">
              <div class="input-row">
                <div class="input-group">
                  <label for="resizeWidth">Breite:</label>
                  <input type="number" id="resizeWidth" min="1" max="5000">
                  <span class="unit">px</span>
                </div>
                <div class="input-group">
                  <label for="resizeHeight">Höhe:</label>
                  <input type="number" id="resizeHeight" min="1" max="5000">
                  <span class="unit">px</span>
                </div>
              </div>
              
              <div class="checkbox-group">
                <input type="checkbox" id="keepAspectRatio" checked>
                <label for="keepAspectRatio">Seitenverhältnis beibehalten</label>
              </div>
              
              <div class="button-group">
                <button type="button" class="btn btn-sm" id="resetSize">
                  <i class="fa-solid fa-arrow-rotate-left"></i> Ursprungsgröße
                </button>
                <button type="button" class="btn btn-sm" id="applyResize">
                  <i class="fa-solid fa-check"></i> Größe ändern
                </button>
              </div>
            </div>
          </div>

          <!-- Export Section -->
          <div class="editor-section">
            <h3>Exportieren</h3>
            <div class="resize-controls">
              <div class="input-row">
                <div class="input-group">
                  <label for="exportFormat">Format:</label>
                  <select id="exportFormat"></select>
                </div>
              </div>
              <div class="button-group">
                 <button type="button" class="btn" id="editorDownload">
                    <i class="fa-solid fa-download"></i> Als Datei herunterladen
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>
      
      <div class="modal-footer">
        <button type="button" class="btn" id="editorCancel">Abbrechen</button>
        <button type="button" class="btn" id="editorReset">
          <i class="fa-solid fa-arrow-rotate-left"></i> Zurücksetzen
        </button>
        <button type="button" class="btn btn-primary" id="editorSave">
          <i class="fa-solid fa-check"></i> Änderungen übernehmen
        </button>
      </div>
    </div>
  `;

  // Add event listeners to the new element
  bindEditorEvents(overlay);
  
  return overlay;
}

/**
 * Binds all necessary event listeners to the editor overlay controls.
 * @param {HTMLElement} overlay The overlay element.
 */
function bindEditorEvents(overlay) {
  const els = {
    close: overlay.querySelector('#editorClose'),
    cancel: overlay.querySelector('#editorCancel'),
    save: overlay.querySelector('#editorSave'),
    reset: overlay.querySelector('#editorReset'),
    
    fileName: overlay.querySelector('#editorFileName'),
    preview: overlay.querySelector('#editorPreview'),
    dimensions: overlay.querySelector('#editorImageDimensions'),
    size: overlay.querySelector('#editorImageSize'),
    
    // Transform controls
    rotateLeft: overlay.querySelector('#rotateLeft'),
    rotate180: overlay.querySelector('#rotate180'),
    rotateRight: overlay.querySelector('#rotateRight'),
    flipHorizontal: overlay.querySelector('#flipHorizontal'),
    flipVertical: overlay.querySelector('#flipVertical'),
    
    // Resize controls
    resizeWidth: overlay.querySelector('#resizeWidth'),
    resizeHeight: overlay.querySelector('#resizeHeight'),
    keepAspectRatio: overlay.querySelector('#keepAspectRatio'),
    resetSize: overlay.querySelector('#resetSize'),
    applyResize: overlay.querySelector('#applyResize'),

    // Export controls
    exportFormat: overlay.querySelector('#exportFormat'),
    editorDownload: overlay.querySelector('#editorDownload')
  };

  let currentImageObj = null;
  let originalCanvas = null;

  // --- Close Listeners ---
  [els.close, els.cancel].forEach(btn => {
    if (btn) {
      btn.addEventListener('click', () => closeEditor());
    }
  });

  // Close when clicking on the background
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      closeEditor();
    }
  });

  // --- Transformation Listeners ---
  if (els.rotateLeft) {
    els.rotateLeft.addEventListener('click', () => {
      if (currentImageObj) {
        ImageProcessor.rotateImage(currentImageObj, -90);
        updatePreview();
      }
    });
  }
  // (other transformation listeners are similar)
  if (els.rotate180) {
    els.rotate180.addEventListener('click', () => {
      if (currentImageObj) { ImageProcessor.rotateImage(currentImageObj, 180); updatePreview(); }
    });
  }
  if (els.rotateRight) {
    els.rotateRight.addEventListener('click', () => {
      if (currentImageObj) { ImageProcessor.rotateImage(currentImageObj, 90); updatePreview(); }
    });
  }
  if (els.flipHorizontal) {
    els.flipHorizontal.addEventListener('click', () => {
      if (currentImageObj) { ImageProcessor.flipImage(currentImageObj, 'horizontal'); updatePreview(); }
    });
  }
  if (els.flipVertical) {
    els.flipVertical.addEventListener('click', () => {
      if (currentImageObj) { ImageProcessor.flipImage(currentImageObj, 'vertical'); updatePreview(); }
    });
  }

  // --- Resize Listeners ---
  if (els.keepAspectRatio && els.resizeWidth && els.resizeHeight) {
    [els.resizeWidth, els.resizeHeight].forEach(input => {
      input.addEventListener('input', () => {
        if (els.keepAspectRatio.checked && currentImageObj) {
          const isWidth = input === els.resizeWidth;
          const value = parseInt(input.value) || 0;
          if (value > 0) {
            const aspect = currentImageObj.originalWidth / currentImageObj.originalHeight;
            if (isWidth) {
              els.resizeHeight.value = Math.round(value / aspect);
            } else {
              els.resizeWidth.value = Math.round(value * aspect);
            }
          }
        }
      });
    });
  }
  if (els.resetSize) {
    els.resetSize.addEventListener('click', () => {
      if (currentImageObj) {
        els.resizeWidth.value = currentImageObj.originalWidth;
        els.resizeHeight.value = currentImageObj.originalHeight;
      }
    });
  }
  if (els.applyResize) {
    els.applyResize.addEventListener('click', () => {
      if (currentImageObj && els.resizeWidth && els.resizeHeight) {
        const newWidth = parseInt(els.resizeWidth.value) || currentImageObj.canvas.width;
        const newHeight = parseInt(els.resizeHeight.value) || currentImageObj.canvas.height;
        if (newWidth > 0 && newHeight > 0) {
          ImageProcessor.resizeImage(currentImageObj, newWidth, newHeight, els.keepAspectRatio.checked);
          updatePreview();
        }
      }
    });
  }

  // --- Export Listener ---
  if (els.editorDownload) {
    els.editorDownload.addEventListener('click', async () => {
        if (!currentImageObj || !els.exportFormat) return;
        const selectedMimeType = els.exportFormat.value;
        const format = ImageProcessor.availableFormats.find(f => f.mimeType === selectedMimeType);
        if (!format) {
            alert('Ungültiges Format ausgewählt.');
            return;
        }

        const originalText = els.editorDownload.innerHTML;
        els.editorDownload.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Erstelle...';
        els.editorDownload.disabled = true;

        try {
            const blob = await ImageProcessor.convertToFormat(currentImageObj, format);
            const fileBase = els.fileName.value.trim() || ImageProcessor.getFileNameWithoutExtension(currentImageObj.file.name);
            const fileName = `${ImageProcessor.safeBaseName(fileBase)}.${format.ext}`;
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            a.remove();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
        } catch (error) {
            console.error('Download-Fehler im Editor:', error);
            alert('Fehler beim Erstellen des Bildes: ' + error.message);
        } finally {
            els.editorDownload.innerHTML = originalText;
            els.editorDownload.disabled = false;
        }
    });
  }

  // --- Main Action Listeners ---
  if (els.reset) {
    els.reset.addEventListener('click', () => {
      if (currentImageObj && originalCanvas) {
        // Restore original canvas
        const ctx = currentImageObj.ctx;
        currentImageObj.canvas.width = originalCanvas.width;
        currentImageObj.canvas.height = originalCanvas.height;
        ctx.clearRect(0, 0, currentImageObj.canvas.width, currentImageObj.canvas.height);
        ctx.drawImage(originalCanvas, 0, 0);
        
        // Reset UI fields
        if (els.fileName) {
          els.fileName.value = ImageProcessor.getFileNameWithoutExtension(currentImageObj.file.name);
        }
        if (els.resizeWidth) els.resizeWidth.value = currentImageObj.originalWidth;
        if (els.resizeHeight) els.resizeHeight.value = currentImageObj.originalHeight;
        
        updatePreview();
      }
    });
  }

  if (els.save) {
    els.save.addEventListener('click', () => {
      if (currentImageObj && els.fileName) {
        // Update filename if changed
        const newName = els.fileName.value.trim();
        if (newName) {
          currentImageObj.outputName = ImageProcessor.safeBaseName(newName);
        }
        
        // Dispatch event to update the main UI (e.g., the card's title)
        window.dispatchEvent(new CustomEvent('images-updated'));
        
        closeEditor();
      }
    });
  }

  function updatePreview() {
    if (!currentImageObj || !els.preview) return;
    
    // Make the preview responsive to its container size
    const container = els.preview.parentElement;
    if (!container) return;
    const maxSize = container.clientWidth > 0 ? container.clientWidth : 300; // Use container width, fallback to 300px
    
    // Update preview canvas
    const scale = Math.min(maxSize / currentImageObj.canvas.width, maxSize / currentImageObj.canvas.height, 1);
    els.preview.width = Math.floor(currentImageObj.canvas.width * scale);
    els.preview.height = Math.floor(currentImageObj.canvas.height * scale);
    const ctx = els.preview.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, els.preview.width, els.preview.height);
      ctx.drawImage(currentImageObj.canvas, 0, 0, els.preview.width, els.preview.height);
    }
    
    // Update info text
    if (els.dimensions) {
      els.dimensions.textContent = `${currentImageObj.canvas.width} × ${currentImageObj.canvas.height} px`;
    }
    if (els.size) {
      const estimatedSize = currentImageObj.canvas.width * currentImageObj.canvas.height * 4;
      els.size.textContent = ImageProcessor.formatFileSize(estimatedSize);
    }
    
    // Update resize inputs
    if (els.resizeWidth) els.resizeWidth.value = currentImageObj.canvas.width;
    if (els.resizeHeight) els.resizeHeight.value = currentImageObj.canvas.height;
  }

  // Attach a method to the overlay to populate it with data.
  // This is called every time the overlay is opened.
  overlay._setImage = function(imageObj) {
    currentImageObj = imageObj;
    if (!imageObj) return;
    
    // Save a copy of the original canvas for the "Reset" function
    originalCanvas = document.createElement('canvas');
    originalCanvas.width = imageObj.canvas.width;
    originalCanvas.height = imageObj.canvas.height;
    const originalCtx = originalCanvas.getContext('2d');
    if (originalCtx) {
      originalCtx.drawImage(imageObj.canvas, 0, 0);
    }
    
    // Initialize UI fields
    if (els.fileName) {
      els.fileName.value = imageObj.outputName || ImageProcessor.getFileNameWithoutExtension(imageObj.file.name);
    }
    if (els.resizeWidth) els.resizeWidth.value = imageObj.canvas.width;
    if (els.resizeHeight) els.resizeHeight.value = imageObj.canvas.height;

    // Populate the export format dropdown
    if (els.exportFormat) {
        els.exportFormat.innerHTML = '';
        const currentExtension = ImageProcessor.getFileExtension(imageObj.file.name).toLowerCase();
        ImageProcessor.availableFormats.forEach(format => {
            if (ImageProcessor.supportsFormat(format.mimeType)) {
                const option = document.createElement('option');
                option.value = format.mimeType;
                option.textContent = format.name;
                if (format.ext === currentExtension) {
                    option.selected = true;
                }
                els.exportFormat.appendChild(option);
            }
        });
    }
    
    updatePreview();
  };
}

/**
 * Populates the editor with data from a given image object.
 * @param {HTMLElement} overlay The overlay element.
 * @param {Object} imageObj The image object.
 */
function populateEditor(overlay, imageObj) {
  if (overlay._setImage) {
    overlay._setImage(imageObj);
  }
}


