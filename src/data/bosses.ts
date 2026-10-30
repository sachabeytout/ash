import type { EnemyId } from './enemies';

export type BossAttackId = 'bite' | 'charge' | 'quake' | 'summon' | 'leap' | 'icefall';
export type BossId = 'ammit' | 'fenrir';

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
  /** Enchaîné (Fenrir) : des chaînes le relient aux murs ; il en brise une en phase 2. */
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

/** Fenrir-Ω : le loup enchaîné du Givre-Serveur. Bondit, fait tomber la glace, appelle sa meute. */
export const FENRIR: BossDef = {
  id: 'fenrir',
  texture: 'fenrir',
  chained: true,
  nameKey: 'boss.fenrir',
  titleKey: 'boss.fenrir.title',
  phase2Key: 'boss.fenrir.phase2',
  defeatedKey: 'boss.fenrir.defeated',
  maxHp: 1100,
  radius: 18,
  speed: 58,
  phase2At: 0.5,
  phase2Tempo: 0.8,
  idleMs: { min: 550, max: 900 },
  weights: {
    1: { bite: 3, leap: 2, icefall: 2, charge: 1 },
    2: { bite: 2, leap: 2, icefall: 2, charge: 2, summon: 1 },
  },
  bite: {
    telegraphMs: 650,
    activeMs: 130,
    recoveryMs: 600,
    damage: 13,
    range: 54,
    arcDeg: 100,
    lunge: 26,
  },
  charge: {
    telegraphMs: 900,
    activeMs: 340,
    recoveryMs: 800,
    damage: 15,
    distance: 240,
    width: 28,
  },
  summon: { telegraphMs: 900, recoveryMs: 700, enemy: 'wolfbot', count: 2 },
  leap: { telegraphMs: 950, activeMs: 420, recoveryMs: 850, damage: 16, radius: 42 },
  icefall: {
    telegraphMs: 1000,
    activeMs: 150,
    recoveryMs: 700,
    damage: 12,
    count: 5,
    radius: 20,
    spread: 70,
  },
  reward: { xp: 70, weaponParts: 3 },
};

export const BOSSES: Record<BossId, BossDef> = { ammit: AMMIT, fenrir: FENRIR };
