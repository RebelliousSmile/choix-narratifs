---
objective: Moteur narratif Phase 1 (« la boucle juste ») + challenge testé du contrat packet.rs.
success_condition: "cd engine && cargo test && cargo run -p cn-harness"
iteration: 0
created_at: "2026-06-03T00:00:00Z"
plan_kind: simple
---

# Moteur narratif — Phase 1 + challenge de packet.rs

Exécution du plan d'action (track CN), premier jalon « la boucle juste », plus la
demande explicite de **challenger et tester `packet.rs`** (brique non vérifiée).

## Projection M/C/D

- **M (Must)** : crate `core` pure (état, registre épistémique, directeur,
  verifier, façade `restore/prepare/resolve/snapshot`) ; `packet.rs` intégré
  **verbatim** et compilant avec ses 5 tests ; harnais terminal avec `/narrate`
  stub démontrant le critère de sortie (fuyard écarté + resample invisible) ;
  suite de tests qui challenge `packet.rs`.
- **C (Could)** : trace dev par tour (US-1.2) ; snapshot round-trip ; README.
- **D (Don't)** : couche wasm-bindgen, island Astro, UI d'élaboration, export,
  vrai appel LLM — phases ultérieures du plan. Stub avant LLM, terminal avant island.

## Livré

- `engine/` : workspace cargo (`cn-core` + `cn-harness`).
- `core/src/packet.rs` : contrat recopié verbatim (source de vérité CN ↔ Hub).
- `core/src/{state,directeur,verifier,engine}.rs` : le cœur Phase 1
  (scène : 1 PNJ « le docker », 1 secret « qui a payé »).
- `core/tests/packet_challenge.rs` : 16 tests de challenge.
- `harness/src/main.rs` : la boucle déroulée en deux tours.

## Résultat des tests

`cargo test` : **9 unitaires** (5 contrat packet + 4 moteur) + **16 challenge** = 25, tous verts. Clippy clean.

Critère de sortie démontré (harnais) :
- Tour 1 : fuyard `#0` (cite « Verain ») écarté → commit du candidat valide `#1`.
- Tour 2 : 3 candidats invalides (fuite / contradiction / move non exécuté) →
  resample invisible → commit. Seul le paquet canon-free franchit le mur.

## Bilan du challenge de `packet.rs`

Aucun bug : le contrat tient. Mais 5 tests avaient des angles morts (VersionMismatch
jamais déclenché, `n` jamais testé au-dessus de `N_MAX`, `deny_unknown_fields`
prouvé seulement à la racine, rename « move », champ requis manquant, enum
invalide, enveloppe `NarrateResponse`). Surtout, deux tests **figent la frontière** :
le mur est *structurel*, pas *sémantique* — un secret dans une string `revealable`
/`withhold` passe `validate()` (c'est le `verifier` canon-aware qui le coupe). Voir
`engine/README.md`.
