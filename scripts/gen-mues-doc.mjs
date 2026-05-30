/**
 * Génère la documentation markdown des mues / playbooks à partir des données
 * du sélecteur en entonnoir. Sortie : catalogue + matrice d'affectation
 * (poids de chaque option de réponse vers chaque mue).
 *
 * Lancement : `pnpm gen:docs` (ou `node scripts/gen-mues-doc.mjs`).
 * Ne JAMAIS éditer les fichiers générés à la main : modifier les JSON sources.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const GAMES = [
  {
    file: 'src/data/mues-monsterhearts.json',
    out: 'docs/mues-monsterhearts.md',
    terme: 'mue',
    pluriel: 'mues',
  },
  {
    file: 'src/data/mues-motw.json',
    out: 'docs/playbooks-monster-of-the-week.md',
    terme: 'playbook',
    pluriel: 'playbooks',
  },
];

/** Échappe le caractère `|` qui casse les tableaux markdown. */
const esc = (v) => String(v ?? '').replace(/\|/g, '\\|');

for (const game of GAMES) {
  const data = JSON.parse(readFileSync(game.file, 'utf8'));
  const mues = data.mues ?? [];
  const questions = data.questions ?? [];
  const lines = [];

  lines.push(`# ${data.jeu} — Catalogue des ${game.pluriel} et matrice d'affectation`);
  lines.push('');
  lines.push(`> Document **généré automatiquement** depuis \`${game.file}\``);
  lines.push('> via `scripts/gen-mues-doc.mjs`. Ne pas éditer à la main —');
  lines.push('> modifier les données source puis relancer `pnpm gen:docs`.');
  lines.push('');

  // ── Catalogue ──────────────────────────────────────────────────────────────
  lines.push(`## Catalogue des ${game.pluriel} (${mues.length})`);
  lines.push('');
  lines.push('| Nom | Résumé | Thèmes | Tags |');
  lines.push('|---|---|---|---|');
  for (const m of mues) {
    lines.push(
      `| **${esc(m.nom)}** | ${esc(m.resume)} | ${esc((m.themes ?? []).join(', '))} | ${esc((m.tags ?? []).join(', '))} |`,
    );
  }
  lines.push('');

  // ── Matrice d'affectation ────────────────────────────────────────────────────
  lines.push(`## Matrice d'affectation`);
  lines.push('');
  lines.push(
    `Pour chaque **option de réponse**, poids attribué à chaque ${game.terme}. ` +
      `Une case vide = aucun poids (0). Le score final d'un·e ${game.terme} est la somme ` +
      `des poids des options choisies.`,
  );
  lines.push('');

  const header = ['Question / Option', ...mues.map((m) => m.nom)];
  const sep = header.map(() => '---');

  for (const q of questions) {
    const titre = q.theme ? `${esc(q.theme)} — ${esc(q.texte)}` : esc(q.texte);
    lines.push(`### ${titre}`);
    lines.push('');
    lines.push('| ' + header.map(esc).join(' | ') + ' |');
    lines.push('| ' + sep.join(' | ') + ' |');
    for (const o of q.options ?? []) {
      const cells = [
        o.texte,
        ...mues.map((m) => (o.poids && o.poids[m.id] ? String(o.poids[m.id]) : '')),
      ];
      lines.push('| ' + cells.map(esc).join(' | ') + ' |');
    }
    lines.push('');
  }

  mkdirSync('docs', { recursive: true });
  writeFileSync(game.out, lines.join('\n'), 'utf8');
  console.log(`✓ ${game.out} (${mues.length} ${game.pluriel}, ${questions.length} questions)`);
}
