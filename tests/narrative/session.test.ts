// Éprouve la boucle hôte (session.ts) avec des doubles : fuyard écarté, resample
// invisible, épuisement, reprise de session. Pas de WASM, pas de navigateur.

import { describe, it, expect } from 'vitest';

import { runTurn, resume, ResampleExhausted } from '../../src/scripts/narrative/session';
import { MemorySnapshotStore } from '../../src/scripts/narrative/snapshot-store';
import { FakeEngine, ScriptedNarrator } from './doubles';

describe('runTurn — la boucle juste', () => {
  it('écarte le fuyard et commite le candidat valide', async () => {
    const engine = new FakeEngine();
    const narrator = new ScriptedNarrator([
      [
        'Le docker grogne : « Verain a payé. »', // fuyard
        'Il se détourne. « La cargaison ? Partie, elle a quitté le quai. »',
      ],
    ]);

    const res = await runTurn(engine, narrator, null, 'Où est la cargaison ?');

    expect(res.resamples).toBe(0);
    expect(res.commit.index).toBe(1);
    expect(res.commit.diff).toEqual(['la cargaison a quitté le quai']);
    // le narrateur n'a JAMAIS reçu le secret
    expect(narrator.calls[0].packetJson).not.toContain('Verain');
    expect(narrator.calls[0].n).toBe(3);
  });

  it('resample invisible quand tous les candidats sont invalides, puis commit', async () => {
    const engine = new FakeEngine();
    const narrator = new ScriptedNarrator([
      // batch 0 : fuite, contradiction, move non exécuté → tous écartés
      [
        'Il ricane : « Verain. »',
        'Il hausse les épaules : « toujours sur le quai. »',
        'Il sourit, serein, et ne bronche pas.',
      ],
      // batch 1 (resample) : un valide
      ['Il détourne les yeux. « Elle a quitté le quai, c\'est tout. »'],
    ]);

    const res = await runTurn(engine, narrator, null, 'Qui a payé ?!');

    expect(res.resamples).toBe(1);
    expect(res.commit.candidat).toContain('quitté le quai');
    // même paquet re-soumis au resample (beat ouvert) ; narrateur re-échantillonne
    expect(narrator.calls).toHaveLength(2);
    expect(narrator.calls[0].packetJson).toBe(narrator.calls[1].packetJson);
  });

  it('abandonne après maxResamples si tout reste invalide', async () => {
    const engine = new FakeEngine();
    const invalide = ['Il sourit, serein, et ne bronche pas.'];
    const narrator = new ScriptedNarrator([invalide, invalide, invalide, invalide]);

    await expect(
      runTurn(engine, narrator, null, 'Qui ?', { maxResamples: 2 }),
    ).rejects.toBeInstanceOf(ResampleExhausted);
    // 1 essai initial + 2 resamples = 3 appels
    expect(narrator.calls).toHaveLength(3);
  });

  it('persiste le snapshot après commit quand un store + sessionId sont fournis', async () => {
    const engine = new FakeEngine();
    const store = new MemorySnapshotStore();
    const narrator = new ScriptedNarrator([
      ['Il se détourne. « Partie, elle a quitté le quai. »'],
    ]);

    await runTurn(engine, narrator, store, 'Où ?', { sessionId: 's1' });

    const bytes = await store.load('s1');
    expect(bytes).not.toBeNull();
  });
});

describe('resume — reprise de session', () => {
  it('repart frais quand aucun snapshot', async () => {
    const store = new MemorySnapshotStore();
    const engine = await resume(
      store,
      'absent',
      FakeEngine.fromSnapshot,
      () => new FakeEngine(),
    );
    expect(engine.savoirJoueur()).toEqual([]);
  });

  it('reprend le savoir depuis le snapshot persisté', async () => {
    const store = new MemorySnapshotStore();
    const engine = new FakeEngine();
    const narrator = new ScriptedNarrator([
      ['Il se détourne. « Partie, elle a quitté le quai. »'],
    ]);
    await runTurn(engine, narrator, store, 'Où ?', { sessionId: 's2' });

    const repris = await resume(
      store,
      's2',
      FakeEngine.fromSnapshot,
      () => new FakeEngine(),
    );
    expect(repris.savoirJoueur()).toEqual(['la cargaison a quitté le quai']);
  });
});
