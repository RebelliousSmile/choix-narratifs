// Helpers d'élaboration côté auteur. Le TYPE `SceneSpec` est GÉNÉRÉ depuis Rust
// (source de vérité : engine/core/src/state.rs → ./generated). Ce module ne porte
// que la LOGIQUE de pré-remplissage/validation, qui DOUBLE celle de Rust (autorité)
// pour un retour immédiat dans le formulaire avant l'appel WASM.

import type { SceneSpec } from './generated';

export type { SceneSpec };

/** Mots-outils capitalisés à exclure de la dérivation (miroir du Rust). */
const OUTILS = new Set([
  'le', 'la', 'les', 'un', 'une', 'des', 'de', 'du', 'il', 'elle', 'on',
  'ce', 'cet', 'cette', 'ils', 'elles', 'nous', 'vous', 'et', 'ou', 'qui',
]);

/**
 * Dérive les jetons de fuite d'un secret : ses noms propres (mots capitalisés,
 * ≥ 3 caractères, hors mots-outils). Pré-remplit le champ — l'auteur peut corriger.
 * Miroir de `derive_jetons_fuite` en Rust.
 */
export function deriveJetonsFuite(secret: string): string[] {
  return secret
    .split(/[^\p{L}\p{N}]+/u)
    .map((m) => m.trim())
    .filter(
      (m) =>
        [...m].length >= 3 &&
        m.charAt(0) === m.charAt(0).toUpperCase() &&
        m.charAt(0) !== m.charAt(0).toLowerCase() &&
        !OUTILS.has(m.toLowerCase()),
    );
}

/** Jetons de fuite effectifs : explicites, sinon dérivés. */
export function jetonsFuiteEffectifs(spec: SceneSpec): string[] {
  const explicites = spec.jetons_fuite.map((j) => j.trim()).filter(Boolean);
  return explicites.length > 0 ? explicites : deriveJetonsFuite(spec.secret);
}

/**
 * Valide un devis (miroir de `SceneSpec::validate`). Renvoie un message d'erreur
 * en français, ou `null` si jouable. L'autorité reste Rust : ce contrôle évite un
 * aller-retour WASM pour un retour immédiat dans le formulaire.
 */
export function validateSceneSpec(spec: SceneSpec): string | null {
  if (!spec.lieu.trim()) return 'Le lieu est requis.';
  if (!spec.pnj_nom.trim()) return 'Le nom du PNJ est requis.';
  if (!spec.secret.trim()) return 'Le grand secret est requis.';
  if (spec.revealable.every((r) => !r.trim())) {
    return "Au moins un fait révélable est requis (sinon le PNJ n'a rien à lâcher).";
  }
  const jetons = jetonsFuiteEffectifs(spec);
  if (jetons.length === 0) {
    return "Aucun mot qui trahit le secret n'a pu être déterminé. Précisez-en au moins un.";
  }
  for (const fait of spec.revealable) {
    const f = fait.toLowerCase();
    for (const jeton of jetons) {
      if (f.includes(jeton.toLowerCase())) {
        return `Le fait révélable « ${fait} » contient le mot secret « ${jeton} » : il fuiterait le secret.`;
      }
    }
  }
  return null;
}

/** Devis vide pour amorcer le formulaire. */
export function emptySpec(): SceneSpec {
  return {
    lieu: '',
    pnj_nom: '',
    pnj_voix: '',
    secret: '',
    jetons_fuite: [],
    revealable: [],
    faits_etablis: [],
    jetons_contradiction: [],
    withhold: [],
  };
}
