// Producteur d'export (Phase 5, US-1.4) — versant TS.
//
// La MEMBRANE est en Rust (Engine::export, autorité canon-aware). Les TYPES du
// compte rendu sont GÉNÉRÉS depuis Rust (./generated). Ici : le rendu Markdown (vue
// lisible — le JSON reste la source de vérité) et l'interface `Publisher` (couture
// CN↔Suddenly, encore à spécifier).

import type {
  CompteRendu,
  Decision,
  Echange,
  ExportError,
  ResolutionPublique,
  SceneInfo,
  SecretResolution,
} from './generated';

export type {
  CompteRendu,
  Decision,
  Echange,
  ExportError,
  ResolutionPublique,
  SceneInfo,
  SecretResolution,
};

/** Rend un compte rendu en Markdown lisible (éditeur + publication). */
export function renderMarkdown(cr: CompteRendu): string {
  const lignes: string[] = [];
  lignes.push(`# ${cr.scene.lieu}`);
  if (cr.scene.ambiance) lignes.push(`*${cr.scene.ambiance}*`);
  lignes.push('');
  lignes.push(`**${cr.scene.pnj_nom}** — ${cr.scene.pnj_voix}`);
  lignes.push('');

  for (const e of cr.echanges) {
    lignes.push(`> ${e.action}`);
    lignes.push('');
    lignes.push(e.prose);
    lignes.push('');
  }

  if (cr.faits_appris.length > 0) {
    lignes.push('## Ce que l’on a appris');
    for (const f of cr.faits_appris) lignes.push(`- ${f}`);
    lignes.push('');
  }

  if (cr.resolutions.length > 0) {
    lignes.push('## Dénouement');
    for (const r of cr.resolutions) lignes.push(r.revelation);
    lignes.push('');
  }

  return lignes.join('\n').trimEnd() + '\n';
}

/**
 * La couture aval CN↔Suddenly (« blob → base »). Encore À SPÉCIFIER : on l'abstrait
 * derrière cette interface, comme `Narrator` l'a fait pour le Hub.
 */
export interface Publisher {
  /** Publie le compte rendu. Renvoie une référence (URL / id) si la couture la fournit. */
  publish(cr: CompteRendu, markdown: string): Promise<string>;
}

/**
 * Publieur HTTP vers Suddenly (« blob → base »). La couture restant à spécifier,
 * l'enveloppe est volontairement minimale : `{ compte_rendu, markdown }`. À ajuster
 * quand le format d'ingestion sera figé. Branché via `resolvePublisher`.
 */
export class HttpPublisher implements Publisher {
  constructor(
    private endpoint: string,
    private token: string,
  ) {}

  async publish(cr: CompteRendu, markdown: string): Promise<string> {
    const res = await fetch(this.endpoint, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${this.token}`,
      },
      body: JSON.stringify({ compte_rendu: cr, markdown }),
    });
    if (!res.ok) {
      throw new Error(`Publication Suddenly: HTTP ${res.status}`);
    }
    const data = (await res.json()) as { url?: string; id?: string };
    return data.url ?? data.id ?? 'publié';
  }
}

/** Slug de fichier depuis le lieu (lettres/chiffres → tirets). */
export function slugLieu(lieu: string): string {
  return (
    lieu
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '') // dé-accentue pour un nom de fichier ASCII
      .replace(/[^\p{L}\p{N}]+/gu, '-')
      .replace(/^-+|-+$/g, '')
      .toLowerCase() || 'compte-rendu'
  );
}

/** Date `YYYY-MM-DD` (préfixe de fichier, tri chronologique). */
function jour(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Enveloppe le corps Markdown d'un front-matter YAML publiable : titre, PNJ,
 * date, faits/résolutions en compteurs. Rend l'export directement ingérable par
 * un moteur de publication (Suddenly ou statique) sans post-traitement.
 */
export function withFrontMatter(cr: CompteRendu, markdown: string, now: Date = new Date()): string {
  const esc = (s: string) => `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
  const lignes = [
    '---',
    `titre: ${esc(cr.scene.lieu)}`,
    `pnj: ${esc(cr.scene.pnj_nom)}`,
    `date: ${jour(now)}`,
    `faits_appris: ${cr.faits_appris.length}`,
    `resolu: ${cr.resolutions.length > 0}`,
  ];
  if (cr.scene.ambiance) lignes.push(`ambiance: ${esc(cr.scene.ambiance)}`);
  lignes.push('---', '');
  return lignes.join('\n') + markdown;
}

/**
 * Publieur local (repli hors Hub) : produit un `.md` **publiable** — corps rendu
 * + front-matter YAML — et le propose au téléchargement, nommé `AAAA-MM-JJ-lieu.md`.
 * Remplacé par `HttpPublisher` dès que l'endpoint Suddenly existe (via `resolvePublisher`).
 */
export class DownloadPublisher implements Publisher {
  async publish(cr: CompteRendu, markdown: string): Promise<string> {
    const contenu = withFrontMatter(cr, markdown);
    const nom = `${jour(new Date())}-${slugLieu(cr.scene.lieu)}.md`;
    const blob = new Blob([contenu], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nom;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    return a.download;
  }
}
