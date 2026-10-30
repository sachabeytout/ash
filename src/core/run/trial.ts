import type { BiomeDef } from '../../data/biomes';
import { specialCandidates, specialRooms } from './special';
import type { RunState } from './state';
import type { Wave } from './waves';

/**
 * Épreuve de Vesper : une salle de combat par biome est chronométrée.
 * La vider à temps fait apparaître un coffre ; échouer ne coûte rien.
 */

/** Temps accordé : une base, plus un peu par ennemi et par vague (l'élite compte double). */
export const TRIAL_BASE_MS = 9000;
export const TRIAL_PER_ENEMY_MS = 2600;
export const TRIAL_PER_WAVE_MS = 1500;

/** Salles possibles (communes avec les évènements). */
export const trialCandidates = specialCandidates;

/** La salle-épreuve du biome, fixée par la graine de la run (la même si on reprend la partie). */
export function trialRoom(seed: number, biomeIndex: number, biome: BiomeDef): number | null {
  return specialRooms(seed, biomeIndex, biome).trial;
}

export function trialTimeMs(waves: readonly Wave[], elite?: string): number {
  let enemies = 0;
  for (const wave of waves) for (const id of wave) enemies += id === elite ? 2 : 1;
  return TRIAL_BASE_MS + enemies * TRIAL_PER_ENEMY_MS + waves.length * TRIAL_PER_WAVE_MS;
}

export interface ChestLoot {
  shards: number;
  xp: number;
}

/** Contenu du coffre : grandit avec le biome. */
export function chestLoot(biomeIndex: number): ChestLoot {
  return { shards: 30 + 10 * biomeIndex, xp: 15 + 5 * biomeIndex };
}

export function openChest(run: RunState, loot: ChestLoot): void {
  run.shards += loot.shards;
  run.xp += loot.xp;
}
