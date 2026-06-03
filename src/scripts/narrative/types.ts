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

/// Numéro de contrat — ÉMIS PAR LE MOTEUR (generated/contract.json), plus écrit à
/// la main. Réexporté ici pour les imports existants (`./types`).
export { PACKET_SCHEMA_VERSION } from './contract';
