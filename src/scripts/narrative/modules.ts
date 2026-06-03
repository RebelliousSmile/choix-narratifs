// Catalogue de modules pré-construits (le « bucket »). Chaque module disponible
// est un `SceneSpec` complet, jouable via `WasmEngine.fromScene`. Le même format
// sert la création au formulaire — bucket et UI produisent un `SceneSpec`.
//
// Le module `docker` reproduit `World::scene_docker()` (scène d'amorce Phase 1)
// sous forme de devis d'auteur, pour prouver l'équivalence des deux chemins.

import type { SceneSpec } from './scene-spec';
import type { Contexte } from './contexte';

export interface NarrativeModule {
  id: string;
  titre: string;
  /** Disponible = jouable ; sinon affiché grisé « bientôt ». */
  disponible: boolean;
  spec: SceneSpec;
  /**
   * Couches du vault dont la scène hérite (univers / campagne / système). Optionnel :
   * un module plat (sans contexte) reste valide. Replié dans le spec par `composeScene`.
   */
  contexte?: Contexte;
}

export const MODULES: NarrativeModule[] = [
  {
    id: 'docker',
    titre: 'Le docker au quai',
    disponible: true,
    spec: {
      lieu: 'le quai, à la nuit tombée',
      ambiance: 'pluie fine, lanternes',
      pnj_nom: 'le docker',
      pnj_voix: 'bourru, phrases courtes',
      secret: 'Verain a payé pour la cargaison',
      jetons_fuite: ['Verain'],
      revealable: ['la cargaison a quitté le quai'],
      faits_etablis: ['la cargaison a quitté le quai'],
      jetons_contradiction: [
        'toujours sur le quai',
        'encore là',
        "n'a pas bougé",
        'jamais partie',
      ],
      withhold: ['qui a payé'],
    },
  },
  {
    id: 'informateur',
    titre: "L'informateur nerveux",
    disponible: false,
    // Démontre la composition : la scène hérite des faits du monde et de la campagne.
    contexte: {
      univers: {
        id: 'port-franc',
        nom: 'Le Port Franc',
        faits_etablis: ['le couvre-feu tombe à minuit', 'la garde est corrompue'],
        jetons_contradiction: ['aucun couvre-feu', 'la garde est intègre'],
      },
      campagne: {
        id: 'les-plans-voles',
        nom: 'Les plans volés',
        faits_etablis: ['les plans ont disparu du coffre il y a trois jours'],
        jetons_contradiction: ['les plans sont toujours au coffre'],
      },
      systeme: { id: 'cn-base', nom: 'Choix narratifs (base)' },
    },
    spec: {
      lieu: "arrière-salle d'un café",
      ambiance: 'néons, fumée',
      pnj_nom: 'Soren',
      pnj_voix: 'volubile, regarde ses mains',
      secret: 'Soren a vendu les plans à la mauvaise personne',
      jetons_fuite: ['Soren', 'plans'],
      revealable: ["la livraison a eu lieu mardi"],
      faits_etablis: [],
      jetons_contradiction: [],
      withhold: ['à qui'],
    },
  },
  {
    id: 'archives',
    titre: 'La gardienne des archives',
    disponible: false,
    spec: {
      lieu: 'salle des archives, midi',
      ambiance: 'silence, poussière',
      pnj_nom: 'Madame Veil',
      pnj_voix: 'précise, formulaire à la main',
      secret: 'le dossier n°47 a été falsifié par son supérieur',
      jetons_fuite: ['falsifié', 'supérieur'],
      revealable: ['le dossier a été consulté trois fois ce mois-ci'],
      faits_etablis: [],
      jetons_contradiction: [],
      withhold: ['qui a modifié le dossier'],
    },
  },
];

export function findModule(id: string): NarrativeModule | undefined {
  return MODULES.find((m) => m.id === id);
}
