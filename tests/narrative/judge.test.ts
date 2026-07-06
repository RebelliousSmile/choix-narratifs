// Épreuve du juge sémantique canon-free (#39, Phase 2) : seule l'interface +
// le stub existent à ce stade (HttpJudge arrive en Phase 3). On verrouille ici
// que le stub ne rejette jamais rien, quel que soit le paquet ou les candidats.

import { describe, it, expect } from 'vitest';
import { StubJudge } from '../../src/scripts/narrative/stub-judge';
import { resolveJudge } from '../../src/scripts/narrative/runtime-config';
import type { ScenePacket } from '../../src/scripts/narrative/types';
import prepareFixture from './fixtures/prepare.json';

describe('StubJudge', () => {
  const { packet } = prepareFixture as unknown as { packet: ScenePacket };

  it('ne rejette jamais rien, quel que soit le nombre de candidats', async () => {
    const verdicts = await new StubJudge().judge(packet, ['a', 'b', 'c']);
    expect(verdicts).toEqual([null, null, null]);
  });

  it('renvoie un tableau vide pour zéro candidat', async () => {
    expect(await new StubJudge().judge(packet, [])).toEqual([]);
  });
});

describe('résolution du juge (#39, Phase 2)', () => {
  it('résout toujours le stub — HttpJudge arrive en Phase 3', () => {
    expect(resolveJudge().mode).toBe('stub');
  });
});
