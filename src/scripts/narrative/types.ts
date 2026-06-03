// Le MOTEUR est la source de vérité du schéma de données. Les types de frontière
// sont GÉNÉRÉS depuis Rust (ts-rs) dans ./generated — plus aucun miroir à la main.
// Ce fichier ne garde que la constante de version (une valeur, pas un type) et
// réexporte les types pour ne pas casser les imports existants (`./types`).
//
// Régénérer après un changement Rust : `pnpm gen:types` (puis committer ./generated).

export type {
  Registre,
  Ratio,
  ShapeTag,
  Cadre,
  Locuteur,
  Form,
  ScenePacket,
  Prepared,
  Rejet,
  Outcome,
} from './generated';

/// Numéro de contrat (valeur — non exprimable comme type généré). Reflète
/// `cn_core::packet::PACKET_SCHEMA_VERSION` ; vérifié contre une fixture Rust dans
/// tests/narrative/contract.test.ts.
export const PACKET_SCHEMA_VERSION = 1;
