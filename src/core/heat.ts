import { HEAT, HEAT_REWARD_PER_POINT, type HeatId } from '../data/heat';

export type HeatLevels = Partial<Record<HeatId, number>>;

export interface HeatModifiers {
  enemyHp: number;
  enemyDamage: number;
  enemySpeed: number;
  waveBudget: number;
  shopPrice: number;
  noRest: boolean;
  /** Multiplicateur des récompenses de fin de run (XP, pièces d'arme). */
  reward: number;
}

function level(levels: HeatLevels, id: HeatId): number {
  const def = HEAT.find((h) => h.id === id);
  return Math.max(0, Math.min(def?.maxLevel ?? 0, levels[id] ?? 0));
}

function per(id: HeatId): number {
  return HEAT.find((h) => h.id === id)?.perLevel ?? 0;
}

export function heatTotal(levels: HeatLevels): number {
  return HEAT.reduce((sum, h) => sum + level(levels, h.id), 0);
}

export function heatModifiers(levels: HeatLevels): HeatModifiers {
  return {
    enemyHp: 1 + level(levels, 'curfew') * per('curfew'),
    waveBudget: 1 + level(levels, 'patrols') * per('patrols'),
    enemyDamage: 1 + level(levels, 'surveillance') * per('surveillance'),
    enemySpeed: 1 + level(levels, 'overclock') * per('overclock'),
    shopPrice: 1 + level(levels, 'rationing') * per('rationing'),
    noRest: level(levels, 'noRest') > 0,
    reward: 1 + heatTotal(levels) * HEAT_REWARD_PER_POINT,
  };
}

/** Change le niveau d'une mesure (borné entre 0 et le maximum). */
export function setHeat(levels: HeatLevels, id: HeatId, value: number): void {
  const def = HEAT.find((h) => h.id === id);
  if (!def) return;
  levels[id] = Math.max(0, Math.min(def.maxLevel, value));
}
