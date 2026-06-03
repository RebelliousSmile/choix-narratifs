// Producteur d'export (Phase 5, US-1.4) — versant TS.
//
// La MEMBRANE est en Rust (Engine::export, autorité canon-aware). Ici : les types
// miroir du compte rendu, le rendu Markdown (vue lisible — le JSON reste la source
// de vérité), et l'interface `Publisher` (couture CN↔Suddenly, encore à spécifier).
//
// SOURCE DE VÉRITÉ des types : engine/core/src/engine.rs.

/** Décision de l'éditeur pour un secret resté caché. Entrée de `WasmEngine.export`. */
export type Decision = { type: 'reveler'; texte: string } | { type: 'retirer' };

export interface SecretResolution {
  secret: string;
  decision: Decision;
}

export interface Echange {
  action: string;
  prose: string;
}

export interface ResolutionPublique {
  revelation: string;
}

export interface SceneInfo {
  lieu: string;
  ambiance: string | null;
  pnj_nom: string;
  pnj_voix: string;
}

/** Le compte rendu clos qui franchit la membrane. Aucun secret « caché vivant ». */
export interface CompteRendu {
  scene: SceneInfo;
  echanges: Echange[];
  faits_appris: string[];
  resolutions: ResolutionPublique[];
}

/** Motif de refus de la membrane (renvoyé par `WasmEngine.export` comme JSON levé). */
export type ExportError =
  | { type: 'secret_non_resolu'; detail: string }
  | { type: 'fuite_dans_prose'; detail: { secret: string; jeton: string } };

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
