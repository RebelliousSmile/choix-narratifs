import { describe, it, expect } from 'vitest';
import deckData from '../src/data/parallaxe.json';
import {
  validateDeck,
  filtrerPool,
  tirerCarte,
  filtreVide,
  estPause,
  type DeckParallaxe,
} from '../src/scripts/parallaxe-schema';

const result = validateDeck(deckData as unknown);
const deck: DeckParallaxe = result.ok ? result.value : { nom: '', cartes: [] };

describe('parallaxe.json — intégrité', () => {
  it('passe la validation de schéma', () => {
    expect(result.ok).toBe(true);
  });

  it('contient 54 cartes (53 thématiques + 1 Pause)', () => {
    expect(deck.cartes.length).toBe(54);
    expect(deck.cartes.filter((c) => estPause(c)).length).toBe(1);
  });

  it('a des numéros uniques de 1 à 54', () => {
    const nums = deck.cartes.map((c) => c.num).sort((a, b) => a - b);
    expect(nums).toEqual(Array.from({ length: 54 }, (_, i) => i + 1));
  });

  it("n'a aucune carte Moi · Neutre (exclusion absolue)", () => {
    const moiNeutre = deck.cartes.filter(
      (c) => c.focale === 'moi' && c.tonalite === 'neutre',
    );
    expect(moiNeutre.length).toBe(0);
  });
});

describe('filtrerPool (logique d\'exclusion : cocher = écarter)', () => {
  it('sans filtre, garde tout le deck (Pause incluse)', () => {
    expect(filtrerPool(deck.cartes, filtreVide()).length).toBe(54);
  });

  it('exclut la Pause quand inclurePause est faux', () => {
    const pool = filtrerPool(deck.cartes, { ...filtreVide(), inclurePause: false });
    expect(pool.length).toBe(53);
    expect(pool.some((c) => estPause(c))).toBe(false);
  });

  it('écarte les cartes d\'une focale (Lieu) sans toucher à la Pause', () => {
    const pool = filtrerPool(deck.cartes, { ...filtreVide(), focales: ['lieu'] });
    expect(pool.some((c) => c.focale === 'lieu')).toBe(false);
    expect(pool.some((c) => c.focale === 'compagnon')).toBe(true);
    expect(pool.some((c) => estPause(c))).toBe(true);
  });

  it('cumule les exclusions de plusieurs axes', () => {
    const pool = filtrerPool(deck.cartes, {
      ...filtreVide(),
      focales: ['moi'],
      tonalites: ['hostile'],
      inclurePause: false,
    });
    expect(pool.some((c) => c.focale === 'moi')).toBe(false);
    expect(pool.some((c) => c.tonalite === 'hostile')).toBe(false);
    expect(pool.length).toBeGreaterThan(0);
  });

  it('vide le pool thématique si toutes les focales sont écartées', () => {
    const pool = filtrerPool(deck.cartes, {
      focales: ['moi', 'compagnon', 'pnj', 'tiers', 'lieu'],
      tonalites: [],
      archetypes: [],
      inclurePause: false,
    });
    expect(pool.length).toBe(0);
  });
});

describe('tirerCarte', () => {
  it('renvoie null sur un pool vide', () => {
    expect(tirerCarte([])).toBe(null);
  });

  it('tire de façon déterministe avec un random injecté', () => {
    const pool = filtrerPool(deck.cartes, { ...filtreVide(), inclurePause: false });
    const premiere = tirerCarte(pool, () => 0);
    const derniere = tirerCarte(pool, () => 0.999999);
    expect(premiere?.num).toBe(pool[0].num);
    expect(derniere?.num).toBe(pool[pool.length - 1].num);
  });

  it('reste dans les bornes même si random renvoie 1', () => {
    const pool = filtrerPool(deck.cartes, filtreVide());
    expect(tirerCarte(pool, () => 1)).not.toBe(null);
  });
});
