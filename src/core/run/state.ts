import type { WeaponId } from '../../data/weapons';
import type { RewardKind } from './rewards';

/** État d'une run en cours (sérialisable : servira à la sauvegarde en cours de run). */
export interface RunState {
  seed: number;
  weapon: WeaponId;
  biome: number;
  /** Salle actuelle, à partir de 1. */
  room: number;
  hp: number;
  maxHp: number;
  damageBonus: number;
  shards: number;
  xp: number;
  weaponParts: number;
  startedAt: number;
  elapsedMs: number;
}

export interface RunSummary {
  outcome: 'death' | 'cleared';
  room: number;
  killedBy?: string;
  elapsedMs: number;
  xp: number;
  weaponParts: number;
}

export function newRun(seed: number, weapon: WeaponId, maxHp: number, now: number): RunState {
  return {
    seed,
    weapon,
    biome: 0,
    room: 1,
    hp: maxHp,
    maxHp,
    damageBonus: 0,
    shards: 0,
    xp: 0,
    weaponParts: 0,
    startedAt: now,
    elapsedMs: 0,
  };
}

/** Applique la récompense d'une porte. Les dons arrivent dans la prochaine version : effet provisoire. */
export function applyReward(run: RunState, reward: RewardKind): void {
  switch (reward) {
    case 'boon':
      run.maxHp += 5;
      run.hp = Math.min(run.maxHp, run.hp + 10);
      break;
    case 'shards':
      run.shards += 25;
      break;
    case 'weaponMod':
      run.damageBonus += 0.1;
      break;
    case 'xp':
      run.xp += 20;
      break;
    case 'weaponParts':
      run.weaponParts += 1;
      break;
  }
}

/** Ce qui est conservé à la mort : tout l'XP et les pièces d'arme (une mort fait toujours progresser). */
export function summarize(
  run: RunState,
  outcome: RunSummary['outcome'],
  killedBy?: string,
): RunSummary {
  return {
    outcome,
    room: run.room,
    elapsedMs: run.elapsedMs,
    xp: run.xp + run.room * 2,
    weaponParts: run.weaponParts,
    ...(killedBy ? { killedBy } : {}),
  };
}
