import type { Pantheon } from '../../data/gods';
import { createRng } from '../rng';
import { rollGod } from './rewards';
import type { RunState } from './state';

/**
 * Salles d'évènement : une par biome, sans combat. Un choix simple, toujours refusable.
 * - Braise d'Aelia : un don contre un peu de vie (jamais mortel).
 * - Âme en cage : la libérer donne des PV max (aucun coût).
 * - Enclume de Brokk : affûter l'arme contre des éclats.
 */
export const EVENT_IDS = ['ember', 'prisoner', 'anvil'] as const;
export type EventId = (typeof EVENT_IDS)[number];

/** Braise : part des PV max payée. */
export const EMBER_HP_COST = 0.2;
export const PRISONER_MAX_HP = 5;
export const ANVIL_COST = 35;
export const ANVIL_DAMAGE = 0.1;

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
    case 'ember': {
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
  }
  return true;
}
