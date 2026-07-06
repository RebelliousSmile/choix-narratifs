// Éprouve la boucle hôte (session.ts) avec des doubles : fuyard écarté, resample
// invisible, épuisement, reprise de session. Pas de WASM, pas de navigateur.

import { describe, it, expect } from 'vitest';

import { runTurn, resume, ResampleExhausted } from '../../src/scripts/narrative/session';
import { MemorySnapshotStore } from '../../src/scripts/narrative/snapshot-store';
import { FakeEngine, ScriptedNarrator, ScriptedJudge } from './doubles';

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

describe('runTurn — juge sémantique (#39, Phase 3)', () => {
  it('le juge ne délègue jamais la fuite : le filet lexical écarte quand même le fuyard qu’il approuve', async () => {
    const engine = new FakeEngine();
    const narrator = new ScriptedNarrator([
      [
        'Le docker grogne : « Verain a payé. »', // fuyard lexical
        'Il se détourne. « Partie, elle a quitté le quai. »',
      ],
    ]);
    const judge = new ScriptedJudge([[null, null]]); // le juge n'objecte rien

    const res = await runTurn(engine, narrator, null, 'Où est la cargaison ?', { judge });

    expect(res.commit.index).toBe(1);
    expect(judge.calls[0].candidates).toHaveLength(2);
    // le juge ne reçoit jamais le canon (paquet canon-free par construction)
    expect(JSON.stringify(judge.calls[0].packet)).not.toContain('secret_reponse');
    expect(JSON.stringify(judge.calls[0].packet)).not.toContain('jetons_fuite');
  });

  it('remonte l’index original quand le juge filtre un candidat avant resolve()', async () => {
    const engine = new FakeEngine();
    const narrator = new ScriptedNarrator([
      [
        'Il ricane, mais ne dit rien d’utile.', // survit au juge, écarté par resolve() (move_non_execute)
        'Il dit : la cargaison est toujours sur le quai.', // écarté par le juge (contradiction sémantique)
        'Il se détourne. Elle a quitté le quai.', // gagnant
      ],
    ]);
    const judge = new ScriptedJudge([
      [null, { type: 'contradiction', detail: 'toujours sur le quai' }, null],
    ]);

    const res = await runTurn(engine, narrator, null, 'Qui a payé ?!', { judge });

    // index du batch ORIGINAL (2), pas de celui des survivants (survivor-index 1)
    expect(res.commit.index).toBe(2);
    expect(res.resamples).toBe(0);
  });

  it('le juge écarte tout le batch : resample sans solliciter resolve(), même paquet re-soumis', async () => {
    const engine = new FakeEngine();
    const narrator = new ScriptedNarrator([
      ['Il dit : la cargaison est toujours sur le quai.', 'Il sourit, ne bronche pas.'],
      ['Il se détourne. Elle a quitté le quai.'],
    ]);
    const judge = new ScriptedJudge([
      [{ type: 'contradiction', detail: 'toujours sur le quai' }, { type: 'move_non_execute' }],
      [null],
    ]);

    const res = await runTurn(engine, narrator, null, 'Qui ?', { judge });

    expect(res.resamples).toBe(1);
    expect(narrator.calls).toHaveLength(2);
    expect(narrator.calls[0].packetJson).toBe(narrator.calls[1].packetJson);
  });

  it('ResampleExhausted expose les rejets sémantiques avec la forme Rejet inchangée, en index original', async () => {
    const engine = new FakeEngine();
    const batchRejete = ['Il dit : la cargaison est toujours sur le quai.'];
    const narrator = new ScriptedNarrator([batchRejete, batchRejete, batchRejete]);
    const rejetAttendu = { type: 'contradiction' as const, detail: 'toujours sur le quai' };
    const judge = new ScriptedJudge([[rejetAttendu], [rejetAttendu], [rejetAttendu]]);

    const err = await runTurn(engine, narrator, null, 'Qui ?', { judge, maxResamples: 2 }).catch(
      (e: unknown) => e,
    );

    expect(err).toBeInstanceOf(ResampleExhausted);
    expect((err as ResampleExhausted).derniersRejets).toEqual([[0, rejetAttendu]]);
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
