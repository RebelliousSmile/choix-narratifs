/**
 * Presets génériques pour une petite ville côtière — logique PURE, déterministe.
 *
 * S'inspire librement d'un cadre de bord de mer pour Monsterhearts saison 2,
 * SANS reprendre le texte officiel : lieux génériques, libellés reformulés.
 * Aucune dépendance DOM ni Konva. Utilisable tel quel comme `presets` de
 * MapEditor (chaque paletteId correspond à un id de la palette « ville »).
 */
import type { PlacedItem } from './map-state';

interface PresetSeed {
  id: string;
  paletteId: string;
  label: string;
  x: number;
  y: number;
}

// Disposition fixe (déterministe) d'une poignée de lieux génériques.
const SEEDS: PresetSeed[] = [
  { id: 'lieu-lycee', paletteId: 'lycee', label: 'Lycée', x: 200, y: 160 },
  { id: 'lieu-port', paletteId: 'port', label: 'Port', x: 640, y: 420 },
  { id: 'lieu-plage', paletteId: 'plage', label: 'Plage', x: 420, y: 500 },
  { id: 'lieu-commerce', paletteId: 'commerce', label: 'Épicerie du coin', x: 360, y: 240 },
  { id: 'lieu-place', paletteId: 'lieu', label: 'Place centrale', x: 420, y: 300 },
  { id: 'lieu-diner', paletteId: 'commerce', label: 'Restaurant routier', x: 560, y: 200 },
  { id: 'lieu-falaise', paletteId: 'lieu', label: 'Falaises', x: 760, y: 140 },
  { id: 'lieu-quartier', paletteId: 'lieu', label: 'Quartier résidentiel', x: 140, y: 380 },
];

/**
 * Renvoie une ébauche déterministe de plan de ville côtière.
 *
 * - ids uniques et stables ;
 * - coordonnées numériques finies ;
 * - aucun aléatoire → résultat reproductible.
 */
export function snakeBayPresets(): PlacedItem[] {
  return SEEDS.map((seed) => ({
    id: seed.id,
    paletteId: seed.paletteId,
    x: seed.x,
    y: seed.y,
    label: seed.label,
  }));
}
