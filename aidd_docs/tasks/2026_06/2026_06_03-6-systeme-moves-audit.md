---
objective: Auditer « le système comme contrainte sur les moves » AVANT de l'implémenter.
success_condition: "Décision de conception tranchée (taxonomie de moves + gating système)."
iteration: 0
created_at: "2026-06-03T00:00:00Z"
plan_kind: audit
---

# Système → contrainte sur les moves (audit)

Décision FX : à terme, les règles (système) influencent ce qu'un PNJ peut faire/savoir.
Aujourd'hui `Systeme` est un **rail de données** (`{id, nom}`), non appliqué.

## État actuel (le point de départ honnête)

- Le directeur produit **un seul move codé en dur** : `"se détourne, lâche 1 fait mineur"`,
  `budget=1`, `n=3`. Il n'existe **pas de catalogue de moves**.
- Le verifier vérifie qu'un `jetons_move` (= `revealable`) apparaît — il ne connaît pas
  de « type » de move.

## Le vrai blocage : pas de modèle de move

« Le système contraint les moves » suppose **un ensemble de moves** à contraindre.
Ce préalable n'existe pas. Donc l'incrément se fait en **deux temps** :

1. **Catalogue de moves** (prérequis, sans système) : un `Move` = `{ id, libellé,
   jetons (preuve d'exécution), préconditions publiques }`. Le directeur **choisit**
   parmi les moves dont les préconditions tiennent (état public). Le verifier garde sa
   checklist, mais `jetons_move` vient du move choisi, plus de `revealable`.
2. **Gating système** : `Systeme` porte la liste des moves autorisés + leurs
   préconditions de règle. Le directeur intersecte « moves possibles » ∩ « moves
   autorisés par le système ».

## Décisions à trancher (avant code)

1. **Taxonomie de move.** Générique narratif (se fermer / dévier / concéder /
   menacer / révéler partiellement…) **ou** calqué PbtA (moves nommés du jeu) ?
   → impacte le catalogue et le format `Systeme`.
2. **Nature des préconditions.** Publiques uniquement (le directeur reste
   canon-blind sur les secrets) — confirmé nécessaire. Mais sur quoi portent-elles :
   faits connus du joueur ? jauges/horloges (cf. Jauges & Tarot) ? relation ?
3. **Couplage de jouabilité.** Aujourd'hui `jetons_move = revealable` garantit que le
   stub passe. Avec un catalogue, chaque move porte ses propres jetons → il faut que le
   narrateur (stub/Hub) sache les produire. À recâbler dans `StubNarrator`.

## Recommandation

Faire le **temps 1 (catalogue + sélection)** d'abord — c'est l'ossature, testable sans
règles. Le **temps 2 (gating système)** ensuite, une fois le format `Systeme` figé.
Ne pas démarrer sans trancher la **taxonomie de move** (décision 1) : tout en découle.

**Ne touche pas** au contrat `packet.rs` : le move voyage déjà comme une string
(`move`), la forme ne change pas — seul son **contenu** devient issu d'un catalogue.
