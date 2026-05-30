import { describe, it, expect } from 'vitest';
import { validateEmbeds } from '../src/scripts/embeds-schema';
import embeds from '../src/data/embeds.json';

describe('validateEmbeds — données réelles', () => {
  it('valide embeds.json', () => {
    const result = validateEmbeds(embeds as unknown);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.length).toBeGreaterThan(0);
    }
  });
});

describe('validateEmbeds — données invalides', () => {
  it('rejette une racine non-tableau', () => {
    const result = validateEmbeds({});
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.length).toBeGreaterThan(0);
    }
  });

  it('rejette des ids dupliqués', () => {
    const bad = [
      { id: 'a', nom: 'A', url: 'https://x', embeddable: false, description: 'd', tags: [] },
      { id: 'a', nom: 'B', url: 'https://y', embeddable: false, description: 'd', tags: [] },
    ];
    const result = validateEmbeds(bad);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.includes('dupliqué'))).toBe(true);
    }
  });

  it('rejette une entrée avec un champ requis manquant', () => {
    const bad = [{ id: 'a', nom: 'A', url: 'https://x', embeddable: false, tags: [] }];
    const result = validateEmbeds(bad);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.includes('description'))).toBe(true);
    }
  });

  it('rejette un mauvais type pour embeddable', () => {
    const bad = [
      { id: 'a', nom: 'A', url: 'https://x', embeddable: 'oui', description: 'd', tags: [] },
    ];
    const result = validateEmbeds(bad);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.includes('embeddable'))).toBe(true);
    }
  });
});
