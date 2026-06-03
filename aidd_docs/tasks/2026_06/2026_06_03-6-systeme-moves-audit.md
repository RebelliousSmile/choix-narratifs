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

## Décisions

1. **Taxonomie de move — TRANCHÉ : agnostique, hors de tout jargon de système.**
   Le catalogue est un petit ensemble de **gestes dramatiques universels**, nommés
   en langage ordinaire, valables quel que soit le jeu : p. ex. `se_fermer`,
   `devier`, `temporiser`, `conceder`, `reveler_partiellement`, `presser`,
   `mentir`, `rediriger`. **Aucun** move nommé d'un système précis (pas de PbtA,
   pas de « moves » de jeu). Le moteur ignore D&D / PbtA / etc.
2. **Le « système » est un PROFIL de données, pas du code spécifique.** Un système
   = `{ id, nom, moves_autorisés: [id…], préconditions }` exprimé **dans les termes
   agnostiques du catalogue**. Brancher un nouveau jeu = fournir un profil, jamais
   modifier le moteur. C'est l'inverse de coder des règles en dur.
3. **Préconditions : publiques uniquement** (le directeur reste canon-blind).
   Portent sur l'état public : faits déjà connus du joueur, éventuellement jauges/
   horloges si on les expose un jour — exprimées sans vocabulaire de système.
4. **Couplage de jouabilité.** Chaque move du catalogue porte ses propres jetons de
   preuve ; `StubNarrator` doit savoir les produire (aujourd'hui calé sur
   `revealable`). À recâbler avec le catalogue.

## Note sur le mot « move »

Le champ `move` du contrat (`packet.rs`, figé v1) reste — il désigne un **beat
dramatique générique**, pas un « move » PbtA. On ne renomme pas (coûterait un bump
de version + régénération du schéma relais). Le catalogue, lui, est ce qui rend ce
contenu agnostique et explicite.

## Recommandation

Faire le **temps 1 (catalogue agnostique + sélection par le directeur)** d'abord —
ossature testable sans aucun système. Le **temps 2 (profils de système)** ensuite :
le moteur intersecte « moves possibles (préconditions publiques) » ∩ « moves
autorisés par le profil ». **Ne touche pas** au contrat `packet.rs`.
