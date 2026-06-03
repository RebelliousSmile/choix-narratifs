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
}

/** Vérifie la forme minimale d'un paquet avant l'envoi. Lève si incompatible. */
export function assertCanonShape(packet: ScenePacket): void {
  if (packet.schema_version !== PACKET_SCHEMA_VERSION) {
    throw new Error(
      `Version de schéma de paquet incompatible : attendu ${PACKET_SCHEMA_VERSION}, reçu ${packet.schema_version}.`,
    );
  }
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
      throw new Error(`Relais /narrate: HTTP ${res.status}`);
    }
    const data = (await res.json()) as { candidates: string[] };
    return data.candidates;
  }
}
