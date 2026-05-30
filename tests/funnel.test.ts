import { describe, it, expect } from 'vitest';
import {
  topRecommendations,
  createFunnelState,
  setReponse,
  nextStep,
  previousStep,
  isComplete,
  resetFunnel,
  funnelEligibility,
  countEligible,
  type ScoredMue,
} from '../src/scripts/funnel';
import type { Mue, JeuMues } from '../src/scripts/mues-schema';
import monsterhearts from '../src/data/mues-monsterhearts.json';

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

describe('funnelEligibility — entonnoir éliminatoire', () => {
  const jeu: JeuMues = {
    jeu: 'Test',
    mues: [
      { id: 'a', nom: 'A', resume: 'a', themes: [], tags: [] },
      { id: 'b', nom: 'B', resume: 'b', themes: [], tags: [] },
      { id: 'c', nom: 'C', resume: 'c', themes: [], tags: [] },
    ],
    questions: [
      {
        id: 'q1',
        texte: 'q1',
        options: [
          { id: 'q1a', texte: '', poids: { a: 3 } },
          { id: 'q1b', texte: '', poids: { b: 3, c: 1 } },
        ],
      },
      {
        id: 'q2',
        texte: 'q2',
        options: [
          { id: 'q2a', texte: '', poids: { a: 1, b: 1 } },
          { id: 'q2b', texte: '', poids: { c: 3 } },
        ],
      },
    ],
  };

  it('sans réponse, toutes les mues sont éligibles', () => {
    expect(countEligible(jeu, {})).toBe(3);
  });

  it('élimine les moins bien classées selon le planning', () => {
    // 3 mues, 2 questions -> cible(1) = round(3 - 2*1/2) = 2 : on garde les 2 meilleures.
    // q1a : a=3, b=0, c=0 -> a et b gardées (b<c à l'id), c éliminée.
    const e = funnelEligibility(jeu, { q1: 'q1a' });
    const elig = Object.fromEntries(e.map((x) => [x.mue.id, x.eligible]));
    expect(elig).toEqual({ a: true, b: true, c: false });
    expect(countEligible(jeu, { q1: 'q1a' })).toBe(2);
  });

  it('une mue éliminée le reste (monotone)', () => {
    // c éliminée dès q1 ; elle ne réapparaît pas après q2.
    const after1 = funnelEligibility(jeu, { q1: 'q1a' });
    const after2 = funnelEligibility(jeu, { q1: 'q1a', q2: 'q2b' });
    expect(after1.find((x) => x.mue.id === 'c')?.eligible).toBe(false);
    expect(after2.find((x) => x.mue.id === 'c')?.eligible).toBe(false);
  });

  it('le compte est monotone décroissant', () => {
    const c0 = countEligible(jeu, {});
    const c1 = countEligible(jeu, { q1: 'q1a' });
    const c2 = countEligible(jeu, { q1: 'q1a', q2: 'q2a' });
    expect(c0).toBeGreaterThanOrEqual(c1);
    expect(c1).toBeGreaterThanOrEqual(c2);
    expect(c2).toBe(1); // converge sur la gagnante
  });

  it('la gagnante reste toujours éligible (données réelles)', () => {
    const jeuReel = monsterhearts as unknown as JeuMues;
    const reponses = { 'q5-monstre': 'q5-b', 'q6-liens': 'q6-d', 'q7-devenir': 'q7-e' };
    const e = funnelEligibility(jeuReel, reponses);
    const elue = e.find((x) => x.mue.id === 'elue');
    expect(elue?.eligible).toBe(true);
    // au moins une éliminée, jamais zéro éligible
    const eligibles = e.filter((x) => x.eligible).length;
    expect(eligibles).toBeGreaterThanOrEqual(1);
    expect(eligibles).toBeLessThan(jeuReel.mues.length);
  });
});
