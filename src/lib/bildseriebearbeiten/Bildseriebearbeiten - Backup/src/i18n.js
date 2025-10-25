// src/i18n.js
// This file now loads translations from the /locales/ folder.

/**
 * Updates the text content of elements with data-i18n attributes.
 */
function updateContent() {
  document.querySelectorAll('[data-i18n]').forEach(element => {
    const key = element.getAttribute('data-i18n'); // Corrected typo from data-i8n
    // Handles attribute translations like [title]key
    if (key.startsWith('[')) {
      const match = key.match(/\[(.*?)\](.*)/);
      if (match) {
        const attr = match[1];
        const attrKey = match[2];
        element.setAttribute(attr, i18next.t(attrKey));
      }
    } else {
      element.innerHTML = i18next.t(key);
    }
  });

  // Special case for updating the document title and meta description
  const titleEl = document.querySelector('title[data-i18n]');
  if(titleEl) document.title = i18next.t(titleEl.dataset.i18n);

  const metaDescEl = document.querySelector('meta[name="description"][data-i18n]');
  if(metaDescEl) metaDescEl.content = i18next.t(metaDescEl.dataset.i18n);

  // Set the lang attribute on the HTML element
  document.documentElement.lang = i18next.language;
}

/**
 * Sets the 'active' class on the correct language button.
 * @param {string} lang The active language code ('de' or 'en').
 */
function setActiveButton(lang) {
    document.getElementById('langDE').classList.toggle('active', lang === 'de');
    document.getElementById('langEN').classList.toggle('active', lang === 'en');
}

/**
 * Initializes the i18next library and sets up language switchers.
 */
async function initializeI18n() {
  // Warten bis i18next verfügbar ist
  let attempts = 0;
  while ((!window.i18next || !window.i18nextHttpBackend) && attempts < 50) {
    await new Promise(resolve => setTimeout(resolve, 100));
    attempts++;
  }
  
  if (!window.i18next || !window.i18nextHttpBackend) {
    console.warn('i18next libraries not loaded, falling back to default text');
    return;
  }

  await i18next
  .use(window.i18nextHttpBackend)
  .init({
      lng: 'de',
      fallbackLng: 'de',
      debug: false,
      backend: {
          loadPath: './locales/{{lng}}.json'
      }
  });
  updateContent();
  setActiveButton('de');

  // Rest der Event Listener bleibt gleich...
  document.getElementById('langDE').addEventListener('click', () => {
    if(i18next.language !== 'de') {
      i18next.changeLanguage('de', (err) => {
        if (err) return console.error('Error changing language:', err);
        updateContent();
        setActiveButton('de');
      });
    }
  });

  document.getElementById('langEN').addEventListener('click', () => {
    if(i18next.language !== 'en') {
        i18next.changeLanguage('en', (err) => {
            if (err) return console.error('Error changing language:', err);
            updateContent();
            setActiveButton('en');
        });
    }
  });
}

// Initialize when the DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeI18n, { once: true });
} else {
    initializeI18n();
}