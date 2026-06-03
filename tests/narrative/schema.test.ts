// Épreuve du JSON Schema émis par le moteur (la « dpc » de validation agnostique).
// Garde-fou : le mur tient jusque dans le schéma publié (aucun type porteur de canon).

import { describe, it, expect } from 'vitest';
import schema from '../../src/scripts/narrative/generated/schema.json';

const defs = (schema as { $defs: Record<string, any> }).$defs;

describe('JSON Schema publié par le moteur', () => {
  it('contient les types de frontière', () => {
    for (const t of ['ScenePacket', 'SceneSpec', 'Outcome', 'Rejet', 'CompteRendu', 'Decision']) {
      expect(defs[t]).toBeDefined();
    }
  });

  it('le paquet expose la clé JSON "move" (rename serde), requise', () => {
    const sp = defs.ScenePacket;
    expect(sp.properties.move).toBeDefined();
    expect(sp.properties.mouvement).toBeUndefined();
    expect(sp.required).toContain('move');
  });

  it('Rejet est un enum taggé (oneOf type/detail)', () => {
    expect(Array.isArray(defs.Rejet.oneOf)).toBe(true);
    const tags = defs.Rejet.oneOf.map((v: any) => v.properties.type.const ?? v.properties.type.enum?.[0]);
    expect(tags).toContain('fuite');
    expect(tags).toContain('move_non_execute');
  });

  it('LE MUR : aucun type interne porteur de canon dans le schéma', () => {
    for (const interdit of ['World', 'Canon', 'Registry', 'BeatPlan', 'Event']) {
      expect(defs[interdit]).toBeUndefined();
    }
  });

  it('deny_unknown_fields → additionalProperties:false sur le paquet', () => {
    expect(defs.ScenePacket.additionalProperties).toBe(false);
  });
});
