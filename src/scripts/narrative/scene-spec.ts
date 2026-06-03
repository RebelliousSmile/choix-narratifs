// Devis d'élaboration côté auteur — miroir TS de `cn_core::state::SceneSpec`.
// SOURCE DE VÉRITÉ : engine/core/src/state.rs.
//
// Ce type voyage de l'UI d'élaboration au moteur (`WasmEngine.fromScene`). Il porte
// le secret EN CLAIR (l'auteur le saisit), vit côté client, et ne franchit jamais le
// mur : `prepare` ne lit que les champs publics du World.
//
// La validation ci-dessous DOUBLE celle de Rust (qui reste l'autorité) : elle sert à
// donner un retour immédiat dans le formulaire avant d'appeler le WASM.

export interface SceneSpec {
  lieu: string;
  /** Omis par serde quand absent. */
  ambiance?: string;
  pnj_nom: string;
  pnj_voix: string;
  /** Le grand secret (la réponse tue). */
  secret: string;
  /** Mots qui trahissent le secret. Si vide, Rust dérive les noms propres du secret. */
  jetons_fuite: string[];
  /** Ce que le PNJ peut lâcher. Sert aussi de preuve de move (couplage Rust). */
  revealable: string[];
  faits_etablis: string[];
  jetons_contradiction: string[];
  /** Étiquettes de sujet tu (jamais le contenu). */
  withhold: string[];
}

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
