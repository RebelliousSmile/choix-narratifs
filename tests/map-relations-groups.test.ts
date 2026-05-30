/**
 * Tests de la logique PURE partagée par les éditeurs de carte
 * (Plan de classe — Monsterhearts & Snake Bay) : ascendants (relations)
 * et groupes d'influence.
 */
import { describe, it, expect } from 'vitest';
import {
  createMapState,
  addItem,
  removeItem,
  addRelation,
  removeRelation,
  addGroup,
  removeGroup,
  setItemGroup,
  type MapState,
  type PlacedItem,
} from '../src/scripts/map-state';

function human(id: string): PlacedItem {
  return { id, paletteId: 'humain-eleve', x: 0, y: 0 };
}

function withTwoHumans(): MapState {
  let s = createMapState();
  s = addItem(s, human('a'));
  s = addItem(s, human('b'));
  return s;
}

describe('addRelation (ascendant)', () => {
  it('ajoute un ascendant (immuable)', () => {
    const base = withTwoHumans();
    const next = addRelation(base, { id: 'r1', from: 'a', to: 'b' });
    expect(base.relations).toHaveLength(0);
    expect(next.relations).toHaveLength(1);
    expect(next.relations[0]).toMatchObject({ from: 'a', to: 'b' });
    expect(next).not.toBe(base);
  });

  it('dédoublonne les ascendants de même source et cible', () => {
    let s = withTwoHumans();
    s = addRelation(s, { id: 'r1', from: 'a', to: 'b' });
    const again = addRelation(s, { id: 'r2', from: 'a', to: 'b' });
    expect(again.relations).toHaveLength(1);
    expect(again).toBe(s); // état renvoyé inchangé
  });

  it('autorise plusieurs ascendants depuis la même source', () => {
    let s = withTwoHumans();
    s = addItem(s, human('c'));
    s = addRelation(s, { id: 'r1', from: 'a', to: 'b' });
    s = addRelation(s, { id: 'r2', from: 'a', to: 'c' });
    expect(s.relations).toHaveLength(2);
  });
});

describe('removeRelation', () => {
  it('supprime un ascendant par id', () => {
    let s = withTwoHumans();
    s = addRelation(s, { id: 'r1', from: 'a', to: 'b' });
    const next = removeRelation(s, 'r1');
    expect(next.relations).toHaveLength(0);
    expect(next).not.toBe(s);
  });
});

describe('removeItem — cascade sur les ascendants', () => {
  it('supprime aussi les ascendants liés à l’élément retiré', () => {
    let s = withTwoHumans();
    s = addItem(s, human('c'));
    s = addRelation(s, { id: 'r1', from: 'a', to: 'b' });
    s = addRelation(s, { id: 'r2', from: 'c', to: 'a' });
    const next = removeItem(s, 'a');
    expect(next.items.map((i) => i.id)).toEqual(['b', 'c']);
    expect(next.relations).toHaveLength(0); // r1 et r2 référencent 'a'
  });

  it('conserve les ascendants sans rapport avec l’élément retiré', () => {
    let s = withTwoHumans();
    s = addItem(s, human('c'));
    s = addRelation(s, { id: 'r1', from: 'b', to: 'c' });
    const next = removeItem(s, 'a');
    expect(next.relations.map((r) => r.id)).toEqual(['r1']);
  });
});

describe('addGroup / setItemGroup', () => {
  it('ajoute un groupe (immuable)', () => {
    const base = withTwoHumans();
    const next = addGroup(base, { id: 'g1', nom: 'Populaires', couleur: '#e63946' });
    expect(base.groups).toHaveLength(0);
    expect(next.groups).toHaveLength(1);
    expect(next).not.toBe(base);
  });

  it('assigne puis retire un item d’un groupe', () => {
    let s = withTwoHumans();
    s = addGroup(s, { id: 'g1', nom: 'Populaires', couleur: '#e63946' });
    s = setItemGroup(s, 'a', 'g1');
    expect(s.items.find((i) => i.id === 'a')?.groupId).toBe('g1');
    s = setItemGroup(s, 'a', undefined);
    expect(s.items.find((i) => i.id === 'a')?.groupId).toBeUndefined();
  });
});

describe('removeGroup — cascade sur les items', () => {
  it('supprime le groupe et dé-assigne les items concernés', () => {
    let s = withTwoHumans();
    s = addGroup(s, { id: 'g1', nom: 'Populaires', couleur: '#e63946' });
    s = setItemGroup(s, 'a', 'g1');
    s = setItemGroup(s, 'b', 'g1');
    const next = removeGroup(s, 'g1');
    expect(next.groups).toHaveLength(0);
    expect(next.items.every((i) => i.groupId === undefined)).toBe(true);
  });
});
