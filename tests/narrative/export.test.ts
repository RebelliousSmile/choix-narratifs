// Épreuve du rendu Markdown du compte rendu. La membrane elle-même est en Rust
// (engine/core/tests/export.rs) ; ici on vérifie la vue lisible produite côté TS.

import { describe, it, expect } from 'vitest';
import {
  renderMarkdown,
  slugLieu,
  withFrontMatter,
  type CompteRendu,
} from '../../src/scripts/narrative/export';

function cr(over: Partial<CompteRendu> = {}): CompteRendu {
  return {
    scene: { lieu: 'Le quai', ambiance: 'Pluie fine', pnj_nom: 'Le docker', pnj_voix: 'bourru' },
    echanges: [{ action: 'Je demande où est la cargaison.', prose: 'Il se détourne. « Partie. »' }],
    faits_appris: ['la cargaison a quitté le quai'],
    resolutions: [],
    ...over,
  };
}

describe('renderMarkdown', () => {
  it('met le lieu en titre et l’ambiance en italique', () => {
    const md = renderMarkdown(cr());
    expect(md).toContain('# Le quai');
    expect(md).toContain('*Pluie fine*');
    expect(md).toContain('**Le docker** — bourru');
  });

  it('rend chaque échange : action en citation + prose', () => {
    const md = renderMarkdown(cr());
    expect(md).toContain('> Je demande où est la cargaison.');
    expect(md).toContain('Il se détourne. « Partie. »');
  });

  it('inclut les faits appris', () => {
    const md = renderMarkdown(cr());
    expect(md).toContain('## Ce que l’on a appris');
    expect(md).toContain('- la cargaison a quitté le quai');
  });

  it('omet la section faits si vide', () => {
    const md = renderMarkdown(cr({ faits_appris: [] }));
    expect(md).not.toContain('Ce que l’on a appris');
  });

  it('rend le dénouement quand il y a des résolutions', () => {
    const md = renderMarkdown(cr({ resolutions: [{ revelation: 'C’était Verain.' }] }));
    expect(md).toContain('## Dénouement');
    expect(md).toContain('C’était Verain.');
  });

  it('omet le dénouement sans résolution', () => {
    const md = renderMarkdown(cr({ resolutions: [] }));
    expect(md).not.toContain('Dénouement');
  });

  it('gère une ambiance nulle', () => {
    const md = renderMarkdown(cr({ scene: { lieu: 'X', ambiance: null, pnj_nom: 'P', pnj_voix: 'v' } }));
    expect(md).toContain('# X');
    expect(md).not.toContain('null');
    // Aucune ligne d'ambiance en italique seul.
    expect(md.split('\n').some((l) => /^\*[^*]+\*$/.test(l))).toBe(false);
  });
});

describe('slugLieu', () => {
  it('dé-accentue et tirette', () => {
    expect(slugLieu("L'arrière-salle du café")).toBe('l-arriere-salle-du-cafe');
  });
  it('rogne les tirets de bord', () => {
    expect(slugLieu('  Le quai !!  ')).toBe('le-quai');
  });
  it('se replie sur un défaut si vide', () => {
    expect(slugLieu('***')).toBe('compte-rendu');
  });
});

describe('withFrontMatter', () => {
  const date = new Date('2026-07-06T01:55:00Z');

  it('préfixe un front-matter YAML publiable, date figée', () => {
    const out = withFrontMatter(cr(), renderMarkdown(cr()), date);
    expect(out.startsWith('---\n')).toBe(true);
    expect(out).toContain('titre: "Le quai"');
    expect(out).toContain('pnj: "Le docker"');
    expect(out).toContain('date: 2026-07-06');
    expect(out).toContain('faits_appris: 1');
    expect(out).toContain('resolu: false');
    // Le corps rendu suit le front-matter.
    expect(out).toContain('# Le quai');
  });

  it('marque resolu quand il y a un dénouement', () => {
    const c = cr({ resolutions: [{ revelation: 'C’était Verain.' }] });
    expect(withFrontMatter(c, renderMarkdown(c), date)).toContain('resolu: true');
  });

  it('échappe les guillemets du titre', () => {
    const c = cr({ scene: { lieu: 'Chez "Milo"', ambiance: null, pnj_nom: 'P', pnj_voix: 'v' } });
    expect(withFrontMatter(c, '', date)).toContain('titre: "Chez \\"Milo\\""');
  });
});
