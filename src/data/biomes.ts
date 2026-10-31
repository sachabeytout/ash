import type { BossId } from './bosses';
import type { EnemyId } from './enemies';
import type { Pantheon } from './gods';
import type { TrackId } from './music';

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
  /** Salles calmes avec une fontaine qui soigne (pas d'ennemis). */
  fountainRooms: readonly number[];
  elite: EnemyId;
  boss: BossId;
  /** Panthéon dont les dieux apparaissent plus souvent (aucun = tous à égalité). */
  pantheon?: Pantheon;
  /** Thème du biome (salles de combat) et sa version pour le boss. */
  music: TrackId;
  bossMusic: TrackId;
  /** Ambiance visuelle (jamais de rouge-magenta : réservé aux dangers). */
  theme: BiomeTheme;
}

export interface BiomeTheme {
  /** Texture du sol. */
  floor: 'floor' | 'floorIce' | 'floorMarble' | 'floorAviary' | 'floorRoots';
  wall: number;
  wallGlow: number;
  neons: readonly [number, number];
  /** Flocons qui tombent. */
  snow: boolean;
  /** Brume froide qui dérive au ras de l'eau (Nil de minuit). */
  mist?: boolean;
  /** Plumes qui tombent (Volière). */
  feathers?: boolean;
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
      { enemy: 'leaper', fromRoom: 5 },
      { enemy: 'mender', fromRoom: 7 },
    ],
    waveBudget: { base: 2, perRoom: 0.45 },
    wavesPerRoom: { min: 1, max: 3 },
    eliteRooms: [5, 8],
    fountainRooms: [6],
    elite: 'stalker',
    boss: 'ammit',
    music: 'lowtown',
    bossMusic: 'lowtownBoss',
    theme: {
      floor: 'floor',
      wall: 0x2a2048,
      wallGlow: 0x6b4cff,
      neons: [0x6b4cff, 0x4de1ff],
      snow: false,
    },
  },
  {
    id: 'frostserver',
    nameKey: 'biome.frostserver',
    rooms: 10,
    roster: [
      { enemy: 'wolfbot', fromRoom: 1 },
      { enemy: 'frostcaster', fromRoom: 2 },
      { enemy: 'runewarden', fromRoom: 4 },
      { enemy: 'diffuser', fromRoom: 3 },
      { enemy: 'warder', fromRoom: 5 },
      { enemy: 'mender', fromRoom: 7 },
    ],
    waveBudget: { base: 3, perRoom: 0.5 },
    wavesPerRoom: { min: 2, max: 3 },
    eliteRooms: [4, 8],
    fountainRooms: [6],
    elite: 'einherjar',
    boss: 'shezmu',
    music: 'frost',
    bossMusic: 'frostBoss',
    theme: {
      floor: 'floorIce',
      wall: 0x1c3348,
      wallGlow: 0x8ff0ff,
      neons: [0x8ff0ff, 0x9ab4ff],
      snow: false,
      mist: true,
    },
  },
  {
    id: 'olympus',
    nameKey: 'biome.olympus',
    rooms: 10,
    roster: [
      { enemy: 'harpy', fromRoom: 1 },
      { enemy: 'hoplite', fromRoom: 1 },
      { enemy: 'oracle', fromRoom: 3 },
      { enemy: 'leaper', fromRoom: 2 },
      { enemy: 'mender', fromRoom: 4 },
      { enemy: 'warder', fromRoom: 5 },
    ],
    waveBudget: { base: 3.5, perRoom: 0.55 },
    wavesPerRoom: { min: 2, max: 3 },
    eliteRooms: [4, 8],
    fountainRooms: [6],
    elite: 'minotaur',
    boss: 'talos',
    music: 'olympus',
    bossMusic: 'olympusBoss',
    theme: {
      floor: 'floorMarble',
      wall: 0x3a3320,
      wallGlow: 0xffe08a,
      neons: [0xffe08a, 0x9fe0ff],
      snow: false,
    },
  },
  {
    id: 'aviary',
    nameKey: 'biome.aviary',
    rooms: 7,
    roster: [
      { enemy: 'sparrow', fromRoom: 1 },
      { enemy: 'crow', fromRoom: 1 },
      { enemy: 'jailer', fromRoom: 3 },
      { enemy: 'diffuser', fromRoom: 2 },
      { enemy: 'mender', fromRoom: 3 },
      { enemy: 'warder', fromRoom: 4 },
    ],
    waveBudget: { base: 4, perRoom: 0.7 },
    wavesPerRoom: { min: 2, max: 3 },
    eliteRooms: [4],
    fountainRooms: [5],
    elite: 'herald',
    boss: 'oiseleur',
    music: 'aviary',
    bossMusic: 'aviaryBoss',
    theme: {
      floor: 'floorAviary',
      wall: 0x2a1f3a,
      wallGlow: 0xd8b8ff,
      neons: [0xd8b8ff, 0xffe08a],
      snow: false,
      feathers: true,
    },
  },
];

export function getBiome(index: number): BiomeDef {
  const biome = BIOMES[index] ?? BIOMES[0];
  if (!biome) throw new Error('Aucun biome défini');
  return biome;
}
