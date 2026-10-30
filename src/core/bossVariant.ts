import { BOSSES, type BossDef, type BossId } from '../data/bosses';
import { BOSS_VARIANTS } from '../data/bossVariants';
import { createRng } from './rng';
import type { MetaState } from './save/schema';

/** La variante d'un boss est débloquée dès qu'on l'a battu une fois. */
export function variantUnlocked(meta: MetaState, boss: BossId): boolean {
  return (meta.codex[`boss.${boss}`] ?? 0) > 0;
}

/**
 * Le boss de ce biome pour cette run : la variante une fois sur deux si elle est débloquée.
 * Fixé par la graine (le même si on reprend la partie).
 */
export function bossFor(meta: MetaState, boss: BossId, seed: number, biomeIndex: number): BossDef {
  if (!variantUnlocked(meta, boss)) return BOSSES[boss];
  const rng = createRng((seed ^ Math.imul(biomeIndex + 13, 0x6c8e9cf5)) >>> 0);
  return rng.next() < 0.5 ? BOSS_VARIANTS[boss] : BOSSES[boss];
}
