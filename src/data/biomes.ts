import type { EnemyId } from './enemies';

export interface BiomeDef {
  id: string;
  nameKey: string;
  /** Nombre de salles avant le boss (réglable). */
  rooms: number;
  /** Ennemis possibles et à partir de quelle salle ils apparaissent. */
  roster: readonly { enemy: EnemyId; fromRoom: number }[];
  /** Budget de menace d'une vague : base + croissance par salle. */
  waveBudget: { base: number; perRoom: number };
  wavesPerRoom: { min: number; max: number };
  /** Salles où un élite ouvre la première vague. */
  eliteRooms: readonly number[];
  elite: EnemyId;
}

export const BIOMES: readonly BiomeDef[] = [
  {
    id: 'lowtown',
    nameKey: 'biome.lowtown',
    rooms: 10,
    roster: [
      { enemy: 'prowler', fromRoom: 1 },
      { enemy: 'gunner', fromRoom: 2 },
      { enemy: 'brute', fromRoom: 4 },
    ],
    waveBudget: { base: 2, perRoom: 0.45 },
    wavesPerRoom: { min: 1, max: 3 },
    eliteRooms: [5, 8],
    elite: 'stalker',
  },
];

export function getBiome(index: number): BiomeDef {
  const biome = BIOMES[index] ?? BIOMES[0];
  if (!biome) throw new Error('Aucun biome défini');
  return biome;
}
