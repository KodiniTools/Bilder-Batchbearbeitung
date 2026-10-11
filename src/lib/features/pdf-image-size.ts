/**
 * Zielgröße für ein Bild im PDF: auf maxDimension (längste Seite) verkleinern,
 * Seitenverhältnis erhalten, nie vergrößern. Gemeinsam für Hauptthread und Worker.
 */
export function scaledImageSize(
  width: number,
  height: number,
  maxDimension: number
): { width: number; height: number } {
  if (width <= maxDimension && height <= maxDimension) return { width, height }
  if (width > height) {
    return { width: maxDimension, height: Math.max(1, Math.round((height / width) * maxDimension)) }
  }
  return { width: Math.max(1, Math.round((width / height) * maxDimension)), height: maxDimension }
}
