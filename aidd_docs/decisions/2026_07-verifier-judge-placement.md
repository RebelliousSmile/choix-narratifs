# ADR — Où vit le juge sémantique (#39)

**Statut** : Acceptée (2026-07-06)
**Contexte** : issue #39 (fille de #33), plan `aidd_docs/tasks/2026_07/2026_07_06-39-verifier-semantique.md`

## Contexte

Le verifier actuel (`engine/core/src/verifier.rs`) est une checklist par jetons, repliée accents/casse (cf. `texte::plier`, posé par #32) : fuite (`Fuite`) / contradiction (`Contradiction`) / move exécuté (`MoveNonExecute`). Robuste mais lexical — un synonyme ou une reformulation passe à travers.

L'issue #39 demande de détecter ces trois cas **par le sens**, sans changer la forme du contrat (`Rejet::{Fuite, Contradiction, MoveNonExecute}`) ni le couplage avec la boucle (resample invisible). La question ouverte posée par l'issue elle-même : **où vit le juge sémantique** ?

## Contrainte structurante

`Engine::resolve()` est **synchrone** et tourne dans le WASM (`engine/wasm/src/lib.rs`). La seule couture asynchrone de la boucle hôte est `narrator.narrate()` (`src/scripts/narrative/session.ts`). Un juge LLM est intrinsèquement asynchrone → il **ne peut pas** tourner à l'intérieur de `resolve()` tel qu'aujourd'hui structuré.

## L'asymétrie qui force la décision

Les trois vérifications n'ont **pas** la même relation au secret :

| Vérification | A besoin du canon (secret) ? | Conséquence |
| --- | --- | --- |
| `Fuite` | **Oui** — juger « nommer le secret » sémantiquement suppose de connaître le secret | Un juge LLM canon-aware devrait recevoir le canon → le secret sort du client → **le mur se déplace**. |
| `Contradiction` | **Non** — se juge contre les `faits_etablis` publics, déjà canon-free | Peut être jugée par un LLM **canon-free**, sans déplacer le mur. |
| `MoveNonExecute` | **Non** — « la prose joue-t-elle le move choisi » ne lit que des champs publics du paquet (`move`, `revealable`) | Idem : jugement sémantique canon-free, mur intact. |

## Décision

**Option A — répartition asymétrique, mur préservé** :

- `Fuite` reste **lexicale + canon-aware + côté client + synchrone** dans `verifier()`. C'est la seule vérification qui a réellement besoin du secret ; un filet lexical y reste défendable et garde le mur intact. Elle reste le filet autoritaire à l'intérieur de `resolve()`.
- `Contradiction` et `MoveNonExecute` deviennent un **juge sémantique canon-free** (`/judge`, frère de `/narrate`, aveugle au canon), invoqué dans la boucle hôte comme passe asynchrone. Comme il ne voit jamais le secret, le mur ne bouge pas.
- Le contrat `Rejet` est inchangé ; le mécanisme de resample invisible est inchangé (un lot rejeté sémantiquement déclenche le même chemin de resample).

## Alternatives écartées

- **Option B — juge de fuite canon-aware** : déplacerait le mur (le secret atteindrait un provider LLM). Écartée ; à ne reprendre que si le produit accepte explicitement ce compromis.
- **Option C — juge purement consultatif** (classement de qualité, jamais de rejet dur) : la plus petite en effort, mais ne rend pas la détection de contradiction « par le sens » comme le demande l'issue. Conservée comme repli si le juge sémantique s'avère trop bruyant (trop de faux positifs).

## Invariants à préserver (verbatim)

- `Rejet::{Fuite, Contradiction, MoveNonExecute}` ne change pas de forme.
- Le couplage resample invisible (`Outcome::ResampleNeeded` → renarration → re-jugement) ne change pas.
- Le mur (canon jamais transmis au-delà du client) ne se déplace pas : le juge sémantique est construit pour ne **jamais** recevoir le canon.

## Conséquences

- `verifier.rs` documente la fuite comme filet lexical autoritaire ; contradiction/move deviennent délégables au juge.
- Nouvelle couture asynchrone dans `session.ts` entre `narrate` et `resolve` (cf. plan, Phase 3).
- Nouveau endpoint Hub `/judge` (sibling de `/narrate`), à spécifier côté Hub — dépendance non bloquante pour la voie stub (testable dès maintenant hors réseau).
- Risque de faux positifs du juge sémantique : mitigé par repli sur l'option C si nécessaire (cf. registre des risques du plan).
