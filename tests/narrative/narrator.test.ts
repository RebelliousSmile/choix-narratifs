// Épreuve dédiée de HttpNarrator (issue #38) : les codes d'erreur typés du
// contrat Hub (`muses/narrate/contract/schema.json#NarrateError`) et le
// garde-fou de version de schéma (`assertCanonShape`). Le succès générique et
// la résolution stub/hub sont déjà couverts par `runtime-config.test.ts` —
// ici on couvre spécifiquement ce que #38 listait comme manquant.

import { describe, it, expect, vi, afterEach } from 'vitest';
import { HttpNarrator, NarrateHttpError, assertCanonShape } from '../../src/scripts/narrative/narrator';
import { PACKET_SCHEMA_VERSION } from '../../src/scripts/narrative/types';
import type { Prepared } from '../../src/scripts/narrative/types';
import prepareFixture from './fixtures/prepare.json';

function errorResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status });
}

describe('HttpNarrator — codes d’erreur typés du contrat Hub', () => {
  afterEach(() => vi.unstubAllGlobals());

  const cases: Array<{ status: number; code: string; retriable: boolean }> = [
    { status: 401, code: 'unauthorized', retriable: false },
    { status: 402, code: 'quota_exhausted', retriable: false },
    { status: 400, code: 'bad_request', retriable: false },
    { status: 409, code: 'schema_incompatible', retriable: false },
    { status: 502, code: 'provider_error', retriable: true },
  ];

  it.each(cases)(
    'mappe HTTP $status + { error: "$code" } sur NarrateHttpError',
    async ({ status, code, retriable }) => {
      vi.stubGlobal(
        'fetch',
        vi.fn(async () => errorResponse(status, { error: code, detail: 'motif', retriable })),
      );

      const narrator = new HttpNarrator('https://hub.test/narrate', 'tok');
      const err = await narrator.narrate('{}', 1).catch((e: unknown) => e);

      expect(err).toBeInstanceOf(NarrateHttpError);
      expect(err).toMatchObject({ status, code, detail: 'motif', retriable });
    },
  );

  it('retombe sur une Error générique si le corps ne suit pas le contrat (ex. 5xx proxy)', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('<html>Bad Gateway</html>', { status: 502 })));

    const narrator = new HttpNarrator('https://hub.test/narrate', 'tok');
    await expect(narrator.narrate('{}', 1)).rejects.toThrow(/HTTP 502/);
    await expect(narrator.narrate('{}', 1)).rejects.not.toBeInstanceOf(NarrateHttpError);
  });

  it('retombe sur une Error générique si `error` n’est pas un code connu du contrat', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => errorResponse(500, { error: 'oops_inconnu', detail: 'x' })),
    );

    const narrator = new HttpNarrator('https://hub.test/narrate', 'tok');
    await expect(narrator.narrate('{}', 1)).rejects.not.toBeInstanceOf(NarrateHttpError);
  });
});

describe('assertCanonShape', () => {
  const { packet } = prepareFixture as unknown as Prepared;

  it('ne lève pas sur un paquet à la version courante', () => {
    expect(packet.schema_version).toBe(PACKET_SCHEMA_VERSION);
    expect(() => assertCanonShape(packet)).not.toThrow();
  });

  it('lève sur une version de schéma incompatible', () => {
    expect(() => assertCanonShape({ ...packet, schema_version: PACKET_SCHEMA_VERSION + 1 })).toThrow(
      /schéma de paquet incompatible/,
    );
  });
});
