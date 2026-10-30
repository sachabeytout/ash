import { AMMIT, FENRIR, OISELEUR, TALOS, type BossDef, type BossId } from './bosses';

/**
 * Variantes des boss : débloquées après la première victoire contre le boss, puis tirées au hasard
 * (une fois sur deux). Chacune a deux attaques en plus, un peu plus de vie, une teinte et un nom.
 */
export const BOSS_VARIANTS: Record<BossId, BossDef> = {
  // Ammit l'Affamée : elle bondit sur sa proie et fait pleuvoir des ossements.
  ammit: {
    ...AMMIT,
    nameKey: 'boss.ammit.variant',
    maxHp: Math.round(AMMIT.maxHp * 1.15),
    tint: 0xffd0a0,
    weights: {
      1: { bite: 3, charge: 2, quake: 2, leap: 2 },
      2: { bite: 3, charge: 2, quake: 2, leap: 2, icefall: 2, summon: 1 },
    },
    leap: { telegraphMs: 950, activeMs: 420, recoveryMs: 850, damage: 14, radius: 40 },
    icefall: {
      telegraphMs: 1000,
      activeMs: 150,
      recoveryMs: 700,
      damage: 11,
      count: 4,
      radius: 22,
      spread: 75,
      glyph: 'cross',
    },
    summon: { telegraphMs: 900, recoveryMs: 700, enemy: 'prowler', count: 3 },
    reward: { xp: Math.round(AMMIT.reward.xp * 1.3), weaponParts: AMMIT.reward.weaponParts + 1 },
  },
  // Fenrir déchaîné : plus de chaînes ; son souffle gelé balaie l'arène, le sol tremble.
  fenrir: {
    ...FENRIR,
    nameKey: 'boss.fenrir.variant',
    maxHp: Math.round(FENRIR.maxHp * 1.15),
    tint: 0xc8f0ff,
    chained: false,
    weights: {
      1: { bite: 3, leap: 2, icefall: 2, charge: 1, sweep: 2 },
      2: { bite: 2, leap: 2, icefall: 2, charge: 2, sweep: 2, quake: 1, summon: 1 },
    },
    sweep: {
      telegraphMs: 1000,
      activeMs: 900,
      recoveryMs: 800,
      damage: 14,
      range: 180,
      arcDeg: 140,
      thickness: 12,
    },
    quake: {
      telegraphMs: 1000,
      recoveryMs: 700,
      damage: 12,
      ringSpeed: 165,
      ringMax: 220,
      thickness: 12,
    },
    reward: { xp: Math.round(FENRIR.reward.xp * 1.3), weaponParts: FENRIR.reward.weaponParts + 1 },
  },
  // Talos en surchauffe : il bondit malgré son poids et frappe au corps à corps.
  talos: {
    ...TALOS,
    nameKey: 'boss.talos.variant',
    maxHp: Math.round(TALOS.maxHp * 1.15),
    tint: 0xffb070,
    weights: {
      1: { sweep: 3, quake: 2, icefall: 2, charge: 1, bite: 2 },
      2: { sweep: 3, quake: 2, icefall: 2, charge: 1, bite: 2, leap: 2, summon: 1 },
    },
    bite: {
      telegraphMs: 750,
      activeMs: 150,
      recoveryMs: 700,
      damage: 16,
      range: 62,
      arcDeg: 120,
      lunge: 18,
    },
    leap: { telegraphMs: 1000, activeMs: 480, recoveryMs: 950, damage: 18, radius: 48 },
    reward: { xp: Math.round(TALOS.reward.xp * 1.3), weaponParts: TALOS.reward.weaponParts + 1 },
  },
  // L'Oiseleur au Serment brisé : il frappe de près et appelle plus d'oiseaux.
  oiseleur: {
    ...OISELEUR,
    nameKey: 'boss.oiseleur.variant',
    maxHp: Math.round(OISELEUR.maxHp * 1.15),
    tint: 0xe0d0ff,
    weights: {
      1: { sweep: 2, icefall: 2, leap: 2, quake: 1, bite: 2 },
      2: { sweep: 2, icefall: 2, leap: 2, quake: 1, charge: 2, bite: 2, summon: 1 },
    },
    bite: {
      telegraphMs: 700,
      activeMs: 140,
      recoveryMs: 650,
      damage: 15,
      range: 60,
      arcDeg: 130,
      lunge: 24,
    },
    summon: { telegraphMs: 900, recoveryMs: 700, enemy: 'crow', count: 2 },
    reward: {
      xp: Math.round(OISELEUR.reward.xp * 1.3),
      weaponParts: OISELEUR.reward.weaponParts + 1,
    },
  },
};
