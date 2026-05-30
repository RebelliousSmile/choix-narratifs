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
 * Entonnoir éliminatoire MONOTONE.
 *
 * Une mue est éliminée dès qu'elle ne peut plus rattraper la tête, même en
 * obtenant le maximum de points sur toutes les questions restantes :
 *
 *     score_actuel + max_atteignable_restant < score_du_leader
 *
 * Propriétés (démontrables) :
 * - le nombre d'éligibles ne fait que DÉCROÎTRE au fil des réponses (le plafond
 *   `score + maxRestant` est non croissant, le seuil `leader` non décroissant) ;
 * - la gagnante n'est JAMAIS éliminée (son plafond ≥ son score = le leader) ;
 * - sans aucune réponse, toutes les mues sont éligibles.
 *
 * Renvoie les mues dans l'ordre du catalogue (stable, pas de réagencement).
 */
export function funnelEligibility(
  jeu: JeuMues,
  reponses: Record<string, string>,
): FunnelEligibility[] {
  // Questions effectivement répondues (réponse valide).
  const answered = new Set(
    jeu.questions
      .filter((q) => q.options.some((o) => o.id === reponses[q.id]))
      .map((q) => q.id),
  );
  const hasAnswers = answered.size > 0;

  const scored = scoreMues(jeu, reponses);
  const scoreById = new Map(scored.map((s) => [s.mue.id, s.score]));
  const leader = scored.length ? scored[0].score : 0; // scoreMues trie par score décroissant

  // Maximum de points encore atteignables sur les questions NON répondues.
  const maxRemaining = new Map<string, number>();
  for (const mue of jeu.mues) maxRemaining.set(mue.id, 0);
  for (const q of jeu.questions) {
    if (answered.has(q.id)) continue;
    for (const mue of jeu.mues) {
      let best = 0;
      for (const opt of q.options) {
        const w = opt.poids[mue.id] ?? 0;
        if (w > best) best = w;
      }
      maxRemaining.set(mue.id, (maxRemaining.get(mue.id) ?? 0) + best);
    }
  }

  return jeu.mues.map((mue) => {
    const score = scoreById.get(mue.id) ?? 0;
    const ceiling = score + (maxRemaining.get(mue.id) ?? 0);
    const eligible = !hasAnswers || ceiling >= leader;
    return { mue, score, eligible };
  });
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
