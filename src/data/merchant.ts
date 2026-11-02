import type { BiomeTheme } from './biomes';

/**
 * Le Comptoir de Ratatosk : un lieu à part, entre deux mondes. Bois chaud, lanternes, caisses ;
 * Ratatosk tient boutique derrière son étal.
 */
export const MERCHANT_THEME: BiomeTheme = {
  floor: 'floorRoots',
  wall: 0x5a3a1c,
  wallGlow: 0xffc46b,
  neons: [0xffc46b, 0xffa040],
  snow: false,
  // Retours du 02/11 (point 6) : murs en planches, lanternes chaudes, pas de frise égyptienne.
  temple: {
    floor: 0x20160e,
    slab: 0x170f08,
    stone: 0x5a3a1c,
    stoneTop: 0x7a5230,
    joint: 0x3a2410,
    frieze: [],
    glyph: 0xffc46b,
    light: 0xffc46b,
    walls: 'planks',
    corner: 'lantern',
  },
};

/** Répliques de Ratatosk quand Ash s'approche (une tirée par visite). */
export const MERCHANT_GREETINGS = [
  'merchant.greet.1',
  'merchant.greet.2',
  'merchant.greet.3',
  'merchant.greet.4',
  'merchant.greet.5',
] as const;
