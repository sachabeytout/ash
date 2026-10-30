import type { BiomeDef } from '../../data/biomes';
import { createRng } from '../rng';

/** Salles pouvant accueillir une épreuve ou un évènement : ni trop tôt, ni élite, ni fontaine, ni juste avant le boss. */
export function specialCandidates(biome: BiomeDef): number[] {
  const rooms: number[] = [];
  for (let room = 3; room < biome.rooms; room++) {
    if (biome.eliteRooms.includes(room) || biome.fountainRooms.includes(room)) continue;
    rooms.push(room);
  }
  return rooms;
}

export interface SpecialRooms {
  /** Salle d'évènement (choix hors combat). */
  event: number | null;
  /** Salle-épreuve de Vesper (chronométrée). */
  trial: number | null;
  /** Salle spéciale (survie, sombre ou champion), s'il reste une place. */
  challenge: number | null;
}

export type ChallengeId = 'survival' | 'dark' | 'champion';
export const CHALLENGE_IDS: readonly ChallengeId[] = ['survival', 'dark', 'champion'];

/** Survie : tenir ce temps ; des ennemis arrivent par petits groupes. */
export const SURVIVAL_MS = 25000;
export const SURVIVAL_SPAWN_MS = 3500;
export const SURVIVAL_MAX_ALIVE = 4;
/** Champion : l'élite du biome, bien plus résistant. */
export const CHAMPION_HP = 1.8;
/** Éclats en bonus à la fin d'une salle sombre ou d'une arène du champion. */
export const CHALLENGE_SHARDS = 20;

/** Le type de salle spéciale du biome, fixé par la graine. */
export function challengeOf(seed: number, biomeIndex: number): ChallengeId {
  const rng = createRng((seed ^ Math.imul(biomeIndex + 29, 0x2c1b3c6d)) >>> 0);
  return rng.pick(CHALLENGE_IDS);
}

/** Salles spéciales du biome, fixées par la graine de la run (les mêmes si on reprend la partie). */
export function specialRooms(seed: number, biomeIndex: number, biome: BiomeDef): SpecialRooms {
  const pool = specialCandidates(biome);
  const rng = createRng((seed ^ Math.imul(biomeIndex + 1, 0x9e3779b1)) >>> 0);
  const take = (): number | null =>
    pool.length === 0 ? null : (pool.splice(Math.floor(rng.next() * pool.length), 1)[0] ?? null);
  const trial = take();
  const event = take();
  const challenge = take();
  return { event, trial, challenge };
}
