import type { EnemyId } from './enemies';

export type BossAttackId =
  'bite' | 'charge' | 'quake' | 'summon' | 'leap' | 'icefall' | 'sweep' | 'hook';
export type BossId = 'ammit' | 'shezmu' | 'oiseleur' | 'apophis';

export interface BossDef {
  id: BossId;
  nameKey: string;
  titleKey: string;
  /** Bannières : passage en phase 2, victoire. */
  phase2Key: string;
  defeatedKey: string;
  maxHp: number;
  radius: number;
  speed: number;
  /** Sous cette part de vie, la phase 2 commence (attaques plus rapides, invocations, double onde). */
  phase2At: number;
  /** Multiplicateur des télégraphes et récupérations en phase 2 (0,8 = 20 % plus rapide). */
  phase2Tempo: number;
  /** Pause entre deux attaques (ms, tirée entre min et max). */
  idleMs: { min: number; max: number };
  /** Poids de tirage des attaques, par phase. */
  weights: Record<1 | 2, Partial<Record<BossAttackId, number>>>;
  /** Texture du boss. */
  texture: string;
  /** Variante : teinte du sprite (sinon couleurs d'origine). */
  tint?: number;
  /** Enchaîné : des chaînes le relient aux murs ; il en brise une en phase 2. */
  chained?: boolean;
  bite?: {
    telegraphMs: number;
    activeMs: number;
    recoveryMs: number;
    damage: number;
    range: number;
    arcDeg: number;
    lunge: number;
  };
  charge?: {
    telegraphMs: number;
    activeMs: number;
    recoveryMs: number;
    damage: number;
    distance: number;
    width: number;
  };
  /** Onde de choc : un anneau qui s'élargit ; on l'esquive en s'éloignant ou en le traversant en dash. */
  quake?: {
    telegraphMs: number;
    recoveryMs: number;
    damage: number;
    ringSpeed: number;
    ringMax: number;
    thickness: number;
  };
  summon?: { telegraphMs: number; recoveryMs: number; enemy: EnemyId; count: number };
  /** Bond : un cercle marque l'endroit où il va retomber (fixé avant le saut). */
  leap?: {
    telegraphMs: number;
    activeMs: number;
    recoveryMs: number;
    damage: number;
    radius: number;
  };
  /** Pluie de glace : des cercles au sol (dont un sous Ash), puis la glace tombe. */
  icefall?: {
    telegraphMs: number;
    activeMs: number;
    recoveryMs: number;
    damage: number;
    count: number;
    radius: number;
    spread: number;
    /** Dessin dans les cercles : flocon (glace), croix (débris), filet (Oiseleur), goutte (pressoir), œil (Apophis). */
    glyph?: 'flake' | 'cross' | 'net' | 'drop' | 'eye';
  };
  /** Balayage : un rayon part des yeux et balaie un arc annoncé (on passe derrière, ou on le traverse en dash). */
  sweep?: {
    telegraphMs: number;
    activeMs: number;
    recoveryMs: number;
    damage: number;
    range: number;
    arcDeg: number;
    thickness: number;
  };
  /**
   * Chaînes (Shezmu) : une bande annonce la ligne ; la chaîne part, et si elle touche Ash, elle le
   * tire vers le boss. On l'esquive en sortant de la bande (ou en la traversant en dash).
   */
  hook?: {
    telegraphMs: number;
    activeMs: number;
    recoveryMs: number;
    damage: number;
    distance: number;
    width: number;
  };
  /** Récompenses de la victoire (en plus de la sortie). */
  reward: { xp: number; weaponParts: number };
}

/** Ammit, la Dévoreuse : gardienne des Bas-Fonds (interprétation originale du mythe égyptien). */
export const AMMIT: BossDef = {
  id: 'ammit',
  texture: 'ammit',
  nameKey: 'boss.ammit',
  titleKey: 'boss.ammit.title',
  phase2Key: 'boss.ammit.phase2',
  defeatedKey: 'boss.ammit.defeated',
  maxHp: 800,
  radius: 18,
  speed: 40,
  phase2At: 0.5,
  phase2Tempo: 0.8,
  idleMs: { min: 650, max: 1000 },
  weights: {
    1: { bite: 3, charge: 2, quake: 2 },
    2: { bite: 3, charge: 2, quake: 2, summon: 1 },
  },
  bite: {
    telegraphMs: 700,
    activeMs: 140,
    recoveryMs: 650,
    damage: 12,
    range: 58,
    arcDeg: 110,
    lunge: 22,
  },
  charge: {
    telegraphMs: 950,
    activeMs: 380,
    recoveryMs: 850,
    damage: 15,
    distance: 230,
    width: 30,
  },
  quake: {
    telegraphMs: 1000,
    recoveryMs: 700,
    damage: 11,
    ringSpeed: 170,
    ringMax: 210,
    thickness: 12,
  },
  summon: { telegraphMs: 900, recoveryMs: 700, enemy: 'prowler', count: 2 },
  reward: { xp: 50, weaponParts: 2 },
};

/**
 * Shezmu, le Bourreau : le serviteur d'Apophis, au bord du Nil de minuit. Lames en arc, grand
 * balayage, chaînes qui tirent Ash vers lui ; en phase 2, son pressoir écrase le sol et fait pleuvoir
 * des gouttes (les souvenirs pressés d'Anii).
 */
export const SHEZMU: BossDef = {
  id: 'shezmu',
  texture: 'shezmu',
  nameKey: 'boss.shezmu',
  titleKey: 'boss.shezmu.title',
  phase2Key: 'boss.shezmu.phase2',
  defeatedKey: 'boss.shezmu.defeated',
  maxHp: 1100,
  radius: 18,
  speed: 52,
  phase2At: 0.5,
  phase2Tempo: 0.8,
  idleMs: { min: 550, max: 900 },
  weights: {
    1: { bite: 3, sweep: 2, hook: 2 },
    2: { bite: 2, sweep: 2, hook: 2, quake: 2, icefall: 2 },
  },
  // Lame en arc : un coup large devant lui.
  bite: {
    telegraphMs: 650,
    activeMs: 140,
    recoveryMs: 650,
    damage: 13,
    range: 58,
    arcDeg: 150,
    lunge: 18,
  },
  // Grand balayage de la lame (demi-cercle).
  sweep: {
    telegraphMs: 1000,
    activeMs: 800,
    recoveryMs: 800,
    damage: 14,
    range: 120,
    arcDeg: 180,
    thickness: 14,
  },
  hook: { telegraphMs: 850, activeMs: 300, recoveryMs: 750, damage: 8, distance: 220, width: 18 },
  // Phase 2 : le pressoir écrase le sol…
  quake: {
    telegraphMs: 1000,
    recoveryMs: 700,
    damage: 12,
    ringSpeed: 160,
    ringMax: 210,
    thickness: 12,
  },
  // … et des gouttes en tombent.
  icefall: {
    telegraphMs: 1000,
    activeMs: 150,
    recoveryMs: 700,
    damage: 11,
    count: 4,
    radius: 22,
    spread: 80,
    glyph: 'drop',
  },
  reward: { xp: 70, weaponParts: 3 },
};

/**
 * Apophis : le grand serpent de l'Isfet, au fond de la Douât (boss final). Morsure qui se détend,
 * coup de queue, glissade à travers l'arène, anneaux qui se resserrent en onde de choc ; en phase 2,
 * les ténèbres tombent en gouttes et les âmes égarées accourent.
 */
export const APOPHIS: BossDef = {
  id: 'apophis',
  texture: 'apophis',
  nameKey: 'boss.apophis',
  titleKey: 'boss.apophis.title',
  phase2Key: 'boss.apophis.phase2',
  defeatedKey: 'boss.apophis.defeated',
  maxHp: 1900,
  radius: 22,
  speed: 44,
  phase2At: 0.5,
  phase2Tempo: 0.8,
  idleMs: { min: 500, max: 850 },
  weights: {
    1: { bite: 3, sweep: 2, charge: 2, quake: 1 },
    2: { bite: 2, sweep: 2, charge: 2, quake: 2, icefall: 2, summon: 1 },
  },
  // Morsure : le serpent se détend et frappe loin devant lui.
  bite: {
    telegraphMs: 700,
    activeMs: 150,
    recoveryMs: 700,
    damage: 16,
    range: 70,
    arcDeg: 70,
    lunge: 40,
  },
  // Coup de queue.
  sweep: {
    telegraphMs: 1000,
    activeMs: 900,
    recoveryMs: 800,
    damage: 15,
    range: 200,
    arcDeg: 160,
    thickness: 14,
  },
  // Glissade à travers l'arène.
  charge: {
    telegraphMs: 950,
    activeMs: 420,
    recoveryMs: 900,
    damage: 17,
    distance: 260,
    width: 34,
  },
  // Les anneaux se resserrent : onde de choc.
  quake: {
    telegraphMs: 1000,
    recoveryMs: 750,
    damage: 13,
    ringSpeed: 165,
    ringMax: 240,
    thickness: 14,
  },
  // Phase 2 : les ténèbres tombent.
  icefall: {
    telegraphMs: 1000,
    activeMs: 150,
    recoveryMs: 700,
    damage: 13,
    count: 6,
    radius: 22,
    spread: 85,
    glyph: 'eye',
  },
  summon: { telegraphMs: 900, recoveryMs: 700, enemy: 'harpy', count: 2 },
  reward: { xp: 150, weaponParts: 5 },
};

/** L'Oiseleur : le chasseur des oiseaux des dieux, au sommet de la Pyramide aux cages (3e monde). */
export const OISELEUR: BossDef = {
  id: 'oiseleur',
  texture: 'oiseleur',
  nameKey: 'boss.oiseleur',
  titleKey: 'boss.oiseleur.title',
  phase2Key: 'boss.oiseleur.phase2',
  defeatedKey: 'boss.oiseleur.defeated',
  maxHp: 1500,
  radius: 18,
  speed: 52,
  phase2At: 0.5,
  phase2Tempo: 0.8,
  idleMs: { min: 500, max: 850 },
  weights: {
    1: { sweep: 2, icefall: 2, leap: 2, quake: 1 },
    2: { sweep: 2, icefall: 2, leap: 2, quake: 1, charge: 1, summon: 1 },
  },
  charge: {
    telegraphMs: 900,
    activeMs: 360,
    recoveryMs: 850,
    damage: 16,
    distance: 260,
    width: 26,
  },
  quake: {
    telegraphMs: 950,
    recoveryMs: 700,
    damage: 12,
    ringSpeed: 175,
    ringMax: 230,
    thickness: 12,
  },
  summon: { telegraphMs: 900, recoveryMs: 700, enemy: 'sparrow', count: 3 },
  leap: { telegraphMs: 950, activeMs: 420, recoveryMs: 850, damage: 16, radius: 46 },
  icefall: {
    telegraphMs: 1000,
    activeMs: 150,
    recoveryMs: 700,
    damage: 13,
    count: 6,
    radius: 22,
    spread: 85,
    glyph: 'net',
  },
  sweep: {
    telegraphMs: 1000,
    activeMs: 1000,
    recoveryMs: 800,
    damage: 15,
    range: 200,
    arcDeg: 180,
    thickness: 10,
  },
  reward: { xp: 90, weaponParts: 4 },
};

export const BOSSES: Record<BossId, BossDef> = {
  ammit: AMMIT,
  shezmu: SHEZMU,
  oiseleur: OISELEUR,
  apophis: APOPHIS,
};
