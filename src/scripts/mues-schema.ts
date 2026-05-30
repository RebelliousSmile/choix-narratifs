/**
 * Modèle de données des "mues" (Monsterhearts) / "playbooks" (Monster of the Week)
 * et pipeline de validation + scoring.
 *
 * Validateur TypeScript maison (aucune dépendance externe).
 */

export interface Mue {
  id: string;
  nom: string;
  resume: string;
  themes: string[];
  tags: string[];
  lienOfficiel?: string;
}

export interface Option {
  id: string;
  texte: string;
  /** Poids par identifiant de mue (chaque clé doit référencer une mue existante). */
  poids: Record<string, number>;
}

export interface Question {
  id: string;
  texte: string;
  /** Thème de la question (enjeu Monsterhearts), affiché au joueur. */
  theme?: string;
  options: Option[];
}

export interface JeuMues {
  jeu: string;
  mues: Mue[];
  questions: Question[];
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
 * Valide une structure inconnue et garantit qu'elle respecte le contrat JeuMues :
 * - types corrects
 * - ids de mues uniques
 * - ids de questions uniques
 * - chaque question a au moins 2 options
 * - chaque poids référence une mue existante
 */
export function validateJeuMues(data: unknown): ValidationResult<JeuMues> {
  const errors: string[] = [];

  if (!isRecord(data)) {
    return { ok: false, errors: ['La racine doit être un objet.'] };
  }

  if (typeof data.jeu !== 'string' || data.jeu.length === 0) {
    errors.push('Le champ "jeu" doit être une chaîne non vide.');
  }

  const mueIds = new Set<string>();

  if (!Array.isArray(data.mues)) {
    errors.push('Le champ "mues" doit être un tableau.');
  } else {
    data.mues.forEach((mue, index) => {
      const prefix = `mues[${index}]`;
      if (!isRecord(mue)) {
        errors.push(`${prefix} doit être un objet.`);
        return;
      }
      if (typeof mue.id !== 'string' || mue.id.length === 0) {
        errors.push(`${prefix}.id doit être une chaîne non vide.`);
      } else if (mueIds.has(mue.id)) {
        errors.push(`${prefix}.id "${mue.id}" est dupliqué.`);
      } else {
        mueIds.add(mue.id);
      }
      if (typeof mue.nom !== 'string' || mue.nom.length === 0) {
        errors.push(`${prefix}.nom doit être une chaîne non vide.`);
      }
      if (typeof mue.resume !== 'string' || mue.resume.length === 0) {
        errors.push(`${prefix}.resume doit être une chaîne non vide.`);
      }
      if (!isStringArray(mue.themes)) {
        errors.push(`${prefix}.themes doit être un tableau de chaînes.`);
      }
      if (!isStringArray(mue.tags)) {
        errors.push(`${prefix}.tags doit être un tableau de chaînes.`);
      }
      if (mue.lienOfficiel !== undefined && typeof mue.lienOfficiel !== 'string') {
        errors.push(`${prefix}.lienOfficiel doit être une chaîne si présent.`);
      }
    });
  }

  const questionIds = new Set<string>();

  if (!Array.isArray(data.questions)) {
    errors.push('Le champ "questions" doit être un tableau.');
  } else {
    data.questions.forEach((question, qIndex) => {
      const qPrefix = `questions[${qIndex}]`;
      if (!isRecord(question)) {
        errors.push(`${qPrefix} doit être un objet.`);
        return;
      }
      if (typeof question.id !== 'string' || question.id.length === 0) {
        errors.push(`${qPrefix}.id doit être une chaîne non vide.`);
      } else if (questionIds.has(question.id)) {
        errors.push(`${qPrefix}.id "${question.id}" est dupliqué.`);
      } else {
        questionIds.add(question.id);
      }
      if (typeof question.texte !== 'string' || question.texte.length === 0) {
        errors.push(`${qPrefix}.texte doit être une chaîne non vide.`);
      }
      if (question.theme !== undefined && typeof question.theme !== 'string') {
        errors.push(`${qPrefix}.theme doit être une chaîne si présent.`);
      }
      if (!Array.isArray(question.options)) {
        errors.push(`${qPrefix}.options doit être un tableau.`);
        return;
      }
      if (question.options.length < 2) {
        errors.push(`${qPrefix}.options doit contenir au moins 2 options.`);
      }
      question.options.forEach((option, oIndex) => {
        const oPrefix = `${qPrefix}.options[${oIndex}]`;
        if (!isRecord(option)) {
          errors.push(`${oPrefix} doit être un objet.`);
          return;
        }
        if (typeof option.id !== 'string' || option.id.length === 0) {
          errors.push(`${oPrefix}.id doit être une chaîne non vide.`);
        }
        if (typeof option.texte !== 'string' || option.texte.length === 0) {
          errors.push(`${oPrefix}.texte doit être une chaîne non vide.`);
        }
        if (!isRecord(option.poids)) {
          errors.push(`${oPrefix}.poids doit être un objet.`);
          return;
        }
        for (const [mueId, poids] of Object.entries(option.poids)) {
          if (typeof poids !== 'number' || Number.isNaN(poids)) {
            errors.push(`${oPrefix}.poids["${mueId}"] doit être un nombre.`);
          }
          if (!mueIds.has(mueId)) {
            errors.push(`${oPrefix}.poids référence la mue inconnue "${mueId}".`);
          }
        }
      });
    });
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return { ok: true, value: data as unknown as JeuMues };
}

/**
 * Calcule le score de chaque mue à partir des réponses.
 *
 * @param jeu      données validées du jeu
 * @param reponses map { idQuestion -> idOption choisie }
 * @returns liste { mue, score } triée par score décroissant puis par id (déterministe)
 */
export function scoreMues(
  jeu: JeuMues,
  reponses: Record<string, string>,
): { mue: Mue; score: number }[] {
  const scores = new Map<string, number>();
  for (const mue of jeu.mues) {
    scores.set(mue.id, 0);
  }

  for (const question of jeu.questions) {
    const choix = reponses[question.id];
    if (choix === undefined) {
      continue;
    }
    const option = question.options.find((opt) => opt.id === choix);
    if (option === undefined) {
      continue;
    }
    for (const [mueId, poids] of Object.entries(option.poids)) {
      if (scores.has(mueId)) {
        scores.set(mueId, (scores.get(mueId) ?? 0) + poids);
      }
    }
  }

  return jeu.mues
    .map((mue) => ({ mue, score: scores.get(mue.id) ?? 0 }))
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      return a.mue.id.localeCompare(b.mue.id);
    });
}
