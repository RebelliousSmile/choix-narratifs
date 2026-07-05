# Gate 1 — Règle de génération (design system)

Le design system de ce projet est figé dans `design/` (contrat 3 couches).
Autorité : `design/tokens.json` (valeurs) · `design/components.json` (vocabulaire fermé) · `design/design-system.md` (charte).

## Avant de générer ou modifier tout HTML / `.astro` / CSS lié au design

1. **Lire `design/components.json`** — n'utiliser que les classes déclarées (`base`, `elements.*`, `modifiers.*`). Toute classe dont le bloc est un composant connu mais qui n'est pas déclarée = violation `error`.
2. **Lire `design/tokens.json`** — toute référence `var(--…)` doit correspondre à un chemin de token existant (ex. `var(--color-semantic-accent)` ↔ `color.semantic.accent`). Pas de hex/px en dur là où un token existe.
3. Si une classe ou un token manque dans le contrat → **STOP**, ne pas générer. Signaler la lacune ; elle se résout par `/design:adjust` (re-figeage), pas en inventant la classe.

## Principe directeur à respecter

« On lit en empattement, on opère en linéale. » Registre **éditorial** (serif titres, sans corps) pour la vitrine ; registre **applicatif** (sans + mono, app-shell) pour les pages moteur. Cf. `design/design-system.md §2`.

## Vérification

```
pnpm lint:ds        # lint vocabulaire sur src/**/*.astro + design/wireframes/*.html
```

Le gate doit être **vert** avant tout commit touchant `.astro`/`.html` (hook `scripts/hooks/pre-commit`).
