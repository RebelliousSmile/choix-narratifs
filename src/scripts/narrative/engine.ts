// La façade que `WasmEngine` (cn-wasm) implémente, vue de l'hôte TS. Découplée
// du WASM : la boucle (session.ts) ne dépend que de cette interface, ce qui la
// rend testable avec un double sans navigateur ni .wasm.
//
// Le moteur narratif est un PRODUIT SÉPARÉ des outils v1 (cartes, plan de classe,
// mues, parallaxe) : il n'utilise ni `storage.ts` ni leurs conventions.

import type { Outcome, Prepared } from './types';

export interface NarrativeEngine {
  /** Directeur → paquet canon-free. Renvoie le JSON de `Prepared`. */
  prepare(action: string): string;
  /** Verifier → tri des candidats. Renvoie le JSON de `Outcome`. */
  resolve(candidates: string[]): string;
  /** Sérialise l'état pour persistance (octets opaques). */
  snapshot(): Uint8Array;
  /** Ce que le joueur sait à cet instant. */
  savoirJoueur(): string[];
}

export function parsePrepared(json: string): Prepared {
  return JSON.parse(json) as Prepared;
}

export function parseOutcome(json: string): Outcome {
  return JSON.parse(json) as Outcome;
}
