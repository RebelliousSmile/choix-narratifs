import { describe, it, expect } from 'vitest';
import { exportData, importData, saveData, loadData, clearData } from '../src/scripts/storage';

describe('storage', () => {
  // Lit un Blob via FileReader : le Blob de jsdom n'expose pas .text().
  function readBlob(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsText(blob);
    });
  }

  it('exporte une enveloppe avec schemaVersion et tool', async () => {
    const blob = exportData({ hello: 'world' });
    const text = await readBlob(blob);
    const parsed = JSON.parse(text);
    expect(parsed.schemaVersion).toBe(1);
    expect(parsed.tool).toBe('choix-narratifs');
    expect(parsed.data).toEqual({ hello: 'world' });
  });

  it('sauvegarde et recharge des donnees', () => {
    saveData('cle', { a: 1 });
    const loaded = loadData<{ a: number }>('cle');
    expect(loaded).toEqual({ a: 1 });
  });

  it('clearData supprime la cle', () => {
    saveData('cle', { a: 1 });
    clearData('cle');
    expect(loadData('cle')).toBeNull();
  });

  it('importe une enveloppe exportee (round-trip)', async () => {
    const blob = exportData({ x: 42 });
    const result = await importData<{ x: number }>(blob);
    expect(result).toEqual({ x: 42 });
  });

  it('importData rejette un JSON corrompu', async () => {
    const badBlob = new Blob(['pas du json'], { type: 'application/json' });
    await expect(importData(badBlob)).rejects.toThrow();
  });

  it('importData rejette une enveloppe invalide', async () => {
    const badBlob = new Blob([JSON.stringify({ foo: 'bar' })], {
      type: 'application/json',
    });
    await expect(importData(badBlob)).rejects.toThrow();
  });
});
