// Contrat de données runtime du moteur — les « possibles » (façon template.json
// de FoundryVTT). ÉMIS PAR LE MOTEUR (engine/core/examples/emit_possibles.rs) dans
// generated/contract.json, puis lu ici. Les consommateurs LISENT ce contrat et s'y
// adaptent (catalogue de gestes, domaines d'enums, bornes, version) — rien n'est
// codé en dur côté TS.
//
// Régénérer : `pnpm gen:types` (réécrit aussi contract.json), puis committer.

import contractJson from './generated/contract.json';
import type { Registre, Ratio, ShapeTag, Move } from './generated';

export interface Contract {
  packet_schema_version: number;
  best_of_n: { min: number; max: number };
  moves: Move[];
  registres: Registre[];
  ratios: Ratio[];
  shapes: ShapeTag[];
  decisions: string[];
  rejets: string[];
  outcomes: string[];
}

/** Le contrat émis par le moteur (source de vérité runtime). */
export const CONTRACT = contractJson as Contract;

/** Version du contrat de paquet — émise par le moteur, plus écrite à la main. */
export const PACKET_SCHEMA_VERSION = CONTRACT.packet_schema_version;

/** Bornes du best-of-N. */
export const N_MIN = CONTRACT.best_of_n.min;
export const N_MAX = CONTRACT.best_of_n.max;

/** Catalogue agnostique de gestes (les « possibles » du directeur). */
export const MOVES = CONTRACT.moves;

/** Domaines d'enums, pour data-driver l'UI (listes déroulantes, etc.). */
export const REGISTRES = CONTRACT.registres;
export const RATIOS = CONTRACT.ratios;
export const SHAPES = CONTRACT.shapes;
export const DECISIONS = CONTRACT.decisions;
