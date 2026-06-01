/**
 * Modèle de données des outils embarqués / mis en avant + validateur maison.
 * Aucune dépendance externe.
 */

export interface EmbedEntry {
  id: string;
  nom: string;
  url: string;
  /** true => l'outil peut être affiché en iframe ; false => repli fiche + lien. */
  embeddable: boolean;
  /**
   * true => outil hébergé sur ce site (url interne) : la fiche ouvre la page
   * dans l'onglet courant et invite à « Utiliser l'outil » plutôt que de
   * renvoyer vers un site externe.
   */
  internal?: boolean;
  description: string;
  image?: string;
  tags: string[];
}

export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; errors: string[] };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

/**
 * Valide un tableau d'EmbedEntry :
 * - racine = tableau
 * - champs requis présents et typés (id, nom, url, embeddable, description, tags)
 * - image optionnelle mais typée si présente
 * - ids uniques
 */
export function validateEmbeds(data: unknown): ValidationResult<EmbedEntry[]> {
  const errors: string[] = [];

  if (!Array.isArray(data)) {
    return { ok: false, errors: ['La racine doit être un tableau.'] };
  }

  const ids = new Set<string>();

  data.forEach((entry, index) => {
    const prefix = `entries[${index}]`;
    if (!isRecord(entry)) {
      errors.push(`${prefix} doit être un objet.`);
      return;
    }
    if (typeof entry.id !== 'string' || entry.id.length === 0) {
      errors.push(`${prefix}.id doit être une chaîne non vide.`);
    } else if (ids.has(entry.id)) {
      errors.push(`${prefix}.id "${entry.id}" est dupliqué.`);
    } else {
      ids.add(entry.id);
    }
    if (typeof entry.nom !== 'string' || entry.nom.length === 0) {
      errors.push(`${prefix}.nom doit être une chaîne non vide.`);
    }
    if (typeof entry.url !== 'string' || entry.url.length === 0) {
      errors.push(`${prefix}.url doit être une chaîne non vide.`);
    }
    if (typeof entry.embeddable !== 'boolean') {
      errors.push(`${prefix}.embeddable doit être un booléen.`);
    }
    if (entry.internal !== undefined && typeof entry.internal !== 'boolean') {
      errors.push(`${prefix}.internal doit être un booléen si présent.`);
    }
    if (typeof entry.description !== 'string' || entry.description.length === 0) {
      errors.push(`${prefix}.description doit être une chaîne non vide.`);
    }
    if (entry.image !== undefined && typeof entry.image !== 'string') {
      errors.push(`${prefix}.image doit être une chaîne si présent.`);
    }
    if (!isStringArray(entry.tags)) {
      errors.push(`${prefix}.tags doit être un tableau de chaînes.`);
    }
  });

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return { ok: true, value: data as unknown as EmbedEntry[] };
}
