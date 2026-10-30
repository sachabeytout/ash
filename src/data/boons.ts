import type { GodId } from './gods';

/** Action à laquelle un don s'attache. Un seul don par action ; les dons passifs se cumulent. */
export type BoonSlot = 'attack' | 'power' | 'dash' | 'passive';
export type Trigger = Exclude<BoonSlot, 'passive'>;

export type BoonEffect =
  /** Brûlure : dégâts par seconde pendant une durée. */
  | { type: 'burn'; on: Trigger; dps: number; durationMs: number }
  /** Givre : charges qui ralentissent, puis gèlent sur place. */
  | { type: 'chill'; on: Trigger; stacks: number }
  /** Éclair en chaîne : rebondit d'ennemi en ennemi. */
  | { type: 'chain'; on: Trigger; damage: number; bounces: number; range: number }
  /** Foudre qui tombe sur la cible et touche autour d'elle. */
  | { type: 'bolt'; on: Trigger; damage: number; radius: number }
  /** Dégâts en plus contre les ennemis qui brûlent / sont givrés. */
  | { type: 'damageVs'; status: 'burning' | 'chilled'; bonus: number }
  | { type: 'maxHp'; amount: number }
  /** Quand Ash est touché, la foudre frappe l'ennemi le plus proche. */
  | { type: 'retaliate'; damage: number; range: number }
  /** Duo Râ + Skadi : un ennemi gelé qui brûle explose. */
  | { type: 'thermalShock'; damage: number; radius: number }
  /** Amplification : la brûlure dure plus longtemps. */
  | { type: 'burnDuration'; bonus: number };

export type BoonKind = 'normal' | 'duo' | 'amp';

export interface BoonDef {
  id: string;
  /** Dieu qui l'offre (deux pour un duo). */
  gods: readonly GodId[];
  kind: BoonKind;
  nameKey: string;
  /** Description avec la variable {value} (valeur principale, selon la rareté). */
  descKey: string;
  effect: BoonEffect;
  /** Amplification : n'apparaît que si l'un de ces dons est déjà obtenu. */
  requiresAny?: readonly string[];
}

export type Rarity = 'common' | 'rare' | 'epic' | 'duo' | 'amp';

/** Multiplicateur de la valeur principale selon la rareté. */
export const RARITY_POWER: Record<Rarity, number> = {
  common: 1,
  rare: 1.5,
  epic: 2,
  duo: 1,
  amp: 1,
};

/** Chances de rareté d'un don normal (le reste est commun). */
export const RARITY_ODDS = { rare: 0.22, epic: 0.06 } as const;

/** Rayon autour d'Ash touché par un don de dash (brûlure, givre). */
export const DASH_AURA_RADIUS = 34;
/** Portée de recherche d'une cible pour la foudre du dash. */
export const DASH_BOLT_RANGE = 110;

export const BOONS: readonly BoonDef[] = [
  // ---------- Râ : brûlure ----------
  {
    id: 'ra_attack',
    gods: ['ra'],
    kind: 'normal',
    nameKey: 'boon.ra_attack',
    descKey: 'boon.ra_attack.desc',
    effect: { type: 'burn', on: 'attack', dps: 4, durationMs: 3000 },
  },
  {
    id: 'ra_power',
    gods: ['ra'],
    kind: 'normal',
    nameKey: 'boon.ra_power',
    descKey: 'boon.ra_power.desc',
    effect: { type: 'burn', on: 'power', dps: 8, durationMs: 4000 },
  },
  {
    id: 'ra_dash',
    gods: ['ra'],
    kind: 'normal',
    nameKey: 'boon.ra_dash',
    descKey: 'boon.ra_dash.desc',
    effect: { type: 'burn', on: 'dash', dps: 5, durationMs: 3000 },
  },
  {
    id: 'ra_eye',
    gods: ['ra'],
    kind: 'normal',
    nameKey: 'boon.ra_eye',
    descKey: 'boon.ra_eye.desc',
    effect: { type: 'damageVs', status: 'burning', bonus: 0.2 },
  },
  {
    id: 'ra_hearth',
    gods: ['ra'],
    kind: 'normal',
    nameKey: 'boon.ra_hearth',
    descKey: 'boon.ra_hearth.desc',
    effect: { type: 'maxHp', amount: 15 },
  },
  // ---------- Zeus : foudre en chaîne ----------
  {
    id: 'zeus_attack',
    gods: ['zeus'],
    kind: 'normal',
    nameKey: 'boon.zeus_attack',
    descKey: 'boon.zeus_attack.desc',
    effect: { type: 'chain', on: 'attack', damage: 6, bounces: 2, range: 70 },
  },
  {
    id: 'zeus_power',
    gods: ['zeus'],
    kind: 'normal',
    nameKey: 'boon.zeus_power',
    descKey: 'boon.zeus_power.desc',
    effect: { type: 'bolt', on: 'power', damage: 14, radius: 26 },
  },
  {
    id: 'zeus_dash',
    gods: ['zeus'],
    kind: 'normal',
    nameKey: 'boon.zeus_dash',
    descKey: 'boon.zeus_dash.desc',
    effect: { type: 'bolt', on: 'dash', damage: 12, radius: 22 },
  },
  {
    id: 'zeus_riposte',
    gods: ['zeus'],
    kind: 'normal',
    nameKey: 'boon.zeus_riposte',
    descKey: 'boon.zeus_riposte.desc',
    effect: { type: 'retaliate', damage: 20, range: 140 },
  },
  // ---------- Skadi : gel ----------
  {
    id: 'skadi_attack',
    gods: ['skadi'],
    kind: 'normal',
    nameKey: 'boon.skadi_attack',
    descKey: 'boon.skadi_attack.desc',
    effect: { type: 'chill', on: 'attack', stacks: 1 },
  },
  {
    id: 'skadi_power',
    gods: ['skadi'],
    kind: 'normal',
    nameKey: 'boon.skadi_power',
    descKey: 'boon.skadi_power.desc',
    effect: { type: 'chill', on: 'power', stacks: 3 },
  },
  {
    id: 'skadi_dash',
    gods: ['skadi'],
    kind: 'normal',
    nameKey: 'boon.skadi_dash',
    descKey: 'boon.skadi_dash.desc',
    effect: { type: 'chill', on: 'dash', stacks: 2 },
  },
  {
    id: 'skadi_heart',
    gods: ['skadi'],
    kind: 'normal',
    nameKey: 'boon.skadi_heart',
    descKey: 'boon.skadi_heart.desc',
    effect: { type: 'damageVs', status: 'chilled', bonus: 0.15 },
  },
  // ---------- Duo et amplification ----------
  {
    id: 'duo_thermal',
    gods: ['ra', 'skadi'],
    kind: 'duo',
    nameKey: 'boon.duo_thermal',
    descKey: 'boon.duo_thermal.desc',
    effect: { type: 'thermalShock', damage: 30, radius: 44 },
  },
  {
    id: 'amp_noon',
    gods: ['ra'],
    kind: 'amp',
    nameKey: 'boon.amp_noon',
    descKey: 'boon.amp_noon.desc',
    effect: { type: 'burnDuration', bonus: 0.5 },
    requiresAny: ['ra_attack', 'ra_power', 'ra_dash'],
  },
];

export function getBoon(id: string): BoonDef | undefined {
  return BOONS.find((b) => b.id === id);
}

export function slotOf(effect: BoonEffect): BoonSlot {
  return 'on' in effect ? effect.on : 'passive';
}
