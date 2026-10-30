import { AFFIX_CHANCE, AFFIX_IDS, VOLATILE_BLAST, type AffixId } from '../data/affixes';
import type { Rng } from './rng';

/** Marque d'un ennemi qui apparaît (jamais sur une élite ni un boss). */
export function rollAffix(rng: Rng, biomeIndex: number, elite: boolean): AffixId | null {
  if (elite) return null;
  const chance = AFFIX_CHANCE[Math.min(biomeIndex, AFFIX_CHANCE.length - 1)] ?? 0;
  if (rng.next() >= chance) return null;
  return rng.pick(AFFIX_IDS);
}

export function volatileDamage(biomeIndex: number): number {
  return VOLATILE_BLAST.baseDamage + VOLATILE_BLAST.perBiome * biomeIndex;
}
