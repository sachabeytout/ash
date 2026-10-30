import type { BiomeTheme } from './biomes';

/**
 * Le Comptoir de Ratatosk : un lieu à part, entre deux mondes. Bois chaud, lanternes, caisses ;
 * Ratatosk tient boutique derrière son étal.
 */
export const MERCHANT_THEME: BiomeTheme = {
  floor: 'floorRoots',
  wall: 0x5a3a1c,
  wallGlow: 0xffc46b,
  neons: [0xffc46b, 0x7fe7ff],
  snow: false,
};

/** Répliques de Ratatosk quand Ash s'approche (une tirée par visite). */
export const MERCHANT_GREETINGS = [
  'merchant.greet.1',
  'merchant.greet.2',
  'merchant.greet.3',
  'merchant.greet.4',
  'merchant.greet.5',
] as const;
