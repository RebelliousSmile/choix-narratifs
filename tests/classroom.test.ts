import { describe, it, expect } from 'vitest';
import { generateClassroom, CLASSROOM_DESK_PALETTE_ID } from '../scripts/classroom';

describe('generateClassroom', () => {
  it('produit exactement rows * cols éléments', () => {
    expect(generateClassroom(4, 5)).toHaveLength(20);
    expect(generateClassroom(1, 1)).toHaveLength(1);
    expect(generateClassroom(3, 2)).toHaveLength(6);
  });

  it('est déterministe (positions identiques d\'un appel à l\'autre)', () => {
    expect(generateClassroom(3, 3)).toEqual(generateClassroom(3, 3));
  });

  it('ne produit aucun doublon de coordonnées', () => {
    const items = generateClassroom(4, 5);
    const coords = items.map((it) => `${it.x},${it.y}`);
    expect(new Set(coords).size).toBe(items.length);
  });

  it('ne produit aucun doublon d\'identifiant', () => {
    const items = generateClassroom(4, 5);
    const ids = items.map((it) => it.id);
    expect(new Set(ids).size).toBe(items.length);
  });

  it('utilise l\'id de palette pupitre et des coordonnées numériques', () => {
    for (const item of generateClassroom(2, 3)) {
      expect(item.paletteId).toBe(CLASSROOM_DESK_PALETTE_ID);
      expect(typeof item.x).toBe('number');
      expect(typeof item.y).toBe('number');
      expect(Number.isFinite(item.x)).toBe(true);
      expect(Number.isFinite(item.y)).toBe(true);
    }
  });

  it('renvoie un tableau vide pour des dimensions nulles ou négatives', () => {
    expect(generateClassroom(0, 5)).toEqual([]);
    expect(generateClassroom(3, 0)).toEqual([]);
    expect(generateClassroom(-2, 4)).toEqual([]);
  });
});
