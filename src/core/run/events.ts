import type { Pantheon } from '../../data/gods';
import { createRng } from '../rng';
import { rollGod } from './rewards';
import type { RunState } from './state';

/**
 * Salles d'évènement : une par biome, sans combat. Un choix simple, toujours refusable.
 * - Braise d'Anii : un don contre un peu de vie (jamais mortel).
 * - Âme en cage : la libérer donne des PV max (aucun coût).
 * - Enclume de Ptah : affûter l'arme contre des éclats.
 * - Puits de Ratatosk : un don contre des éclats.
 * - Autel de Thot : de l'XP contre un peu de vie (jamais mortel).
 */
export const EVENT_IDS = ['ember', 'prisoner', 'anvil', 'well', 'shrine'] as const;
export type EventId = (typeof EVENT_IDS)[number];

/** Braise : part des PV max payée. */
export const EMBER_HP_COST = 0.2;
export const PRISONER_MAX_HP = 5;
export const ANVIL_COST = 35;
export const ANVIL_DAMAGE = 0.1;
export const WELL_COST = 40;
/** Autel : part des PV max payée, XP gagnée. */
export const SHRINE_HP_COST = 0.15;
export const SHRINE_XP = 40;

/** L'évènement du biome, fixé par la graine de la run. */
export function eventOf(seed: number, biomeIndex: number): EventId {
  const rng = createRng((seed ^ Math.imul(biomeIndex + 7, 0x27d4eb2d)) >>> 0);
  return rng.pick(EVENT_IDS);
}

export interface EventCost {
  hp: number;
  shards: number;
}

export function eventCost(run: RunState, id: EventId, priceMul = 1): EventCost {
  switch (id) {
    case 'ember':
      return { hp: Math.max(1, Math.round(run.maxHp * EMBER_HP_COST)), shards: 0 };
    case 'prisoner':
      return { hp: 0, shards: 0 };
    case 'anvil':
      return { hp: 0, shards: Math.round(ANVIL_COST * priceMul) };
    case 'well':
      return { hp: 0, shards: Math.round(WELL_COST * priceMul) };
    case 'shrine':
      return { hp: Math.max(1, Math.round(run.maxHp * SHRINE_HP_COST)), shards: 0 };
  }
}

/** Accepter est possible si l'évènement n'a pas déjà été pris et si Ash peut payer sans mourir. */
export function canTakeEvent(run: RunState, id: EventId, priceMul = 1): boolean {
  if (run.eventTaken === run.biome) return false;
  const cost = eventCost(run, id, priceMul);
  return run.hp > cost.hp && run.shards >= cost.shards;
}

/** Applique l'évènement. La braise désigne un dieu (le choix du don se fait ensuite). */
export function takeEvent(run: RunState, id: EventId, priceMul = 1, favored?: Pantheon): boolean {
  if (!canTakeEvent(run, id, priceMul)) return false;
  const cost = eventCost(run, id, priceMul);
  run.hp -= cost.hp;
  run.shards -= cost.shards;
  run.eventTaken = run.biome;
  switch (id) {
    case 'ember':
    case 'well': {
      const rng = createRng((run.seed ^ Math.imul(run.biome + 3, 0x165667b1)) >>> 0);
      run.pendingBoon = rollGod(rng, favored);
      break;
    }
    case 'prisoner':
      run.maxHp += PRISONER_MAX_HP;
      run.hp += PRISONER_MAX_HP;
      break;
    case 'anvil':
      run.damageBonus += ANVIL_DAMAGE;
      break;
    case 'shrine':
      run.xp += SHRINE_XP;
      break;
  }
  return true;
}
