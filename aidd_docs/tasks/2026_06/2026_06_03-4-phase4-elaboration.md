---
objective: Phase 4 — UI d'élaboration non-technique (US-2.1/US-3.1) + scènes custom jouables.
success_condition: "pnpm test && pnpm check && pnpm build ; cargo test ; scène créée au formulaire jouable bout-en-bout."
iteration: 0
created_at: "2026-06-03T00:00:00Z"
plan_kind: build
---

# Phase 4 — UI d'élaboration + scènes custom

## Constats d'audit (avant implémentation)

1. **Le moteur n'amorce que `World::scene_docker()` codé en dur.** Une scène créée
   au formulaire n'est pas jouable sans un chemin d'injection. Décision (FX) :
   **étendre le Rust** avec `WasmEngine.fromScene(specJson)` — le packet (contrat
   figé v1) ne change PAS, seul *comment* on construit le `World` change. Pas
   d'incrément de version de schéma.

2. **Couplage de jouabilité (le point délicat).** Le verifier exige qu'au moins un
   `jetons_move` apparaisse dans la prose. Le `StubNarrator` émet `revealable[0]`.
   Donc pour qu'une scène custom soit jouable : **`jetons_move = revealable`**.
   Sinon le stub échoue toujours en `move_non_execute`.

3. **Le mur sémantique de la scène custom.** `jetons_fuite` (mots qui trahissent le
   secret) doit être : (a) non vide, (b) jamais sous-chaîne d'un `revealable` —
   sinon le seul énoncé que le PNJ peut lâcher fuit le secret. `SceneSpec::validate`
   refuse ces cas. Dérivation par défaut : noms propres du secret (mot capitalisé
   hors mots-outils). Le formulaire pré-remplit ce champ, éditable.

4. **Persona : un seul formulaire, commutateur jouer/préparer (FX).** L'auto-ignorance
   est un réglage de session (§3 user-stories), pas un mode global. Mode « jouer »
   (US-2.1, Suddenly) : secret flouté. Mode « préparer » (US-3.2, MJ) : tout visible
   + fiche de prep. Pure UI — n'affecte pas le moteur.

5. **Bucket = catalogue de `SceneSpec` JSON.** Le docker devient le premier module ;
   le même format sert bucket et création. Une scène sélectionnée OU créée produit
   un `SceneSpec` → `fromScene`.

## Plan d'exécution

| # | Brique | Détail |
|---|--------|--------|
| 1 | `core/state.rs` | `SceneSpec` (Serde) + `World::from_spec` + `SceneSpec::validate` + dérivation jetons_fuite |
| 2 | `core/engine.rs` | `Engine::author(spec) -> Result<Engine,String>` |
| 3 | `wasm/lib.rs` | `WasmEngine.fromScene(specJson) -> Result<_,String>` |
| 4 | rebuild | `pnpm build:engine` → `pkg/` régénéré + committé |
| 5 | `narrative/scene-spec.ts` | miroir TS de `SceneSpec` + validation + dérivation (prefill) |
| 6 | `narrative/modules.ts` | catalogue bucket (docker + à venir) |
| 7 | `pages/elaboration.astro` + composant | formulaire 3 étapes + bucket + toggle jouer/préparer + aperçu live |
| 8 | passage spec → moteur | `sessionStorage` ; `moteur-narratif` lit la spec en attente → `fromScene` |
| 9 | tests | Rust (from_spec, validate, jouabilité) + TS (scene-spec, contrat) |

## Frontière documentée

`SceneSpec` est **authoring-facing** : il vit côté client (UI → moteur), jamais
dans le paquet. Le secret y figure en clair (c'est l'auteur qui le saisit) — il ne
franchit le mur à aucun moment car `prepare` ne lit que les champs publics du World.
