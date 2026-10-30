import { GOD_IDS, GODS, type GodId, type Pantheon } from '../../data/gods';
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

export interface DoorReward {
  kind: RewardKind;
  /** Pour une porte de don : le dieu qui attend derrière. */
  god?: GodId;
}

/** Les dieux du panthéon du biome sortent 3 fois plus souvent (nordiques au Givre-Serveur…). */
const FAVORED_WEIGHT = 3;

export function rollGod(rng: Rng, favored?: Pantheon): GodId {
  const weight = (id: GodId) => (favored && GODS[id].pantheon === favored ? FAVORED_WEIGHT : 1);
  let roll = rng.next() * GOD_IDS.reduce((sum, id) => sum + weight(id), 0);
  for (const id of GOD_IDS) {
    roll -= weight(id);
    if (roll < 0) return id;
  }
  return GOD_IDS[GOD_IDS.length - 1] ?? 'ra';
}

/** Portes de sortie d'une salle : récompenses différentes, un dieu tiré pour la porte de don. */
export function rollDoors(rng: Rng, count: number, favored?: Pantheon): DoorReward[] {
  return rollDoorRewards(rng, count).map((kind) =>
    kind === 'boon' ? { kind, god: rollGod(rng, favored) } : { kind },
  );
}
