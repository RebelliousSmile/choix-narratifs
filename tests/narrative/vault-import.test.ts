// Épreuve du pont vault → Contexte : extraction des faits/contradictions d'une note
// markdown, puis composition dans une scène (cohérence de bout en bout).

import { describe, it, expect } from 'vitest';
import { importUnivers, importCampagne } from '../../src/scripts/narrative/vault-import';
import { composeScene } from '../../src/scripts/narrative/contexte';
import type { SceneSpec } from '../../src/scripts/narrative/scene-spec';

const MD = `# Le Port Franc

Quelques lignes de prose libre ignorées par l'importeur.

## Faits établis
- le couvre-feu tombe à minuit
- la garde est corrompue

## Contradictions
- aucun couvre-feu
- la garde est intègre
`;

describe('importUnivers', () => {
  it('extrait le nom (H1), les faits et les contradictions', () => {
    const u = importUnivers('port-franc', MD);
    expect(u.nom).toBe('Le Port Franc');
    expect(u.faits_etablis).toEqual(['le couvre-feu tombe à minuit', 'la garde est corrompue']);
    expect(u.jetons_contradiction).toEqual(['aucun couvre-feu', 'la garde est intègre']);
  });

  it('tombe sur l’id si pas de H1', () => {
    expect(importUnivers('x', '## Faits\n- a').nom).toBe('x');
  });

  it('reconnaît « Faits » comme « Faits établis »', () => {
    expect(importUnivers('x', '# N\n## Faits\n- un fait').faits_etablis).toEqual(['un fait']);
  });

  it('ignore les puces hors section reconnue', () => {
    const u = importUnivers('x', '# N\n## Notes\n- bla\n## Faits\n- vrai');
    expect(u.faits_etablis).toEqual(['vrai']);
  });

  it('accepte * comme puce', () => {
    expect(importUnivers('x', '# N\n## Faits\n* étoile').faits_etablis).toEqual(['étoile']);
  });
});

describe('importCampagne + composition', () => {
  it('les faits importés se replient dans une scène', () => {
    const campagne = importCampagne('c', '# Fil\n## Faits établis\n- les plans ont disparu');
    const spec: SceneSpec = {
      lieu: 'café', pnj_nom: 'Soren', pnj_voix: 'v', secret: 'le Renard a agi',
      jetons_fuite: ['Renard'], revealable: ['la livraison a eu lieu mardi'],
      faits_etablis: ['Soren a peur'], jetons_contradiction: [], withhold: [],
    };
    const out = composeScene(spec, { campagne });
    expect(out.faits_etablis).toEqual(['les plans ont disparu', 'Soren a peur']);
  });
});
