// Résolution des coutures externes (Hub /narrate, publish Suddenly) selon la config.
//
// Ces deux coutures restent À SPÉCIFIER côté serveur. On les abstrait : tant qu'aucun
// endpoint n'est configuré, on retombe sur les stubs (StubNarrator / DownloadPublisher).
// Dès que l'endpoint existe, il suffit de fournir la config — aucun changement de code.
//
// Sources de config :
//   - endpoint : variable de build PUBLIC_* (URL publique, pas un secret) ;
//   - token    : localStorage (le portefeuille Muse de l'utilisateur, jamais en build).

import { HttpNarrator, type Narrator } from './narrator';
import { StubNarrator } from './stub-narrator';
import { DownloadPublisher, HttpPublisher, type Publisher } from './export';
import { HttpJudge, type Judge } from './judge';
import { StubJudge } from './stub-judge';

export const TOKEN_KEY = 'cn-hub-token';

function env(key: string): string | undefined {
  // Le littéral `import.meta.env` doit apparaître tel quel (sans indirection via
  // une variable/cast intermédiaire) : Vite ne détecte et n'injecte l'objet
  // d'environnement que s'il repère ce motif exact dans le code source.
  return (import.meta.env as Record<string, string | undefined> | undefined)?.[key];
}

function localToken(): string | undefined {
  try {
    return globalThis.localStorage?.getItem(TOKEN_KEY) ?? undefined;
  } catch {
    return undefined;
  }
}

/**
 * Le narrateur réel si le Hub est configuré, sinon le stub de démo.
 *
 * `mode` distingue `'stub-no-token'` (endpoint posé mais jeton Muse absent du
 * `localStorage`) de `'stub'` (rien configuré) : même narrateur de repli dans
 * les deux cas, mais l'UI doit pouvoir signaler qu'il manque juste un jeton.
 */
export function resolveNarrator(): { narrator: Narrator; mode: 'hub' | 'stub' | 'stub-no-token' } {
  const endpoint = env('PUBLIC_NARRATE_ENDPOINT');
  const token = localToken();
  if (endpoint && token) {
    return { narrator: new HttpNarrator(endpoint, token), mode: 'hub' };
  }
  if (endpoint && !token) {
    return { narrator: new StubNarrator(), mode: 'stub-no-token' };
  }
  return { narrator: new StubNarrator(), mode: 'stub' };
}

/**
 * Le juge sémantique réel (#39, Phase 3) si le Hub est configuré, sinon le
 * stub (qui ne rejette jamais rien — seul le filet lexical décide alors).
 * Même distinction `stub-no-token`/`stub` que `resolveNarrator`.
 */
export function resolveJudge(): { judge: Judge; mode: 'hub' | 'stub' | 'stub-no-token' } {
  const endpoint = env('PUBLIC_JUDGE_ENDPOINT');
  const token = localToken();
  if (endpoint && token) {
    return { judge: new HttpJudge(endpoint, token), mode: 'hub' };
  }
  if (endpoint && !token) {
    return { judge: new StubJudge(), mode: 'stub-no-token' };
  }
  return { judge: new StubJudge(), mode: 'stub' };
}

/** Le publieur réel si Suddenly est configuré, sinon le téléchargement local. */
export function resolvePublisher(): { publisher: Publisher; mode: 'suddenly' | 'download' } {
  const endpoint = env('PUBLIC_PUBLISH_ENDPOINT');
  const token = localToken();
  if (endpoint && token) {
    return { publisher: new HttpPublisher(endpoint, token), mode: 'suddenly' };
  }
  return { publisher: new DownloadPublisher(), mode: 'download' };
}
