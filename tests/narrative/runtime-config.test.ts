// Épreuve des coutures externes : HTTP (narrateur/publieur) + résolution par config.
// Sans endpoint configuré → repli sur les stubs (démo). Avec → implémentations HTTP.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { HttpNarrator } from '../../src/scripts/narrative/narrator';
import { HttpPublisher, type CompteRendu } from '../../src/scripts/narrative/export';
import { resolveNarrator, resolvePublisher } from '../../src/scripts/narrative/runtime-config';

const cr: CompteRendu = {
  scene: { lieu: 'X', ambiance: null, pnj_nom: 'P', pnj_voix: 'v' },
  echanges: [],
  faits_appris: [],
  resolutions: [],
};

describe('HttpNarrator', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('poste { packet, n } et renvoie les candidats', async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ candidates: ['a', 'b'] }), { status: 200 }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const out = await new HttpNarrator('https://hub.test/narrate', 'tok').narrate('{"x":1}', 2);

    expect(out).toEqual(['a', 'b']);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://hub.test/narrate');
    expect(init.headers).toMatchObject({ authorization: 'Bearer tok' });
    expect(init.body).toContain('"packet"');
  });

  it('lève sur statut non-ok', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 500 })));
    await expect(new HttpNarrator('https://hub.test', 't').narrate('{}', 1)).rejects.toThrow(/500/);
  });
});

describe('HttpPublisher', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('poste le compte rendu et renvoie l’URL', async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ url: 'https://suddenly.test/r/42' }), { status: 200 }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const ref = await new HttpPublisher('https://suddenly.test/publish', 'tok').publish(cr, '# md');

    expect(ref).toBe('https://suddenly.test/r/42');
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(init.body).toContain('"compte_rendu"');
  });

  it('lève sur statut non-ok', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 403 })));
    await expect(new HttpPublisher('https://x', 't').publish(cr, '')).rejects.toThrow(/403/);
  });
});

describe('résolution par config', () => {
  beforeEach(() => {
    try {
      globalThis.localStorage?.removeItem('cn-hub-token');
    } catch {
      /* pas de localStorage */
    }
  });

  it('sans endpoint → narrateur stub', () => {
    expect(resolveNarrator().mode).toBe('stub');
  });

  it('sans endpoint → publieur download', () => {
    expect(resolvePublisher().mode).toBe('download');
  });
});
