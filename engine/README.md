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

**Lecture DDD / hexagonale.** Le moteur est la **référence des données** ; les
consommateurs lisent son schéma et s'adaptent (jamais l'inverse).

- **Domaine** (`cn-core`) : modèle + règles purs, sans I/O — état, directeur,
  verifier, catalogue de gestes, contrat. C'est l'autorité du modèle de données.
- **Adaptateurs** : `cn-wasm` (port JS), l'orchestration TS, les pages Astro. Ils
  n'inventent pas de données ; ils consomment ce que le domaine publie.
- **Schéma publié** (la « dpc ») en deux formes, toutes deux émises depuis le domaine
  et **versionnées** (build/déploiement sans Rust) :
  - **types** compile-time → `generated/*.ts` (ts-rs) ;
  - **contrat runtime** agnostique (façon `template.json` de FoundryVTT) →
    `generated/contract.json` : les « possibles » (catalogue de gestes, domaines
    d'enums, bornes, version) que tout consommateur lit pour se data-driver.

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
  wasm/                     # couche wasm-bindgen `cn-wasm` (Phase 2)
    src/lib.rs              # façade JS WasmEngine
    tests/boundary.rs       # tests de la forme JSON exposée au TS
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

## Phase 2 — couche `wasm-bindgen` (`cn-wasm`)

Enveloppe mince (aucune logique) qui traduit l'API du core pour le JS de l'island.
Façade `WasmEngine` :

| Méthode JS | Rust | Entrée → sortie |
| --- | --- | --- |
| `new WasmEngine()` | `Engine::restore(None)` | scène d'amorce |
| `WasmEngine.fromSnapshot(u8)` | `Engine::restore(Some)` | `Uint8Array` → session |
| `prepare(action)` | `engine.prepare` | `string` → JSON `{ packet, n }` |
| `resolve(candidates)` | `engine.resolve` | `string[]` → JSON `Outcome` |
| `snapshot()` | `engine.snapshot` | → `Uint8Array` |
| `savoirJoueur()` | `engine.savoir_joueur` | → `string[]` |

Conventions de frontière : les structures traversent en **JSON `String`**
(`JSON.parse` côté hôte) ; les erreurs sont levées comme **`string`**. Le paquet
voyage sous la clé `move` (rename serde) et reste la forme fermée du contrat.

`Outcome` sérialisé est discriminé par `outcome` :
`{"outcome":"commit","index":…,"candidat":…,"diff":[…]}` ou
`{"outcome":"resample_needed","rejets":[[i,{"type":"fuite","detail":…}],…]}`.

Vérifié : `cargo build --target wasm32-unknown-unknown -p cn-wasm --release`
produit `cn_wasm.wasm` ; `tests/boundary.rs` fige la forme JSON côté hôte.

### Le moteur EST la source de vérité des types (ts-rs)

Les types de frontière (paquet, `SceneSpec`, `Outcome`, `Rejet`, `CompteRendu`,
`Decision`, trace…) sont **générés depuis les types Rust** via `ts-rs`, dans
`src/scripts/narrative/generated/`. Plus aucun miroir TS écrit à la main : les
consommateurs (UI, et demain d'autres) **importent** ces types et s'y conforment.

```bash
pnpm gen:types   # cargo --features ts → réécrit generated/ + index.ts (barrel)
```

- Versionné comme `pkg/` (build/déploiement sans toolchain Rust). Régénérer **après
  un changement des types de frontière Rust**, puis committer `generated/`.
- La feature `ts` (et `ts-rs`) est **isolée** : le build wasm par défaut ne l'embarque pas.
- Types **internes** porteurs de canon (`World`, `Canon`, `Registry`, `BeatPlan`) ne
  sont **pas** exportés — le mur tient jusque dans le schéma publié.
- Seule valeur encore à la main : `PACKET_SCHEMA_VERSION` (une valeur, pas un type),
  verrouillée sur la sortie Rust par `tests/narrative/contract.test.ts`.

### Bindings JS : `pkg/` est VERSIONNÉ

`src/scripts/narrative/pkg/` (glue JS + `cn_engine_bg.wasm` + `.d.ts`) est
**committé dans le repo**. Conséquence : la **machine de déploiement n'a besoin
d'aucune toolchain Rust** — `pnpm build`/`deploy:prod` prennent le `pkg/` versionné.
On ne le régénère que quand le code Rust du moteur change.

Import côté island : `import init, { WasmEngine } from './pkg/cn_engine.js'`.

### Régénérer le `pkg/` (après un changement Rust)

Pipeline dans `scripts/build-engine.mjs`, branché aux scripts npm :

```bash
pnpm test:engine     # cargo test du crate (garde-fou seul)
pnpm build:engine    # tests + (re)build wasm → src/scripts/narrative/pkg/
pnpm deploy:prod     # build:engine → astro build → transfert SSH → git push
```

`build:engine` produit le glue via **`wasm-pack`** si présent, sinon via un **repli
`wasm-bindgen-cli`** (`cargo install wasm-bindgen-cli` — n'utilise que crates.io,
sans téléchargement GitHub). Après régénération, **committer le `pkg/` mis à jour**.

**Tolérant par défaut** : sans toolchain (ou en cas d'échec), c'est un simple
**avertissement** et le `pkg/` committé est conservé tel quel ; le déploiement
continue. Drapeaux :

- `ENGINE_STRICT=1` — fait du moteur un **gate** (échoue si le build casse) ;
- `SKIP_ENGINE=1` — saute toute l'étape moteur ;
- `ENGINE_TESTS_ONLY=1` — tests sans rebuild wasm.

> Dérive possible : si le Rust change sans régénérer le `pkg/`, l'artefact
> versionné se désynchronise. Régénérer + committer dans le même lot.

## Phases 3-5 (faites)

3. **Island Astro + IndexedDB + reprise** — `/moteur-narratif` ; `WasmEngine` câblé,
   stub narrateur, persistance snapshot, reprise de session.
4. **UI d'élaboration + bucket** — `/elaboration` ; `SceneSpec` → `WasmEngine.fromScene`
   (scènes custom jouables), bucket de modules, couche `contexte` (univers/campagne).
5. **Producteur d'export + rôle éditeur** — `/compte-rendu` ; **membrane** Rust-autoritaire
   (`Engine::export`) : refuse tout secret caché indécis, exige révéler/retirer ;
   `CompteRendu` clos (JSON canonique) + rendu Markdown. Transcript persistant (`World.journal`).

### La membrane d'export (US-1.4) — le second mur

`Engine::export(resolutions)` est l'inverse du mur de `packet.rs` : il décide ce qui
sort vers Suddenly **après** le jeu. Invariants verrouillés (`core/tests/export.rs`) :

- un secret **caché** (jamais lâché en jeu) exige une décision éditeur : `Reveler{texte}`
  (seule la formulation de l'éditeur sort, jamais le canon brut) ou `Retirer` (rien ne sort) ;
- l'export **refuse** (`Err`) tant qu'un secret est indécis ;
- `FuiteDansProse` est une défense en profondeur **inatteignable par la boucle normale**
  (la prose journalisée a déjà passé le verifier) — un mur ne fait jamais confiance à l'étage du dessous ;
- `World.journal` est `#[serde(default)]` : les snapshots Phase 3/4 se chargent sans casser.

La couture aval CN↔Suddenly reste **à spécifier** : abstraite derrière `Publisher`
(stub `DownloadPublisher` côté TS), comme le Hub l'était derrière `Narrator`.

### Brancher les coutures externes (Hub / Suddenly)

Les deux coutures sont résolues par `src/scripts/narrative/runtime-config.ts` :
sans config, on retombe sur les stubs (démo) ; avec config, sur les implémentations
HTTP — **aucun changement de code**.

| Couture | Endpoint (build, public) | Token (localStorage) | Implémentations |
| --- | --- | --- | --- |
| Hub `/narrate` | `PUBLIC_NARRATE_ENDPOINT` | `cn-hub-token` | `StubNarrator` → `HttpNarrator` |
| Publish Suddenly | `PUBLIC_PUBLISH_ENDPOINT` | `cn-hub-token` | `DownloadPublisher` → `HttpPublisher` |

Le token (portefeuille Muse) n'est **jamais** en build : il vit en `localStorage`.
L'en-tête du moteur affiche le mode actif (« Narrateur local (démo) » vs « Hub »).
