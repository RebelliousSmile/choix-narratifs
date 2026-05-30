# Monster of the Week — Catalogue des playbooks et matrice d'affectation

> Document **généré automatiquement** depuis `src/data/mues-motw.json`
> via `scripts/gen-mues-doc.mjs`. Ne pas éditer à la main —
> modifier les données source puis relancer `pnpm gen:docs`.

## Catalogue des playbooks (8)

| Nom | Résumé | Thèmes | Tags |
|---|---|---|---|
| **Le Limier** | Enquêteur né, il flaire les indices et reconstitue la vérité que d'autres préfèrent ignorer. | enquete, verite, obsession | investigation, deduction, tenace |
| **La Brute** | Quand les choses tournent mal, elle est celle qui se met entre le danger et les autres. | combat, protection, colere | bagarre, courage, force |
| **L'Élu** | Une prophétie ou un destin l'a désigné pour affronter une menace particulière. | destin, devoir, sacrifice | combat, mission, arme |
| **L'Expert** | Savant des choses étranges, il sait ce que sont vraiment les monstres et comment les arrêter. | savoir, preparation, curiosite | recherche, rituels, intellect |
| **L'Initié** | Membre d'un ordre secret, il a des ressources et des règles qui ne sont pas les siennes. | loyaute, secret, ordre | organisation, ressources, missions |
| **Le Mortel** | Sans don ni entraînement particulier, il chasse les monstres par simple obstination humaine. | fragilite, courage, humanite | ordinaire, lien, tenace |
| **Le Spectral** | Revenu d'entre les morts, il garde un pied dans l'au-delà et des dons qui vont avec. | mort, frontiere, mystere | surnaturel, fantome, pouvoirs |
| **Le Divin** | Envoyé par une puissance supérieure, il sert une cause qui le dépasse, avec des dons à la clé. | foi, mission, pouvoir | surnaturel, celeste, devoir |

## Matrice d'affectation

Pour chaque **option de réponse**, poids attribué à chaque playbook. Une case vide = aucun poids (0). Le score final d'un·e playbook est la somme des poids des options choisies.

### Pourquoi te retrouves-tu à chasser des monstres ?

| Question / Option | Le Limier | La Brute | L'Élu | L'Expert | L'Initié | Le Mortel | Le Spectral | Le Divin |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Parce que c'est mon destin, qu'il me plaise ou non. |  |  | 3 |  |  |  |  | 2 |
| Parce qu'une organisation m'y a formé et m'y envoie. |  |  |  | 1 | 3 |  |  |  |
| Parce que j'ai vu l'horreur en face et je ne peux plus l'ignorer. | 1 |  |  |  |  | 3 |  |  |
| Parce que ma propre nature me lie déjà à l'étrange. |  |  |  |  |  |  | 3 | 1 |

### Face à une affaire, ta première réaction ?

| Question / Option | Le Limier | La Brute | L'Élu | L'Expert | L'Initié | Le Mortel | Le Spectral | Le Divin |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Rassembler les indices et comprendre ce qui se passe. | 3 |  |  | 2 |  |  |  |  |
| Me documenter sur la créature pour trouver sa faiblesse. |  |  |  | 3 |  |  |  |  |
| Foncer protéger les gens, on réfléchira après. |  | 3 | 1 |  |  |  |  |  |
| Suivre mon intuition ou mes visions. |  |  |  |  |  |  | 2 | 2 |

### Quel est ton plus grand atout ?

| Question / Option | Le Limier | La Brute | L'Élu | L'Expert | L'Initié | Le Mortel | Le Spectral | Le Divin |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Ma force et mon courage au corps-à-corps. |  | 3 | 2 |  |  |  |  |  |
| Mon savoir et ma capacité à préparer le terrain. |  |  |  | 3 | 1 |  |  |  |
| Mes contacts et les ressources de mon ordre. |  |  |  |  | 3 |  |  |  |
| Des dons qui dépassent l'ordinaire. |  |  |  |  |  |  | 2 | 2 |

### Quelle est ta plus grande faiblesse ?

| Question / Option | Le Limier | La Brute | L'Élu | L'Expert | L'Initié | Le Mortel | Le Spectral | Le Divin |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Je ne suis qu'un humain face à des forces énormes. |  |  |  |  |  | 3 |  |  |
| Mon obsession à tout élucider me fait prendre des risques. | 3 |  |  |  |  |  |  |  |
| Je dois rendre des comptes à plus grand que moi. |  |  |  |  | 2 |  |  | 2 |
| Mon lien avec l'au-delà me fragilise autant qu'il m'aide. |  |  |  |  |  |  | 3 |  |

### Dans l'équipe, quel rôle prends-tu naturellement ?

| Question / Option | Le Limier | La Brute | L'Élu | L'Expert | L'Initié | Le Mortel | Le Spectral | Le Divin |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Le bouclier : je tiens la ligne de front. |  | 3 | 1 |  |  |  |  |  |
| Le cerveau : j'apporte le savoir et le plan. | 2 |  |  | 2 |  |  |  |  |
| Le cœur : je garde tout le monde humain et soudé. |  |  |  |  |  | 3 |  |  |
| Le mystère : j'apporte ce qu'on ne peut expliquer. |  |  | 1 |  |  |  | 2 | 2 |
