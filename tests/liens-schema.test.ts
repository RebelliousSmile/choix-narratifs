import { describe, it, expect } from 'vitest';
import { validateLiens } from '../src/scripts/liens-schema';
import liens from '../src/data/liens.json';

describe('validateLiens — données réelles', () => {
  it('valide liens.json', () => {
    const result = validateLiens(liens as unknown);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.length).toBeGreaterThan(0);
    }
  });
});

describe('validateLiens — données invalides', () => {
  it('rejette une racine non-tableau', () => {
    const result = validateLiens({});
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.length).toBeGreaterThan(0);
    }
  });

  it('rejette des ids dupliqués', () => {
    const bad = [
      { id: 'a', titre: 'A', url: 'https://x', description: 'd', categorie: 'Théorie' },
      { id: 'a', titre: 'B', url: 'https://y', description: 'd', categorie: 'Jeux' },
    ];
    const result = validateLiens(bad);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.includes('dupliqué'))).toBe(true);
    }
  });

  it('rejette un champ requis manquant', () => {
    const bad = [{ id: 'a', titre: 'A', url: 'https://x', categorie: 'Jeux' }];
    const result = validateLiens(bad);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.includes('description'))).toBe(true);
    }
  });

  it('rejette une catégorie non autorisée', () => {
    const bad = [
      { id: 'a', titre: 'A', url: 'https://x', description: 'd', categorie: 'Inconnue' },
    ];
    const result = validateLiens(bad);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.includes('categorie'))).toBe(true);
    }
  });
});
