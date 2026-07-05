# Choix narratifs — charte de design

> **Statut : FIGÉ** (adjust · 2026-07-05). Version **1.1.0**.
> _1.1.0 — delta additif (réconciliation `enforce`) : éléments réels ajoutés à `card`/`wall`/`cycle`/`hero`._
> Les 3 couches sont canoniques : `tokens.json` (valeurs) · `components.json` (vocabulaire) · ce fichier (prose).
> Home du design system : `design/` à la racine du projet.
> Un re-figeage passe par `/design:adjust` (rejoue le delta, bump version).

## 1. Provenance

- **Origine** : extraction du CSS livré (`define`, chemin extraction) → challenge divergent (`destructure`) → figeage (`adjust`). Aucune maquette externe ; le CSS de `src/layouts/BaseLayout.astro` a servi de socle, la direction a été rouverte puis tranchée.
- **Direction retenue** : **éditorial dramatique** (territoire B), à **deux registres** — voir §2.
- **Contexte projet** : site statique Astro (zéro-JS par défaut), vitrine du moteur narratif déterministe (Rust → WASM). Public : découvreurs du projet + utilisateurs du moteur. FR.
- **Date** : 2026-07-05. **Version** : 1.0.0 (premier figeage).
- **Décisions d'arbitrage** : serif = **Spectral** (vs Newsreader/Source Serif 4) · dark-only conservé · une seule ombre (`shadow.overlay`) tolérée pour les couches flottantes, le reste plat.

## 2. Le principe directeur — deux registres

> **On lit en empattement, on opère en linéale.**

La frontière entre vitrine et application est un **changement de registre perceptible**, pas un badge. C'est ce qui « identifie les parties applicatives comme telles ».

| | Registre **éditorial** (vitrine) | Registre **applicatif** (moteur) |
|---|---|---|
| Pages | home/concept, documentation, articles, légal | `elaboration`, `moteur-narratif`, `compte-rendu` |
| Titres | **serif** `--font-family-serif` (Spectral), fluide | linéale `--font-family-sans`, plus petite, fonctionnelle |
| Corps / UI | sans-serif système | sans + **mono** (`--font-family-mono`) pour lectures machine (IDs d'événements, seeds) |
| Densité | aérée, lecture 44rem (`container.prose`) | dense, `container.wide` 80rem |
| Chrome | `site-header` + `site-footer` | `app-shell` (toolbar + rail timeline + statusbar) |
| Layout | `BaseLayout.astro` | `AppLayout.astro` (à implémenter) |

## 3. Foundations

### Core trio
1. **Palette** — rampe **prune/aubergine** sombre (`color.neutral.900→50`) + **accent magenta** (`color.brand.primary`, survol `-strong`) + **or** (`color.accent.gold`) réservé au focus/avertissement. **Dark-only.**
2. **Type** — pairing **Spectral (serif, titres vitrine)** + **système sans (corps/UI)** + **mono (registre applicatif)**. Échelle modulaire (~1.2). Poids 400/500/600/700.
3. **Icônes** — jeu **unique** :
   - `icon.library: lucide`
   - `icon.style: outline`
   - Inlinées en **SVG** (zéro-JS, pas de runtime d'icônes). Tokens `icon.size.*` / `icon.stroke.*`. **Jamais d'emoji comme iconographie.**

### Couleur
Les composants ne référencent jamais un hex : ils passent par `color.semantic.*`. Profondeur par **surfaces** : `surface-sunken` < `surface` < `surface-raised` (+ bordures 1px). États : `danger`/`success`/`warning`(=or)/`info` — toujours doublés d'une **icône ou forme**, jamais couleur seule.

### Typographie
Serif = titres vitrine uniquement. Sans = corps + toute l'UI des deux registres. Mono = lectures machine + `<pre>`. Interlignes : `tight 1.15` (display), `snug 1.25` (titres), `base 1.6`, `prose 1.7`. Sur-titres/labels : `letter-spacing.eyebrow` (0.12em).

### Iconographie
Lucide outline inliné. Voir core trio. Les flèches texte (`→ ↗ ←`) historiques sont à **remplacer** par des icônes du jeu lors de l'implémentation.

### Espacement, rayon, bordure, élévation, motion
- Espace : échelle `1→6` (`0.25 · 0.5 · 1 · 1.5 · 2.5 · 4 rem`).
- Rayon : `sm 6px` · `md 12px` · `full 999px` (pills, status-dot).
- Bordure : `1px` défaut · `3px` (focus, filet, marqueur de registre applicatif).
- **Élévation** : le système est **plat**. Profondeur = surfaces + bordures. **Unique exception** : `shadow.overlay`, réservé aux couches **flottantes détachées** (toast, dropdown).
- Motion : `fast 150ms` / `base 200ms`, easing `standard`. Prévoir le fallback `prefers-reduced-motion` (couper les transitions non essentielles).

## 4. Responsive strategy

Mobile-first, breakpoints **`min-width` homogènes** : `sm 640px` · `md 768px` · `lg 1024px`.

- **Cœur mobile (toujours livré)** : navigation complète, contenu/diagrammes empilés lisibles, lecture plafonnée par le viewport, cibles ≥ `size.touch.min` (44px).
- **Enrichi (≥ md)** : header sur une ligne, diagrammes en grille.
- **Applicatif (≥ lg)** : `app-shell` passe multi-colonnes (rail + workspace). En-dessous, l'app s'empile (rail en tiroir/haut).

Conteneurs : `prose 44rem` · `default 64rem` · `wide 80rem` (workspace).

## 5. Component inventory

*(concorde 1:1 avec `design/components.json` — la source fermée vérifiable)*

**Registre éditorial / chrome**

| Composant | Rôle | Variantes | Divergence responsive |
|---|---|---|---|
| `site-header` / `site-nav` | Chrome nav, item actif `aria-current` | lien interne · externe (`site-nav__external`) | wrap < md |
| `site-footer` | Copyright + liens légaux | — | wrap |
| `skip-link` | Accès clavier | — | révélé au focus |
| `hero` | Accroche + CTA | — | empilé |
| `btn` | Action | `primary`/`secondary`/`ghost`/`danger` · `sm`/`lg` | — |
| `card` | Carte de contenu | — | — |
| `post` | Gabarit d'article | — | largeur `prose` |
| `legal` | Page légale | — | largeur `prose` |
| `wall` / `cycle` | Diagrammes explicatifs home | — | 1 col < sm |

**Registre applicatif**

| Composant | Rôle | Variantes | Divergence responsive |
|---|---|---|---|
| `app-shell` | Coquille de l'app moteur | — | empilé < lg, multi-col ≥ lg |
| `toolbar` | Barre d'outils | — | actions repliables |
| `panel` | Panneau de travail | `raised`/`sunken` | — |
| `field` / `input` | Saisie + label/hint/error | `field--invalid` · `input--sm`/`lg` | — |
| `tabs` | Onglets | — | — |
| `badge` | Étiquette d'état | `accent`/`danger`/`success`/`info`/`neutral` | — |
| `status-dot` | Indicateur d'état | `active`/`idle`/`error` | — |
| `timeline` | Fil d'événements (event-sourcing) | — | rail ≥ lg, liste < lg |
| `empty-state` | État vide | — | — |
| `toast` | Notification flottante | `success`/`danger`/`info` | — |
| `icon` | Icône SVG Lucide inline | `sm`/`lg` | — |

Convention de nommage canonique : **BEM** (`base` / `base__element` / `base--modifier`).

## 6. Matrice d'états (pilotes)

| Composant | default | hover | focus | active | disabled | loading | error |
|---|---|---|---|---|---|---|---|
| `btn` | ✅ | ✅ | anneau or | ✅ | `[disabled]` atténué | via `btn__icon` (spinner) | `btn--danger` |
| `input` | ✅ | ✅ | anneau or | — | `[disabled]` sunken | — | `field--invalid` + `field__error` |

## 7. Open questions (non bloquantes — post-figeage)

1. **Câblage `tokens.css`** — l'adapter reproduit le `:root` de `BaseLayout.astro` mais n'est pas encore importé ; bascule vers source unique à faire à l'implémentation (renommage `--color-accent` → `--color-semantic-accent`, etc.).
2. **`theme.css` (Tailwind) non généré** — projet en CSS vanilla ; seul `tokens.css` est produit. Adapter Tailwind sans objet.
3. **Auto-hébergement Spectral** — woff2, titres uniquement, 1 graisse display, subset latin, `font-display: swap`.
4. **`AppLayout` + primitifs applicatifs** — chantier d'implémentation (code), indépendant du contrat désormais figé.
