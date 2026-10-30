import type { EnemyId } from './enemies';

export type BossAttackId = 'bite' | 'charge' | 'quake' | 'summon';
export type BossId = 'ammit';

export interface BossDef {
  id: BossId;
  nameKey: string;
  titleKey: string;
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
  bite: {
    telegraphMs: number;
    activeMs: number;
    recoveryMs: number;
    damage: number;
    range: number;
    arcDeg: number;
    lunge: number;
  };
  charge: {
    telegraphMs: number;
    activeMs: number;
    recoveryMs: number;
    damage: number;
    distance: number;
    width: number;
  };
  /** Onde de choc : un anneau qui s'élargit ; on l'esquive en s'éloignant ou en le traversant en dash. */
  quake: {
    telegraphMs: number;
    recoveryMs: number;
    damage: number;
    ringSpeed: number;
    ringMax: number;
    thickness: number;
  };
  summon: { telegraphMs: number; recoveryMs: number; enemy: EnemyId; count: number };
  /** Récompenses de la victoire (en plus de la sortie). */
  reward: { xp: number; weaponParts: number };
}

/** Ammit, la Dévoreuse : gardienne des Bas-Fonds (interprétation originale du mythe égyptien). */
export const AMMIT: BossDef = {
  id: 'ammit',
  nameKey: 'boss.ammit',
  titleKey: 'boss.ammit.title',
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

export const BOSSES: Record<BossId, BossDef> = { ammit: AMMIT };
