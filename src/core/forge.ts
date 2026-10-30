import { FORGE, type ForgeLevel } from '../data/forge';
import type { WeaponId } from '../data/weapons';
import type { MetaState } from './save/schema';

export interface WeaponBonuses {
  damage: number;
  powerDamage: number;
  superGain: number;
  superDamage: number;
}

export const NO_WEAPON_BONUS: WeaponBonuses = {
  damage: 0,
  powerDamage: 0,
  superGain: 0,
  superDamage: 0,
};

export function forgeLevel(meta: MetaState, weapon: WeaponId): number {
  return Math.min(FORGE[weapon].length, meta.forge[weapon] ?? 0);
}

/** Prochain niveau à acheter, ou undefined si l'arme est au maximum. */
export function nextForgeLevel(meta: MetaState, weapon: WeaponId): ForgeLevel | undefined {
  return FORGE[weapon][forgeLevel(meta, weapon)];
}

/** Achète le niveau suivant avec les pièces d'arme. Renvoie vrai en cas de succès. */
export function upgradeWeapon(meta: MetaState, weapon: WeaponId): boolean {
  const next = nextForgeLevel(meta, weapon);
  if (!next || meta.weaponParts < next.cost) return false;
  meta.weaponParts -= next.cost;
  meta.forge[weapon] = forgeLevel(meta, weapon) + 1;
  return true;
}

/** Bonus cumulés des niveaux de forge atteints. */
export function weaponBonuses(weapon: WeaponId, level: number): WeaponBonuses {
  const total = { ...NO_WEAPON_BONUS };
  FORGE[weapon].slice(0, level).forEach((l) => (total[l.effect.type] += l.effect.value));
  return total;
}
