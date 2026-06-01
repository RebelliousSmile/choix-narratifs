import { describe, it, expect } from 'vitest';
import {
  creerEtatInitial,
  chargeActive,
  emplacementsRestants,
  aiguillage,
  resonance,
  doitReRemplir,
  denouementNormal,
  reRemplissage,
  validateState,
  type JaugeTarotState,
  type FicheEcho,
} from '../src/scripts/jauges-tarot-schema';

function echo(resolu = false): FicheEcho {
  return { id: Math.random().toString(36).slice(2), titre: 't', intrigue: '', lieu: '', acteur: '', progression: 0, resolu };
}

function withEchos(n: number, base = creerEtatInitial()): JaugeTarotState {
  return { ...base, echos: Array.from({ length: n }, () => echo()) };
}

describe('aiguillage (arcane 8)', () => {
  it('mappe le nombre d\'éléments au bon dé', () => {
    expect(aiguillage(0).mode).toBe('aucun');
    expect(aiguillage(1).mode).toBe('designe');
    expect(aiguillage(3).de).toBe('d4');
    expect(aiguillage(5).de).toBe('d8');
    expect(aiguillage(8).de).toBe('d8');
    expect(aiguillage(12).de).toBe('d12');
    expect(aiguillage(13).de).toBe('d20');
    expect(aiguillage(99).de).toBe('d20');
  });
});

describe('charge & emplacements', () => {
  it('ne compte que les échos non résolus', () => {
    const s: JaugeTarotState = { ...creerEtatInitial(), echos: [echo(false), echo(true), echo(false)] };
    expect(chargeActive(s)).toBe(2);
  });
  it('emplacements restants = position', () => {
    expect(emplacementsRestants({ ...creerEtatInitial(), position: 8 })).toBe(8);
  });
});

describe('résonance (arcane 9)', () => {
  it('signe + → scène libre', () => {
    expect(resonance('+', withEchos(5)).imposeEcho).toBe(false);
  });
  it('signe = → imposé seulement si Charge > moitié des restants', () => {
    // exemple du canon : 8 restants, 5 échos → imposé
    const s = { ...withEchos(5), position: 8 };
    expect(resonance('=', s).imposeEcho).toBe(true);
    const s2 = { ...withEchos(3), position: 8 }; // 3 ≤ 4 → inactif
    expect(resonance('=', s2).imposeEcho).toBe(false);
  });
  it('signe - → obligatoire s\'il existe un écho actif', () => {
    expect(resonance('-', withEchos(1)).imposeEcho).toBe(true);
    expect(resonance('-', withEchos(0)).imposeEcho).toBe(false);
  });
});

describe('déclencheurs', () => {
  it('re-remplissage si position ≤ 3', () => {
    expect(doitReRemplir({ ...creerEtatInitial(), position: 3 })).toBe(true);
    expect(doitReRemplir({ ...creerEtatInitial(), position: 4 })).toBe(false);
  });
  it('re-remplissage si Charge > emplacements restants', () => {
    const s = { ...withEchos(6), position: 5 };
    expect(doitReRemplir(s)).toBe(true);
  });
  it('dénouement normal à la position 1', () => {
    expect(denouementNormal({ ...creerEtatInitial(), position: 1 })).toBe(true);
    expect(denouementNormal({ ...creerEtatInitial(), position: 2 })).toBe(false);
  });
});

describe('reRemplissage (arcane 13)', () => {
  it('contracte du nombre de cartes retournées et relance plein', () => {
    const s: JaugeTarotState = { ...creerEtatInitial(), plafond: 12, position: 3, retournees: 2, pointsDestin: 5 };
    const r = reRemplissage(s);
    expect(r.pdDepenses).toBe(2);
    expect(r.nouveauPlafond).toBe(10);
    expect(r.state.plafond).toBe(10);
    expect(r.state.position).toBe(10); // relance sur le nouveau souffle
    expect(r.state.retournees).toBe(0);
    expect(r.state.pointsDestin).toBe(0); // pile vidée
    expect(r.denouementForce).toBe(false);
  });

  it('déclenche le dénouement forcé si nouveau plafond ≤ Charge', () => {
    const s: JaugeTarotState = { ...withEchos(9), plafond: 12, position: 3, retournees: 4 };
    const r = reRemplissage(s); // 12 - 4 = 8 ≤ 9 échos
    expect(r.denouementForce).toBe(true);
  });

  it('ne mute pas l\'état d\'entrée', () => {
    const s: JaugeTarotState = { ...creerEtatInitial(), retournees: 3 };
    reRemplissage(s);
    expect(s.retournees).toBe(3);
  });
});

describe('validateState (import)', () => {
  it('complète une sauvegarde partielle', () => {
    const r = validateState({ plafond: 8, position: 5, echos: [echo()] });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.plafond).toBe(8);
      expect(r.value.position).toBe(5);
      expect(r.value.echos.length).toBe(1);
      expect(r.value.intention.themes).toBe('');
    }
  });
  it('borne position au plafond et rejette le non-objet', () => {
    const r = validateState({ plafond: 6, position: 20 });
    if (r.ok) expect(r.value.position).toBe(6);
    expect(validateState(42).ok).toBe(false);
  });
});
