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
}

/** Salles spéciales du biome, fixées par la graine de la run (les mêmes si on reprend la partie). */
export function specialRooms(seed: number, biomeIndex: number, biome: BiomeDef): SpecialRooms {
  const pool = specialCandidates(biome);
  const rng = createRng((seed ^ Math.imul(biomeIndex + 1, 0x9e3779b1)) >>> 0);
  const take = (): number | null =>
    pool.length === 0 ? null : (pool.splice(Math.floor(rng.next() * pool.length), 1)[0] ?? null);
  const trial = take();
  const event = take();
  return { event, trial };
}
