/**
 * Modèle de données du deck Parallaxe (surcouche universelle pour le JDR solo)
 * et logique pure de filtrage / tirage.
 *
 * Validateur TypeScript maison (aucune dépendance externe). La part aléatoire
 * (tirage) est isolée derrière une fonction `random` injectable pour rester
 * testable.
 */

export type Archetype =
  | 'revelation'
  | 'perte'
  | 'retournement'
  | 'confrontation'
  | 'transformation';

export type Focale = 'moi' | 'compagnon' | 'pnj' | 'tiers' | 'lieu';

export type Tonalite = 'favorable' | 'neutre' | 'hostile';

export type Tangible = 'concret' | 'abstrait';
export type Registre = 'physique' | 'social' | 'mental';
export type Temps = 'passe' | 'present' | 'futur';
export type Recurrence = 'unique' | 'identifie' | 'recurrent';

export interface CarteAxes {
  tangible: Tangible;
  registre: Registre;
  temps: Temps;
  recurrence: Recurrence;
}

export interface Carte {
  num: number;
  nom: string;
  /** null pour la carte Pause (sans axes). */
  archetype: Archetype | null;
  focale: Focale | null;
  tonalite: Tonalite | null;
  axes: CarteAxes | null;
  phrase: string;
  impulsions: string[];
  signe: string;
}

export interface DeckParallaxe {
  nom: string;
  cartes: Carte[];
}

/** Une carte est « thématique » (par opposition à la Pause) si elle a des axes principaux. */
export function estPause(carte: Carte): boolean {
  return carte.archetype === null;
}

/* --------------------------------------------------------------------------
 * Libellés / repères visuels (partagés UI + tests)
 * ------------------------------------------------------------------------ */

export const ARCHETYPES: Archetype[] = [
  'revelation',
  'perte',
  'retournement',
  'confrontation',
  'transformation',
];
export const FOCALES: Focale[] = ['moi', 'compagnon', 'pnj', 'tiers', 'lieu'];
export const TONALITES: Tonalite[] = ['favorable', 'neutre', 'hostile'];

export const ARCHETYPE_LABEL: Record<Archetype, string> = {
  revelation: 'Révélation',
  perte: 'Perte',
  retournement: 'Retournement',
  confrontation: 'Confrontation',
  transformation: 'Transformation',
};

/** Couleur de famille de chaque archétype (cf. canon Parallaxe). */
export const ARCHETYPE_COULEUR: Record<Archetype, string> = {
  revelation: '#d8a13a',
  perte: '#4a5bb0',
  retournement: '#9b59b6',
  confrontation: '#c0392b',
  transformation: '#2e9e7b',
};

export const FOCALE_LABEL: Record<Focale, string> = {
  moi: 'Moi',
  compagnon: 'Compagnon',
  pnj: 'PNJ',
  tiers: 'Tiers',
  lieu: 'Lieu',
};

export const FOCALE_ICONE: Record<Focale, string> = {
  moi: '●',
  compagnon: '●●',
  pnj: '○',
  tiers: '◌',
  lieu: '▢',
};

export const TONALITE_LABEL: Record<Tonalite, string> = {
  favorable: 'Favorable',
  neutre: 'Neutre',
  hostile: 'Hostile',
};

export const TONALITE_SYMBOLE: Record<Tonalite, string> = {
  favorable: '▲',
  neutre: '=',
  hostile: '▼',
};

export const TANGIBLE_LABEL: Record<Tangible, string> = {
  concret: 'Concret',
  abstrait: 'Abstrait',
};
export const REGISTRE_LABEL: Record<Registre, string> = {
  physique: 'Physique',
  social: 'Social',
  mental: 'Mental',
};
export const TEMPS_LABEL: Record<Temps, string> = {
  passe: 'Passé',
  present: 'Présent',
  futur: 'Futur',
};
export const RECURRENCE_LABEL: Record<Recurrence, string> = {
  unique: 'Unique',
  identifie: 'Identifié',
  recurrent: 'Récurrent',
};

/* --------------------------------------------------------------------------
 * Validation
 * ------------------------------------------------------------------------ */

export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; errors: string[] };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function isOneOf<T extends string>(value: unknown, allowed: readonly T[]): value is T {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value);
}

const TANGIBLES: Tangible[] = ['concret', 'abstrait'];
const REGISTRES: Registre[] = ['physique', 'social', 'mental'];
const TEMPS: Temps[] = ['passe', 'present', 'futur'];
const RECURRENCES: Recurrence[] = ['unique', 'identifie', 'recurrent'];

/**
 * Valide une structure inconnue et garantit qu'elle respecte le contrat
 * DeckParallaxe :
 * - racine objet avec `nom` non vide et `cartes` tableau
 * - `num` uniques, entiers positifs
 * - cartes thématiques : archetype/focale/tonalite/axes renseignés et valides
 * - carte Pause : ces quatre champs à null
 * - impulsions tableau non vide de chaînes ; phrase / signe non vides
 */
export function validateDeck(data: unknown): ValidationResult<DeckParallaxe> {
  const errors: string[] = [];

  if (!isRecord(data)) {
    return { ok: false, errors: ['La racine doit être un objet.'] };
  }
  if (typeof data.nom !== 'string' || data.nom.length === 0) {
    errors.push('Le champ "nom" doit être une chaîne non vide.');
  }
  if (!Array.isArray(data.cartes)) {
    return { ok: false, errors: [...errors, 'Le champ "cartes" doit être un tableau.'] };
  }

  const nums = new Set<number>();

  data.cartes.forEach((carte, index) => {
    const prefix = `cartes[${index}]`;
    if (!isRecord(carte)) {
      errors.push(`${prefix} doit être un objet.`);
      return;
    }
    if (typeof carte.num !== 'number' || !Number.isInteger(carte.num) || carte.num <= 0) {
      errors.push(`${prefix}.num doit être un entier positif.`);
    } else if (nums.has(carte.num)) {
      errors.push(`${prefix}.num "${carte.num}" est dupliqué.`);
    } else {
      nums.add(carte.num);
    }
    if (typeof carte.nom !== 'string' || carte.nom.length === 0) {
      errors.push(`${prefix}.nom doit être une chaîne non vide.`);
    }
    if (typeof carte.phrase !== 'string' || carte.phrase.length === 0) {
      errors.push(`${prefix}.phrase doit être une chaîne non vide.`);
    }
    if (typeof carte.signe !== 'string' || carte.signe.length === 0) {
      errors.push(`${prefix}.signe doit être une chaîne non vide.`);
    }
    if (!isStringArray(carte.impulsions) || carte.impulsions.length === 0) {
      errors.push(`${prefix}.impulsions doit être un tableau de chaînes non vide.`);
    }

    const isPause = carte.archetype === null;
    if (isPause) {
      if (carte.focale !== null || carte.tonalite !== null || carte.axes !== null) {
        errors.push(`${prefix} (Pause) doit avoir focale, tonalite et axes à null.`);
      }
      return;
    }

    if (!isOneOf(carte.archetype, ARCHETYPES)) {
      errors.push(`${prefix}.archetype invalide.`);
    }
    if (!isOneOf(carte.focale, FOCALES)) {
      errors.push(`${prefix}.focale invalide.`);
    }
    if (!isOneOf(carte.tonalite, TONALITES)) {
      errors.push(`${prefix}.tonalite invalide.`);
    }
    if (!isRecord(carte.axes)) {
      errors.push(`${prefix}.axes doit être un objet (carte thématique).`);
    } else {
      const a = carte.axes;
      if (!isOneOf(a.tangible, TANGIBLES)) errors.push(`${prefix}.axes.tangible invalide.`);
      if (!isOneOf(a.registre, REGISTRES)) errors.push(`${prefix}.axes.registre invalide.`);
      if (!isOneOf(a.temps, TEMPS)) errors.push(`${prefix}.axes.temps invalide.`);
      if (!isOneOf(a.recurrence, RECURRENCES))
        errors.push(`${prefix}.axes.recurrence invalide.`);
    }
  });

  if (errors.length > 0) {
    return { ok: false, errors };
  }
  return { ok: true, value: data as unknown as DeckParallaxe };
}

/* --------------------------------------------------------------------------
 * Filtrage du pool + tirage
 * ------------------------------------------------------------------------ */

export interface Filtre {
  /** Focales conservées. Tableau vide = aucune contrainte (toutes conservées). */
  focales: Focale[];
  tonalites: Tonalite[];
  archetypes: Archetype[];
  /** Garder la carte Pause dans le pool (vrai par défaut côté UI). */
  inclurePause: boolean;
}

export function filtreVide(): Filtre {
  return { focales: [], tonalites: [], archetypes: [], inclurePause: true };
}

/**
 * Applique le filtrage par axes : une carte thématique est conservée si, pour
 * chaque axe contraint (tableau non vide), sa valeur figure dans la sélection.
 * La carte Pause suit `inclurePause`, indépendamment des autres axes.
 */
export function filtrerPool(cartes: Carte[], filtre: Filtre): Carte[] {
  return cartes.filter((carte) => {
    if (estPause(carte)) {
      return filtre.inclurePause;
    }
    if (filtre.focales.length > 0 && (carte.focale === null || !filtre.focales.includes(carte.focale))) {
      return false;
    }
    if (
      filtre.tonalites.length > 0 &&
      (carte.tonalite === null || !filtre.tonalites.includes(carte.tonalite))
    ) {
      return false;
    }
    if (
      filtre.archetypes.length > 0 &&
      (carte.archetype === null || !filtre.archetypes.includes(carte.archetype))
    ) {
      return false;
    }
    return true;
  });
}

/**
 * Tire une carte au hasard dans le pool (pioche uniforme). `random` renvoie un
 * flottant dans [0, 1[ (défaut Math.random) ; injectable pour les tests.
 * Renvoie null si le pool est vide.
 */
export function tirerCarte(pool: Carte[], random: () => number = Math.random): Carte | null {
  if (pool.length === 0) return null;
  const index = Math.floor(random() * pool.length);
  // Garde-fou si random() renvoie exactement 1 (hors spec, mais prudent).
  return pool[Math.min(index, pool.length - 1)] ?? null;
}
