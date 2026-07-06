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
// Phase 2 (#39) : seule l'interface + le stub existent ici. `HttpJudge` (contre
// un vrai endpoint `/judge`) arrive en Phase 3, quand la passe async est câblée
// dans `session.ts` entre `narrate` et `resolve`.

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
