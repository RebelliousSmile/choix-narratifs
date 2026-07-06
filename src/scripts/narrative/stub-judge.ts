// Juge de démo (sans Hub), miroir de `StubNarrator` (#39, Phase 2).
//
// Repli déterministe tant que `PUBLIC_JUDGE_ENDPOINT` n'est pas configuré : ne
// rejette jamais rien. La boucle continue de compter sur le seul filet lexical
// (`resolve()`, côté Rust) jusqu'au câblage de la passe sémantique en Phase 3.

import type { Judge, JudgeRejet } from './judge';
import type { ScenePacket } from './types';

export class StubJudge implements Judge {
  async judge(_packet: ScenePacket, candidates: string[]): Promise<Array<JudgeRejet | null>> {
    return candidates.map(() => null);
  }
}
