# Moteur narratif (`engine/`) — cœur Rust

Track CN du plan d'action. Crate `core` **pure** (état, registre épistémique,
directeur, verifier, contrat de couture) compilable WASM *et* natif, plus un
`harness` terminal qui déroule la boucle avec un `/narrate` **stub**.

## Lancer

```bash
cd engine
cargo test          # 5 tests de contrat (packet) + 4 moteur + 16 de challenge
cargo run -p cn-harness   # déroule la boucle (Phase 1)
```

## Architecture

```
engine/
  core/                     # crate pure `cn-core`
    src/
      packet.rs             # CONTRAT (source de vérité CN ↔ Hub) — verbatim, ne pas diverger
      state.rs              # World + Canon + registre épistémique (event-sourced)
      directeur.rs          # action joueur + état public → paquet canon-free
      verifier.rs           # canon-aware : checklist fuite / contradiction / move
      engine.rs             # façade : restore / prepare / resolve / snapshot
    tests/
      packet_challenge.rs   # tests qui CHALLENGENT packet.rs (cf. plus bas)
  harness/                  # binaire terminal, /narrate stub
```

API (cf. plan §1) :

```
Engine::restore(snapshot?) -> Engine
engine.prepare(action)     -> Prepared { packet, n }   // directeur → paquet canon-free
engine.resolve(candidates) -> Outcome                  // verifier → Commit | ResampleNeeded
engine.snapshot()          -> bytes
```

## État : Phase 1 — « la boucle juste » (jalon atteint)

Scène d'amorce : 1 PNJ (le docker), 1 secret (qui a payé). Critère de sortie du
plan, démontré par le harnais **et** par des tests automatisés :

- un tour où le **fuyard** (candidat qui cite le secret) est écarté par le verifier ;
- un tour « **tous invalides** » (fuite + contradiction + move non exécuté) qui
  déclenche un **resample invisible** (Mikado, §6) avant le commit.

Invariant montré en trace : seul le **paquet** (canon-free) franchit le mur ; le
canon (`Verain`) ne quitte jamais le moteur. Le stub re-désérialise le paquet,
ce qui prouve que seule la forme fermée a traversé.

## Challenge de `packet.rs`

`packet.rs` arrivait avec 5 tests, mais des invariants n'étaient **pas couverts**.
`core/tests/packet_challenge.rs` (16 tests) comble les angles morts :

| Angle mort des 5 tests fournis | Test de challenge |
| --- | --- |
| `VersionMismatch` jamais déclenché | `version_differente_rejetee`, `version_zero_rejetee` |
| `n` testé seulement à 0, jamais au-dessus de `N_MAX` ni aux bornes | `n_au_dessus_des_bornes_rejete`, `n_aux_bornes_accepte` |
| Borne d'égalité du budget (`budget == len`) | `budget_egal_aux_disponibles_accepte`, `budget_zero_toujours_ok` |
| `deny_unknown_fields` prouvé seulement à la racine | `champ_inconnu_imbrique_dans_form_rejete`, `..._dans_cadre_rejete` |
| Étanchéité du `#[serde(rename = "move")]` | `cle_json_move_obligatoire_la_cle_rust_est_refusee` |
| Champ requis manquant / variante d'enum invalide | `champ_requis_manquant_rejete`, `variante_enum_inconnue_rejetee` |
| JSON minimal (tous les `default` omis) | `json_minimal_sans_champs_default_parse` |
| Enveloppe `NarrateResponse` non testée | `narrate_response_round_trip`, `..._refuse_champ_surnumeraire` |

**Frontière documentée (le point important).** Deux tests figent une *limite* du
contrat : `limite_un_secret_dans_revealable_passe_la_validation` et
`limite_un_secret_dans_withhold_passe_la_validation`. Le mur de `packet.rs` est
**structurel** (aucun champ « canon » ; champs surnuméraires rejetés), **pas
sémantique** : `validate()` ne lit pas le *sens*, donc un secret glissé dans une
string `revealable`/`withhold` passe. C'est **par design** — la fuite sémantique
est coupée par le `verifier` (canon-aware, côté client), pas par ce type. Ces
tests existent pour que personne ne prenne `validate()` pour un filtre à secrets.

Bilan du challenge : **aucun bug dans `packet.rs`** — le contrat tient. Les tests
ajoutés verrouillent son comportement (régressions futures) et balisent sa
frontière de responsabilité.

## Prochaines étapes (plan §3)

2. Couche `wasm-bindgen` (`restore/prepare/resolve/snapshot`).
3. Island Astro `client:only` + IndexedDB + reprise de session.
4. UI d'élaboration + modules en bucket.
5. Producteur d'export + rôle éditeur.
