# Choix narratifs — moteur narratif

Site statique, en français, centré sur un **moteur narratif** : un cœur **Rust →
WASM** déterministe et agnostique du système de jeu, embarqué dans le site et
donné comme **source de vérité** des données. Stack : **Astro 5** + **TypeScript**
(sortie 100 % statique), tests avec **vitest**.

Le site présente le **concept**, la **documentation** du moteur, quelques
**articles**, et son **usage** (élaboration → jeu → compte-rendu). Code source :
<https://github.com/RebelliousSmile/choix-narratifs>.

## Prérequis

- **Node.js ≥ 20** (voir `.nvmrc`).
- **pnpm 10.x** installé en global : `npm install -g pnpm@10`.
  > Note : `corepack` n'est pas utilisable sur la machine de dev (erreur de
  > signature) ; installer pnpm globalement et l'invoquer directement.
- **Rust** *(uniquement pour modifier le moteur)* : `rustup` + cible
  `wasm32-unknown-unknown` + `wasm-pack` **ou** `wasm-bindgen-cli`. Le `pkg/` WASM
  étant **versionné**, builder ou déployer le site n'exige **aucune toolchain Rust**.

## Commandes

```bash
pnpm install      # installe les dépendances
pnpm dev          # serveur de développement
pnpm build        # build statique dans dist/
pnpm preview      # prévisualise le build
pnpm check        # vérification de types Astro
pnpm test         # lance vitest (une passe)

pnpm test:engine  # tests du crate Rust (cargo test)
pnpm build:engine # tests + (re)build du WASM → src/scripts/narrative/pkg/
pnpm deploy:prod  # build:engine → astro build → transfert SSH → git push
```

`build:engine` est **tolérant par défaut** (avertit sans bloquer si la toolchain
Rust manque, et garde le `pkg/` versionné). Drapeaux : `ENGINE_STRICT=1` (gate),
`SKIP_ENGINE=1` (ignore l'étape), `ENGINE_TESTS_ONLY=1` (tests sans rebuild).

## Le moteur narratif

Cœur Rust pur (`cn-core`) compilé en WASM, orchestré côté client, avec deux
frontières « murs » qui protègent le canon. C'est le produit du site.

| Page | Rôle |
| --- | --- |
| `/` | le **concept** (landing) |
| `/documentation` | l'**architecture** du moteur, rendue sur le site |
| `/articles` | notes et articles (collection de contenu Astro) |
| `/elaboration` | composer une scène (bucket de modules **ou** formulaire), jouer/préparer |
| `/moteur-narratif` | jouer la scène (boucle prepare → narrate → resolve), trace dev |
| `/compte-rendu` | clore : résoudre les secrets (membrane), exporter le récit |

Détails d'architecture (le mur `packet.rs`, le verifier, la membrane d'export, les
coutures Hub/Suddenly, comment régénérer le `pkg/`) : **`engine/README.md`**.

## Structure

```
src/
  pages/                # routes Astro (.astro) — dont elaboration / moteur-narratif / compte-rendu
  layouts/              # gabarits partagés
  components/           # composants réutilisables
  scripts/
    narrative/          # orchestration du moteur (types, session, export, stores)
      pkg/              # artefact WASM VERSIONNÉ (glue JS + .wasm) — ne pas éditer à la main
  data/                 # données statiques (jeux, mues, presets…)
engine/                 # moteur narratif Rust (cn-core / cn-wasm / harnais) — voir engine/README.md
public/                 # assets servis tels quels (favicon…)
tests/                  # tests vitest (dont tests/narrative/)
```

