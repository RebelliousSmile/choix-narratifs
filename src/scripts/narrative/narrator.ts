// Le relais `/narrate` (Suddenly AI Hub), vu de l'hôte. C'est la seule frontière
// asynchrone de la boucle : en prod, un `fetch` ; en test, un double scripté.
//
// Le narrateur ne reçoit QUE le paquet (forme fermée). `assertCanonShape` est un
// garde-fou défensif côté hôte : il refuse d'émettre un paquet à la version de
// schéma incompatible (le mur sémantique, lui, reste côté verifier dans le core).

import { PACKET_SCHEMA_VERSION, type ScenePacket } from './types';

export interface Narrator {
  /** Best-of-N : renvoie `n` candidats de prose (aveugles au canon). */
  narrate(packetJson: string, n: number): Promise<string[]>;
  /**
   * Réinitialise l'état interne au démarrage d'une scène (nouvelle session).
   * Optionnel : un narrateur sans mémoire (ex. `HttpNarrator`) l'ignore.
   */
  reset?(): void;
}

/** Vérifie la forme minimale d'un paquet avant l'envoi. Lève si incompatible. */
export function assertCanonShape(packet: ScenePacket): void {
  if (packet.schema_version !== PACKET_SCHEMA_VERSION) {
    throw new Error(
      `Version de schéma de paquet incompatible : attendu ${PACKET_SCHEMA_VERSION}, reçu ${packet.schema_version}.`,
    );
  }
}

/** Codes d'erreur typés du contrat Hub (`muses/narrate/contract/schema.json#NarrateError`). */
export type NarrateErrorCode =
  | 'unauthorized'
  | 'quota_exhausted'
  | 'bad_request'
  | 'schema_incompatible'
  | 'provider_error';

/** Partagé avec `/judge` (#39, Phase 3) : même contrat d'erreur relais, cf. `judge.ts`. */
export const NARRATE_ERROR_CODES: ReadonlySet<string> = new Set([
  'unauthorized',
  'quota_exhausted',
  'bad_request',
  'schema_incompatible',
  'provider_error',
] satisfies NarrateErrorCode[]);

/** Corps d'erreur JSON brut du contrat relais — partagé `/narrate` et `/judge`. */
export interface RelayErrorBody {
  error?: string;
  detail?: string;
  retriable?: boolean;
}

/** Parse le corps JSON d'une réponse d'erreur relais ; `null` si illisible/non-JSON. */
export async function parseRelayErrorBody(res: Response): Promise<RelayErrorBody | null> {
  try {
    return (await res.json()) as RelayErrorBody;
  } catch {
    return null;
  }
}

/** Erreur typée du relais : permet à l'UI un message précis (jeton, quota, panne provider…). */
export class NarrateHttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: NarrateErrorCode,
    readonly detail: string,
    readonly retriable: boolean,
  ) {
    super(`Relais /narrate [${code}] (HTTP ${status}) : ${detail}`);
    this.name = 'NarrateHttpError';
  }
}

/** Lit le corps d'erreur ; retombe sur une Error générique si non conforme au contrat. */
async function readNarrateError(res: Response): Promise<Error> {
  const body = await parseRelayErrorBody(res);
  if (body && typeof body.error === 'string' && NARRATE_ERROR_CODES.has(body.error)) {
    return new NarrateHttpError(res.status, body.error as NarrateErrorCode, body.detail ?? '', body.retriable ?? false);
  }
  return new Error(`Relais /narrate: HTTP ${res.status}`);
}

/** Implémentation HTTP du relais (Phase 3+). Documentée ici, branchée plus tard. */
export class HttpNarrator implements Narrator {
  constructor(
    private endpoint: string,
    private token: string,
  ) {}

  async narrate(packetJson: string, n: number): Promise<string[]> {
    const res = await fetch(this.endpoint, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${this.token}`,
      },
      // L'enveloppe du contrat : { packet, n }. Le paquet est déjà sérialisé.
      body: `{"packet":${packetJson},"n":${n}}`,
    });
    if (!res.ok) {
      throw await readNarrateError(res);
    }
    const data = (await res.json()) as { candidates: string[] };
    return data.candidates;
  }
}
