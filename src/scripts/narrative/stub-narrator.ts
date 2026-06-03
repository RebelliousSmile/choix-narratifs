// Narrateur local pour circuit de démo (sans Hub).
//
// Génère n réponses template à partir du paquet. Chaque réponse inclut
// `revealable[0]` — ce fait chevauche les `jetons_move` dans la scène
// d'amorce, ce qui garantit que le verifier Rust laisse passer (vérifiée
// contre FakeEngine dans tests/narrative/stub-narrator.test.ts).
//
// Ne mentionne jamais `withhold` (pas de fuite). Peut être remplacé par
// `HttpNarrator` dès que l'endpoint Hub est spécifié.

import type { Narrator } from './narrator';
import type { ScenePacket } from './types';

const VARIANTES: Array<(nom: string, fait: string) => string> = [
  (nom, fait) => `${nom} détourne les yeux. « ${fait}. » Il n'ajoute rien.`,
  (_, fait) => `Silence. Puis : « ${fait}. » Plus rien.`,
  (nom, fait) => `${nom} grommelle sans vous regarder. « ${fait}. Voilà. »`,
  (_, fait) => `Il hausse les épaules. « ${fait}. C'est tout. »`,
  (nom, fait) => `${nom} vous jette un bref regard. « ${fait}. »`,
];

export class StubNarrator implements Narrator {
  async narrate(packetJson: string, n: number): Promise<string[]> {
    const packet = JSON.parse(packetJson) as ScenePacket;
    const nom = packet.locuteur.nom;
    const fait = packet.revealable[0] ?? packet.move;

    const count = Math.min(n, VARIANTES.length);
    return Array.from({ length: count }, (_, i) => VARIANTES[i](nom, fait));
  }
}
