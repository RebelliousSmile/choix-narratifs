# Pipeline des mues / playbooks

Ce document explique comment ajouter ou modifier une mue (Monsterhearts) ou un
playbook (Monster of the Week) et garder les données cohérentes.

## Fichiers concernés

- `src/scripts/mues-schema.ts` — interfaces TypeScript, `validateJeuMues`, `scoreMues`.
- `src/data/mues-monsterhearts.json` — données Monsterhearts.
- `src/data/mues-motw.json` — données Monster of the Week.
- `tests/mues-schema.test.ts` — validation des deux JSON + scoring déterministe.

## Modèle de données (`JeuMues`)

```ts
interface Mue { id; nom; resume; themes: string[]; tags: string[]; lienOfficiel? }
interface Option { id; texte; poids: Record<string, number> } // clé = id d'une mue existante
interface Question { id; texte; options: Option[] }            // >= 2 options
interface JeuMues { jeu; mues: Mue[]; questions: Question[] }
```

## Règles de validation

`validateJeuMues(data)` retourne `{ ok: true, value }` ou `{ ok: false, errors }`.
Il vérifie :

- les types de tous les champs ;
- l'unicité des `id` de mues ;
- l'unicité des `id` de questions ;
- au moins 2 options par question ;
- chaque clé de `poids` référence une mue existante.

## Ajouter une mue

1. Ajouter un objet dans `mues[]` avec un `id` unique (slug en minuscules, sans
   accent), un `nom` affiché, un `resume` **reformulé personnel et court**
   (1 phrase — jamais le texte officiel), `themes` et `tags`.
2. Répartir des `poids` vers cette mue dans les options des questions pour
   qu'elle puisse être recommandée. Sinon elle restera toujours à 0.
3. (Optionnel) renseigner `lienOfficiel` vers la ressource officielle.

## Ajouter / modifier une question

1. Ajouter un objet dans `questions[]` avec un `id` unique et `texte`.
2. Fournir **au moins 2 options**, chacune avec un `id`, un `texte` et un objet
   `poids` dont les clés sont des `id` de mues existantes.
3. Garder un entonnoir : questions générales d'abord, puis discriminantes.

## Scoring

`scoreMues(jeu, reponses)` additionne les `poids` des options choisies
(`reponses` = `{ idQuestion: idOption }`) et renvoie la liste
`{ mue, score }` triée par **score décroissant puis id croissant** : le
résultat est déterministe et l'ordre stable en cas d'égalité.

## Vérifier après modification

```bash
pnpm check   # types
pnpm test    # validation des JSON + scoring
pnpm build   # build statique
```

> Droits d'auteur : les `resume` sont des reformulations personnelles brèves,
> jamais une copie du texte officiel. Renvoyer vers les ouvrages via
> `lienOfficiel` ou les pages éditoriales.
