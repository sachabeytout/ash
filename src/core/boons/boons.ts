import {
  BOONS,
  RARITY_ODDS,
  RARITY_POWER,
  getBoon,
  slotOf,
  type BoonDef,
  type BoonEffect,
  type Rarity,
  type Trigger,
} from '../../data/boons';
import type { GodId } from '../../data/gods';
import type { Rng } from '../rng';

/** Un don possédé pendant la run (sérialisable). */
export interface OwnedBoon {
  id: string;
  rarity: Rarity;
}

/** Un don proposé au choix. */
export interface BoonOffer {
  id: string;
  rarity: Rarity;
  /** Le don déjà présent sur la même action, qui sera remplacé. */
  replaces?: string;
}

/** Duos et amplifications sortent plus souvent quand ils sont possibles (on veut les voir). */
const SPECIAL_WEIGHT = 3;

function ownsGod(owned: readonly OwnedBoon[], god: GodId): boolean {
  return owned.some((o) => getBoon(o.id)?.gods.includes(god) && getBoon(o.id)?.kind === 'normal');
}

/** Ce don peut-il être proposé par ce dieu, vu les dons déjà obtenus ? */
export function isEligible(def: BoonDef, owned: readonly OwnedBoon[], god: GodId): boolean {
  if (!def.gods.includes(god)) return false;
  if (owned.some((o) => o.id === def.id)) return false;
  if (def.kind === 'duo') return def.gods.every((g) => ownsGod(owned, g));
  if (def.requiresAny) return def.requiresAny.some((id) => owned.some((o) => o.id === id));
  return true;
}

export function rollRarity(rng: Rng, kind: BoonDef['kind'], rareBonus = 0): Rarity {
  if (kind !== 'normal') return kind;
  const r = rng.next();
  if (r < RARITY_ODDS.epic + rareBonus / 3) return 'epic';
  if (r < RARITY_ODDS.epic + RARITY_ODDS.rare + rareBonus) return 'rare';
  return 'common';
}

/** Tire jusqu'à `count` dons différents d'un dieu (choix 1 parmi 3). */
export function rollOffer(
  rng: Rng,
  owned: readonly OwnedBoon[],
  god: GodId,
  count = 3,
  rareBonus = 0,
): BoonOffer[] {
  const pool = BOONS.filter((b) => isEligible(b, owned, god));
  const offers: BoonOffer[] = [];
  while (offers.length < count && pool.length > 0) {
    const weight = (b: BoonDef) => (b.kind === 'normal' ? 1 : SPECIAL_WEIGHT);
    let roll = rng.next() * pool.reduce((sum, b) => sum + weight(b), 0);
    let index = 0;
    for (; index < pool.length - 1; index++) {
      roll -= weight(pool[index] as BoonDef);
      if (roll < 0) break;
    }
    const def = pool.splice(index, 1)[0] as BoonDef;
    const slot = slotOf(def.effect);
    const replaced =
      slot === 'passive'
        ? undefined
        : owned.find((o) => {
            const d = getBoon(o.id);
            return d !== undefined && slotOf(d.effect) === slot;
          });
    offers.push({
      id: def.id,
      rarity: rollRarity(rng, def.kind, rareBonus),
      ...(replaced ? { replaces: replaced.id } : {}),
    });
  }
  return offers;
}

/** Prend un don : il remplace celui qui occupait la même action. */
export function takeBoon(owned: readonly OwnedBoon[], offer: BoonOffer): OwnedBoon[] {
  const rest = owned.filter((o) => o.id !== offer.replaces && o.id !== offer.id);
  return [...rest, { id: offer.id, rarity: offer.rarity }];
}

/** Valeur principale d'un effet (celle qui grandit avec la rareté). */
export function mainValue(effect: BoonEffect, rarity: Rarity): number {
  const p = RARITY_POWER[rarity];
  switch (effect.type) {
    case 'burn':
      return Math.round(effect.dps * p);
    case 'chill':
      return Math.round(effect.stacks * p);
    case 'chain':
    case 'bolt':
    case 'retaliate':
    case 'thermalShock':
      return Math.round(effect.damage * p);
    case 'damageVs':
    case 'burnDuration':
      return Math.round(effect.bonus * p * 100);
    case 'maxHp':
      return Math.round(effect.amount * p);
  }
}

// ---------- Profil de combat : tous les dons résumés en chiffres prêts à l'emploi ----------

export interface HitEffects {
  burn?: { dps: number; durationMs: number };
  chill?: number;
  chain?: { damage: number; bounces: number; range: number };
  bolt?: { damage: number; radius: number };
}

export interface CombatProfile {
  on: Record<Trigger, HitEffects>;
  /** Bonus de dégâts (0,2 = +20 %) contre les ennemis qui brûlent / sont givrés. */
  vsBurning: number;
  vsChilled: number;
  retaliate?: { damage: number; range: number };
  thermalShock?: { damage: number; radius: number };
}

export function buildProfile(owned: readonly OwnedBoon[]): CombatProfile {
  const profile: CombatProfile = {
    on: { attack: {}, power: {}, dash: {} },
    vsBurning: 0,
    vsChilled: 0,
  };
  let burnDurationBonus = 0;
  for (const o of owned) {
    const def = getBoon(o.id);
    if (!def) continue;
    const e = def.effect;
    const v = mainValue(e, o.rarity);
    switch (e.type) {
      case 'burn':
        profile.on[e.on].burn = { dps: v, durationMs: e.durationMs };
        break;
      case 'chill':
        profile.on[e.on].chill = v;
        break;
      case 'chain':
        profile.on[e.on].chain = { damage: v, bounces: e.bounces, range: e.range };
        break;
      case 'bolt':
        profile.on[e.on].bolt = { damage: v, radius: e.radius };
        break;
      case 'damageVs':
        if (e.status === 'burning') profile.vsBurning += v / 100;
        else profile.vsChilled += v / 100;
        break;
      case 'maxHp':
        break; // appliqué une fois, au moment où on prend le don (voir run/state)
      case 'retaliate':
        profile.retaliate = { damage: v, range: e.range };
        break;
      case 'thermalShock':
        profile.thermalShock = { damage: v, radius: e.radius };
        break;
      case 'burnDuration':
        burnDurationBonus += v / 100;
        break;
    }
  }
  if (burnDurationBonus > 0) {
    for (const fx of Object.values(profile.on)) {
      if (fx.burn) fx.burn.durationMs = Math.round(fx.burn.durationMs * (1 + burnDurationBonus));
    }
  }
  return profile;
}

/** Multiplicateur de dégâts d'un coup selon l'état de la cible. */
export function damageMultiplier(
  profile: CombatProfile,
  target: { burning: boolean; chilled: boolean },
): number {
  return 1 + (target.burning ? profile.vsBurning : 0) + (target.chilled ? profile.vsChilled : 0);
}
