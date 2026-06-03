// Couches de contexte du vault (univers / campagne / système) au-dessus d'une scène.
//
// POURQUOI : un secret n'est cohérent que dans un monde (univers), des règles
// (système) et des fils rouges (campagne). Le vault `rpg-writer` est la source de
// vérité de ces couches (cf. aidd_docs/memory/external + vault-layout). Ici, on en
// modélise la part que le moteur consomme : des FAITS partagés qui doivent tenir.
//
// COMPOSITION CÔTÉ CLIENT : le moteur Rust n'ingère qu'un `SceneSpec` plat (contrat
// stable). `composeScene` replie les faits hérités (univers + campagne) dans le
// SceneSpec AVANT de jouer. Les modules plats (sans contexte) restent valides tels quels.

import type { SceneSpec } from './scene-spec';

/** Univers : environnement global. Ses faits sont vrais pour toute scène qui s'y déroule. */
export interface Univers {
  id: string;
  nom: string;
  faits_etablis: string[];
  jetons_contradiction: string[];
}

/** Campagne : fils rouges. Faits partagés entre les scènes d'une même intrigue. */
export interface Campagne {
  id: string;
  nom: string;
  faits_etablis: string[];
  jetons_contradiction: string[];
}

/**
 * Système : les règles du jeu. RAIL POSÉ, PAS ENCORE APPLIQUÉ. À terme, le système
 * deviendra une contrainte sur les moves du directeur (décision FX). Aujourd'hui, il
 * est porté pour l'affichage/traçabilité mais n'entre pas dans la résolution.
 */
export interface Systeme {
  id: string;
  nom: string;
}

/** Le contexte d'un module : les couches du vault dont la scène hérite. */
export interface Contexte {
  univers?: Univers;
  campagne?: Campagne;
  /** Porté mais non encore enforced (cf. Systeme). */
  systeme?: Systeme;
}

/** Concatène en dédupliquant, ordre préservé (hérité d'abord, scène ensuite). */
function fusionner(...listes: string[][]): string[] {
  const vu = new Set<string>();
  const out: string[] = [];
  for (const liste of listes) {
    for (const item of liste) {
      const v = item.trim();
      if (v && !vu.has(v)) {
        vu.add(v);
        out.push(v);
      }
    }
  }
  return out;
}

/**
 * Replie le contexte (univers + campagne) dans le SceneSpec : les faits du monde et
 * de la campagne s'ajoutent aux faits de la scène. No-op si `contexte` est absent —
 * les modules plats traversent inchangés. Le `systeme` n'est PAS replié (pas encore
 * une entrée du moteur).
 */
export function composeScene(spec: SceneSpec, contexte?: Contexte): SceneSpec {
  if (!contexte) return spec;
  const sources = [contexte.univers, contexte.campagne].filter(
    (c): c is Univers | Campagne => c !== undefined,
  );
  if (sources.length === 0) return spec;
  return {
    ...spec,
    faits_etablis: fusionner(
      ...sources.map((s) => s.faits_etablis),
      spec.faits_etablis,
    ),
    jetons_contradiction: fusionner(
      ...sources.map((s) => s.jetons_contradiction),
      spec.jetons_contradiction,
    ),
  };
}
