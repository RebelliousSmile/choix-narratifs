// Garde-fou d'alignement TS ↔ Rust : on parse de VRAIES sorties du moteur
// (fixtures émises par `cargo run -p cn-core --example emit_contract`) avec les
// types TS. Si la forme Rust change, ces tests cassent.

import { describe, it, expect } from 'vitest';

// Import JSON direct (resolveJsonModule, déjà utilisé dans le projet) : pas de
// node:fs, donc typecheck sans @types/node. Ces fichiers sont émis par Rust.
import prepareFixture from './fixtures/prepare.json';
import commitFixture from './fixtures/resolve_commit.json';
import resampleFixture from './fixtures/resolve_resample.json';

import type { Outcome, Prepared } from '../../src/scripts/narrative/types';

describe('contrat TS ↔ Rust (fixtures réelles)', () => {
  it('prepare.json a la forme Prepared et reste canon-free', () => {
    const prep = prepareFixture as unknown as Prepared;
    expect(prep.n).toBe(3);
    expect(prep.packet.schema_version).toBe(1);
    // clé JSON "move" (rename serde), pas "mouvement"
    expect(typeof prep.packet.move).toBe('string');
    expect(prep.packet.withhold).toEqual(['qui a payé']);
    // aucun secret ne transite
    expect(JSON.stringify(prep)).not.toContain('Verain');
    // les enums voyagent en snake_case
    expect(prep.packet.form.ratio).toBe('non_verbal_dominant');
  });

  it('resolve_commit.json est un Commit discriminé', () => {
    const out = commitFixture as unknown as Outcome;
    expect(out.outcome).toBe('commit');
    if (out.outcome === 'commit') {
      expect(out.index).toBe(1); // le fuyard #0 écarté
      expect(out.diff).toEqual(['la cargaison a quitté le quai']);
    }
  });

  it('resolve_resample.json est un ResampleNeeded avec rejets typés', () => {
    const out = resampleFixture as unknown as Outcome;
    expect(out.outcome).toBe('resample_needed');
    if (out.outcome === 'resample_needed') {
      expect(out.rejets).toHaveLength(3);
      // tuples [index, Rejet]
      expect(out.rejets[0][0]).toBe(0);
      expect(out.rejets[0][1].type).toBe('fuite');
      expect(out.rejets[1][1].type).toBe('contradiction');
      expect(out.rejets[2][1].type).toBe('move_non_execute');
    }
  });
});
