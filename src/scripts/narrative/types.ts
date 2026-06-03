// Miroir TypeScript du contrat émis par `cn-wasm` (= `serde_json` de `cn-core`).
// SOURCE DE VÉRITÉ : engine/core/src/{packet,engine,verifier}.rs.
// Garde-fou d'alignement : tests/narrative/contract.test.ts parse de vraies
// sorties Rust (tests/narrative/fixtures/*.json) avec ces types.

export const PACKET_SCHEMA_VERSION = 1;

export type Registre =
  | 'sec'
  | 'neutre'
  | 'tendu'
  | 'lyrique'
  | 'familier'
  | 'solennel';

export type Ratio = 'non_verbal_dominant' | 'equilibre' | 'verbal_dominant';

export type ShapeTag =
  | 'monologue'
  | 'question_reponse'
  | 'action_puis_replique'
  | 'description_puis_dialogue'
  | 'liste_descripteurs'
  | 'replique_seche';

export interface Cadre {
  lieu: string;
  /** Omis par serde quand absent (`skip_serializing_if`). */
  ambiance?: string;
  presents: string[];
}

export interface Locuteur {
  nom: string;
  voix: string;
}

export interface Form {
  registre: Registre;
  budget_revelation: number;
  ratio: Ratio;
  interdit_shape: ShapeTag[];
}

/** La forme fermée qui franchit le mur. `move` est la clé JSON (rename serde). */
export interface ScenePacket {
  schema_version: number;
  cadre: Cadre;
  locuteur: Locuteur;
  action_joueur: string;
  hearing: string;
  move: string;
  revealable: string[];
  withhold: string[];
  form: Form;
}

/** Sortie de `prepare`. */
export interface Prepared {
  packet: ScenePacket;
  n: number;
}

/** Motif d'écartement d'un candidat (enum Rust, adjacently tagged). */
export type Rejet =
  | { type: 'fuite'; detail: string }
  | { type: 'contradiction'; detail: string }
  | { type: 'move_non_execute' };

/** Sortie de `resolve` (enum Rust, internally tagged par `outcome`). */
export type Outcome =
  | { outcome: 'commit'; index: number; candidat: string; diff: string[] }
  | { outcome: 'resample_needed'; rejets: Array<[number, Rejet]> };
