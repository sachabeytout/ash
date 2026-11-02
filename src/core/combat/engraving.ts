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
  /** Phase active plus longue (parade plus facile à réussir : 1,25 = +25 %). */
  activeMul?: number;
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
  if (mod.activeMul) s.activeMs = Math.round(s.activeMs * mod.activeMul);
  if (s.parry) s.parry = { ...s.parry, damage: s.parry.damage * dmg };
  if (s.projectile) s.projectile = modProjectile(s.projectile, dmg, mod.projectile);
  if (s.zone) s.zone = modZone(s.zone, dmg, mod.zone);
  if (mod.finisher && comboIndex === comboLength - 1) s = applyEngraving(s, mod.finisher, 0, 1);
  return s;
}

/**
 * Réunit deux changements de coup (forge de Ptah + gravure) en un seul : les multiplicateurs se
 * multiplient, les ajouts s'additionnent, et pour le reste le second l'emporte.
 */
export function mergeStepMods(a: StepMod | undefined, b: StepMod | undefined): StepMod | undefined {
  if (!a) return b;
  if (!b) return a;
  const out: StepMod = {
    ...a,
    ...b,
    ...num('damageMul', mul(a.damageMul, b.damageMul)),
    ...num('rangeAdd', add(a.rangeAdd, b.rangeAdd)),
    ...num('arcAdd', add(a.arcAdd, b.arcAdd)),
    ...num('lungeAdd', add(a.lungeAdd, b.lungeAdd)),
    ...num('knockbackMul', mul(a.knockbackMul, b.knockbackMul)),
    ...num('tempoMul', mul(a.tempoMul, b.tempoMul)),
    ...num('activeMul', mul(a.activeMul, b.activeMul)),
    ...num('comboRamp', add(a.comboRamp, b.comboRamp)),
  };
  const finisher = mergeStepMods(a.finisher, b.finisher);
  if (finisher) out.finisher = finisher;
  if (a.projectile && b.projectile) {
    const p = a.projectile;
    const q = b.projectile;
    out.projectile = {
      ...p,
      ...q,
      ...num('damageMul', mul(p.damageMul, q.damageMul)),
      ...num('countAdd', add(p.countAdd, q.countAdd)),
      ...num('spreadAdd', add(p.spreadAdd, q.spreadAdd)),
      ...num('pierceAdd', add(p.pierceAdd, q.pierceAdd)),
      ...num('rangeMul', mul(p.rangeMul, q.rangeMul)),
      ...num('speedMul', mul(p.speedMul, q.speedMul)),
      ...num('radiusAdd', add(p.radiusAdd, q.radiusAdd)),
      ...num('bounces', add(p.bounces, q.bounces)),
    };
  }
  if (a.zone && b.zone) {
    out.zone = {
      ...a.zone,
      ...b.zone,
      ...num('damageMul', mul(a.zone.damageMul, b.zone.damageMul)),
      ...num('radiusAdd', add(a.zone.radiusAdd, b.zone.radiusAdd)),
      ...num('countAdd', add(a.zone.countAdd, b.zone.countAdd)),
    };
  }
  if (a.fx && b.fx) {
    out.fx = {
      ...a.fx,
      ...b.fx,
      ...num('crit', add(a.fx.crit, b.fx.crit)),
      ...num('lifeOnHit', add(a.fx.lifeOnHit, b.fx.lifeOnHit)),
    };
  }
  return out;
}

const mul = (x?: number, y?: number) => (x === undefined ? y : y === undefined ? x : x * y);
const add = (x?: number, y?: number) => (x === undefined ? y : y === undefined ? x : x + y);
/** `{ key: value }`, ou rien si la valeur est absente (propriétés optionnelles exactes). */
function num<K extends string>(key: K, value: number | undefined): Partial<Record<K, number>> {
  return value === undefined ? {} : ({ [key]: value } as Record<K, number>);
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
