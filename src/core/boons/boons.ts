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
  /** Étincelle du Phénix : rareté actuelle du don amélioré. */
  from?: Rarity;
}

/** Rareté suivante (seuls les dons communs et rares progressent). */
export function nextRarity(rarity: Rarity): Rarity | null {
  return rarity === 'common' ? 'rare' : rarity === 'rare' ? 'epic' : null;
}

/** Dons pouvant gagner un cran de rareté. */
export function upgradableBoons(owned: readonly OwnedBoon[]): OwnedBoon[] {
  return owned.filter((o) => nextRarity(o.rarity) !== null && getBoon(o.id)?.kind === 'normal');
}

/** Étincelle : jusqu'à `count` dons possédés, chacun proposé au cran de rareté suivant. */
export function rollUpgrades(rng: Rng, owned: readonly OwnedBoon[], count = 3): BoonOffer[] {
  const pool = upgradableBoons(owned);
  const offers: BoonOffer[] = [];
  while (offers.length < count && pool.length > 0) {
    const pick = pool.splice(Math.floor(rng.next() * pool.length), 1)[0];
    const next = pick && nextRarity(pick.rarity);
    if (pick && next) offers.push({ id: pick.id, rarity: next, from: pick.rarity });
  }
  return offers;
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
    case 'arrows':
    case 'shockwave':
    case 'curse':
      return Math.round(effect.damage * p);
    case 'damageVs':
    case 'burnDuration':
    case 'judge':
    case 'dashCooldown':
    case 'speed':
    case 'critDamage':
    case 'weaken':
    case 'stunDuration':
      return Math.round(('bonus' in effect ? effect.bonus : effect.reduction) * p * 100);
    case 'maxHp':
    case 'healOnKill':
    case 'barrier':
    case 'lifeOnHit':
      return Math.round(effect.amount * p);
    case 'execute':
    case 'judgementDay':
      return Math.round(effect.threshold * p);
    case 'crit':
    case 'nightHunt':
      return Math.round(effect.chance * p);
    case 'aegis':
    case 'aegisCharge':
      return Math.round(effect.charges * p);
    case 'deflect':
      return Math.round(effect.radius * p);
    case 'stun':
      return effect.scales === 'chance'
        ? Math.round(effect.chance * p)
        : Math.round(effect.durationMs * p);
    case 'lastBreath':
      return Math.round(effect.hp * p);
    case 'stormStun':
    case 'critStun':
      return effect.durationMs;
    // Amplifications à paliers fixes (pas de rareté).
    case 'chainBounces':
    case 'chillStacks':
    case 'executeBonus':
    case 'arrowCount':
      return effect.bonus;
    case 'curseDamage':
      return Math.round(effect.bonus * 100);
    case 'aegisStorm':
      return Math.round(effect.damage * p);
    case 'blackSun':
      return Math.round(effect.dps * p);
    case 'embalm':
      return Math.round(effect.amount * p);
  }
}

// ---------- Profil de combat : tous les dons résumés en chiffres prêts à l'emploi ----------

export interface HitEffects {
  burn?: { dps: number; durationMs: number };
  chill?: number;
  chain?: { damage: number; bounces: number; range: number };
  bolt?: { damage: number; radius: number };
  /** Exécution sous cette part de vie (0,1 = 10 %). */
  execute?: number;
  judge?: { bonus: number; durationMs: number };
  /** Chance de critique (0,1 = 10 %). */
  crit?: number;
  weaken?: { reduction: number; durationMs: number };
  barrier?: number;
  deflect?: number;
  arrows?: { damage: number; count: number };
  stun?: { chance: number; durationMs: number };
  shockwave?: { damage: number; radius: number; knockback: number };
  curse?: { damage: number; radius: number };
  lifeOnHit?: number;
  dashCooldown?: number;
}

export interface CombatProfile {
  on: Record<Trigger, HitEffects>;
  /** Bonus de dégâts (0,2 = +20 %) contre les ennemis qui brûlent / givrés / étourdis / loin. */
  vsBurning: number;
  vsChilled: number;
  vsStunned: number;
  vsFar: number;
  retaliate?: { damage: number; range: number };
  thermalShock?: { damage: number; radius: number };
  healOnKill: number;
  speed: number;
  /** Dégâts des critiques : ×(2 + critDamage). */
  critDamage: number;
  /** Chance de critique en plus sur toutes les actions (duo). */
  critAll: number;
  aegis: number;
  lastBreath: number;
  /** Les éclairs de Zeus étourdissent (ms, duo). */
  stormStun: number;
  /** Les explosions de malédiction exécutent sous ce seuil (duo). */
  judgementDay: number;
  /** Foudre en chaîne quand l'égide bloque (dégâts, duo). */
  aegisStorm: number;
  /** Les explosions de malédiction enflamment (duo). */
  blackSun?: { dps: number; durationMs: number };
  /** Les critiques étourdissent (ms, duo). */
  critStun: number;
  /** Soin quand un ennemi qui brûle meurt (duo). */
  embalm: number;
}

export function buildProfile(owned: readonly OwnedBoon[]): CombatProfile {
  const profile: CombatProfile = {
    on: { attack: {}, power: {}, dash: {} },
    vsBurning: 0,
    vsChilled: 0,
    vsStunned: 0,
    vsFar: 0,
    healOnKill: 0,
    speed: 0,
    critDamage: 0,
    critAll: 0,
    aegis: 0,
    lastBreath: 0,
    stormStun: 0,
    judgementDay: 0,
    aegisStorm: 0,
    critStun: 0,
    embalm: 0,
  };
  let burnDurationBonus = 0;
  let stunDurationBonus = 0;
  const amp = { bounces: 0, chill: 0, execute: 0, arrows: 0, curse: 0 };
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
        else if (e.status === 'chilled') profile.vsChilled += v / 100;
        else if (e.status === 'stunned') profile.vsStunned += v / 100;
        else profile.vsFar += v / 100;
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
      case 'execute':
        profile.on[e.on].execute = v / 100;
        break;
      case 'judge':
        profile.on[e.on].judge = { bonus: v / 100, durationMs: e.durationMs };
        break;
      case 'healOnKill':
        profile.healOnKill += v;
        break;
      case 'crit':
        profile.on[e.on].crit = v / 100;
        break;
      case 'dashCooldown':
        profile.on[e.on].dashCooldown = v / 100;
        break;
      case 'speed':
        profile.speed += v / 100;
        break;
      case 'critDamage':
        profile.critDamage += v / 100;
        break;
      case 'aegis':
      case 'aegisCharge':
        profile.aegis += v;
        break;
      case 'weaken':
        profile.on[e.on].weaken = { reduction: v / 100, durationMs: e.durationMs };
        break;
      case 'barrier':
        profile.on[e.on].barrier = v;
        break;
      case 'deflect':
        profile.on[e.on].deflect = v;
        break;
      case 'arrows':
        profile.on[e.on].arrows = { damage: v, count: e.count };
        break;
      case 'stun':
        profile.on[e.on].stun =
          e.scales === 'chance'
            ? { chance: v / 100, durationMs: e.durationMs }
            : { chance: e.chance / 100, durationMs: v };
        break;
      case 'shockwave':
        profile.on[e.on].shockwave = { damage: v, radius: e.radius, knockback: e.knockback };
        break;
      case 'curse':
        profile.on[e.on].curse = { damage: v, radius: e.radius };
        break;
      case 'lifeOnHit':
        profile.on[e.on].lifeOnHit = v;
        break;
      case 'lastBreath':
        profile.lastBreath = v;
        break;
      case 'stormStun':
        profile.stormStun = v;
        break;
      case 'judgementDay':
        profile.judgementDay = v / 100;
        break;
      case 'nightHunt':
        profile.critAll += v / 100;
        break;
      case 'aegisStorm':
        profile.aegisStorm = v;
        break;
      case 'blackSun':
        profile.blackSun = { dps: v, durationMs: e.durationMs };
        break;
      case 'critStun':
        profile.critStun = v;
        break;
      case 'embalm':
        profile.embalm = v;
        break;
      case 'stunDuration':
        stunDurationBonus += v / 100;
        break;
      case 'chainBounces':
        amp.bounces += v;
        break;
      case 'chillStacks':
        amp.chill += v;
        break;
      case 'executeBonus':
        amp.execute += v / 100;
        break;
      case 'arrowCount':
        amp.arrows += v;
        break;
      case 'curseDamage':
        amp.curse += v / 100;
        break;
    }
  }
  for (const fx of Object.values(profile.on)) {
    if (fx.burn && burnDurationBonus > 0)
      fx.burn.durationMs = Math.round(fx.burn.durationMs * (1 + burnDurationBonus));
    if (fx.stun && stunDurationBonus > 0)
      fx.stun.durationMs = Math.round(fx.stun.durationMs * (1 + stunDurationBonus));
    if (fx.chain) fx.chain.bounces += amp.bounces;
    if (fx.chill) fx.chill += amp.chill;
    if (fx.execute) fx.execute += amp.execute;
    if (fx.arrows) fx.arrows.count += amp.arrows;
    if (fx.curse) fx.curse.damage = Math.round(fx.curse.damage * (1 + amp.curse));
  }
  return profile;
}

/** Multiplicateur de dégâts d'un coup selon l'état de la cible. */
export function damageMultiplier(
  profile: CombatProfile,
  target: {
    burning: boolean;
    chilled: boolean;
    stunned?: boolean;
    far?: boolean;
    judged?: number;
  },
): number {
  return (
    1 +
    (target.burning ? profile.vsBurning : 0) +
    (target.chilled ? profile.vsChilled : 0) +
    (target.stunned ? profile.vsStunned : 0) +
    (target.far ? profile.vsFar : 0) +
    (target.judged ?? 0)
  );
}
