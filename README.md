# Choix narratifs & JdR narratifs

Site statique d'outils interactifs pour le jeu de rôle narratif (joueurs solo et
meneurs de jeu), en français. Stack : **Astro 5** + **TypeScript** (sortie 100 %
statique), tests avec **vitest**. Le **moteur narratif** ajoute un cœur **Rust →
WASM** (déterministe) embarqué dans le site.

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

Un produit **à part** des outils v1 (cartes, plan de classe, sélecteurs de
mues/playbooks, parallaxe, Jauges & Tarot). Cœur Rust pur (`cn-core`) compilé en
WASM, orchestré côté client, avec deux frontières « murs » qui protègent le canon.

| Page | Rôle |
| --- | --- |
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

