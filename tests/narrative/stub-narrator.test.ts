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
