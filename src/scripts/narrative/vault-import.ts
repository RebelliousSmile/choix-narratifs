// Pont vault `rpg-writer` → moteur (lecture). Convertit une note markdown d'univers
// ou de campagne en couche `Contexte` consommable par le moteur (faits + contradictions).
//
// POURQUOI : le vault (cf. vault-layout) est la source de vérité des couches
// canon/univers/campagne, en markdown. Le moteur, lui, consomme des FAITS. Cet
// importeur extrait la part que le moteur sait utiliser, sans imposer tout le vault.
//
// CONVENTION (volontairement minimale, documentée) — sous un titre H1 = le nom :
//
//   # Le Port Franc
//   ## Faits établis
//   - le couvre-feu tombe à minuit
//   - la garde est corrompue
//   ## Contradictions
//   - aucun couvre-feu
//   - la garde est intègre
//
// Les puces sous « Faits établis » (ou « Faits ») → faits_etablis ; sous
// « Contradictions » → jetons_contradiction. Le reste est ignoré (prose libre).

import type { Univers, Campagne } from './contexte';

interface Parsed {
  nom: string;
  faits_etablis: string[];
  jetons_contradiction: string[];
}

const RE_H1 = /^#\s+(.+?)\s*$/;
const RE_H2 = /^##\s+(.+?)\s*$/;
const RE_PUCE = /^[-*]\s+(.+?)\s*$/;

function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, ''); // sans accents, pour matcher les titres
}

function parse(md: string): Parsed {
  let nom = '';
  const faits: string[] = [];
  const contradictions: string[] = [];
  let cible: 'faits' | 'contradictions' | null = null;

  for (const ligne of md.split(/\r?\n/)) {
    const h1 = ligne.match(RE_H1);
    if (h1) {
      if (!nom) nom = h1[1].trim();
      cible = null;
      continue;
    }
    const h2 = ligne.match(RE_H2);
    if (h2) {
      const t = norm(h2[1]);
      if (t.startsWith('faits')) cible = 'faits';
      else if (t.startsWith('contradiction')) cible = 'contradictions';
      else cible = null;
      continue;
    }
    const puce = ligne.match(RE_PUCE);
    if (puce && cible) {
      const val = puce[1].trim();
      if (val) (cible === 'faits' ? faits : contradictions).push(val);
    }
  }

  return { nom, faits_etablis: faits, jetons_contradiction: contradictions };
}

/** Importe une note d'univers depuis du markdown vault. `id` identifie la couche. */
export function importUnivers(id: string, markdown: string): Univers {
  const p = parse(markdown);
  return { id, nom: p.nom || id, faits_etablis: p.faits_etablis, jetons_contradiction: p.jetons_contradiction };
}

/** Importe un fil rouge de campagne depuis du markdown vault. */
export function importCampagne(id: string, markdown: string): Campagne {
  const p = parse(markdown);
  return { id, nom: p.nom || id, faits_etablis: p.faits_etablis, jetons_contradiction: p.jetons_contradiction };
}
