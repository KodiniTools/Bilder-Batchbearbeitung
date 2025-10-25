// selected-border-enhance.v2.js
// Light mode: red outline. Dark mode: yellow outline.
// Works with system dark mode AND class/data-theme toggles.

(function(){
  if (document.getElementById('selected-border-enhance-v2')) return;

  const style = document.createElement('style');
  style.id = 'selected-border-enhance-v2';
  style.textContent = `
  /* Defaults (light mode) */
  :root{
    --sel-outline: #ef4444;            /* red-500 */
    --sel-shadow: rgba(239,68,68,.15);
    --sel-hover:  rgba(239,68,68,.22);
  }
  /* System dark mode */
  @media (prefers-color-scheme: dark){
    :root{
      --sel-outline: #f59e0b;          /* amber-500 (gelb) */
      --sel-shadow: rgba(245,158,11,.20);
      --sel-hover:  rgba(245,158,11,.28);
    }
  }
  /* App-level dark toggles (class or data attribute) */
  :root.dark, .dark, [data-theme="dark"]{
    --sel-outline: #f59e0b !important; /* amber-500 */
    --sel-shadow: rgba(245,158,11,.20) !important;
    --sel-hover:  rgba(245,158,11,.28) !important;
  }

  .image-card { border-radius: 12px; }
  .image-card.selected{
    outline: 1px solid var(--sel-outline) !important;
    outline-offset: 2px;
    box-shadow: 0 0 0 2px var(--sel-shadow);
    transition: box-shadow .18s ease, outline-color .18s ease;
  }
  .image-card.selected:hover{
    box-shadow: 0 4px 18px var(--sel-hover);
  }`;

  document.head.appendChild(style);
})();