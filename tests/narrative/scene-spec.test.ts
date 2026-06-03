// Épreuve du miroir TS de SceneSpec : dérivation, validation, alignement avec Rust.
// L'autorité reste Rust (engine/core/tests/scene_spec.rs) ; ici on vérifie que le
// retour immédiat du formulaire suit les mêmes règles.

import { describe, it, expect } from 'vitest';
import {
  deriveJetonsFuite,
  validateSceneSpec,
  jetonsFuiteEffectifs,
  emptySpec,
  type SceneSpec,
} from '../../src/scripts/narrative/scene-spec';

function jouable(): SceneSpec {
  return {
    lieu: "L'arrière-salle du café",
    ambiance: 'Néons, fumée',
    pnj_nom: 'Soren',
    pnj_voix: 'Volubile',
    secret: 'Maline a commandité le vol',
    jetons_fuite: [],
    revealable: ['le coffre était déjà ouvert'],
    faits_etablis: [],
    jetons_contradiction: [],
    withhold: ['qui a commandité'],
  };
}

describe('deriveJetonsFuite', () => {
  it('extrait les noms propres', () => {
    expect(deriveJetonsFuite('Verain a payé pour la cargaison')).toEqual(['Verain']);
  });

  it('ignore les mots-outils capitalisés', () => {
    expect(deriveJetonsFuite('Le dossier a été ouvert')).toEqual([]);
  });

  it('garde plusieurs noms propres', () => {
    expect(deriveJetonsFuite('Soren a trahi Maline')).toEqual(['Soren', 'Maline']);
  });

  it('ignore les mots de moins de 3 lettres', () => {
    expect(deriveJetonsFuite('Il a vu Al hier')).toEqual([]);
  });
});

describe('validateSceneSpec', () => {
  it('accepte une scène jouable', () => {
    expect(validateSceneSpec(jouable())).toBeNull();
  });

  it('refuse un lieu vide', () => {
    expect(validateSceneSpec({ ...jouable(), lieu: '  ' })).toMatch(/lieu/i);
  });

  it('refuse un PNJ vide', () => {
    expect(validateSceneSpec({ ...jouable(), pnj_nom: '' })).toMatch(/PNJ/i);
  });

  it('refuse un secret vide', () => {
    expect(validateSceneSpec({ ...jouable(), secret: '' })).toMatch(/secret/i);
  });

  it('refuse sans fait révélable', () => {
    expect(validateSceneSpec({ ...jouable(), revealable: [] })).toMatch(/révélable/i);
  });

  it('refuse un secret sans nom propre ni jeton explicite', () => {
    const s = { ...jouable(), secret: 'le maire en personne', jetons_fuite: [] };
    expect(validateSceneSpec(s)).toMatch(/trahit le secret/i);
  });

  it('accepte un jeton de fuite explicite quand le secret n’a pas de nom propre', () => {
    const s = { ...jouable(), secret: 'le maire en personne', jetons_fuite: ['maire'] };
    expect(validateSceneSpec(s)).toBeNull();
  });

  it('refuse un jeton de fuite présent dans un fait révélable', () => {
    const s = {
      ...jouable(),
      secret: 'Verain a payé',
      jetons_fuite: [],
      revealable: ['Verain est passé hier'],
    };
    expect(validateSceneSpec(s)).toMatch(/fuiterait/i);
  });
});

describe('jetonsFuiteEffectifs', () => {
  it('privilégie les jetons explicites', () => {
    const s = { ...jouable(), jetons_fuite: ['X'] };
    expect(jetonsFuiteEffectifs(s)).toEqual(['X']);
  });

  it('dérive quand vide', () => {
    expect(jetonsFuiteEffectifs(jouable())).toEqual(['Maline']);
  });
});

describe('emptySpec', () => {
  it('produit un devis vide invalide', () => {
    expect(validateSceneSpec(emptySpec())).not.toBeNull();
  });
});
