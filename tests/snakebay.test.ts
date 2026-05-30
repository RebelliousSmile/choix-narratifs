import { describe, it, expect } from 'vitest';
import { snakeBayPresets } from '../src/scripts/snakebay';

describe('snakeBayPresets', () => {
  it('est déterministe (mêmes presets à chaque appel)', () => {
    expect(snakeBayPresets()).toEqual(snakeBayPresets());
  });

  it('produit des identifiants uniques', () => {
    const items = snakeBayPresets();
    const ids = items.map((it) => it.id);
    expect(new Set(ids).size).toBe(items.length);
  });

  it('produit des coordonnées numériques finies', () => {
    for (const item of snakeBayPresets()) {
      expect(typeof item.x).toBe('number');
      expect(typeof item.y).toBe('number');
      expect(Number.isFinite(item.x)).toBe(true);
      expect(Number.isFinite(item.y)).toBe(true);
    }
  });

  it('renvoie au moins quelques lieux génériques', () => {
    expect(snakeBayPresets().length).toBeGreaterThan(0);
  });

  it('chaque preset référence un paletteId non vide', () => {
    for (const item of snakeBayPresets()) {
      expect(typeof item.paletteId).toBe('string');
      expect(item.paletteId.length).toBeGreaterThan(0);
    }
  });
});
