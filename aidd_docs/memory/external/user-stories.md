# User stories — choix-narratifs (moteur narratif)

*Fait suite au récap d'intégration et au schéma du paquet (`packet.rs`). Personas
fournis par FX. Format : « En tant que…, je veux…, afin de… » + critères
d'acceptation tirés des invariants. Les `§n` renvoient au doc moteur.*

**Tags d'outil :** `[CN]` choix-narratifs · `[Hub]` Suddenly AI Hub (relais) ·
`[Sud]` Suddenly (plateforme). Une story tagguée `[CN+Hub]` ou `[CN+Sud]` franchit
une couture (cf. § « Répartition par outil »).

---

## Cadre : le cycle est un pipeline pour l'un, un menu pour les autres

Les quatre phases (élaboration → construction → jeu → compte rendu) forment un
pipeline **seulement pour FX**. Les autres personas y entrent et en sortent à des
points différents — donc chaque phase doit **tenir debout seule**.

| Persona | Élaboration | Construction | Jeu | Compte rendu | Export Suddenly |
|---|:--:|:--:|:--:|:--:|:--:|
| FX — chaîne complète | ● | ● | ● | ● | ● |
| Utilisateur Suddenly — structurer | ● | ○ | ○ | ● | ● |
| MJ — préparer son scénario | ● | ● | — | — | — |
| Acteur d'impro — s'entraîner | ◐ | ◐ | ● | — | — |

*● central · ○ optionnel · ◐ minimal (contexte seul) · — hors usage*

**Conséquence directe :** l'élaboration et le jeu doivent être utilisables *sans le
reste*. Deux personas (Suddenly, MJ) ne jouent jamais en solo ; un (impro) ne fait
quasi pas d'élaboration.

---

## Persona 1 — FX : la chaîne de bout en bout

*Créateur-développeur. Parcourt les quatre phases, exporte vers Suddenly, et règle le moteur.*

- **US-1.1** `[CN+Hub]` — En tant que FX, je veux **dérouler une session complète** d'un
  module (élaboration → jeu) depuis choix-narratifs, afin de valider la boucle bout-en-bout.
  - Le narrateur ne reçoit que le paquet ; aucun secret ne transite (vérifiable en trace).
  - Un tour où tous les candidats échouent au verifier déclenche un resample invisible (Mikado, §6).
- **US-1.2** `[CN]` — En tant que FX (mode dev), je veux une **vue de trace** par tour, afin
  de voir quel candidat a fui, lequel a été écarté, et le diff d'état (§7).
- **US-1.3** `[CN]` — En tant que FX, je veux **choisir la variante d'élaboration** (corpus
  externe / squelette / contexte seul), afin de régler le curseur d'auto-ignorance.
  - Avec un corpus externe que je n'ai pas écrit, je ne connais pas les secrets : le
    danger « tu es la fuite » (§11) est neutralisé.
- **US-1.4** `[CN+Sud]` — En tant que FX, je veux **exporter une session jouée en compte
  rendu**, afin de la publier sur Suddenly.
  - L'export ne franchit la membrane qu'**après résolution** : les secrets non révélés
    sont soit résolus, soit retirés. Le mur tombe sur le résolu, jamais sur le caché vivant.

---

## Persona 2 — L'utilisateur Suddenly : structurer son récit

*Vient du social, veut donner forme à une histoire. Entre par l'élaboration, sort par
l'export. **Non-technique : pas de git, pas de fichier, pas de terminal.***

- **US-2.1** `[CN]` — En tant qu'utilisateur Suddenly, je veux **transformer une idée floue
  en canon structuré** (faits, PNJ, jeu d'indices) via une UI de formulaires, afin de poser
  l'ossature de mon récit sans toucher au code.
  - Aucune étape n'exige git, fichier local ni terminal (l'accès non-tech = un problème
    d'UI, pas de stockage).
- **US-2.2** `[CN+Sud]` — En tant qu'utilisateur Suddenly, je veux **publier mon récit
  structuré vers Suddenly**, afin de le partager à la communauté.
- **US-2.3** `[CN+Hub]` — En tant qu'utilisateur Suddenly, je veux **tester légèrement** mon
  ossature en jouant quelques tours, afin de voir si elle tient — sans aller jusqu'au bout.

---

## Persona 3 — Le MJ : préparer son scénario

*Prépare pour une table **humaine**. Il veut tout savoir — l'auto-ignorance ne s'applique
pas à lui. Il consomme l'authoring, pas la boucle solo.*

- **US-3.1** `[CN]` — En tant que MJ, je veux **construire un canon** (PNJ avec leur savoir
  de départ, jeu d'indices, graphe de scènes), afin de préparer un scénario que je ferai
  jouer à ma table.
- **US-3.2** `[CN]` — En tant que MJ, je veux **un document de prep lisible** (l'écran du MJ,
  tous secrets visibles), afin de mener ma partie sans l'outil pendant le jeu.
- **US-3.3** `[CN+Hub]` — En tant que MJ, je veux **interroger un PNJ en prep** (« que
  lâcherait-il si on lui demande X ? »), afin de tester ses réactions avant la table.
  - Usage *single-beat* du narrateur, pas une session. Le MJ voit tout : le mur ne s'applique pas.

> **Note d'archi :** ce persona prouve que la **couche d'élaboration a une valeur
> autonome**, découplée du moteur solo. À traiter comme produit à part entière.

---

## Persona 4 — L'acteur d'impro : s'entraîner

*Veut un partenaire de scène qui surprend. Quasi pas d'élaboration (contexte seul). Le jeu
seul. Pas de compte rendu.*

- **US-4.1** `[CN]` — En tant qu'acteur d'impro, je veux **démarrer une scène depuis un
  simple contexte** (lieu, enjeu), afin de m'entraîner immédiatement, sans préparation.
- **US-4.2** `[CN+Hub]` — En tant qu'acteur d'impro, je veux un **partenaire dont les
  réactions sont motivées** (il se méprend *pour une raison* : peur, agenda, savoir limité),
  afin de pratiquer la lecture et la relance comme à une vraie table — pas du bruit aléatoire (§6).
- **US-4.3** `[CN]` — En tant qu'acteur d'impro, je veux que **la scène m'échappe** (je ne
  décide ni ne vois ce qui se trame), afin d'avoir une vraie surprise à laquelle réagir.
  - L'acte de *cacher* échappe à mon contrôle (oracle + hasard), pas seulement le contenu
    caché (§9).

> **Note d'archi :** ce persona prouve que le **jeu a une valeur autonome** avec
> l'élaboration la plus légère (contexte seul). La miscommunication motivée (§6) n'est pas
> un détail — c'est *son* produit.

---

## Répartition par outil

Trois livrables distincts. La plupart des stories ont leur **cœur dans choix-narratifs** ;
certaines franchissent une couture vers le Hub ou Suddenly.

### `[CN]` choix-narratifs — site Astro statique + moteur WASM
Le gros du travail : élaboration, construction, jeu, et la *production* de l'export.
- Toutes les stories (US-1.x, 2.x, 3.x, 4.x) ont une composante CN.
- Possède : l'UI d'authoring, le core WASM (directeur / oracle / verifier / registre
  épistémique), la surface de jeu, la vue de trace dev, l'état (IndexedDB + snapshot bucket),
  le producteur d'export, le doc de prep MJ.

### `[Hub]` Suddenly AI Hub — le relais narrateur
**Aucun persona propre.** C'est l'infra de frontière grossière (§5) qui *sert* toutes les
stories de jeu — un service, pas une destination utilisateur.
- Sert : US-1.1, US-2.3, US-3.3, US-4.2 (tout appel narrateur).
- Possède : l'endpoint `/narrate`, l'auth token → portefeuille Muse, le métrage par
  candidat, le routage providers (Anthropic / OpenRouter). Reste aveugle au canon.

### `[Sud]` Suddenly — la plateforme
Le côté partagé : ingestion du compte rendu, fédération, communauté.
- Possède le versant aval de : US-1.4, US-2.2.
- C'est la *destination* du persona « utilisateur Suddenly », pas l'outil qu'il manipule
  pour élaborer (ça, c'est CN).

### Les deux coutures (points d'intégration)
1. **CN ↔ Hub** : le paquet de `/narrate`. **Déjà figée** (`packet.rs`).
2. **CN ↔ Suddenly** : la membrane d'export (compte rendu, blob → base), franchie *après*
   résolution des secrets. **À spécifier.**

---

## Ce que les personas imposent à l'architecture

1. **L'élaboration est un produit autonome** (MJ + Suddenly) → l'UI d'authoring non-tech
   est prioritaire, indépendamment du moteur de jeu.
2. **Le jeu est un produit autonome** (impro) → la variante « contexte seul » et un
   démarrage sans prep doivent exister tôt.
3. **L'auto-ignorance est un réglage de session, pas un mode global.** Centrale pour FX et
   l'impro, *inversée* pour le MJ (qui veut tout voir). Le mur s'active/désactive par session.
4. **Le compte rendu / export ne sert que FX et l'utilisateur Suddenly** → module aval, pas
   un prérequis du jeu.
5. **Single-beat vs session** (US-3.3 vs US-1.1) : le moteur doit pouvoir produire *un beat
   isolé* sans session persistante.

---

*Prochaine étape : le plan technique — par outil, en commençant par le cœur CN (boucle
bout-en-bout, US-1.1, qui s'appuie sur le paquet déjà figé), puis l'UI d'élaboration
(US-2.1 / US-3.1).*
