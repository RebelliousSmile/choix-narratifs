import { describe, it, expect } from 'vitest';
import { validateJeuMues, scoreMues, type JeuMues } from '../src/scripts/mues-schema';
import monsterhearts from '../src/data/mues-monsterhearts.json';
import motw from '../src/data/mues-motw.json';

describe('validateJeuMues — données réelles', () => {
  it('valide le jeu Monsterhearts', () => {
    const result = validateJeuMues(monsterhearts as unknown);
    expect(result.ok).toBe(true);
  });

  it('valide le jeu Monster of the Week', () => {
    const result = validateJeuMues(motw as unknown);
    expect(result.ok).toBe(true);
  });
});

describe('validateJeuMues — données invalides', () => {
  it('rejette une racine non-objet', () => {
    const result = validateJeuMues(null);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.length).toBeGreaterThan(0);
    }
  });

  it('rejette des ids de mues dupliqués', () => {
    const bad = {
      jeu: 'Test',
      mues: [
        { id: 'a', nom: 'A', resume: 'x', themes: [], tags: [] },
        { id: 'a', nom: 'A2', resume: 'y', themes: [], tags: [] },
      ],
      questions: [
        {
          id: 'q1',
          texte: 'q',
          options: [
            { id: 'o1', texte: 'o1', poids: { a: 1 } },
            { id: 'o2', texte: 'o2', poids: { a: 1 } },
          ],
        },
      ],
    };
    const result = validateJeuMues(bad);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.includes('dupliqué'))).toBe(true);
    }
  });

  it('rejette un poids référençant une mue inconnue', () => {
    const bad = {
      jeu: 'Test',
      mues: [{ id: 'a', nom: 'A', resume: 'x', themes: [], tags: [] }],
      questions: [
        {
          id: 'q1',
          texte: 'q',
          options: [
            { id: 'o1', texte: 'o1', poids: { a: 1 } },
            { id: 'o2', texte: 'o2', poids: { inconnu: 1 } },
          ],
        },
      ],
    };
    const result = validateJeuMues(bad);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.includes('inconnue'))).toBe(true);
    }
  });

  it('rejette une question avec moins de 2 options', () => {
    const bad = {
      jeu: 'Test',
      mues: [{ id: 'a', nom: 'A', resume: 'x', themes: [], tags: [] }],
      questions: [{ id: 'q1', texte: 'q', options: [{ id: 'o1', texte: 'o1', poids: { a: 1 } }] }],
    };
    const result = validateJeuMues(bad);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.includes('au moins 2'))).toBe(true);
    }
  });
});

describe('scoreMues — déterminisme & ordre stable', () => {
  const jeu = monsterhearts as unknown as JeuMues;

  it('produit le même résultat pour les mêmes réponses', () => {
    const reponses = { 'q1-desir': 'q1-a', 'q7-devenir': 'q7-e' };
    const run1 = scoreMues(jeu, reponses);
    const run2 = scoreMues(jeu, reponses);
    expect(run1).toEqual(run2);
  });

  it('trie par score décroissant puis par id (égalités stables)', () => {
    // Aucune réponse -> tous les scores à 0 -> ordre par id croissant
    const result = scoreMues(jeu, {});
    expect(result.every((r) => r.score === 0)).toBe(true);
    const ids = result.map((r) => r.mue.id);
    const sorted = [...ids].sort((a, b) => a.localeCompare(b));
    expect(ids).toEqual(sorted);
  });

  it('place la mue attendue en tête sur un profil marqué', () => {
    // Profil « héroïne dévouée » : part de rage + loyauté + cause plus grande.
    const reponses = {
      'q5-monstre': 'q5-b',
      'q6-liens': 'q6-d',
      'q7-devenir': 'q7-e',
    };
    const result = scoreMues(jeu, reponses);
    expect(result[0]?.mue.id).toBe('elue');
    expect(result[0]?.score).toBeGreaterThan(0);
  });
});
