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

const TOKEN_KEY = 'cn-hub-token';

function env(key: string): string | undefined {
  // import.meta.env est injecté par Vite/Astro ; absent en test → undefined.
  const meta = import.meta as unknown as { env?: Record<string, string | undefined> };
  return meta.env?.[key];
}

function localToken(): string | undefined {
  try {
    return globalThis.localStorage?.getItem(TOKEN_KEY) ?? undefined;
  } catch {
    return undefined;
  }
}

/** Le narrateur réel si le Hub est configuré, sinon le stub de démo. */
export function resolveNarrator(): { narrator: Narrator; mode: 'hub' | 'stub' } {
  const endpoint = env('PUBLIC_NARRATE_ENDPOINT');
  const token = localToken();
  if (endpoint && token) {
    return { narrator: new HttpNarrator(endpoint, token), mode: 'hub' };
  }
  return { narrator: new StubNarrator(), mode: 'stub' };
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
