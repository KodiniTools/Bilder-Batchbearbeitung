// remove-resize-addon.js

(function(){
  // 1) Visually hide via CSS (idempotent)
  if (!document.getElementById('hide-resize-css')) {
    const style = document.createElement('style');
    style.id = 'hide-resize-css';
    style.textContent = `
      .image-resize-panel{ display:none !important; }
      .image-action-btn.edit-btn{ display:none !important; }
    `;
    document.head.appendChild(style);
  }

  // 2) Remove existing nodes and keep removing newly added ones (e.g., after uploads)
  function nuke() {
    document.querySelectorAll('.image-resize-panel, .image-action-btn.edit-btn')
      .forEach(el => el.remove());
  }

  // Initial pass
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', nuke, { once: true });
  } else {
    nuke();
  }

  // 3) Watch the image container for new cards and clean them up
  const container = document.getElementById('imageContainer') || document.body;
  const mo = new MutationObserver(() => nuke());
  mo.observe(container, { childList: true, subtree: true });

  // 4) Also react to app-level events that re-render cards
  window.addEventListener('images-updated', nuke);
  window.addEventListener('open-editor', () => setTimeout(nuke, 0));
})();
