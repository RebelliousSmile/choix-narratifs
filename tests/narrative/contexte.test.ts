// Épreuve de la composition vault → SceneSpec : héritage des faits du monde et de
// la campagne, dédup, no-op pour les modules plats, système non replié.

import { describe, it, expect } from 'vitest';
import { composeScene, type Contexte } from '../../src/scripts/narrative/contexte';
import type { SceneSpec } from '../../src/scripts/narrative/scene-spec';

function spec(): SceneSpec {
  return {
    lieu: 'café',
    pnj_nom: 'Soren',
    pnj_voix: 'volubile',
    secret: 'Maline a tout orchestré',
    jetons_fuite: ['Maline'],
    revealable: ['la livraison a eu lieu mardi'],
    faits_etablis: ['Soren a peur'],
    jetons_contradiction: ['Soren est serein'],
    withhold: ['à qui'],
  };
}

const contexte: Contexte = {
  univers: {
    id: 'u',
    nom: 'Le Port Franc',
    faits_etablis: ['le couvre-feu tombe à minuit'],
    jetons_contradiction: ['aucun couvre-feu'],
  },
  campagne: {
    id: 'c',
    nom: 'Les plans volés',
    faits_etablis: ['les plans ont disparu il y a trois jours'],
    jetons_contradiction: ['les plans sont au coffre'],
  },
  systeme: { id: 's', nom: 'CN base' },
};

describe('composeScene', () => {
  it('no-op sans contexte', () => {
    const s = spec();
    expect(composeScene(s, undefined)).toEqual(s);
  });

  it('no-op si contexte vide (ni univers ni campagne)', () => {
    const s = spec();
    expect(composeScene(s, { systeme: { id: 's', nom: 'x' } })).toEqual(s);
  });

  it('hérite les faits du monde puis de la campagne puis de la scène (ordre)', () => {
    const out = composeScene(spec(), contexte);
    expect(out.faits_etablis).toEqual([
      'le couvre-feu tombe à minuit',
      'les plans ont disparu il y a trois jours',
      'Soren a peur',
    ]);
  });

  it('fusionne aussi les tournures de contradiction', () => {
    const out = composeScene(spec(), contexte);
    expect(out.jetons_contradiction).toEqual([
      'aucun couvre-feu',
      'les plans sont au coffre',
      'Soren est serein',
    ]);
  });

  it('déduplique les faits répétés entre couches', () => {
    const s = spec();
    s.faits_etablis = ['le couvre-feu tombe à minuit', 'Soren a peur'];
    const out = composeScene(s, contexte);
    expect(out.faits_etablis.filter((f) => f === 'le couvre-feu tombe à minuit')).toHaveLength(1);
  });

  it('ne replie pas le système (rail posé, pas encore enforced)', () => {
    const out = composeScene(spec(), contexte);
    // Le système n'ajoute aucun fait : les compteurs ne bougent que d'univers+campagne.
    expect(out.faits_etablis).toHaveLength(3);
  });

  it('ne mute pas le spec d’origine', () => {
    const s = spec();
    const avant = [...s.faits_etablis];
    composeScene(s, contexte);
    expect(s.faits_etablis).toEqual(avant);
  });
});
