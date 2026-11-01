import type { AttackStep, ProjectileSpec, ZoneSpec } from './attack';

/**
 * Gravures de Ptah (retour F8, 0.68.0) : une gravure change une action de l'arme, jamais le dash
 * ni le Super. Une seule gravure par action ; avec ses 4 gravures, l'arme est « éveillée ».
 */
export type EngravingSlot = 'attack' | 'power' | 'dashAttack' | 'dashPower';
export const ENGRAVING_SLOTS: readonly EngravingSlot[] = [
  'attack',
  'power',
  'dashAttack',
  'dashPower',
];

/** Bonus de dégâts de l'arme éveillée (ses 4 actions gravées). */
export const AWAKENED_DAMAGE = 0.1;

/** Ce qu'une gravure change sur le coup (tout est optionnel). */
export interface StepMod {
  damageMul?: number;
  rangeAdd?: number;
  arcAdd?: number;
  lungeAdd?: number;
  knockbackMul?: number;
  /** Anticipation et récupération plus courtes (0,8 = −20 %). */
  tempoMul?: number;
  /** Le coup touche plusieurs fois pendant sa phase active (corps à corps). */
  hits?: number;
  /** Attaque : chaque coup du combo fait plus de dégâts que le précédent (+x par rang). */
  comboRamp?: number;
  /** Attaque : ces changements ne valent que pour le dernier coup du combo. */
  finisher?: StepMod;
  projectile?: {
    damageMul?: number;
    countAdd?: number;
    spreadAdd?: number;
    pierceAdd?: number;
    rangeMul?: number;
    speedMul?: number;
    radiusAdd?: number;
    /** Rebondit vers un autre ennemi après avoir touché. */
    bounces?: number;
    /** Se divise en deux petits projectiles au premier impact. */
    split?: number;
    /** Explose au bout de sa course. */
    explodeEnd?: { damage: number; radius: number };
    /** Disque : tourne sur place (ms) avant de revenir. */
    hover?: number;
  };
  zone?: { damageMul?: number; radiusAdd?: number; countAdd?: number };
  /** Le tir ou la zone est relancé une deuxième fois après ce délai (ms). */
  echoMs?: number;
  /** Onde ou projectiles lancés en plus au moment du coup. */
  wave?: ProjectileSpec;
  /** Attire les ennemis proches (rayon) juste avant de frapper. */
  pull?: number;
  /** Garde : une parade réussie détruit aussi les tirs ennemis proches (rayon). */
  reflect?: number;
  /** Effets ajoutés aux ennemis touchés par cette action. */
  fx?: {
    burn?: { dps: number; durationMs: number };
    venom?: { stacks: number; dps: number };
    judge?: { bonus: number; durationMs: number };
    stun?: { chance: number; durationMs: number };
    crit?: number;
    lifeOnHit?: number;
  };
}

export interface EngravingDef {
  id: string;
  weapon: string;
  slot: EngravingSlot;
  nameKey: string;
  descKey: string;
  mod: StepMod;
}

/** Applique une gravure à un coup. `comboIndex` / `comboLength` : rang dans le combo (attaque). */
export function applyEngraving(
  step: AttackStep,
  mod: StepMod | undefined,
  comboIndex = 0,
  comboLength = 1,
): AttackStep {
  if (!mod) return step;
  let s: AttackStep = { ...step };
  const dmg = (mod.damageMul ?? 1) * (1 + (mod.comboRamp ?? 0) * comboIndex);
  s.damage *= dmg;
  if (s.range > 0) s.range += mod.rangeAdd ?? 0;
  s.arcDeg = Math.min(360, s.arcDeg + (mod.arcAdd ?? 0));
  s.lunge += mod.lungeAdd ?? 0;
  s.knockback *= mod.knockbackMul ?? 1;
  if (mod.tempoMul) {
    s.windupMs = Math.round(s.windupMs * mod.tempoMul);
    s.recoveryMs = Math.round(s.recoveryMs * mod.tempoMul);
  }
  if (s.parry) s.parry = { ...s.parry, damage: s.parry.damage * dmg };
  if (s.projectile) s.projectile = modProjectile(s.projectile, dmg, mod.projectile);
  if (s.zone) s.zone = modZone(s.zone, dmg, mod.zone);
  if (mod.finisher && comboIndex === comboLength - 1) s = applyEngraving(s, mod.finisher, 0, 1);
  return s;
}

function modProjectile(p: ProjectileSpec, dmg: number, m: StepMod['projectile']): ProjectileSpec {
  const out: ProjectileSpec = { ...p, damage: p.damage * dmg };
  if (!m) return out;
  out.damage *= m.damageMul ?? 1;
  if (m.countAdd) {
    out.count = (p.count ?? 1) + m.countAdd;
    out.spreadDeg = Math.min(360, (p.spreadDeg ?? 0) + (m.spreadAdd ?? 20));
  }
  out.pierce += m.pierceAdd ?? 0;
  out.range *= m.rangeMul ?? 1;
  out.speed *= m.speedMul ?? 1;
  out.radius += m.radiusAdd ?? 0;
  if (m.bounces) out.bounces = (p.bounces ?? 0) + m.bounces;
  if (m.split) out.split = m.split;
  if (m.explodeEnd) out.explodeEnd = m.explodeEnd;
  if (m.hover) out.hover = m.hover;
  return out;
}

function modZone(z: ZoneSpec, dmg: number, m: StepMod['zone']): ZoneSpec {
  const out: ZoneSpec = { ...z, damage: z.damage * dmg };
  if (!m) return out;
  out.damage *= m.damageMul ?? 1;
  out.radius += m.radiusAdd ?? 0;
  if (m.countAdd) {
    out.count = (z.count ?? 1) + m.countAdd;
    out.spread = Math.max(z.spread ?? 0, 30);
  }
  return out;
}

/** Actions de l'arme pas encore gravées. */
export function freeSlots(owned: readonly EngravingDef[]): EngravingSlot[] {
  return ENGRAVING_SLOTS.filter((slot) => !owned.some((e) => e.slot === slot));
}

/**
 * Tire jusqu'à `count` gravures de l'arme pour des actions pas encore gravées (choix 1 parmi 3).
 * `rand` : nombre aléatoire dans [0, 1[.
 */
export function rollEngravings(
  all: readonly EngravingDef[],
  weapon: string,
  owned: readonly EngravingDef[],
  rand: () => number,
  count = 3,
): EngravingDef[] {
  const free = freeSlots(owned);
  const pool = all.filter((e) => e.weapon === weapon && free.includes(e.slot));
  const picks: EngravingDef[] = [];
  while (picks.length < count && pool.length > 0)
    picks.push(pool.splice(Math.floor(rand() * pool.length), 1)[0] as EngravingDef);
  return picks;
}

/** L'arme est éveillée quand ses 4 actions sont gravées. */
export function isAwakened(owned: readonly EngravingDef[]): boolean {
  return freeSlots(owned).length === 0;
}
