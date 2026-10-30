import type { Rng } from '../rng';

/** Les 5 récompenses possibles derrière une porte. */
export const REWARD_KINDS = ['boon', 'shards', 'weaponMod', 'xp', 'weaponParts'] as const;
export type RewardKind = (typeof REWARD_KINDS)[number];

/** Poids de tirage : les dons sont plus fréquents (c'est le cœur de la run). */
const WEIGHTS: Record<RewardKind, number> = {
  boon: 4,
  shards: 2,
  weaponMod: 1,
  xp: 2,
  weaponParts: 1,
};

/** Tire `count` récompenses différentes pour les portes de sortie. */
export function rollDoorRewards(rng: Rng, count: number): RewardKind[] {
  const pool = [...REWARD_KINDS];
  const result: RewardKind[] = [];
  while (result.length < count && pool.length > 0) {
    const total = pool.reduce((sum, k) => sum + WEIGHTS[k], 0);
    let roll = rng.next() * total;
    let index = 0;
    for (; index < pool.length - 1; index++) {
      roll -= WEIGHTS[pool[index] as RewardKind];
      if (roll < 0) break;
    }
    result.push(pool.splice(index, 1)[0] as RewardKind);
  }
  return result;
}
