// Éprouve le VRAI chemin IndexedDB (IdbSnapshotStore) sous jsdom via fake-indexeddb.
// jsdom n'implémente pas IndexedDB : `fake-indexeddb/auto` installe les globals.

import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';

import { IdbSnapshotStore } from '../../src/scripts/narrative/snapshot-store';

describe('IdbSnapshotStore (IndexedDB réel via fake-indexeddb)', () => {
  let store: IdbSnapshotStore;

  beforeEach(() => {
    store = new IdbSnapshotStore();
  });

  it('round-trip : save puis load rend les mêmes octets', async () => {
    const bytes = new Uint8Array([1, 2, 3, 250, 0, 99]);
    await store.save('sess-a', bytes);
    const loaded = await store.load('sess-a');
    expect(loaded).not.toBeNull();
    expect(Array.from(loaded!)).toEqual(Array.from(bytes));
  });

  it('load rend null pour une session inconnue', async () => {
    expect(await store.load('jamais-vu')).toBeNull();
  });

  it('save écrase la valeur précédente', async () => {
    await store.save('sess-b', new Uint8Array([1]));
    await store.save('sess-b', new Uint8Array([9, 9]));
    const loaded = await store.load('sess-b');
    expect(Array.from(loaded!)).toEqual([9, 9]);
  });

  it('clear supprime le snapshot', async () => {
    await store.save('sess-c', new Uint8Array([7]));
    await store.clear('sess-c');
    expect(await store.load('sess-c')).toBeNull();
  });

  it('isole les sessions par clé', async () => {
    await store.save('s1', new Uint8Array([1]));
    await store.save('s2', new Uint8Array([2]));
    expect(Array.from((await store.load('s1'))!)).toEqual([1]);
    expect(Array.from((await store.load('s2'))!)).toEqual([2]);
  });

  it('ne tronque pas une vue Uint8Array sur un buffer plus grand', async () => {
    // Simule la mémoire WASM : une vue sur une fenêtre d'un buffer.
    const big = new Uint8Array([0, 0, 42, 43, 44, 0]);
    const view = big.subarray(2, 5); // [42,43,44]
    await store.save('sess-view', view);
    const loaded = await store.load('sess-view');
    expect(Array.from(loaded!)).toEqual([42, 43, 44]);
  });
});
