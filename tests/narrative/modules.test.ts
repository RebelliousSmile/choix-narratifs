// Garde-fou : tout module marqué `disponible` doit être JOUABLE avec le narrateur
// par défaut (StubNarrator) — c.-à-d. valide ET capable de produire un commit. Ce
// test attrape les pièges du genre « le jeton de fuite est le nom du PNJ » (le
// narrateur nomme toujours son interlocuteur → fuite à chaque réplique).

import { describe, it, expect } from 'vitest';
import { MODULES } from '../../src/scripts/narrative/modules';
import { composeScene } from '../../src/scripts/narrative/contexte';
import { validateSceneSpec, jetonsFuiteEffectifs } from '../../src/scripts/narrative/scene-spec';
import { StubNarrator } from '../../src/scripts/narrative/stub-narrator';

const disponibles = MODULES.filter((m) => m.disponible);

describe('modules disponibles', () => {
  it('il y a au moins un module disponible', () => {
    expect(disponibles.length).toBeGreaterThan(0);
  });

  for (const m of disponibles) {
    describe(m.titre, () => {
      const spec = composeScene(m.spec, m.contexte);

      it('passe la validation (après composition du contexte)', () => {
        expect(validateSceneSpec(spec)).toBeNull();
      });

      it("le jeton de fuite n'est pas le nom du PNJ", () => {
        const nom = spec.pnj_nom.toLowerCase();
        for (const j of jetonsFuiteEffectifs(spec)) {
          expect(nom.includes(j.toLowerCase())).toBe(false);
        }
      });

      it('la prose du stub ne contient aucun jeton de fuite', async () => {
        const candidats = await new StubNarrator().narrate(JSON.stringify({
          schema_version: 1,
          cadre: { lieu: spec.lieu, ambiance: spec.ambiance, presents: [] },
          locuteur: { nom: spec.pnj_nom, voix: spec.pnj_voix },
          action_joueur: '',
          hearing: 'demande anodine',
          move: 'se détourne',
          revealable: spec.revealable,
          withhold: spec.withhold,
          form: { registre: 'sec', budget_revelation: 1, ratio: 'equilibre', interdit_shape: [] },
        }), 5);

        for (const c of candidats) {
          for (const j of jetonsFuiteEffectifs(spec)) {
            expect(c.toLowerCase().includes(j.toLowerCase())).toBe(false);
          }
        }
      });
    });
  }
});
