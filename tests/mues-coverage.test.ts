/**
 * Couverture du sélecteur de mues : on vérifie par force brute que CHAQUE mue
 * peut sortir en recommandation n°1 (score strictement supérieur à toutes les
 * autres) pour au moins une combinaison de réponses. Garantit qu'aucune mue
 * n'est « morte » (jamais atteignable) dans le questionnaire.
 */
import { describe, it, expect } from 'vitest';
import { scoreMues, type JeuMues } from '../src/scripts/mues-schema';
import monsterhearts from '../src/data/mues-monsterhearts.json';

const jeu = monsterhearts as unknown as JeuMues;

/** Produit cartésien : une option choisie par question. */
function* combinations(jeu: JeuMues): Generator<Record<string, string>> {
  const qs = jeu.questions;
  const idx = new Array(qs.length).fill(0);
  while (true) {
    const rep: Record<string, string> = {};
    qs.forEach((q, i) => { rep[q.id] = q.options[idx[i]].id; });
    yield rep;
    let k = qs.length - 1;
    while (k >= 0) {
      idx[k]++;
      if (idx[k] < qs[k].options.length) break;
      idx[k] = 0;
      k--;
    }
    if (k < 0) break;
  }
}

describe('couverture du questionnaire des mues', () => {
  // Calcul une seule fois : ensemble des mues atteignables en n°1 strict.
  const strictTop = new Set<string>();
  for (const rep of combinations(jeu)) {
    const scored = scoreMues(jeu, rep);
    if (scored.length >= 2 && scored[0].score > scored[1].score) {
      strictTop.add(scored[0].mue.id);
    } else if (scored.length === 1) {
      strictTop.add(scored[0].mue.id);
    }
  }

  it('chaque mue peut être recommandée en n°1 (argmax strict)', () => {
    const missing = jeu.mues.map((m) => m.id).filter((id) => !strictTop.has(id));
    expect(missing, `mues jamais atteignables en n°1 : ${missing.join(', ')}`).toEqual([]);
  });

  it('toutes les mues du catalogue sont distinctes et non vides', () => {
    expect(jeu.mues.length).toBe(28);
    expect(new Set(jeu.mues.map((m) => m.id)).size).toBe(28);
  });
});
