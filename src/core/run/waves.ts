import type { BiomeDef } from '../../data/biomes';
import type { EnemyId } from '../../data/enemies';
import type { Rng } from '../rng';

export type Wave = readonly EnemyId[];

/**
 * Prépare les vagues d'une salle de combat. Le budget de menace grandit avec la profondeur,
 * et les nouveaux types d'ennemis n'arrivent qu'à partir de leur salle d'introduction.
 */
export function planWaves(
  biome: BiomeDef,
  room: number,
  threatOf: (id: EnemyId) => number,
  rng: Rng,
): Wave[] {
  const available = biome.roster.filter((r) => room >= r.fromRoom).map((r) => r.enemy);
  if (available.length === 0) return [];
  const extraWaves = Math.min(
    biome.wavesPerRoom.max - biome.wavesPerRoom.min,
    Math.floor((room - 1) / 4) + rng.int(0, 1),
  );
  const waveCount = biome.wavesPerRoom.min + extraWaves;
  const budget = biome.waveBudget.base + biome.waveBudget.perRoom * (room - 1);

  const waves: Wave[] = [];
  for (let w = 0; w < waveCount; w++) {
    let remaining = Math.round(budget);
    const wave: EnemyId[] = [];
    let guard = 0;
    while (remaining > 0 && guard++ < 50) {
      const affordable = available.filter((id) => threatOf(id) <= remaining);
      if (affordable.length === 0) break;
      const pick = rng.pick(affordable);
      wave.push(pick);
      remaining -= threatOf(pick);
    }
    if (wave.length > 0) waves.push(wave);
  }
  // Salle d'élite : l'élite mène la première vague, qui perd deux ennemis pour rester juste.
  if (biome.eliteRooms.includes(room)) {
    const first = waves[0] ?? [];
    waves[0] = [biome.elite, ...first.slice(0, Math.max(0, first.length - 2))];
  }
  return waves;
}
