# Choix narratifs & JdR narratifs

Site statique d'outils interactifs pour le jeu de rôle narratif (joueurs solo et
meneurs de jeu), en français. Stack : **Astro 5** + **TypeScript** (sortie 100 %
statique), tests avec **vitest**.

## Prérequis

- **Node.js ≥ 20** (voir `.nvmrc`).
- **pnpm 10.x** installé en global : `npm install -g pnpm@10`.
  > Note : `corepack` n'est pas utilisable sur la machine de dev (erreur de
  > signature) ; installer pnpm globalement et l'invoquer directement.

## Commandes

```bash
pnpm install   # installe les dépendances
pnpm dev       # serveur de développement
pnpm build     # build statique dans dist/
pnpm preview   # prévisualise le build
pnpm check     # vérification de types Astro
pnpm test      # lance vitest (une passe)
```

## Structure

```
src/
  pages/        # routes Astro (.astro)
  layouts/      # gabarits partagés
  components/   # composants réutilisables
  scripts/      # logique TypeScript des outils
  data/         # données statiques (jeux, mues, presets…)
public/         # assets servis tels quels (favicon…)
tests/          # tests vitest
```
