import { describe, it, expect } from 'vitest';
import {
  createMapState,
  snap,
  addItem,
  removeItem,
  moveItem,
  MAP_SCHEMA_VERSION,
  type MapState,
  type PlacedItem,
} from '../src/scripts/map-state';

function item(id: string, x = 0, y = 0): PlacedItem {
  return { id, paletteId: 'desk', x, y };
}

describe('createMapState', () => {
  it('crée un état vide versionné', () => {
    const state = createMapState();
    expect(state.schemaVersion).toBe(MAP_SCHEMA_VERSION);
    expect(state.items).toEqual([]);
  });
});

describe('snap', () => {
  it('aligne sur la grille la plus proche', () => {
    expect(snap(23, 10)).toBe(20);
    expect(snap(26, 10)).toBe(30);
    expect(snap(25, 10)).toBe(30);
    expect(snap(0, 10)).toBe(0);
  });

  it('renvoie la valeur inchangée si gridSize <= 0', () => {
    expect(snap(23, 0)).toBe(23);
    expect(snap(23, -5)).toBe(23);
  });

  it('est déterministe', () => {
    expect(snap(47, 16)).toBe(snap(47, 16));
  });
});

describe('addItem', () => {
  it('ajoute un élément (immuable)', () => {
    const state = createMapState();
    const next = addItem(state, item('a'));
    expect(state.items).toHaveLength(0);
    expect(next.items).toHaveLength(1);
    expect(next.items[0].id).toBe('a');
    expect(next).not.toBe(state);
  });

  it('remplace un élément de même id', () => {
    let state = createMapState();
    state = addItem(state, item('a', 0, 0));
    state = addItem(state, item('a', 50, 50));
    expect(state.items).toHaveLength(1);
    expect(state.items[0].x).toBe(50);
  });
});

describe('removeItem', () => {
  it('supprime par id (immuable)', () => {
    let state = createMapState();
    state = addItem(state, item('a'));
    state = addItem(state, item('b'));
    const next = removeItem(state, 'a');
    expect(state.items).toHaveLength(2);
    expect(next.items.map((i) => i.id)).toEqual(['b']);
    expect(next).not.toBe(state);
  });

  it('ne fait rien si l’id est absent (renvoie un nouvel objet)', () => {
    const state = addItem(createMapState(), item('a'));
    const next = removeItem(state, 'zzz');
    expect(next.items.map((i) => i.id)).toEqual(['a']);
    expect(next).not.toBe(state);
  });
});

describe('moveItem', () => {
  it('déplace un élément (immuable)', () => {
    let state = createMapState();
    state = addItem(state, item('a', 0, 0));
    const next = moveItem(state, 'a', 100, 200);
    expect(state.items[0]).toEqual({ id: 'a', paletteId: 'desk', x: 0, y: 0 });
    expect(next.items[0].x).toBe(100);
    expect(next.items[0].y).toBe(200);
    expect(next).not.toBe(state);
    expect(next.items[0]).not.toBe(state.items[0]);
  });

  it('renvoie un état inchangé (nouvelle ref) si id absent', () => {
    const state = addItem(createMapState(), item('a', 0, 0));
    const next = moveItem(state, 'zzz', 9, 9);
    expect(next.items[0].x).toBe(0);
    expect(next).not.toBe(state);
  });

  it('est déterministe', () => {
    const base: MapState = addItem(createMapState(), item('a', 0, 0));
    expect(moveItem(base, 'a', 30, 40)).toEqual(moveItem(base, 'a', 30, 40));
  });
});
