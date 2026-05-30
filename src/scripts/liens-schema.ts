/**
 * Modèle de données des liens externes + validateur maison.
 * Aucune dépendance externe.
 */

export const CATEGORIES_LIENS = [
  'Théorie',
  'Outils tiers',
  'Communautés',
  'Jeux',
] as const;

export type CategorieLien = (typeof CATEGORIES_LIENS)[number];

export interface Lien {
  id: string;
  titre: string;
  url: string;
  description: string;
  categorie: CategorieLien;
}

export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; errors: string[] };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isCategorie(value: unknown): value is CategorieLien {
  return (
    typeof value === 'string' &&
    (CATEGORIES_LIENS as readonly string[]).includes(value)
  );
}

/**
 * Valide un tableau de Lien :
 * - racine = tableau
 * - champs requis présents et typés (id, titre, url, description, categorie)
 * - categorie ∈ CATEGORIES_LIENS
 * - ids uniques
 */
export function validateLiens(data: unknown): ValidationResult<Lien[]> {
  const errors: string[] = [];

  if (!Array.isArray(data)) {
    return { ok: false, errors: ['La racine doit être un tableau.'] };
  }

  const ids = new Set<string>();

  data.forEach((entry, index) => {
    const prefix = `liens[${index}]`;
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
    if (typeof entry.titre !== 'string' || entry.titre.length === 0) {
      errors.push(`${prefix}.titre doit être une chaîne non vide.`);
    }
    if (typeof entry.url !== 'string' || entry.url.length === 0) {
      errors.push(`${prefix}.url doit être une chaîne non vide.`);
    }
    if (typeof entry.description !== 'string' || entry.description.length === 0) {
      errors.push(`${prefix}.description doit être une chaîne non vide.`);
    }
    if (!isCategorie(entry.categorie)) {
      errors.push(
        `${prefix}.categorie doit être l'une de : ${CATEGORIES_LIENS.join(', ')}.`,
      );
    }
  });

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return { ok: true, value: data as unknown as Lien[] };
}
