// Narrateur local pour circuit de démo (sans Hub).
//
// Il ne SIMULE pas : il rend le beat que le moteur a déjà décidé. Chaque réponse
// énonce `revealable[0]` — couplage de jouabilité `jetons_move = revealable`
// (cf. engine/core/tests/scene_spec.rs §7) : énoncer un fait révélable prouve le
// move, donc le verifier Rust laisse passer. Vérifié contre FakeEngine dans
// tests/narrative/stub-narrator.test.ts.
//
// Contraintes tenues sans LLM :
//   - jamais `withhold` ni le secret (pas de fuite) — on n'utilise que des champs
//     sûrs par contrat (`revealable`, `move`, `hearing`), jamais le texte brut du
//     joueur (`action_joueur`) qui pourrait porter un jeton de fuite ;
//   - budget de révélation respecté (`form.budget_revelation`) ;
//   - variété : la forme tourne d'un tour à l'autre, et le PNJ réagit à
//     l'insistance (une relance sur un fait déjà lâché sonne différemment d'un
//     premier aveu). C'est ce qui distingue la démo d'un perroquet figé.
//
// Remplaçable par `HttpNarrator` dès que l'endpoint Hub est spécifié.

import type { Narrator } from './narrator';
import type { ScenePacket } from './types';

/** Aveu : la première fois que le PNJ concède ce fait. `f2` = second fait optionnel. */
const AVEU: Array<(nom: string, f: string, f2: string | null) => string> = [
  (nom, f, f2) => `${nom} détourne les yeux. « ${f}${suite(f2)}. » Il n'ajoute rien.`,
  (nom, f, f2) => `Un silence. ${nom} finit par lâcher : « ${f}${suite(f2)}. »`,
  (nom, f, f2) => `${nom} pèse la question, puis grommelle. « ${f}${suite(f2)}. Voilà. »`,
  (nom, f, f2) => `${nom} vous jette un bref regard. « ${f}${suite(f2)}. » Puis plus rien.`,
  (nom, f, f2) => `Il hausse les épaules. « ${f}${suite(f2)}. C'est tout ce que je sais. »`,
];

/** Relance : le joueur revient sur un fait déjà donné ; le PNJ se braque. */
const RELANCE: Array<(nom: string, f: string) => string> = [
  (nom, f) => `${nom} soupire. « Je vous l'ai dit : ${f}. Rien de plus. »`,
  (nom, f) => `« ${f}. » ${nom} répète, agacé, sans lever les yeux.`,
  (nom, f) => `${nom} ne bronche pas. « ${f}. Vous pouvez insister. »`,
  (nom, f) => `« Toujours la même chose : ${f}. » ${nom} croise les bras.`,
  (nom, f) => `${nom} serre la mâchoire. « ${f}, et j'en resterai là. »`,
];

/** Second fait accolé à l'aveu quand le budget l'autorise. */
function suite(f2: string | null): string {
  return f2 ? `. ${f2}` : '';
}

export class StubNarrator implements Narrator {
  /** Compteur de tours : fait tourner la forme (le tour N n'ouvre pas comme N-1). */
  private tour = 0;
  /** Faits déjà lâchés : une relance dessus sonne braquée, pas comme un aveu neuf. */
  private lachees = new Set<string>();

  /** Repart à neuf (nouvelle scène / nouvelle session). */
  reset(): void {
    this.tour = 0;
    this.lachees.clear();
  }

  async narrate(packetJson: string, n: number): Promise<string[]> {
    const packet = JSON.parse(packetJson) as ScenePacket;
    const nom = packet.locuteur.nom;
    const fait = packet.revealable[0] ?? packet.move;

    // Second fait seulement si le beat en autorise plusieurs.
    const faitBis =
      packet.form.budget_revelation >= 2 && packet.revealable.length >= 2
        ? packet.revealable[1]
        : null;

    // Déjà lâché ce tour-ci ? → registre « relance » (le PNJ se braque).
    const deja = this.lachees.has(fait);
    this.lachees.add(fait);

    // Rotation par tour pour ne pas répéter la même forme deux tours de suite.
    const base = this.tour;
    this.tour += 1;

    const banque = deja ? RELANCE : AVEU;
    return Array.from({ length: n }, (_, i) => {
      const v = banque[(base + i) % banque.length];
      return deja
        ? (v as (nom: string, f: string) => string)(nom, fait)
        : (v as (nom: string, f: string, f2: string | null) => string)(nom, fait, faitBis);
    });
  }
}
