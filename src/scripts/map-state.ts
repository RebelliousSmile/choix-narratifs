/**
 * État d'une carte 2D — logique PURE, sans aucune dépendance Konva ni DOM.
 *
 * Sert de socle commun aux éditeurs de carte (plan de classe, Snake Bay, ...).
 * Toutes les fonctions sont immuables et déterministes : elles renvoient un
 * nouvel objet sans muter l'entrée.
 */

export const MAP_SCHEMA_VERSION = 1;

/** Forme visuelle proposée par un élément de palette. */
export type PaletteShape = 'rect' | 'circle' | 'label';

/** Élément disponible dans la palette (catalogue d'objets plaçables). */
export interface PaletteItem {
  id: string;
  label: string;
  color?: string;
  shape?: PaletteShape;
}

/** Élément effectivement placé sur la carte. */
export interface PlacedItem {
  id: string;
  paletteId: string;
  x: number;
  y: number;
  label?: string;
  rotation?: number;
}

/** État sérialisable de la carte. */
export interface MapState {
  schemaVersion: number;
  items: PlacedItem[];
}

/** Crée un état de carte vide. */
export function createMapState(): MapState {
  return { schemaVersion: MAP_SCHEMA_VERSION, items: [] };
}

/**
 * Aligne une valeur sur la grille la plus proche.
 * `snap(23, 10) === 20`, `snap(26, 10) === 30`. Si gridSize <= 0, renvoie la
 * valeur inchangée (pas de grille).
 */
export function snap(value: number, gridSize: number): number {
  if (!Number.isFinite(gridSize) || gridSize <= 0) {
    return value;
  }
  return Math.round(value / gridSize) * gridSize;
}

/**
 * Ajoute un élément à la carte (immuable).
 * Si un élément du même id existe déjà, il est remplacé.
 */
export function addItem(state: MapState, item: PlacedItem): MapState {
  const items = state.items.filter((existing) => existing.id !== item.id);
  return { ...state, items: [...items, item] };
}

/** Supprime l'élément d'identifiant `id` (immuable). */
export function removeItem(state: MapState, id: string): MapState {
  return { ...state, items: state.items.filter((item) => item.id !== id) };
}

/**
 * Déplace l'élément `id` aux coordonnées (x, y) (immuable).
 * Si l'élément n'existe pas, l'état est renvoyé inchangé (nouvelle référence).
 */
export function moveItem(
  state: MapState,
  id: string,
  x: number,
  y: number,
): MapState {
  return {
    ...state,
    items: state.items.map((item) =>
      item.id === id ? { ...item, x, y } : item,
    ),
  };
}
