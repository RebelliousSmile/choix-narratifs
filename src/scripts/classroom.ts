/**
 * Génération d'une ébauche de plan de classe — logique PURE, déterministe.
 *
 * Produit une grille de pupitres (rows x cols) sans dépendance DOM ni Konva.
 * Les pupitres générés utilisent l'id de palette `pupitre` afin d'être
 * directement exploitables comme `presets` par MapEditor.
 */
import type { PlacedItem } from './map-state';

/** Identifiant de palette utilisé pour les pupitres générés. */
export const CLASSROOM_DESK_PALETTE_ID = 'pupitre';

/** Origine de la grille (marge en haut à gauche) et pas entre pupitres. */
const ORIGIN_X = 80;
const ORIGIN_Y = 120;
const STEP_X = 120;
const STEP_Y = 100;

/**
 * Génère une grille déterministe de pupitres.
 *
 * - exactement `rows * cols` éléments ;
 * - positions calculées (aucun aléatoire) → résultat reproductible ;
 * - aucune paire d'éléments ne partage les mêmes coordonnées ;
 * - ids stables de la forme `pupitre-r{row}-c{col}`.
 *
 * `rows` et `cols` négatifs ou nuls produisent un tableau vide.
 */
export function generateClassroom(rows: number, cols: number): PlacedItem[] {
  const safeRows = Math.max(0, Math.floor(rows));
  const safeCols = Math.max(0, Math.floor(cols));

  const items: PlacedItem[] = [];
  for (let row = 0; row < safeRows; row += 1) {
    for (let col = 0; col < safeCols; col += 1) {
      items.push({
        id: `pupitre-r${row}-c${col}`,
        paletteId: CLASSROOM_DESK_PALETTE_ID,
        x: ORIGIN_X + col * STEP_X,
        y: ORIGIN_Y + row * STEP_Y,
        label: `Pupitre ${row * safeCols + col + 1}`,
      });
    }
  }
  return items;
}
