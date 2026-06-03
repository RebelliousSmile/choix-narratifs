// Doubles de test pour éprouver l'orchestration (session.ts) SANS WASM.
//
// `FakeEngine` n'est pas un second moteur : c'est un double fidèle qui reproduit
// la FORME du contrat (mêmes JSON que cn-wasm) et une règle de verifier minimale
// (fuite « verain » / contradiction / move « quitté le quai »), pour que la
// boucle voie de vrais Commit / ResampleNeeded. La vraie logique est testée en
// Rust ; ici on teste le câblage TS.

import type { NarrativeEngine } from '../../src/scripts/narrative/engine';
import type { Narrator } from '../../src/scripts/narrative/narrator';
import type { Outcome, Prepared, Rejet, ScenePacket } from '../../src/scripts/narrative/types';

const PACKET: ScenePacket = {
  schema_version: 1,
  cadre: { lieu: 'le quai, à la nuit tombée', ambiance: 'pluie fine', presents: [] },
  locuteur: { nom: 'le docker', voix: 'bourru, phrases courtes' },
  action_joueur: '',
  hearing: 'menace sur le secret',
  move: 'se détourne, lâche 1 fait mineur',
  revealable: ['la cargaison a quitté le quai'],
  withhold: ['qui a payé'],
  form: {
    registre: 'sec',
    budget_revelation: 1,
    ratio: 'non_verbal_dominant',
    interdit_shape: ['liste_descripteurs', 'monologue'],
  },
};

const FAIT = 'la cargaison a quitté le quai';

export class FakeEngine implements NarrativeEngine {
  private revealed: string[];

  constructor(initial: string[] = []) {
    this.revealed = [...initial];
  }

  static fromSnapshot(bytes: Uint8Array): FakeEngine {
    const revealed = JSON.parse(new TextDecoder().decode(bytes)) as string[];
    return new FakeEngine(revealed);
  }

  prepare(action: string): string {
    const prepared: Prepared = { packet: { ...PACKET, action_joueur: action }, n: 3 };
    return JSON.stringify(prepared);
  }

  resolve(candidates: string[]): string {
    const rejets: Array<[number, Rejet]> = [];
    let winner = -1;

    candidates.forEach((c, i) => {
      const low = c.toLowerCase();
      if (low.includes('verain')) {
        rejets.push([i, { type: 'fuite', detail: 'verain' }]);
      } else if (low.includes('toujours sur le quai')) {
        rejets.push([i, { type: 'contradiction', detail: 'toujours sur le quai' }]);
      } else if (!low.includes('quitté le quai') && !low.includes('partie')) {
        rejets.push([i, { type: 'move_non_execute' }]);
      } else if (winner < 0) {
        winner = i;
      }
    });

    if (winner >= 0) {
      const diff = this.revealed.includes(FAIT) ? [] : [FAIT];
      this.revealed.push(...diff);
      const outcome: Outcome = {
        outcome: 'commit',
        index: winner,
        candidat: candidates[winner],
        diff,
      };
      return JSON.stringify(outcome);
    }

    const outcome: Outcome = { outcome: 'resample_needed', rejets };
    return JSON.stringify(outcome);
  }

  snapshot(): Uint8Array {
    return new TextEncoder().encode(JSON.stringify(this.revealed));
  }

  savoirJoueur(): string[] {
    return [...this.revealed];
  }
}

/** Narrateur scripté : renvoie les batches dans l'ordre ; mémorise les appels. */
export class ScriptedNarrator implements Narrator {
  readonly calls: Array<{ packetJson: string; n: number }> = [];

  constructor(private batches: string[][]) {}

  async narrate(packetJson: string, n: number): Promise<string[]> {
    this.calls.push({ packetJson, n });
    return this.batches.shift() ?? [];
  }
}
