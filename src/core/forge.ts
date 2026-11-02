import { FORGE, STARTING_WEAPONS, UNLOCK_COST, type ForgeLevel } from '../data/forge';
import { DAWNBLADE_VICTORIES } from '../data/story';
import type { WeaponId } from '../data/weapons';
import { mergeStepMods, type StepMod } from './combat/engraving';
import type { MetaState } from './save/schema';

export interface WeaponBonuses {
  damage: number;
  powerDamage: number;
  superGain: number;
  superDamage: number;
  /** Frappes et tourbillons d'élan (niveau 9). */
  strikeDamage: number;
  /** PV rendus par ennemi vaincu. */
  killHeal: number;
  /** Recharge du dash plus rapide (fraction). */
  dashCooldown: number;
  /** Un tir d'attaque sur n part en double (0 = jamais). */
  doubleShot: number;
  parryHeal: number;
  parrySuper: number;
  /** Changements de coups (niveaux 6 à 10), par action. */
  attackMod?: StepMod;
  powerMod?: StepMod;
}

export const NO_WEAPON_BONUS: WeaponBonuses = {
  damage: 0,
  powerDamage: 0,
  superGain: 0,
  superDamage: 0,
  strikeDamage: 0,
  killHeal: 0,
  dashCooldown: 0,
  doubleShot: 0,
  parryHeal: 0,
  parrySuper: 0,
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

/** Arme choisie à la fenêtre de départ (la Katana si l'arme choisie n'est plus disponible). */
export function chosenWeapon(meta: MetaState): WeaponId {
  return isUnlocked(meta, meta.selectedWeapon) ? meta.selectedWeapon : 'katana';
}

/** Choisit l'arme de la run ; refusé si elle est verrouillée. */
export function selectWeapon(meta: MetaState, weapon: WeaponId): boolean {
  if (!isUnlocked(meta, weapon)) return false;
  meta.selectedWeapon = weapon;
  return true;
}

export function isUnlocked(meta: MetaState, weapon: WeaponId): boolean {
  // La Lame de l'Aube est forgée par Brokk à la 5e victoire (histoire), pas achetée.
  if (weapon === 'dawnblade') return meta.clears >= DAWNBLADE_VICTORIES;
  return STARTING_WEAPONS.includes(weapon) || meta.unlocked.includes(weapon);
}

/** Débloque une arme chez Brokk. Renvoie vrai en cas de succès. */
export function unlockWeapon(meta: MetaState, weapon: WeaponId): boolean {
  const cost = UNLOCK_COST[weapon];
  if (cost === undefined || isUnlocked(meta, weapon) || meta.weaponParts < cost) return false;
  meta.weaponParts -= cost;
  meta.unlocked.push(weapon);
  return true;
}

/** Bonus cumulés des niveaux de forge atteints. */
export function weaponBonuses(weapon: WeaponId, level: number): WeaponBonuses {
  const total: WeaponBonuses = { ...NO_WEAPON_BONUS };
  for (const { effect } of FORGE[weapon].slice(0, level)) {
    if (effect.type === 'mod') {
      if (effect.slot !== 'power')
        total.attackMod = mergeStepMods(total.attackMod, effect.mod) ?? effect.mod;
      if (effect.slot !== 'attack')
        total.powerMod = mergeStepMods(total.powerMod, effect.mod) ?? effect.mod;
    } else if (effect.type === 'doubleShot') {
      total.doubleShot = effect.value;
    } else {
      total[effect.type] += effect.value;
    }
  }
  return total;
}
