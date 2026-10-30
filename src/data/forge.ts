import type { WeaponId } from './weapons';

/**
 * Forge de Brokk : chaque arme s'améliore avec les pièces d'arme (progression permanente).
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
  { cost: 1, effect: { type: 'damage', value: 0.08 }, descKey: 'forge.damage' },
  { cost: 2, effect: { type: 'powerDamage', value: 0.2 }, descKey: 'forge.powerDamage' },
  { cost: 3, effect: { type: 'superGain', value: 0.25 }, descKey: 'forge.superGain' },
  { cost: 4, effect: { type: 'damage', value: 0.08 }, descKey: 'forge.damage' },
  { cost: 5, effect: { type: 'superDamage', value: 0.3 }, descKey: 'forge.superDamage' },
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

/** Armes de départ ; les autres se débloquent chez Brokk contre des pièces d'arme. */
export const STARTING_WEAPONS: readonly WeaponId[] = ['katana', 'twinBlades'];
export const UNLOCK_COST: Partial<Record<WeaponId, number>> = {
  staff: 3,
  crossbow: 3,
  disc: 5,
  chain: 5,
};
