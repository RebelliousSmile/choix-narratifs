/**
 * Génération d'une ébauche de plan de classe — logique PURE, déterministe.
 *
 * Les pupitres sont répartis sur toute la surface disponible en divisant
 * équitablement l'espace (marges + écart entre pupitres calculés dynamiquement).
 */
import type { PlacedItem } from './map-state';

export const CLASSROOM_DESK_PALETTE_ID = 'pupitre';

/** Taille d'un pupitre en pixels (2 unités de grille × 20px). */
const DESK_SIZE = 40;
const GRID = 20;

/**
 * Génère une grille de pupitres répartis sur toute la surface.
 *
 * @param rows    nombre de rangées
 * @param cols    nombre de colonnes
 * @param canvasW largeur du canvas en px (défaut A4 paysage ~800px)
 * @param canvasH hauteur du canvas en px (défaut A4 paysage ~566px)
 */
export function generateClassroom(
  rows: number,
  cols: number,
  canvasW = 800,
  canvasH = 566,
): PlacedItem[] {
  const safeRows = Math.max(0, Math.floor(rows));
  const safeCols = Math.max(0, Math.floor(cols));
  if (safeRows === 0 || safeCols === 0) return [];

  // Marges : 8% horizontal, 10% vertical
  const marginX = Math.round(canvasW * 0.08);
  const marginY = Math.round(canvasH * 0.10);
  const usableW = canvasW - marginX * 2;
  const usableH = canvasH - marginY * 2;

  // Espacement entre pupitres (aligne sur la grille)
  const stepX = safeCols > 1
    ? Math.round((usableW - DESK_SIZE) / (safeCols - 1) / GRID) * GRID
    : 0;
  const stepY = safeRows > 1
    ? Math.round((usableH - DESK_SIZE) / (safeRows - 1) / GRID) * GRID
    : 0;

  // Si un seul col/row : centrer
  const startX = safeCols === 1
    ? Math.round((canvasW - DESK_SIZE) / 2 / GRID) * GRID
    : marginX;
  const startY = safeRows === 1
    ? Math.round((canvasH - DESK_SIZE) / 2 / GRID) * GRID
    : marginY;

  const items: PlacedItem[] = [];
  let n = 1;
  for (let row = 0; row < safeRows; row++) {
    for (let col = 0; col < safeCols; col++) {
      items.push({
        id: `pupitre-r${row}-c${col}`,
        paletteId: CLASSROOM_DESK_PALETTE_ID,
        x: startX + col * stepX,
        y: startY + row * stepY,
        label: `Élève ${n++}`,
      });
    }
  }
  return items;
}
