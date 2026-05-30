/**
 * Tests de PRÉSENCE de contenu pour les pages vitrines alimentées par
 * embeds.json (Dialogues, Solo). Le schéma est validé ailleurs
 * (embeds-schema.test.ts) ; ici on garantit que les outils référencés PAR ID
 * dans chaque page existent bien — sinon la page perdrait une carte en silence.
 *
 * Les listes d'ids reflètent les appels `pick([...])` des pages :
 *   - src/pages/dialogues.astro
 *   - src/pages/solo.astro
 */
import { describe, it, expect } from 'vitest';
import embedsData from '../src/data/embeds.json';
import { validateEmbeds, type EmbedEntry } from '../src/scripts/embeds-schema';

const result = validateEmbeds(embedsData as unknown);
const embeds: EmbedEntry[] = result.ok ? result.value : [];
const ids = new Set(embeds.map((e) => e.id));

function allPresent(refs: string[]): boolean {
  return refs.every((id) => ids.has(id));
}

describe('embeds.json — intégrité globale', () => {
  it('passe la validation de schéma', () => {
    expect(result.ok).toBe(true);
  });

  it('a des identifiants uniques', () => {
    expect(ids.size).toBe(embeds.length);
  });

  it('chaque embed a une URL', () => {
    expect(embeds.every((e) => e.url.length > 0)).toBe(true);
  });
});

describe('page Dialogues interactifs', () => {
  // pick(['conversational-cards', 'suddenly'])
  const refs = ['conversational-cards', 'suddenly'];
  it('référence des ids qui existent tous dans embeds.json', () => {
    expect(allPresent(refs)).toBe(true);
  });
});

describe('page Solo', () => {
  // pick(['jauges-et-tarots', 'parallaxe', 'cinerio', 'muses-et-oracles']) + pick(['suddenly'])
  const soloRefs = ['jauges-et-tarots', 'parallaxe', 'cinerio', 'muses-et-oracles'];
  const autresRefs = ['suddenly'];
  it('référence les 4 outils solo attendus, tous présents', () => {
    expect(soloRefs.length).toBe(4);
    expect(allPresent(soloRefs)).toBe(true);
  });

  it('référence les autres outils (Suddenly), présents', () => {
    expect(allPresent(autresRefs)).toBe(true);
  });
});
