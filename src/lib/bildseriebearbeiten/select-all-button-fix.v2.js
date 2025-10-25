// select-all-button-fix.v2.js
// Keeps the "Alle auswählen" button's icon/text in sync with current selection.
// Empty box when NOT all selected; checked box ONLY when ALL selected.
(function(){
  function computeState(){
    const cards = Array.from(document.querySelectorAll('.image-card'));
    const selected = cards.filter(c => c.classList.contains('selected')).length;
    return { total: cards.length, selected, allSelected: cards.length>0 && selected === cards.length };
  }
  function render(){
    const btn = document.getElementById('selectAllButton');
    if (!btn) return;
    const { total, allSelected } = computeState();
    btn.disabled = total === 0;
    // Icon/Label logic (fixed): show checked ONLY when all selected
    const label = allSelected ? 'Auswahl aufheben' : 'Alle auswählen';
    const icon  = allSelected ? 'fas fa-check-square' : 'far fa-square';
    btn.innerHTML = `<i class="${icon}"></i> ${label}`;
  }
  function schedule(){ requestAnimationFrame(render); }
  // Initial
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', render, { once: true });
  } else {
    render();
  }
  // Watch selection changes
  const container = document.getElementById('imageContainer') || document.body;
  const mo = new MutationObserver(schedule);
  mo.observe(container, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
  // App events
  window.addEventListener('images-updated', schedule);
  window.addEventListener('open-editor', schedule);
  container.addEventListener('click', schedule, true);
})();