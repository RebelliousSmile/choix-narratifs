# Cahier des charges — Site « Choix narratifs & JdR narratifs »

> Issu de `/aidd-refine:01-brainstorm` — statut : **en attente de validation**

## Vision

Site **statique orienté outils interactifs** autour des choix narratifs et des
jeux de rôle narratifs, destiné en priorité aux **joueurs solo** et aux
**maîtres de jeu**. Le contenu éditorial est **secondaire** : il sert à présenter
et contextualiser les outils.

## Public cible

- Joueurs solo (structurer leur récit, générer de la matière narrative)
- Maîtres de jeu (outils d'animation et de préparation)

## Périmètre v1 — deux jeux PbtA ciblés

Premiers outils dédiés à **Monsterhearts** et **Monster of the Week** :

| #  | Outil                              | Jeu                              | Fonctionnement                                                            |
| -- | ---------------------------------- | -------------------------------- | ------------------------------------------------------------------------ |
| A  | Sélecteur de mues                  | Monsterhearts **et** MotW (2 outils distincts) | Questions **en entonnoir** → **une mue/playbook recommandée**            |
| B  | Générateur de plan de classe       | Monsterhearts                    | **Génération auto + retouche manuelle**                                   |
| C  | Générateur de plan de Snake Bay    | Monsterhearts saison 2           | Carte de ville : **génération auto + placement/édition manuelle** par le MJ |

Contenu des jeux : **descriptions reformulées personnelles** (pas de copie du
texte officiel), renvoi vers les livres.

## Outils & projets personnels mis en avant

Présentation par **intégration/embed** quand l'outil le permet, sinon fiche + lien.

| Espace                  | Projets                                                        |
| ----------------------- | ------------------------------------------------------------- |
| Création narrative solo | Jauges et Tarots · Parallaxe · Cinerio · Muses et Oracles     |
| Autres outils           | Suddenly                                                       |
| Dialogues interactifs   | Conversational Cards · outil de dialogue intégré à Suddenly   |

## Autres sections (roadmap au-delà de la v1)

| Section                  | Rôle                                                                 | Type            |
| ------------------------ | ------------------------------------------------------------------- | --------------- |
| Sélecteur de contenus    | Filtre/recommandeur d'outils, jeux, ressources selon critères       | Outil           |
| Page liens externes      | Ressources complémentaires                                          | Contenu         |

## Contraintes techniques

- 100 % statique, **SSG = Astro 6** (islands `client:*`, sortie zéro-JS par défaut, Vite/pnpm)
- **Logique des outils en TypeScript pur** (pas de WASM en v1 — le placement de quelques
  dizaines d'éléments ne justifie pas la chaîne Rust→WASM). WASM gardé en réserve
  **uniquement** pour un éventuel générateur de cartes de monde procédurales lourdes.
- **Éditeur de carte 2D : Konva.js** (drag & drop, snap-to-grid) pour les outils B et C
- **Persistance localStorage** (JSON versionné + export/import fichier) — pas de compte ni serveur
- **Langue : français uniquement**

> Note : B (plan de classe) et C (Snake Bay) sont des **éditeurs avec presets/ébauche
> auto**, pas des générateurs aléatoires — Snake Bay est un lieu canonique de MH S2.

## Sélecteur de mues — sortie

Questions en entonnoir → **1 mue principale recommandée + 1-2 alternatives proches**
(évite le dirigisme et gère les profils sans match unique).

## Suivi du projet

Pas de plan à jalons : tout est décomposé en **GitHub Issues** (repo
`RebelliousSmile/choix-narratifs`), enrichies puis traitées petit à petit.

## Hors périmètre

- Pas de backend, auth, BDD serveur
- Pas de monétisation / affiliation
- Pas d'i18n

## Points de vigilance

- **Droits d'auteur** Monsterhearts / MotW → reformulations uniquement (re-vérifier avant publication)
- **Embeddabilité** des outils externes (iframe autorisée, responsive) → vérifier outil par outil
- **Recoupement** vitrine / dialogues / liens externes → regrouper éventuellement en « Outils & ressources »
