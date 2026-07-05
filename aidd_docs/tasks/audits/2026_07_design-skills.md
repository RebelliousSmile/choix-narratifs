# Audit : cycle design (5 skills du plugin `design`)

Méta-audit critique du pipeline `define → destructure → adjust → enforce → diffuse`, fondé sur une exécution réelle de bout en bout sur le projet choix-narratifs (construction d'un design system « éditorial dramatique » à deux registres). Cible = les **skills**, pas le code projet.

- **Date** : 2026-07-05
- **Scope** : `plugins/design/skills/{define,destructure,adjust,enforce,diffuse}` + `plugins/design/references/*`
- **Health** : fair (un défaut critique dans le gate, isolé et déjà contourné localement ; le reste est de la dette de tooling)
- **Findings** : 1 critical, 6 warning, 4 minor

Health : `fair` — le seul critique touche le verrou (`lint-core`) mais il est isolé et corrigeable en S ; les autres findings sont des lacunes de chaîne, pas des cassures.

## Findings

Chemins relatifs à `C:/Users/fxgui/Documents/LLM/Marketplace/plugins/design/`.

| Sev | Category | Location | Issue | Suggested fix | Effort |
| --- | --- | --- | --- | --- | --- |
| 🔴 | code-quality | `skills/enforce/adapters/lint-core.mjs:82-84` (usage `:102-110`) | Le mapping inverse `varName.replace(/-/g,'.')` est **ambigu** : une clé de token à tiret (`text-muted`) devient `color.semantic.text.muted` ≠ chemin réel `color.semantic.text-muted`. Tout token sémantique multi-mot fait **échouer le gate à tort**. Rencontré sur le vrai projet : 290 fausses erreurs après un `adjust` pourtant correct. | Construire l'ensemble des noms de vars **valides** dans le sens direct (chemin → `--a-b-c`, comme l'adapter) et comparer. Round-trip déterministe. | S |
| 🟡 | architecture | `references/token-schema.md:78-108` ; `references/design-system-contract.md:37` | Le contrat déclare les adapters « generated / never hand-edited » mais **aucun générateur n'est fourni** ; `define`/`adjust` disent « regenerate both adapters » à la main. J'ai écrit `tokens.css` à la main → il a **dérivé** de `tokens.json` (`lineHeight`/`zIndex`). Cause racine du finding suivant. | Livrer un générateur `tokens.json → tokens.css/theme.css` et l'appeler depuis `write-material`/`freeze`. | M |
| 🟡 | code-quality | `references/token-schema.md:24` vs `:80-90` | Incohérence de nommage **dans le référentiel** : les groupes requis listent `font.lineHeight`, `zIndex` (camelCase) mais la règle adapter dit kebab (`.`→`-`). Les deux ne peuvent pas round-tripper (`font.lineHeight.base` → `--font-lineHeight-base`, pas `--font-line-height-base`). | Trancher : clés de tokens en **kebab** (`line-height`, `z-index`) et l'énoncer explicitement. | S |
| 🟡 | architecture | `skills/enforce/references/gate-wiring.md:62` | Le hook pre-commit et les exemples `success_condition` ne matchent que `\.html$`. Les projets Astro/React/Vue portent les classes dans `.astro`/`.tsx`/`.vue` → **le gate ne couvre rien** en l'état. J'ai dû réécrire le glob. | Globiser les extensions de templates du projet ; documenter par stack (baseline non-WP). | S |
| 🟡 | architecture | `skills/adjust/02-freeze` ; `references/manifest-schema.md:56-61` | Aucune **réconciliation manifeste ↔ code réel** avant figeage. `define` écrit l'inventaire en prose (savoir partiel) ; `adjust` le fige tel quel. Résultat vécu : figé en 1.0.0, puis `enforce` a trouvé **22 classes réelles non déclarées** → re-figeage immédiat 1.1.0. | Étape `define`/`adjust` : grep des `class="…"` réels, diff contre le manifeste avant de figer. | M |
| 🟡 | architecture | `skills/destructure` (sortie chat uniquement) ; `skills/adjust/01-arbitrate` | `destructure` est read-only et **ne persiste rien** ; `adjust` doit « collecter les pistes destructure » qui n'existent que dans la conversation → perdues entre sessions, arbitrage non traçable. | `destructure` émet un `design/critique.md` (ou ledger) que `01-arbitrate` consomme. | M |
| 🟡 | tests | `skills/enforce/05-fidelity-gate` (chemin construction) | Le gate de **fidélité** exige une maquette → **sauté** en construction-from-brief. Un lint vocabulaire vert ne dit rien du layout/contraste/rendu. Tout mon cycle était en construction : seul le vocabulaire était gardé ; un layout responsive cassé passerait. | Pour le chemin construction : smoke visuel léger (rendu wireframe, pas de scroll horizontal, échantillon de contraste) comme 2ᵉ gate. | L |
| 🟢 | code-quality | `skills/enforce/adapters/lint-core.mjs:95` | `if (!knownBases.has(blockPart)) continue;` — une classe de composant **inconnue** (bloc absent du manifeste) est traitée en « utility » et **passe**. Un typo de base (`heor__title`) ou un composant non déclaré échappe au gate. | Mode strict optionnel + allowlist de préfixes utilitaires (ex. `wf-`, `u-`). | M |
| 🟢 | architecture | `references/token-schema.md:96-108` | `define`/`adjust` imposent l'adapter Tailwind `theme.css` sans **chemin CSS vanilla** de première classe. Projet Astro vanilla → j'ai omis `theme.css` de façon ad hoc. | Nommer « CSS custom properties vanilla » comme cible supportée ; rendre `theme.css` conditionnel à la détection Tailwind. | S |
| 🟢 | architecture | `references/design-system-contract.md:20-38` | **Aucun skill ne possède le câblage** de l'adapter dans l'app réelle. Le `:root` généré a dérivé du `:root` inline de l'app jusqu'à ce que je le branche manuellement en `enforce`. | `adjust`/`enforce` : étape explicite « importer `tokens.css` comme source unique de l'app ». | S |
| 🟢 | architecture | `skills/diffuse` (sortie `design/wireframes/*.html`) | Les wireframes `diffuse` sont des **previews orphelines** : pas de chemin du CSS de référence vers l'implémentation réelle des composants → la valeur fuit (re-typage manuel). | Émettre des composants stack-natifs (via pivot `sc-*`) ou documenter le chemin de reprise. | M |

## Top actions (classées par impact)

1. **Corriger le mapping de `lint-core.mjs`** (résout 🔴 ligne 1) — bug de correction dans le verrou lui-même ; le gate rejette des entrées correctes. Fix en S, déjà prototypé (patch local dans ce projet). Remonter en amont du plugin. Handoff : `refactor`.
2. **Livrer un générateur d'adapters + trancher le kebab** (résout les 2 🟡 token-schema) — supprime la dérive `tokens.json` ↔ `tokens.css` à la racine, qui a produit le finding critique en aval. Handoff : `implement`.
3. **Réconciliation manifeste ↔ code avant figeage** (résout le 🟡 adjust + atténue le 🟢 lint-core:95) — évite le re-figeage immédiat 1.0.0→1.1.0 systématique. Handoff : `implement`.
4. **Généraliser le gate au-delà de `.html`** (résout le 🟡 gate-wiring) — sans ça le gate est inopérant sur toute stack composant. Handoff : `refactor`.
5. **Persister la critique `destructure` + smoke visuel en construction** (résout les 2 🟡 restants) — traçabilité de l'arbitrage et filet visuel quand il n'y a pas de maquette.

## Coverage

- **Scanned** : code-quality (logique des skills, cohérence du référentiel), architecture (handoffs entre skills, propriété du câblage, frontières), tests (natures de gate : vocabulaire vs fidélité).
- **Skipped** : security, dependencies, performance — sans objet pour un pipeline de skills de design (aucune surface d'exécution, pas de dépendances applicatives, pas de hot path). `ui` non listé comme pillar distinct : ses findings (drift, états, fidélité) sont ici reclassés en architecture/tests car ils portent sur l'**outillage**, pas sur une UI livrée.

---

### Note de contexte (preuve de première main)

Cet audit n'est pas théorique : les findings 🔴 et les 3 premiers 🟡 ont été **rencontrés et contournés** pendant l'exécution réelle du cycle sur ce projet (patch local `design/lint/lint-core.mjs`, réalignement kebab de `design/tokens.json`, re-figeage manifeste 1.0.0→1.1.0, réécriture du glob de gate pour `.astro`). Le cycle **produit un résultat correct** (gate vert, build vert), mais au prix d'interventions manuelles que les skills devraient absorber.
