---
title: Exemple de format d'article
description: Gabarit de démonstration — reste en brouillon et n'apparaît pas sur le site. Copiez-le pour écrire un vrai article.
pubDate: 2026-07-05
draft: true
---

Cet article est un **brouillon** (`draft: true`) : il n'apparaît ni dans la liste
`/articles`, ni comme page publiée. Il documente le frontmatter attendu par la
collection et empêche Astro de signaler une collection vide au lancement.

## Frontmatter

| Champ | Type | Rôle |
| --- | --- | --- |
| `title` | texte | titre affiché |
| `description` | texte | résumé (liste + `<meta description>`) |
| `pubDate` | date | date de publication (tri antéchronologique) |
| `draft` | booléen (optionnel) | `true` masque l'article ; absent ou `false` le publie |

## Rédiger un vrai article

Copiez ce fichier, renommez-le (le nom de fichier devient l'URL, ex.
`pourquoi-un-moteur-deterministe.md` → `/articles/pourquoi-un-moteur-deterministe`),
retirez `draft` (ou mettez-le à `false`), et écrivez en Markdown.
