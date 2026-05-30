/**
 * État d'une carte 2D — logique PURE, sans aucune dépendance Konva ni DOM.
 *
 * Toutes les fonctions sont immuables et déterministes : elles renvoient un
 * nouvel objet sans muter l'entrée.
 */

export const MAP_SCHEMA_VERSION = 1;

/** Palette de couleurs prédéfinies pour les groupes d'influence. */
export const GROUP_COLORS = [
  '#e63946',
  '#f4a261',
  '#e9c46a',
  '#52b788',
  '#457b9d',
  '#9c6b98',
  '#ff70a6',
  '#8d99ae',
] as const;

export type PaletteShape = 'rect' | 'circle' | 'label';

export interface PaletteItem {
  id: string;
  label: string;
  color?: string;
  shape?: PaletteShape;
  widthUnits?: number;  // largeur en unités de grille (défaut 2)
  heightUnits?: number; // hauteur en unités de grille (défaut 2)
}

export interface PlacedItem {
  id: string;
  paletteId: string;
  x: number;
  y: number;
  label?: string;
  rotation?: number;
  groupId?: string;
  /** Dimensions en unités de grille (override les valeurs de la palette). */
  widthUnits?: number;
  heightUnits?: number;
}

/** Groupe d'influence (couleur + nom). */
export interface Group {
  id: string;
  nom: string;
  couleur: string;
}

/** Ascendant (flèche d'influence) entre deux éléments. */
export interface Relation {
  id: string;
  from: string;
  to: string;
}

export interface MapState {
  schemaVersion: number;
  items: PlacedItem[];
  groups: Group[];
  relations: Relation[];
}

export function createMapState(): MapState {
  return { schemaVersion: MAP_SCHEMA_VERSION, items: [], groups: [], relations: [] };
}

export function snap(value: number, gridSize: number): number {
  if (!Number.isFinite(gridSize) || gridSize <= 0) return value;
  return Math.round(value / gridSize) * gridSize;
}

export function addItem(state: MapState, item: PlacedItem): MapState {
  const items = state.items.filter((i) => i.id !== item.id);
  return { ...state, items: [...items, item] };
}

export function removeItem(state: MapState, id: string): MapState {
  return {
    ...state,
    items: state.items.filter((i) => i.id !== id),
    relations: (state.relations ?? []).filter((r) => r.from !== id && r.to !== id),
  };
}

export function moveItem(state: MapState, id: string, x: number, y: number): MapState {
  return {
    ...state,
    items: state.items.map((i) => (i.id === id ? { ...i, x, y } : i)),
  };
}

export function addGroup(state: MapState, group: Group): MapState {
  return { ...state, groups: [...(state.groups ?? []), group] };
}

export function removeGroup(state: MapState, groupId: string): MapState {
  return {
    ...state,
    groups: (state.groups ?? []).filter((g) => g.id !== groupId),
    items: state.items.map((i) =>
      i.groupId === groupId ? { ...i, groupId: undefined } : i,
    ),
  };
}

export function setItemGroup(
  state: MapState,
  itemId: string,
  groupId: string | undefined,
): MapState {
  return {
    ...state,
    items: state.items.map((i) => (i.id === itemId ? { ...i, groupId } : i)),
  };
}

export function addRelation(state: MapState, rel: Relation): MapState {
  const rels = state.relations ?? [];
  if (rels.some((r) => r.from === rel.from && r.to === rel.to)) return state;
  return { ...state, relations: [...rels, rel] };
}

export function removeRelation(state: MapState, id: string): MapState {
  return {
    ...state,
    relations: (state.relations ?? []).filter((r) => r.id !== id),
  };
}
