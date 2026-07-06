// Le juge sémantique canon-free (#39) — cf. ADR
// `aidd_docs/decisions/2026_07-verifier-judge-placement.md` (option A retenue).
//
// Contrairement au narrateur, le juge ne reçoit JAMAIS le canon : seulement le
// paquet de scène (déjà canon-free par construction, cf. `packet.rs`) et les
// candidats de prose déjà générés. Il ne peut rendre que les deux verdicts qui
// n'ont pas besoin du secret pour être jugés par le sens : `Contradiction` et
// `MoveNonExecute`. La fuite reste le filet lexical **autoritaire**, coupé
// canon-aware et synchrone dans `resolve()` (Rust) — le juge ne la voit jamais
// et ne peut donc jamais la rendre : le mur ne bouge pas.
//
// Phase 3 (#39) : `HttpJudge` câble un vrai endpoint `/judge`, frère de
// `/narrate` — même contrat d'erreur relais (cf. `NARRATE_ERROR_CODES`,
// `parseRelayErrorBody` dans `narrator.ts`), jamais le canon dans la requête.

import { NARRATE_ERROR_CODES, parseRelayErrorBody } from './narrator';
import type { Rejet, ScenePacket } from './types';

/** Verdict que le juge peut rendre — jamais `fuite` (cf. commentaire de module). */
export type JudgeRejet = Extract<Rejet, { type: 'contradiction' } | { type: 'move_non_execute' }>;

export interface Judge {
  /**
   * Juge chaque candidat, dans l'ordre. Ne reçoit que `packet` (canon-free) et
   * les candidats de prose — jamais le canon. `null` = rien à objecter
   * sémantiquement pour ce candidat.
   */
  judge(packet: ScenePacket, candidates: string[]): Promise<Array<JudgeRejet | null>>;
}

/** Même jeu de codes que `/narrate` (contrat relais partagé, cf. `narrator.ts`). */
export type JudgeErrorCode =
  | 'unauthorized'
  | 'quota_exhausted'
  | 'bad_request'
  | 'schema_incompatible'
  | 'provider_error';

/** Erreur typée du relais `/judge` : miroir de `NarrateHttpError` (cf. `narrator.ts`). */
export class JudgeHttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: JudgeErrorCode,
    readonly detail: string,
    readonly retriable: boolean,
  ) {
    super(`Relais /judge [${code}] (HTTP ${status}) : ${detail}`);
    this.name = 'JudgeHttpError';
  }
}

/** Lit le corps d'erreur ; retombe sur une Error générique si non conforme au contrat. */
async function readJudgeError(res: Response): Promise<Error> {
  const body = await parseRelayErrorBody(res);
  if (body && typeof body.error === 'string' && NARRATE_ERROR_CODES.has(body.error)) {
    return new JudgeHttpError(res.status, body.error as JudgeErrorCode, body.detail ?? '', body.retriable ?? false);
  }
  return new Error(`Relais /judge: HTTP ${res.status}`);
}

/**
 * Implémentation HTTP du juge (#39, Phase 3). Canon-free par construction :
 * l'enveloppe envoyée (`{ packet, candidates }`) ne contient jamais le canon,
 * `packet` étant déjà canon-free par construction (cf. `packet.rs`).
 */
export class HttpJudge implements Judge {
  constructor(
    private endpoint: string,
    private token: string,
  ) {}

  async judge(packet: ScenePacket, candidates: string[]): Promise<Array<JudgeRejet | null>> {
    const res = await fetch(this.endpoint, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${this.token}`,
      },
      body: JSON.stringify({ packet, candidates }),
    });
    if (!res.ok) {
      throw await readJudgeError(res);
    }
    const data = (await res.json()) as { verdicts: Array<JudgeRejet | null> };
    return data.verdicts;
  }
}
