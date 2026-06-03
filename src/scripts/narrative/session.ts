// La boucle hôte (TS) du moteur narratif — l'orchestration que l'island pilotera.
// Découplée du WASM et du réseau : elle ne dépend que des interfaces
// `NarrativeEngine`, `Narrator`, `SnapshotStore`. C'est CE module qu'on éprouve
// avant de câbler la vraie page (le WASM/navigateur, lui, attend `pkg/`).
//
//   prepare → narrate(Hub) → resolve → resample si tous invalides (Mikado §6)
//           → snapshot persisté après commit.

import type { NarrativeEngine } from './engine';
import { parseOutcome, parsePrepared } from './engine';
import { assertCanonShape, type Narrator } from './narrator';
import type { SnapshotStore } from './snapshot-store';
import type { Prepared, Rejet } from './types';

export interface TurnCommit {
  index: number;
  candidat: string;
  diff: string[];
}

export interface TurnResult {
  prepared: Prepared;
  /** Nombre de resamples invisibles avant le commit (0 = passé du premier coup). */
  resamples: number;
  commit: TurnCommit;
}

export interface RunTurnOptions {
  /** Nombre max de resamples avant d'abandonner le beat (défaut 3). */
  maxResamples?: number;
  /** Si fourni avec un store, persiste le snapshot après commit. */
  sessionId?: string;
}

/** Levée quand tous les candidats échouent au-delà de `maxResamples`. */
export class ResampleExhausted extends Error {
  constructor(
    readonly action: string,
    readonly tentatives: number,
    readonly derniersRejets: Array<[number, Rejet]>,
  ) {
    super(
      `Resample épuisé après ${tentatives} tentative(s) pour « ${action} » : aucun candidat valide.`,
    );
    this.name = 'ResampleExhausted';
  }
}

/**
 * Déroule un tour complet. Le même paquet est re-soumis à chaque resample (le
 * beat reste ouvert côté moteur) ; le narrateur, lui, re-échantillonne.
 */
export async function runTurn(
  engine: NarrativeEngine,
  narrator: Narrator,
  store: SnapshotStore | null,
  action: string,
  opts: RunTurnOptions = {},
): Promise<TurnResult> {
  const maxResamples = opts.maxResamples ?? 3;

  const prepared = parsePrepared(engine.prepare(action));
  assertCanonShape(prepared.packet);
  const packetJson = JSON.stringify(prepared.packet);

  let resamples = 0;
  for (;;) {
    const candidates = await narrator.narrate(packetJson, prepared.n);
    const outcome = parseOutcome(engine.resolve(candidates));

    if (outcome.outcome === 'commit') {
      if (store && opts.sessionId) {
        await store.save(opts.sessionId, engine.snapshot());
      }
      return {
        prepared,
        resamples,
        commit: {
          index: outcome.index,
          candidat: outcome.candidat,
          diff: outcome.diff,
        },
      };
    }

    // resample_needed : tous écartés.
    if (resamples >= maxResamples) {
      throw new ResampleExhausted(action, resamples + 1, outcome.rejets);
    }
    resamples++;
  }
}

/**
 * Reprise de session : recharge le snapshot s'il existe, sinon démarre frais.
 * `fromSnapshot`/`fresh` produisent un moteur (en prod : `WasmEngine.fromSnapshot`
 * vs `new WasmEngine()`).
 */
export async function resume<E extends NarrativeEngine>(
  store: SnapshotStore,
  sessionId: string,
  fromSnapshot: (bytes: Uint8Array) => E,
  fresh: () => E,
): Promise<E> {
  const bytes = await store.load(sessionId);
  return bytes ? fromSnapshot(bytes) : fresh();
}
