import type { BossAttackId, BossDef } from '../../data/bosses';
import type { Rng } from '../rng';

export type BossPhase = 1 | 2;

export function bossPhase(def: BossDef, hp: number, maxHp: number): BossPhase {
  return hp / maxHp <= def.phase2At ? 2 : 1;
}

/**
 * Choix de la prochaine attaque : tirage pondéré, jamais trois fois la même de suite,
 * et au plus une invocation toutes les quatre attaques (le combat reste lisible).
 */
export function chooseBossAttack(
  def: BossDef,
  phase: BossPhase,
  history: readonly BossAttackId[],
  rng: Rng,
): BossAttackId {
  const weights = def.weights[phase];
  const last2 = history.slice(-2);
  const recentSummon = history.slice(-3).includes('summon');
  const options = (Object.keys(weights) as BossAttackId[]).filter((id) => {
    if (last2.length === 2 && last2.every((h) => h === id)) return false;
    if (id === 'summon' && recentSummon) return false;
    return (weights[id] ?? 0) > 0;
  });
  const total = options.reduce((sum, id) => sum + (weights[id] ?? 0), 0);
  let roll = rng.next() * total;
  for (const id of options) {
    roll -= weights[id] ?? 0;
    if (roll < 0) return id;
  }
  return options[options.length - 1] ?? 'bite';
}

/** Durée ajustée à la phase (la phase 2 est plus rapide). */
export function tempo(def: BossDef, phase: BossPhase, ms: number): number {
  return phase === 2 ? Math.round(ms * def.phase2Tempo) : ms;
}

/** L'anneau d'onde de choc touche-t-il un cercle (joueur) ? */
export function ringHits(
  ringRadius: number,
  thickness: number,
  distance: number,
  targetRadius: number,
): boolean {
  return Math.abs(distance - ringRadius) <= thickness / 2 + targetRadius;
}
