/**
 * Moteur de questions-entonnoir réutilisable.
 *
 * Logique PURE (aucune dépendance DOM/navigateur) partagée par les sélecteurs
 * de mues (Monsterhearts, Monster of the Week, ...). Déterministe.
 */

import { scoreMues } from './mues-schema';
import type { JeuMues, Mue } from './mues-schema';

/** Un élément scoré tel que renvoyé par scoreMues(). */
export interface ScoredMue {
  mue: Mue;
  score: number;
}

/**
 * Renvoie les meilleures recommandations à partir d'une liste déjà triée par
 * score décroissant (sortie de scoreMues).
 *
 * Garanties :
 * - toujours au moins 1 élément (si la liste d'entrée est non vide),
 * - au plus `max` éléments (borné à [1, 3] par défaut),
 * - ordre stable : on conserve l'ordre d'entrée (déjà déterministe), donc
 *   le même `scored` produit toujours le même résultat.
 *
 * @param scored liste { mue, score } triée par score décroissant
 * @param max    nombre maximum de recommandations (défaut 3, borné à 1..3)
 */
export function topRecommendations(scored: ScoredMue[], max = 3): ScoredMue[] {
  if (scored.length === 0) {
    return [];
  }
  // Borne max dans [1, 3] : on veut 1 reco principale + 1-2 alternatives.
  const limit = Math.min(Math.max(Math.trunc(max), 1), 3);
  return scored.slice(0, Math.min(limit, scored.length));
}

/**
 * État immuable d'un parcours d'entonnoir : index de la question courante et
 * réponses déjà saisies (map idQuestion -> idOption).
 */
export interface FunnelState {
  /** Index de la question courante dans jeu.questions. */
  index: number;
  /** Réponses choisies, par identifiant de question. */
  reponses: Record<string, string>;
}

/** Crée l'état initial d'un entonnoir (première question, aucune réponse). */
export function createFunnelState(): FunnelState {
  return { index: 0, reponses: {} };
}

/**
 * Enregistre (ou remplace) la réponse pour une question donnée.
 * Immuable : renvoie un nouvel état.
 */
export function setReponse(
  state: FunnelState,
  questionId: string,
  optionId: string,
): FunnelState {
  return {
    index: state.index,
    reponses: { ...state.reponses, [questionId]: optionId },
  };
}

/**
 * Avance d'une étape sans dépasser le nombre total de questions.
 * Immuable : renvoie un nouvel état.
 */
export function nextStep(state: FunnelState, total: number): FunnelState {
  const max = Math.max(total, 0);
  return { ...state, index: Math.min(state.index + 1, max) };
}

/**
 * Recule d'une étape sans passer sous 0 (conserve les réponses).
 * Immuable : renvoie un nouvel état.
 */
export function previousStep(state: FunnelState): FunnelState {
  return { ...state, index: Math.max(state.index - 1, 0) };
}

/** Indique si l'entonnoir a atteint l'écran de résultat. */
export function isComplete(state: FunnelState, total: number): boolean {
  return state.index >= total;
}

/**
 * Réinitialise complètement le parcours.
 * Pratique helper symétrique de createFunnelState pour les composants.
 */
export function resetFunnel(): FunnelState {
  return createFunnelState();
}

/** Éligibilité d'une mue dans l'entonnoir. */
export interface FunnelEligibility {
  mue: Mue;
  score: number;
  eligible: boolean;
}

/**
 * Entonnoir éliminatoire à PLANNING.
 *
 * À chaque réponse, on resserre l'ensemble des mues encore en lice vers un
 * effectif cible qui décroît linéairement de `M` (toutes les mues) à `1` :
 *
 *     cible(k) = round(M - (M - 1) * k / nbQuestions)
 *
 * Les mues les moins bien classées (score cumulé, départage par id) au-delà de
 * cet effectif sont éliminées DÉFINITIVEMENT (jamais ressuscitées).
 *
 * Propriétés :
 * - le décompte descend régulièrement dès la 1re question (≈ M/nbQuestions
 *   éliminations par étape) ;
 * - une mue éliminée le reste (monotone) ;
 * - la recommandation principale (meilleur score final) n'est JAMAIS barrée ;
 * - sans réponse, toutes les mues sont éligibles.
 *
 * Renvoie les mues dans l'ordre du catalogue (stable).
 */
export function funnelEligibility(
  jeu: JeuMues,
  reponses: Record<string, string>,
): FunnelEligibility[] {
  const total = jeu.questions.length || 1;
  const M = jeu.mues.length;

  // Questions répondues, dans l'ordre du questionnaire.
  const answeredQs = jeu.questions.filter((q) =>
    q.options.some((o) => o.id === reponses[q.id]),
  );

  const scored = scoreMues(jeu, reponses);
  const scoreById = new Map(scored.map((s) => [s.mue.id, s.score]));

  /** Effectif cible après k réponses. */
  const cible = (k: number) => Math.max(1, Math.round(M - (M - 1) * (k / total)));

  const eliminated = new Set<string>();
  const cumul = new Map<string, number>(jeu.mues.map((m) => [m.id, 0]));

  let step = 0;
  for (const q of answeredQs) {
    step += 1;
    const opt = q.options.find((o) => o.id === reponses[q.id]);
    if (opt) {
      for (const [id, w] of Object.entries(opt.poids)) {
        if (cumul.has(id)) cumul.set(id, (cumul.get(id) ?? 0) + w);
      }
    }
    const garde = cible(step);
    const alive = jeu.mues
      .filter((m) => !eliminated.has(m.id))
      .sort((a, b) => {
        const d = (cumul.get(b.id) ?? 0) - (cumul.get(a.id) ?? 0);
        return d !== 0 ? d : a.id.localeCompare(b.id);
      });
    for (let i = garde; i < alive.length; i += 1) eliminated.add(alive[i].id);
  }

  // La recommandation principale ne peut jamais être barrée.
  if (scored.length) eliminated.delete(scored[0].mue.id);

  return jeu.mues.map((mue) => ({
    mue,
    score: scoreById.get(mue.id) ?? 0,
    eligible: !eliminated.has(mue.id),
  }));
}

/** Nombre de mues encore en lice dans l'entonnoir. */
export function countEligible(
  jeu: JeuMues,
  reponses: Record<string, string>,
): number {
  return funnelEligibility(jeu, reponses).filter((e) => e.eligible).length;
}

/** Réexport pour confort des consommateurs (composants .astro). */
export type { JeuMues, Mue };
