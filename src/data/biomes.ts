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
  floor: 'floor' | 'floorIce' | 'floorMarble' | 'floorPyramid' | 'floorRoots';
  wall: number;
  wallGlow: number;
  neons: readonly [number, number];
  /** Flocons qui tombent. */
  snow: boolean;
  /** Brume froide qui dérive au ras de l'eau (Nil de minuit). */
  mist?: boolean;
  /** Grains de sable qui tombent du plafond (Pyramide aux cages). */
  sand?: boolean;
  /**
   * Retours du 02/11 (point 6, option A) : salle de temple éclairée au feu, au lieu des néons. Murs en
   * blocs de pierre avec une frise peinte, braseros dans les coins, sol de grandes dalles.
   */
  temple?: TempleTheme;
}

export interface TempleTheme {
  /** Sol et joints des dalles. */
  floor: number;
  slab: number;
  /** Blocs des murs : pierre, arête éclairée, joints. */
  stone: number;
  stoneTop: number;
  joint: number;
  /** Frise peinte au-dessus du mur du haut (couleurs en alternance) et hiéroglyphes peints. */
  frieze: readonly number[];
  glyph: number;
  /** Lumière des braseros (jamais de rouge-magenta). */
  light: number;
  /** Murs en blocs de pierre (par défaut) ou en planches (comptoir de Ratatosk). */
  walls?: 'stone' | 'planks';
  /** Braseros (par défaut) ou lanternes dans les coins. */
  corner?: 'brazier' | 'lantern';
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
      wall: 0x6b5236,
      wallGlow: 0xe8b060,
      neons: [0xff9640, 0xffc070],
      snow: false,
      // Héliopolis : temple de grès, frise lapis, ocre et turquoise, braseros orangés.
      temple: {
        floor: 0x2a2016,
        slab: 0x1f170f,
        stone: 0x6b5236,
        stoneTop: 0x8a6a44,
        joint: 0x4a3824,
        frieze: [0x2a4a8a, 0xc08a3a, 0x3aa89a, 0xc08a3a],
        glyph: 0xd8b060,
        light: 0xff9640,
      },
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
      wall: 0x5a606c,
      wallGlow: 0xc8d4e8,
      neons: [0xff9a50, 0xc8d4e8],
      snow: false,
      mist: true,
      // Nil de minuit : temple de calcaire gris-bleu au bord du fleuve, frise argentée, feu chaud la nuit.
      temple: {
        floor: 0x181b21,
        slab: 0x0f1216,
        stone: 0x5a606c,
        stoneTop: 0x767c88,
        joint: 0x3a3e48,
        frieze: [0x2a4a8a, 0xc8d4e8, 0x3aa89a, 0xc8d4e8],
        glyph: 0xc8d4e8,
        light: 0xff9a50,
      },
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
    waveBudget: { base: 3.5, perRoom: 0.6 },
    wavesPerRoom: { min: 2, max: 3 },
    eliteRooms: [4],
    fountainRooms: [5],
    elite: 'herald',
    boss: 'oiseleur',
    music: 'aviary',
    bossMusic: 'aviaryBoss',
    // La Pyramide aux cages : une pyramide dont l'Oiseleur s'est emparé pour en faire sa volière.
    theme: {
      floor: 'floorPyramid',
      wall: 0x8a6c40,
      wallGlow: 0xe8c070,
      neons: [0xffa848, 0xffd36b],
      snow: false,
      sand: true,
      // Pyramide aux cages : couloirs de calcaire doré, frise or, lapis et turquoise.
      temple: {
        floor: 0x1e170d,
        slab: 0x15100a,
        stone: 0x8a6c40,
        stoneTop: 0xb08c58,
        joint: 0x5a4426,
        frieze: [0xd8a840, 0x2a4a9a, 0x40d0c0, 0x2a4a9a],
        glyph: 0xd8a840,
        light: 0xffa848,
      },
    },
  },
  {
    // La Douât : le monde de la nuit, où Apophis attend la barque de Râ (dernier monde).
    id: 'douat',
    nameKey: 'biome.douat',
    rooms: 8,
    roster: [
      { enemy: 'harpy', fromRoom: 1 },
      { enemy: 'hoplite', fromRoom: 1 },
      { enemy: 'oracle', fromRoom: 2 },
      { enemy: 'leaper', fromRoom: 2 },
      { enemy: 'mender', fromRoom: 3 },
      { enemy: 'warder', fromRoom: 4 },
    ],
    waveBudget: { base: 4, perRoom: 0.7 },
    wavesPerRoom: { min: 2, max: 3 },
    eliteRooms: [4, 7],
    fountainRooms: [5],
    elite: 'minotaur',
    boss: 'apophis',
    music: 'olympus',
    bossMusic: 'olympusBoss',
    theme: {
      floor: 'floorMarble',
      wall: 0x2e2e34,
      wallGlow: 0x9fe8b0,
      neons: [0xffa040, 0x9fe8b0],
      snow: false,
      // Douât : basalte noir du monde des morts, frise or, lapis et vert des âmes, braseros chauds.
      temple: {
        floor: 0x131116,
        slab: 0x0a090c,
        stone: 0x2e2e34,
        stoneTop: 0x4a4a52,
        joint: 0x1a1a1e,
        frieze: [0xc8a040, 0x2a4a8a, 0x7fd8a0, 0x2a4a8a],
        glyph: 0x7fd8a0,
        light: 0xffa040,
      },
    },
  },
];

export function getBiome(index: number): BiomeDef {
  const biome = BIOMES[index] ?? BIOMES[0];
  if (!biome) throw new Error('Aucun biome défini');
  return biome;
}
