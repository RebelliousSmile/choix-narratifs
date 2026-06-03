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

/**
 * Stub de publication : ne sort pas du navigateur — propose le Markdown au
 * téléchargement. Remplaçable par `HttpPublisher` quand l'endpoint Suddenly existera.
 */
export class DownloadPublisher implements Publisher {
  async publish(cr: CompteRendu, markdown: string): Promise<string> {
    const titre = cr.scene.lieu.replace(/[^\p{L}\p{N}]+/gu, '-').toLowerCase() || 'compte-rendu';
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${titre}.md`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    return a.download;
  }
}
