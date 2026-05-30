---
objective: Socle Astro 5 + TypeScript, sortie statique, pnpm, vitest, prêt pour les outils.
success_condition: "pnpm install && pnpm build && pnpm test"
iteration: 0
created_at: "2026-05-30T00:00:00Z"
plan_kind: simple
issue: 1
---

# Socle Astro 5 + structure du projet (#1)

## Projection M/C/D

- **M (Must)** : Astro 5 stable, TypeScript strict, `output: 'static'`, vitest
  configuré et vert, page d'accueil minimale `lang="fr"`, build produisant
  `dist/index.html`. Gestion par pnpm uniquement.
- **C (Could)** : favicon SVG placeholder, README de démarrage, arborescence de
  dossiers prête (`src/layouts`, `src/components`, `src/scripts`, `src/data`).
- **D (Don't)** : aucune logique métier (sélecteur de mues, éditeurs Konva,
  storage localStorage, embeds) ; pas de WASM ; pas d'i18n ; pas de CI.

## Règles applicables

| Règle | Source | Application |
| ----- | ------ | ----------- |
| pnpm uniquement (jamais npm) | `~/.claude/CLAUDE.md` | `package.json` déclare `packageManager: pnpm@10.5.2` ; toutes commandes via `pnpm`. |
| Pas de corepack (cassé sur la machine) | Consigne environnement | `pnpm` invoqué directement, README documente l'install globale de pnpm. |
| 100 % statique, Astro, français | `BRAINSTORM.md` | `output: 'static'`, page `<html lang="fr">`. |
| TypeScript pur, pas de WASM en v1 | `BRAINSTORM.md` | `tsconfig` strict ; `pnpm-workspace.yaml` réserve l'emplacement d'un futur crate WASM. |

## Phases

1. **Branche & plan** : `feat/1-socle-astro` depuis `main` ; rédaction de ce plan.
2. **Scaffold** : `package.json`, `astro.config.mjs`, `tsconfig.json`,
   `pnpm-workspace.yaml`, `.nvmrc`, `vitest.config.ts`, `src/env.d.ts`,
   arborescence `src/` + `public/` avec `.gitkeep`, `src/pages/index.astro`,
   `public/favicon.svg`, `README.md`, `tests/smoke.test.ts`.
3. **Validation réelle** : `pnpm install`, `pnpm build` (vérifier
   `dist/index.html` + `lang="fr"`), `pnpm test`, `pnpm check`.
4. **Livraison** : commit `feat: socle Astro 5 + structure du projet (#1)`,
   push, ouverture de PR vers `main` (sans merge).

## Critère de succès

`pnpm install && pnpm build && pnpm test` passe, et `dist/index.html` existe
en contenant `lang="fr"`.
