/**
 * Unterkante fixierter/sticky Elemente am oberen Fensterrand (z. B. die
 * globale SSI-Navigation), die darunterliegende Inhalte überdecken.
 *
 * @param below Optional: Element (z. B. ein Modal-Overlay). Es zählen nur
 *   Elemente, die oberhalb davon gezeichnet werden; das Element selbst und
 *   alles darunter wird ignoriert.
 */
export function getTopOverlayBottom(below?: Element | null): number {
  if (typeof document === 'undefined') return 0
  let bottom = 0
  const x = Math.round(window.innerWidth / 2)
  // elementsFromPoint liefert die Elemente von oben (zuoberst) nach unten
  for (const el of document.elementsFromPoint(x, 1)) {
    if (below && (el === below || below.contains(el))) break
    let node: HTMLElement | null = el as HTMLElement
    while (node && node !== document.body) {
      const pos = getComputedStyle(node).position
      if (pos === 'fixed' || pos === 'sticky') {
        const rect = node.getBoundingClientRect()
        // Vollflächige Overlays sind keine Kopfleisten
        if (rect.top <= 1 && rect.height < window.innerHeight / 2) {
          bottom = Math.max(bottom, rect.bottom)
        }
        break
      }
      node = node.parentElement
    }
  }
  return bottom
}
