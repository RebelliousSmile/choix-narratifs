/**
 * Moteur de campagne « Jauges & Tarot » (surcouche solo universelle).
 *
 * Ce module ne gère QUE l'état mécanique suivi par le tableau de bord : la Jauge
 * Narrative (12 → 1, contractible), la Charge Mentale (échos), les Points de
 * Destin, et les fiches (Challenge, Description, Compagnon, Intention). Le
 * contenu des cartes Muses & Oracles et la résolution du jeu cible restent hors
 * périmètre (couches 1 et 3). Toute la logique est pure et testable ; la part
 * persistance / aléatoire vit dans le composant.
 */

export type Posture = 'H' | 'N' | 'A'; // Hostile / Neutre / Allié
export type Signe = '+' | '=' | '-';
export type Cavalier = 'pique' | 'coeur' | 'trefle' | 'carreau';
export type TypeDescription = 'lieu' | 'pnj' | 'objet' | 'faction';

/** Couleur du tarot à jouer (assignée à une zone). */
export type Couleur = 'pique' | 'coeur' | 'trefle' | 'carreau';
/** Figure d'As (retirée des couleurs avant la partie). */
export type AsFigure = 'pique' | 'coeur' | 'trefle' | 'carreau';

/** Les 4 zones « couleur » et la couleur du tarot qui leur est assignée. */
export interface AffectationCouleurs {
  jauge: Couleur;
  charge: Couleur;
  descriptions: Couleur;
  challenges: Couleur;
}

/** As : figure de ressource récurrente (glissée sur l'As correspondant). */
export interface FicheRessource {
  id: string;
  as: AsFigure;
  nom: string;
  trait1: string;
  trait2: string;
}

/** Ligne de Temps (atouts 21 → 1, l'Excuse au bout). Éphémère par séquence. */
export interface LigneTemps {
  ouverte: boolean;
  /** 21 (départ, calme) → 1 (climax). 0 = Excuse / Stase. */
  position: number;
}

export interface FicheEcho {
  id: string;
  titre: string;
  intrigue: string;
  lieu: string;
  acteur: string;
  /** 0 à 4 cases cochées. À 4, l'écho est mûr (prochaine résonance peut le clore). */
  progression: number;
  resolu: boolean;
}

export interface FicheChallenge {
  id: string;
  nom: string;
  posture: Posture;
  impulsion: string;
  danger: string;
  faiblesse: string;
  menace: string;
  /** Vitalité 0 à 4. À 4, l'obstacle est vaincu. */
  vitalite: number;
}

export interface FicheDescription {
  id: string;
  type: TypeDescription;
  nom: string;
  trait1: string;
  trait2: string;
}

export interface FicheCompagnon {
  id: string;
  cavalier: Cavalier;
  nom: string;
  concurrenceDomaine: string;
  /** Seuil de Concurrence en % (d100 ≤ seuil → spotlight compagnon). */
  concurrenceSeuil: number;
  complementarite: string;
  caractere: string;
}

export interface FicheIntention {
  themes: string;
  ton: string;
  verites: string;
  vivre: string;
  eviter: string;
  question: string;
  filsRouges: string;
}

export interface JaugeTarotState {
  /** Plafond actif de la Jauge (départ 12, diminue par contraction, jamais ne remonte). */
  plafond: number;
  /** Emplacement en cours (de plafond vers 1). À 1 : dénouement. */
  position: number;
  /** Cartes A retournées ce cycle = PD dépensés ce cycle (contraction au re-remplissage). */
  retournees: number;
  /** Pile de Résolues = réserve de Points de Destin. */
  pointsDestin: number;
  echos: FicheEcho[];
  challenges: FicheChallenge[];
  descriptions: FicheDescription[];
  compagnons: FicheCompagnon[];
  ressources: FicheRessource[];
  intention: FicheIntention;
  ligne: LigneTemps;
}

export const CAVALIER_LABEL: Record<Cavalier, string> = {
  pique: 'Ton Rival (Pique)',
  coeur: 'Ton Préféré (Cœur)',
  trefle: 'Ton Débiteur (Trèfle)',
  carreau: 'Ton Acolyte (Carreau)',
};

export const POSTURE_LABEL: Record<Posture, string> = {
  H: 'Hostile',
  N: 'Neutre',
  A: 'Allié',
};

export const TYPE_DESCRIPTION_LABEL: Record<TypeDescription, string> = {
  lieu: 'Lieu',
  pnj: 'PNJ',
  objet: 'Objet',
  faction: 'Faction',
};

export const COULEUR_LABEL: Record<Couleur, string> = {
  pique: 'Pique',
  coeur: 'Cœur',
  trefle: 'Trèfle',
  carreau: 'Carreau',
};

export const COULEUR_SYMBOLE: Record<Couleur, string> = {
  pique: '♠',
  coeur: '♥',
  trefle: '♣',
  carreau: '♦',
};

/** Couleurs « rouges » du tarot (Cœur, Carreau) — pour le rendu visuel. */
export const COULEUR_ROUGE: Record<Couleur, boolean> = {
  pique: false,
  coeur: true,
  trefle: false,
  carreau: true,
};

export const AS_LABEL: Record<AsFigure, string> = {
  pique: 'Mentor (As de Pique)',
  coeur: 'Protecteur (As de Cœur)',
  trefle: 'Soutien (As de Trèfle)',
  carreau: 'Réseau (As de Carreau)',
};

/** Position de départ de la Ligne de Temps. 0 = l'Excuse (Stase). */
export const LIGNE_DEPART = 21;

export const PLAFOND_INITIAL = 12;
export const MAX_FICHES = 12;
export const MAX_COMPAGNONS = 4;

export function creerIntentionVide(): FicheIntention {
  return { themes: '', ton: '', verites: '', vivre: '', eviter: '', question: '', filsRouges: '' };
}

/**
 * Affectation FIXE des couleurs du tarot aux zones. C'est une part symbolique du
 * système : le mapping ne se permute pas (Cœur → Charge Mentale, Pique →
 * Challenge, Trèfle → Jauge Narrative, Carreau → Descriptions).
 */
export const AFFECTATION_COULEURS: AffectationCouleurs = {
  jauge: 'trefle',
  charge: 'coeur',
  descriptions: 'carreau',
  challenges: 'pique',
};

export function creerEtatInitial(): JaugeTarotState {
  return {
    plafond: PLAFOND_INITIAL,
    position: PLAFOND_INITIAL,
    retournees: 0,
    pointsDestin: 0,
    echos: [],
    challenges: [],
    descriptions: [],
    compagnons: [],
    ressources: [],
    intention: creerIntentionVide(),
    ligne: { ouverte: false, position: LIGNE_DEPART },
  };
}

/* --------------------------------------------------------------------------
 * Dérivés
 * ------------------------------------------------------------------------ */

/** Nombre d'échos actifs (non résolus) sur la Charge Mentale. */
export function chargeActive(state: JaugeTarotState): number {
  return state.echos.filter((e) => !e.resolu).length;
}

/** Emplacements restants dans la Jauge (de la position courante jusqu'à 1). */
export function emplacementsRestants(state: JaugeTarotState): number {
  return Math.max(0, state.position);
}

export interface Aiguillage {
  mode: 'de' | 'designe' | 'aucun';
  de: 'd4' | 'd8' | 'd12' | 'd20' | null;
  texte: string;
}

/**
 * Aiguillage (arcane 8) : selon le nombre d'éléments dans la zone ciblée, le dé
 * imprimé à lire sur la carte M&O. 13+ → d20, 9–12 → d12, 5–8 → d8, 2–4 → d4,
 * 1 → élément désigné (pas de dé), 0 → pas d'aiguillage.
 */
export function aiguillage(nbElements: number): Aiguillage {
  if (nbElements <= 0) return { mode: 'aucun', de: null, texte: 'Pas d’aiguillage — se baser sur la carte.' };
  if (nbElements === 1) return { mode: 'designe', de: null, texte: 'Élément unique désigné (pas de dé).' };
  if (nbElements <= 4) return { mode: 'de', de: 'd4', texte: 'Lis le d4 sur la carte.' };
  if (nbElements <= 8) return { mode: 'de', de: 'd8', texte: 'Lis le d8 sur la carte.' };
  if (nbElements <= 12) return { mode: 'de', de: 'd12', texte: 'Lis le d12 sur la carte.' };
  return { mode: 'de', de: 'd20', texte: 'Lis le d20 sur la carte.' };
}

export interface Resonance {
  niveau: 'libre' | 'conditionnelle' | 'obligatoire';
  imposeEcho: boolean;
  texte: string;
}

/**
 * Résonance (arcane 9) selon le signe de la carte N :
 * + → scène libre ; = → écho imposé si Charge > moitié des emplacements restants ;
 * – → écho obligatoire (s'il existe au moins un écho actif).
 */
export function resonance(signe: Signe, state: JaugeTarotState): Resonance {
  const charge = chargeActive(state);
  const restants = emplacementsRestants(state);
  if (signe === '+') {
    return { niveau: 'libre', imposeEcho: false, texte: 'Scène libre — le présent se joue sans contrainte du passé.' };
  }
  if (signe === '=') {
    const impose = charge > restants / 2;
    return {
      niveau: 'conditionnelle',
      imposeEcho: impose && charge > 0,
      texte: impose
        ? `Résonance conditionnelle ACTIVE (Charge ${charge} > ${restants}/2) — un écho s'impose.`
        : `Résonance conditionnelle inactive (Charge ${charge} ≤ ${restants}/2) — scène libre.`,
    };
  }
  return {
    niveau: 'obligatoire',
    imposeEcho: charge > 0,
    texte:
      charge > 0
        ? 'Résonance obligatoire — tire un écho actif au hasard, il s’impose à la scène.'
        : 'Résonance obligatoire, mais aucun écho actif — scène libre par défaut.',
  };
}

/** Re-remplissage déclenché si la Jauge atteint 3, ou si la Charge dépasse les emplacements restants. */
export function doitReRemplir(state: JaugeTarotState): boolean {
  return state.position <= 3 || chargeActive(state) > emplacementsRestants(state);
}

/** Dénouement normal : la Jauge atteint l'emplacement 1. */
export function denouementNormal(state: JaugeTarotState): boolean {
  return state.position <= 1;
}

export interface ResultatReRemplissage {
  state: JaugeTarotState;
  pdDepenses: number;
  nouveauPlafond: number;
  denouementForce: boolean;
}

/**
 * Re-remplissage (arcane 13) : contracte la Jauge du nombre de cartes A
 * retournées, vide la Pile de Résolues, puis relance la Jauge sur un souffle
 * plus court. Si le nouveau plafond est ≤ Charge Mentale, le dénouement forcé
 * est déclenché. Renvoie un nouvel état (l'entrée n'est pas mutée).
 */
export function reRemplissage(state: JaugeTarotState): ResultatReRemplissage {
  const pdDepenses = state.retournees;
  const charge = chargeActive(state);
  const nouveauPlafond = Math.max(1, state.plafond - pdDepenses);
  const denouementForce = nouveauPlafond <= charge;
  const next: JaugeTarotState = {
    ...state,
    plafond: nouveauPlafond,
    position: nouveauPlafond,
    retournees: 0,
    pointsDestin: 0,
  };
  return { state: next, pdDepenses, nouveauPlafond, denouementForce };
}

/* --------------------------------------------------------------------------
 * Couleurs & Ligne de Temps
 * ------------------------------------------------------------------------ */

export type ZoneCouleur = keyof AffectationCouleurs;

export function ouvrirLigne(depart: number = LIGNE_DEPART): LigneTemps {
  return { ouverte: true, position: Math.max(1, Math.min(LIGNE_DEPART, Math.round(depart))) };
}

/**
 * Retire `retrait` arcanes de la Ligne de Temps (1 = succès, 0 = négociation,
 * 2 = échec critique ; n quelconque pour une cascade). La position est bornée à
 * 0 (l'Excuse / Stase). Renvoie une nouvelle Ligne.
 */
export function retirerArcanes(ligne: LigneTemps, retrait: number): LigneTemps {
  if (!ligne.ouverte) return ligne;
  return { ...ligne, position: Math.max(0, ligne.position - Math.max(0, Math.round(retrait))) };
}

export type EtatLigne = 'fermee' | 'depart' | 'tension' | 'beat-final' | 'stase';

export function etatLigne(ligne: LigneTemps): EtatLigne {
  if (!ligne.ouverte) return 'fermee';
  if (ligne.position <= 0) return 'stase';
  if (ligne.position === 1) return 'beat-final';
  if (ligne.position >= LIGNE_DEPART) return 'depart';
  return 'tension';
}

/* --------------------------------------------------------------------------
 * Validation (import de sauvegarde)
 * ------------------------------------------------------------------------ */

export type ValidationResult<T> = { ok: true; value: T } | { ok: false; errors: string[] };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Valide une sauvegarde importée et complète les champs manquants avec les
 * valeurs par défaut (tolérant aux versions antérieures). Les nombres clés sont
 * bornés pour éviter un état incohérent.
 */
export function validateState(data: unknown): ValidationResult<JaugeTarotState> {
  if (!isRecord(data)) {
    return { ok: false, errors: ['La sauvegarde doit être un objet.'] };
  }
  const base = creerEtatInitial();

  const num = (v: unknown, fallback: number): number =>
    typeof v === 'number' && Number.isFinite(v) ? v : fallback;
  const arr = <T>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);

  const plafond = Math.min(PLAFOND_INITIAL, Math.max(1, Math.round(num(data.plafond, base.plafond))));
  const position = Math.min(plafond, Math.max(1, Math.round(num(data.position, plafond))));

  const ligneSrc = isRecord(data.ligne) ? data.ligne : {};
  const ligne: LigneTemps = {
    ouverte: ligneSrc.ouverte === true,
    position: Math.max(0, Math.min(LIGNE_DEPART, Math.round(num(ligneSrc.position, LIGNE_DEPART)))),
  };

  const value: JaugeTarotState = {
    plafond,
    position,
    retournees: Math.max(0, Math.round(num(data.retournees, 0))),
    pointsDestin: Math.max(0, Math.round(num(data.pointsDestin, 0))),
    echos: arr<FicheEcho>(data.echos),
    challenges: arr<FicheChallenge>(data.challenges),
    descriptions: arr<FicheDescription>(data.descriptions),
    compagnons: arr<FicheCompagnon>(data.compagnons),
    ressources: arr<FicheRessource>(data.ressources),
    intention: isRecord(data.intention)
      ? { ...base.intention, ...(data.intention as Partial<FicheIntention>) }
      : base.intention,
    ligne,
  };
  return { ok: true, value };
}
