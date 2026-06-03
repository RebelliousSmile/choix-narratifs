// Épreuve du contrat de données runtime émis par le moteur (les « possibles »,
// façon template.json Foundry). Source de vérité = generated/contract.json.

import { describe, it, expect } from 'vitest';
import {
  CONTRACT,
  PACKET_SCHEMA_VERSION,
  N_MIN,
  N_MAX,
  MOVES,
  REGISTRES,
} from '../../src/scripts/narrative/contract';
import prepareFixture from './fixtures/prepare.json';

describe('contrat runtime (possibles émis par le moteur)', () => {
  it('la version vient du moteur et suit la fixture Rust', () => {
    expect(PACKET_SCHEMA_VERSION).toBe(
      (prepareFixture as { packet: { schema_version: number } }).packet.schema_version,
    );
  });

  it('expose les bornes du best-of-N', () => {
    expect(N_MIN).toBe(1);
    expect(N_MAX).toBe(5);
  });

  it('expose le catalogue de gestes (agnostique)', () => {
    expect(MOVES.length).toBeGreaterThanOrEqual(6);
    const ids = MOVES.map((m) => m.id);
    expect(ids).toContain('se_fermer');
    expect(ids).toContain('conceder');
    // agnostique : aucun id de move n'est du jargon de système.
    for (const m of MOVES) {
      expect(m.id).not.toMatch(/playbook|pbta|stat|roll/i);
      expect(m.libelle.length).toBeGreaterThan(0);
    }
  });

  it('expose les domaines d’enums pour data-driver l’UI', () => {
    expect(REGISTRES).toContain('sec');
    expect(CONTRACT.ratios).toContain('non_verbal_dominant');
    expect(CONTRACT.shapes).toContain('monologue');
    expect(CONTRACT.decisions).toEqual(['reveler', 'retirer']);
    expect(CONTRACT.rejets).toContain('move_non_execute');
    expect(CONTRACT.outcomes).toEqual(['commit', 'resample_needed']);
  });
});
