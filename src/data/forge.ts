import type { WeaponId } from './weapons';

/**
 * Forge de Ptah : chaque arme s'améliore avec les pièces d'arme (progression permanente).
 * Un niveau = un effet qui s'ajoute aux précédents.
 */
export type ForgeEffect =
  /** Dégâts de toutes les attaques (0,08 = +8 %). */
  | { type: 'damage'; value: number }
  /** Dégâts de l'attaque puissante seulement. */
  | { type: 'powerDamage'; value: number }
  /** La jauge de Super se remplit plus vite. */
  | { type: 'superGain'; value: number }
  /** Le Super fait plus de dégâts. */
  | { type: 'superDamage'; value: number };

export interface ForgeLevel {
  cost: number;
  effect: ForgeEffect;
  descKey: string;
}

const STANDARD: readonly ForgeLevel[] = [
  // Prix relevés au retour F12 (0.72.0) : 2, 3, 4, 6, 8 (avant 1 à 5). Les niveaux déjà forgés restent.
  { cost: 2, effect: { type: 'damage', value: 0.08 }, descKey: 'forge.damage' },
  { cost: 3, effect: { type: 'powerDamage', value: 0.2 }, descKey: 'forge.powerDamage' },
  { cost: 4, effect: { type: 'superGain', value: 0.25 }, descKey: 'forge.superGain' },
  { cost: 6, effect: { type: 'damage', value: 0.08 }, descKey: 'forge.damage' },
  { cost: 8, effect: { type: 'superDamage', value: 0.3 }, descKey: 'forge.superDamage' },
];

/** Niveaux de forge par arme (mêmes paliers pour l'instant, réglables arme par arme). */
export const FORGE: Record<WeaponId, readonly ForgeLevel[]> = {
  katana: STANDARD,
  twinBlades: STANDARD,
  staff: STANDARD,
  crossbow: STANDARD,
  disc: STANDARD,
  chain: STANDARD,
  dawnblade: STANDARD,
};

/** Armes de départ ; les autres se débloquent chez Ptah contre des pièces d'arme. */
export const STARTING_WEAPONS: readonly WeaponId[] = ['katana', 'twinBlades'];
export const UNLOCK_COST: Partial<Record<WeaponId, number>> = {
  staff: 8,
  crossbow: 8,
  disc: 12,
  chain: 12,
};
