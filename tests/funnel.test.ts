import { describe, it, expect } from 'vitest';
import {
  topRecommendations,
  createFunnelState,
  setReponse,
  nextStep,
  previousStep,
  isComplete,
  resetFunnel,
  type ScoredMue,
} from '../src/scripts/funnel';
import type { Mue } from '../src/scripts/mues-schema';

function mue(id: string): Mue {
  return { id, nom: id, resume: `resume ${id}`, themes: [], tags: [] };
}

function scored(...entries: [string, number][]): ScoredMue[] {
  return entries.map(([id, score]) => ({ mue: mue(id), score }));
}

describe('topRecommendations', () => {
  it('renvoie au plus 3 éléments par défaut', () => {
    const input = scored(['a', 10], ['b', 8], ['c', 6], ['d', 4], ['e', 2]);
    const result = topRecommendations(input);
    expect(result).toHaveLength(3);
    expect(result.map((r) => r.mue.id)).toEqual(['a', 'b', 'c']);
  });

  it('renvoie au moins 1 élément quand des mues existent', () => {
    const input = scored(['a', 5]);
    const result = topRecommendations(input);
    expect(result).toHaveLength(1);
    expect(result[0].mue.id).toBe('a');
  });

  it('renvoie un tableau vide pour une entrée vide', () => {
    expect(topRecommendations([])).toEqual([]);
  });

  it('gère le cas où il y a moins de 3 mues', () => {
    const input = scored(['a', 5], ['b', 3]);
    const result = topRecommendations(input);
    expect(result).toHaveLength(2);
    expect(result.map((r) => r.mue.id)).toEqual(['a', 'b']);
  });

  it('est déterministe : même entrée -> même sortie', () => {
    const input = scored(['a', 10], ['b', 8], ['c', 6], ['d', 4]);
    const first = topRecommendations(input);
    const second = topRecommendations(input);
    expect(first).toEqual(second);
  });

  it('conserve un ordre stable (celui de l’entrée déjà triée)', () => {
    const input = scored(['z', 10], ['m', 9], ['a', 8], ['b', 7]);
    const result = topRecommendations(input);
    expect(result.map((r) => r.mue.id)).toEqual(['z', 'm', 'a']);
  });

  it('borne max dans [1, 3]', () => {
    const input = scored(['a', 5], ['b', 4], ['c', 3], ['d', 2]);
    expect(topRecommendations(input, 0)).toHaveLength(1);
    expect(topRecommendations(input, 10)).toHaveLength(3);
    expect(topRecommendations(input, 2)).toHaveLength(2);
  });

  it('ne dépasse jamais le nombre de mues disponibles', () => {
    const input = scored(['a', 5]);
    expect(topRecommendations(input, 3)).toHaveLength(1);
  });
});

describe('état de l’entonnoir', () => {
  it('crée un état initial vide', () => {
    const state = createFunnelState();
    expect(state.index).toBe(0);
    expect(state.reponses).toEqual({});
  });

  it('setReponse est immuable et enregistre la réponse', () => {
    const state = createFunnelState();
    const next = setReponse(state, 'q1', 'q1o1');
    expect(state.reponses).toEqual({});
    expect(next.reponses).toEqual({ q1: 'q1o1' });
    expect(next).not.toBe(state);
  });

  it('setReponse remplace une réponse existante', () => {
    let state = createFunnelState();
    state = setReponse(state, 'q1', 'q1o1');
    state = setReponse(state, 'q1', 'q1o2');
    expect(state.reponses).toEqual({ q1: 'q1o2' });
  });

  it('nextStep avance sans dépasser le total', () => {
    let state = createFunnelState();
    state = nextStep(state, 2);
    expect(state.index).toBe(1);
    state = nextStep(state, 2);
    expect(state.index).toBe(2);
    state = nextStep(state, 2);
    expect(state.index).toBe(2);
  });

  it('previousStep recule sans passer sous 0 et conserve les réponses', () => {
    let state = createFunnelState();
    state = setReponse(state, 'q1', 'q1o1');
    state = nextStep(state, 2);
    state = previousStep(state);
    expect(state.index).toBe(0);
    expect(state.reponses).toEqual({ q1: 'q1o1' });
    state = previousStep(state);
    expect(state.index).toBe(0);
  });

  it('isComplete détecte la fin du parcours', () => {
    let state = createFunnelState();
    expect(isComplete(state, 2)).toBe(false);
    state = nextStep(state, 2);
    expect(isComplete(state, 2)).toBe(false);
    state = nextStep(state, 2);
    expect(isComplete(state, 2)).toBe(true);
  });

  it('resetFunnel renvoie un état initial', () => {
    expect(resetFunnel()).toEqual(createFunnelState());
  });
});
