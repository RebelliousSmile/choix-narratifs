// Épreuve du StubNarrator : vérifier que les réponses générées passent le
// verifier (via FakeEngine) et respectent le contrat du paquet.

import { describe, it, expect } from 'vitest';
import { StubNarrator } from '../../src/scripts/narrative/stub-narrator';
import { FakeEngine } from './doubles';

describe('StubNarrator', () => {
  it('retourne exactement n candidats', async () => {
    const narrator = new StubNarrator();
    const engine = new FakeEngine();
    const { packet, n } = JSON.parse(engine.prepare('action')) as { packet: unknown; n: number };

    const candidates = await narrator.narrate(JSON.stringify(packet), n);

    expect(candidates).toHaveLength(n);
  });

  it('tous les candidats passent le verifier (FakeEngine)', async () => {
    const narrator = new StubNarrator();
    const engine = new FakeEngine();
    const { packet, n } = JSON.parse(engine.prepare('qui a payé ?')) as {
      packet: unknown;
      n: number;
    };

    const candidates = await narrator.narrate(JSON.stringify(packet), n);
    const outcome = JSON.parse(engine.resolve(candidates)) as { outcome: string };

    expect(outcome.outcome).toBe('commit');
  });

  it('ne mentionne jamais withhold ("qui a payé")', async () => {
    const narrator = new StubNarrator();
    const engine = new FakeEngine();
    const { packet } = JSON.parse(engine.prepare('action')) as { packet: unknown };

    const candidates = await narrator.narrate(JSON.stringify(packet), 5);

    for (const c of candidates) {
      expect(c.toLowerCase()).not.toContain('qui a payé');
    }
  });

  it('ne mentionne jamais le secret ("verain")', async () => {
    const narrator = new StubNarrator();
    const engine = new FakeEngine();
    const { packet } = JSON.parse(engine.prepare('action')) as { packet: unknown };

    const candidates = await narrator.narrate(JSON.stringify(packet), 5);

    for (const c of candidates) {
      expect(c.toLowerCase()).not.toContain('verain');
    }
  });

  it('varie la réponse retenue (index 0) d’un tour à l’autre', async () => {
    const narrator = new StubNarrator();
    const engine = new FakeEngine();
    const { packet, n } = JSON.parse(engine.prepare('action')) as { packet: unknown; n: number };
    const pj = JSON.stringify(packet);

    const t1 = (await narrator.narrate(pj, n))[0];
    const t2 = (await narrator.narrate(pj, n))[0];
    const t3 = (await narrator.narrate(pj, n))[0];

    // La forme retenue tourne : deux tours consécutifs ne sont pas identiques.
    expect(t1).not.toBe(t2);
    expect(t2).not.toBe(t3);
  });

  it('passe en registre « relance » quand le même fait est redemandé', async () => {
    const narrator = new StubNarrator();
    const engine = new FakeEngine();
    const { packet, n } = JSON.parse(engine.prepare('action')) as { packet: unknown; n: number };
    const pj = JSON.stringify(packet);

    const premier = (await narrator.narrate(pj, n))[0]; // aveu
    const relance = (await narrator.narrate(pj, n))[0]; // même fait → braquage

    // L'aveu ne se braque pas ; la relance, si (« je vous l'ai dit », « insister »…).
    expect(premier).not.toBe(relance);
    // Toujours valide : le fait révélable (donc un jeton de move) reste présent.
    expect(relance.toLowerCase()).toContain('quitté le quai');
  });

  it('reset() efface la mémoire inter-tours', async () => {
    const narrator = new StubNarrator();
    const engine = new FakeEngine();
    const { packet, n } = JSON.parse(engine.prepare('action')) as { packet: unknown; n: number };
    const pj = JSON.stringify(packet);

    const avant = (await narrator.narrate(pj, n))[0];
    narrator.reset();
    const apres = (await narrator.narrate(pj, n))[0];

    // Après reset, on retrouve le premier tour (même rotation, aveu et non relance).
    expect(apres).toBe(avant);
  });

  it('se replie sur move si revealable est vide', async () => {
    const narrator = new StubNarrator();
    const packetVide = {
      schema_version: 1,
      cadre: { lieu: 'lieu', presents: [] },
      locuteur: { nom: 'PNJ', voix: 'neutre' },
      action_joueur: 'action',
      hearing: 'demande anodine',
      move: 'se détourne',
      revealable: [],
      withhold: [],
      form: { registre: 'sec', budget_revelation: 0, ratio: 'equilibre', interdit_shape: [] },
    };

    const candidates = await narrator.narrate(JSON.stringify(packetVide), 2);

    expect(candidates).toHaveLength(2);
    for (const c of candidates) {
      expect(c.length).toBeGreaterThan(0);
    }
  });
});
