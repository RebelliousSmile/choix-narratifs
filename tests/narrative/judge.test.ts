// Épreuve du juge sémantique canon-free (#39). Le stub ne rejette jamais rien
// (repli de démo, hors Hub) ; `HttpJudge` (Phase 3) poste `{ packet, candidates }`
// canon-free et lève une erreur typée sur statut non-ok.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { StubJudge } from '../../src/scripts/narrative/stub-judge';
import { HttpJudge, JudgeHttpError } from '../../src/scripts/narrative/judge';
import { resolveJudge } from '../../src/scripts/narrative/runtime-config';
import type { ScenePacket } from '../../src/scripts/narrative/types';
import prepareFixture from './fixtures/prepare.json';

const { packet } = prepareFixture as unknown as { packet: ScenePacket };

describe('StubJudge', () => {
  it('ne rejette jamais rien, quel que soit le nombre de candidats', async () => {
    const verdicts = await new StubJudge().judge(packet, ['a', 'b', 'c']);
    expect(verdicts).toEqual([null, null, null]);
  });

  it('renvoie un tableau vide pour zéro candidat', async () => {
    expect(await new StubJudge().judge(packet, [])).toEqual([]);
  });
});

describe('HttpJudge', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('poste { packet, candidates } canon-free et renvoie les verdicts', async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ verdicts: [null, { type: 'move_non_execute' }] }), { status: 200 }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const out = await new HttpJudge('https://hub.test/judge', 'tok').judge(packet, ['a', 'b']);

    expect(out).toEqual([null, { type: 'move_non_execute' }]);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://hub.test/judge');
    expect(init.headers).toMatchObject({ authorization: 'Bearer tok' });
    expect(init.body).not.toContain('secret_reponse');
    expect(init.body).not.toContain('jetons_fuite');
  });

  it('lève une JudgeHttpError typée sur statut non-ok conforme au contrat', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ error: 'quota_exhausted', detail: 'X', retriable: true }), { status: 429 })),
    );
    const err = await new HttpJudge('https://hub.test/judge', 't').judge(packet, ['a']).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(JudgeHttpError);
    expect(err).toMatchObject({ status: 429, code: 'quota_exhausted', retriable: true });
  });

  it('lève sur statut non-ok non conforme au contrat', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 500 })));
    await expect(new HttpJudge('https://hub.test/judge', 't').judge(packet, ['a'])).rejects.toThrow(/500/);
  });
});

describe('résolution du juge par config (#39, Phase 3)', () => {
  beforeEach(() => {
    try {
      globalThis.localStorage?.removeItem('cn-hub-token');
    } catch {
      /* pas de localStorage */
    }
  });

  afterEach(() => vi.unstubAllEnvs());

  it('sans endpoint → juge stub', () => {
    expect(resolveJudge().mode).toBe('stub');
  });

  it('endpoint posé mais jeton absent → stub-no-token', () => {
    vi.stubEnv('PUBLIC_JUDGE_ENDPOINT', 'https://hub.test/judge');
    expect(resolveJudge().mode).toBe('stub-no-token');
  });

  it('endpoint + jeton → juge hub', () => {
    vi.stubEnv('PUBLIC_JUDGE_ENDPOINT', 'https://hub.test/judge');
    globalThis.localStorage?.setItem('cn-hub-token', 'tok');
    expect(resolveJudge().mode).toBe('hub');
  });
});
