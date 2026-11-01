import {
  BOONS,
  RARITY_ODDS,
  RARITY_POWER,
  getBoon,
  slotOf,
  type BoonDef,
  type BoonSlot,
  type BoonEffect,
  type Rarity,
  type SlotEffect,
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
  /** Braise du Bennu (ex-Étincelle) : rareté actuelle du don amélioré. */
  from?: Rarity;
  /**
   * Puits d'offrandes (0.61.0), quand le dieu n'a plus assez de dons nouveaux :
   * « favor » = un de ses dons possédés gagne un cran de rareté (`id`, `from` → `rarity`) ;
   * « offering » = des PV max en plus (`id` = OFFERING_ID).
   */
  special?: 'favor' | 'offering';
}

/** Identifiant de l'Offrande (ce n'est pas un don). */
export const OFFERING_ID = 'offering';
/** PV max (et soin) donnés par une Offrande. */
export const OFFERING_HP = 6;
/** Au plus un don qui remplace un don possédé par choix (tant qu'il reste des dons nouveaux). */
export const MAX_REPLACEMENTS = 1;

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

/** Les duos sortent plus souvent quand ils sont possibles (on veut les voir). */
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

/** Le don déjà posé sur la même action (et que ce don remplacerait), s'il y en a un. */
function replacedBy(def: BoonDef, owned: readonly OwnedBoon[]): OwnedBoon | undefined {
  const slot = slotOf(def.effect);
  if (slot === 'passive') return undefined;
  return owned.find((o) => {
    const d = getBoon(o.id);
    return d !== undefined && slotOf(d.effect) === slot;
  });
}

/**
 * Tire jusqu'à `count` choix d'un dieu (choix 1 parmi 3). Au plus `MAX_REPLACEMENTS` don qui
 * remplace un don possédé ; s'il ne reste pas assez de dons nouveaux, le Puits d'offrandes
 * complète : une Faveur (un don de ce dieu gagne un cran de rareté), puis une Offrande (PV max),
 * et seulement ensuite d'autres remplacements. Le joueur n'est jamais obligé de remplacer.
 */
export function rollOffer(
  rng: Rng,
  owned: readonly OwnedBoon[],
  god: GodId,
  count = 3,
  rareBonus = 0,
): BoonOffer[] {
  const pool = BOONS.filter((b) => isEligible(b, owned, god));
  const offers: BoonOffer[] = [];
  const extraReplacements: BoonDef[] = [];
  let replacements = 0;
  while (offers.length < count && pool.length > 0) {
    const weight = (b: BoonDef) => (b.kind === 'normal' ? 1 : SPECIAL_WEIGHT);
    let roll = rng.next() * pool.reduce((sum, b) => sum + weight(b), 0);
    let index = 0;
    for (; index < pool.length - 1; index++) {
      roll -= weight(pool[index] as BoonDef);
      if (roll < 0) break;
    }
    const def = pool.splice(index, 1)[0] as BoonDef;
    const replaced = replacedBy(def, owned);
    if (replaced && replacements >= MAX_REPLACEMENTS) {
      extraReplacements.push(def);
      continue;
    }
    if (replaced) replacements++;
    offers.push({
      id: def.id,
      rarity: rollRarity(rng, def.kind, rareBonus),
      ...(replaced ? { replaces: replaced.id } : {}),
    });
  }
  // Puits d'offrandes : des Faveurs (dons différents), en gardant une place pour l'Offrande.
  const favors = upgradableBoons(owned).filter((o) => getBoon(o.id)?.gods.includes(god));
  while (offers.length < Math.max(1, count - 1) && favors.length > 0) {
    const pick = favors.splice(Math.floor(rng.next() * favors.length), 1)[0];
    const next = pick && nextRarity(pick.rarity);
    if (pick && next)
      offers.push({ id: pick.id, rarity: next, from: pick.rarity, special: 'favor' });
  }
  if (offers.length < count)
    offers.push({ id: OFFERING_ID, rarity: 'common', special: 'offering' });
  while (offers.length < count && extraReplacements.length > 0) {
    const def = extraReplacements.shift() as BoonDef;
    const replaced = replacedBy(def, owned);
    offers.push({
      id: def.id,
      rarity: rollRarity(rng, def.kind, rareBonus),
      ...(replaced ? { replaces: replaced.id } : {}),
    });
  }
  return offers;
}

/** Prend un don : il remplace celui qui occupait la même action. */
/**
 * Dieu du don posé sur une action (attaque, dash…) : sa couleur habille cette action
 * (ex. la traînée de l'attaque prend la couleur du dieu de l'attaque).
 */
export function slotGod(owned: readonly OwnedBoon[], slot: BoonSlot): GodId | undefined {
  for (const o of owned) {
    const def = getBoon(o.id);
    if (def && slotOf(def.effect) === slot) return def.gods[0];
  }
  return undefined;
}

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
    case 'soak':
      return Math.round(effect.slow * p * 100);
    case 'venom':
      return Math.round(effect.stacks * p);
    case 'roomHeal':
      return Math.round(effect.amount * p);
    case 'venomPotency':
      return Math.round(effect.bonus * p * 100);
    case 'conduct':
      return Math.round(effect.damage * p);
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
    case 'executeAll':
    case 'judgementDay':
      return Math.round(effect.threshold * p);
    case 'crit':
    case 'nightHunt':
      return Math.round(effect.chance * p);
    case 'aegis':
    case 'aegisCharge':
      return Math.round(effect.charges * p);
    case 'rider':
      return mainValue(effect.effect, rarity);
    case 'dawn':
    case 'shatter':
    case 'jackalSpirit':
      return Math.round(effect.damage * p);
    case 'burnSpread':
    case 'venomSpread':
      return Math.round(effect.radius * p);
    case 'scales':
    case 'poisonWeak':
      return Math.round(effect.reduction * p * 100);
    case 'actionDamage':
    case 'moonPhase':
    case 'wrath':
    case 'openMouth':
    case 'superGain':
      return Math.round(effect.bonus * p * 100);
    case 'purr':
      return Math.round(effect.amount * p);
    case 'dashGuard':
      return Math.round(effect.ms * p);
    case 'soakAegis':
      return Math.round(effect.cooldownMs / 1000);
    case 'critBurn':
    case 'zapBurn':
      return Math.round(effect.dps * p);
    case 'venomHeal':
    case 'executeHeal':
      return Math.round(effect.amount * p);
    case 'moonRiver':
    case 'stunVenom':
      return effect.stacks;
    case 'frozenCrit':
      return effect.chance;
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
    // Passifs de renfort (anciennes amplifications) : ils grandissent aussi avec la rareté.
    case 'chainBounces':
    case 'chillStacks':
    case 'executeBonus':
    case 'arrowCount':
      return Math.round(effect.bonus * p);
    case 'curseDamage':
      return Math.round(effect.bonus * p * 100);
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
  /** Trempé : ralentissement (0,2 = −20 %) et durée. */
  soak?: { slow: number; durationMs: number };
  /** Doses de venin ajoutées et dégâts par seconde de chaque dose. */
  venom?: { stacks: number; dps: number };
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
  vsSoaked: number;
  vsPoisoned: number;
  /** PV rendus à chaque salle terminée (Isis). */
  roomHeal: number;
  /** Duo Seth + Sobek : dégâts de foudre sur tous les ennemis trempés à chaque éclair. */
  conduct: number;
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
  /** Les éclairs étourdissent (ms ; ancien duo, plus offert). */
  stormStun: number;
  /** Les explosions de malédiction exécutent sous ce seuil (duo). */
  judgementDay: number;
  /** Foudre en chaîne quand le Bouclier de Saïs bloque (dégâts, duo). */
  aegisStorm: number;
  /** Les explosions de malédiction enflamment (duo). */
  blackSun?: { dps: number; durationMs: number };
  /** Les critiques étourdissent (ms, duo). */
  critStun: number;
  /** Soin quand un ennemi qui brûle meurt (duo). */
  embalm: number;
  /** Bonus contre les ennemis ralentis (trempés ou givrés, Bastet). */
  vsSlowed: number;
  // ---------- Passifs « en plus » (0.58.0) ----------
  dawn?: { damage: number; radius: number };
  burnSpread: number;
  scales: number;
  actionDamage: Record<'attack' | 'power' | 'super', number>;
  shatter?: { damage: number; radius: number };
  moonPhase: number;
  wrath: number;
  venomSpread: number;
  poisonWeak: number;
  jackalSpirit: number;
  openMouth: number;
  purr: number;
  superGain: number;
  dashGuardMs: number;
  // ---------- Duos tirés de la mythologie (0.59.0) ----------
  soakAegisMs: number;
  critBurn?: { dps: number; durationMs: number };
  zapBurn?: { dps: number; durationMs: number };
  venomHeal: number;
  executeHeal: number;
  moonRiver: number;
  frozenCrit: number;
  stunVenom: number;
}

export function buildProfile(owned: readonly OwnedBoon[]): CombatProfile {
  const profile: CombatProfile = {
    on: { attack: {}, power: {}, dash: {}, super: {} },
    vsBurning: 0,
    vsChilled: 0,
    vsStunned: 0,
    vsFar: 0,
    vsSoaked: 0,
    vsPoisoned: 0,
    roomHeal: 0,
    conduct: 0,
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
    vsSlowed: 0,
    burnSpread: 0,
    scales: 0,
    actionDamage: { attack: 0, power: 0, super: 0 },
    moonPhase: 0,
    wrath: 0,
    venomSpread: 0,
    poisonWeak: 0,
    jackalSpirit: 0,
    openMouth: 0,
    purr: 0,
    superGain: 0,
    dashGuardMs: 0,
    soakAegisMs: 0,
    venomHeal: 0,
    executeHeal: 0,
    moonRiver: 0,
    frozenCrit: 0,
    stunVenom: 0,
  };
  const riders: Record<Trigger, HitEffects> = { attack: {}, power: {}, dash: {}, super: {} };
  let burnDurationBonus = 0;
  let venomPotency = 0;
  let executeAll = 0;
  let stunDurationBonus = 0;
  const amp = { bounces: 0, chill: 0, execute: 0, arrows: 0, curse: 0 };
  for (const o of owned) {
    const def = getBoon(o.id);
    if (!def) continue;
    const e = def.effect;
    const v = mainValue(e, o.rarity);
    if ('on' in e) {
      applyOn(profile.on, e, v);
      continue;
    }
    switch (e.type) {
      case 'roomHeal':
        profile.roomHeal += v;
        break;
      case 'venomPotency':
        venomPotency += v / 100;
        break;
      case 'conduct':
        profile.conduct = v;
        break;
      case 'damageVs':
        if (e.status === 'burning') profile.vsBurning += v / 100;
        else if (e.status === 'chilled') profile.vsChilled += v / 100;
        else if (e.status === 'stunned') profile.vsStunned += v / 100;
        else if (e.status === 'soaked') profile.vsSoaked += v / 100;
        else if (e.status === 'poisoned') profile.vsPoisoned += v / 100;
        else if (e.status === 'slowed') profile.vsSlowed += v / 100;
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
      case 'executeAll':
        executeAll = Math.max(executeAll, v / 100);
        break;
      case 'healOnKill':
        profile.healOnKill += v;
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
      case 'rider':
        applyOn(riders, e.effect, v);
        break;
      case 'dawn':
        profile.dawn = { damage: v, radius: e.radius };
        break;
      case 'burnSpread':
        profile.burnSpread = Math.max(profile.burnSpread, v);
        break;
      case 'scales':
        profile.scales += v / 100;
        break;
      case 'actionDamage':
        profile.actionDamage[e.act] += v / 100;
        break;
      case 'shatter':
        profile.shatter = { damage: v, radius: e.radius };
        break;
      case 'moonPhase':
        profile.moonPhase += v / 100;
        break;
      case 'wrath':
        profile.wrath += v / 100;
        break;
      case 'venomSpread':
        profile.venomSpread = Math.max(profile.venomSpread, v);
        break;
      case 'poisonWeak':
        profile.poisonWeak += v / 100;
        break;
      case 'jackalSpirit':
        profile.jackalSpirit += v;
        break;
      case 'openMouth':
        profile.openMouth += v / 100;
        break;
      case 'purr':
        profile.purr += v;
        break;
      case 'superGain':
        profile.superGain += v / 100;
        break;
      case 'dashGuard':
        profile.dashGuardMs += v;
        break;
      case 'soakAegis':
        profile.soakAegisMs = e.cooldownMs;
        break;
      case 'critBurn':
        profile.critBurn = { dps: v, durationMs: e.durationMs };
        break;
      case 'zapBurn':
        profile.zapBurn = { dps: v, durationMs: e.durationMs };
        break;
      case 'venomHeal':
        profile.venomHeal += v;
        break;
      case 'executeHeal':
        profile.executeHeal += v;
        break;
      case 'moonRiver':
        profile.moonRiver = v;
        break;
      case 'frozenCrit':
        profile.frozenCrit = v / 100;
        break;
      case 'stunVenom':
        profile.stunVenom += v;
        break;
    }
  }
  for (const act of Object.keys(riders) as Trigger[]) mergeFx(profile.on[act], riders[act]);
  if (executeAll > 0) {
    for (const fx of [profile.on.attack, profile.on.power])
      fx.execute = Math.max(fx.execute ?? 0, executeAll);
  }
  for (const fx of Object.values(profile.on)) {
    if (fx.burn && burnDurationBonus > 0)
      fx.burn.durationMs = Math.round(fx.burn.durationMs * (1 + burnDurationBonus));
    if (fx.stun && stunDurationBonus > 0)
      fx.stun.durationMs = Math.round(fx.stun.durationMs * (1 + stunDurationBonus));
    if (fx.venom && venomPotency > 0)
      fx.venom.dps = Math.round(fx.venom.dps * (1 + venomPotency) * 10) / 10;
    if (fx.chain) fx.chain.bounces += amp.bounces;
    if (fx.chill) fx.chill += amp.chill;
    if (fx.execute) fx.execute += amp.execute;
    if (fx.arrows) fx.arrows.count += amp.arrows;
    if (fx.curse) fx.curse.damage = Math.round(fx.curse.damage * (1 + amp.curse));
  }
  return profile;
}

/** Effet d'action (attaque, puissante, dash, Super) écrit dans la table des effets. */
function applyOn(on: Record<Trigger, HitEffects>, e: SlotEffect, v: number): void {
  switch (e.type) {
    case 'burn':
      on[e.on].burn = { dps: v, durationMs: e.durationMs };
      break;
    case 'chill':
      on[e.on].chill = v;
      break;
    case 'soak':
      on[e.on].soak = { slow: v / 100, durationMs: e.durationMs };
      break;
    case 'venom':
      on[e.on].venom = { stacks: v, dps: e.dps };
      break;
    case 'chain':
      on[e.on].chain = { damage: v, bounces: e.bounces, range: e.range };
      break;
    case 'bolt':
      on[e.on].bolt = { damage: v, radius: e.radius };
      break;
    case 'execute':
      on[e.on].execute = v / 100;
      break;
    case 'judge':
      on[e.on].judge = { bonus: v / 100, durationMs: e.durationMs };
      break;
    case 'crit':
      on[e.on].crit = v / 100;
      break;
    case 'dashCooldown':
      on[e.on].dashCooldown = v / 100;
      break;
    case 'weaken':
      on[e.on].weaken = { reduction: v / 100, durationMs: e.durationMs };
      break;
    case 'barrier':
      on[e.on].barrier = v;
      break;
    case 'deflect':
      on[e.on].deflect = v;
      break;
    case 'arrows':
      on[e.on].arrows = { damage: v, count: e.count };
      break;
    case 'stun':
      on[e.on].stun =
        e.scales === 'chance'
          ? { chance: v / 100, durationMs: e.durationMs }
          : { chance: e.chance / 100, durationMs: v };
      break;
    case 'shockwave':
      on[e.on].shockwave = { damage: v, radius: e.radius, knockback: e.knockback };
      break;
    case 'curse':
      on[e.on].curse = { damage: v, radius: e.radius };
      break;
    case 'lifeOnHit':
      on[e.on].lifeOnHit = v;
      break;
  }
}

/**
 * Ajoute les effets d'un passif « en plus » à ceux du don qui occupe l'action : l'effet le plus fort
 * l'emporte, les charges et les chances s'additionnent.
 */
function mergeFx(target: HitEffects, add: HitEffects): void {
  const max = (a: number | undefined, b: number) => Math.max(a ?? 0, b);
  if (add.burn)
    target.burn = target.burn
      ? {
          dps: Math.max(target.burn.dps, add.burn.dps),
          durationMs: Math.max(target.burn.durationMs, add.burn.durationMs),
        }
      : add.burn;
  if (add.soak)
    target.soak = target.soak
      ? {
          slow: Math.max(target.soak.slow, add.soak.slow),
          durationMs: Math.max(target.soak.durationMs, add.soak.durationMs),
        }
      : add.soak;
  if (add.venom)
    target.venom = target.venom
      ? {
          stacks: target.venom.stacks + add.venom.stacks,
          dps: Math.max(target.venom.dps, add.venom.dps),
        }
      : add.venom;
  if (add.chill) target.chill = (target.chill ?? 0) + add.chill;
  if (add.chain)
    target.chain = target.chain
      ? {
          damage: Math.max(target.chain.damage, add.chain.damage),
          bounces: Math.max(target.chain.bounces, add.chain.bounces),
          range: Math.max(target.chain.range, add.chain.range),
        }
      : add.chain;
  if (add.bolt)
    target.bolt = target.bolt && target.bolt.damage >= add.bolt.damage ? target.bolt : add.bolt;
  if (add.execute) target.execute = max(target.execute, add.execute);
  if (add.judge)
    target.judge = target.judge
      ? {
          bonus: Math.max(target.judge.bonus, add.judge.bonus),
          durationMs: Math.max(target.judge.durationMs, add.judge.durationMs),
        }
      : add.judge;
  if (add.crit) target.crit = (target.crit ?? 0) + add.crit;
  if (add.weaken)
    target.weaken = target.weaken
      ? {
          reduction: Math.max(target.weaken.reduction, add.weaken.reduction),
          durationMs: Math.max(target.weaken.durationMs, add.weaken.durationMs),
        }
      : add.weaken;
  if (add.barrier) target.barrier = max(target.barrier, add.barrier);
  if (add.deflect) target.deflect = max(target.deflect, add.deflect);
  if (add.arrows)
    target.arrows = target.arrows
      ? {
          damage: Math.max(target.arrows.damage, add.arrows.damage),
          count: target.arrows.count + add.arrows.count,
        }
      : add.arrows;
  if (add.stun)
    target.stun = target.stun
      ? {
          chance: 1 - (1 - target.stun.chance) * (1 - add.stun.chance),
          durationMs: Math.max(target.stun.durationMs, add.stun.durationMs),
        }
      : add.stun;
  if (add.shockwave)
    target.shockwave =
      target.shockwave && target.shockwave.damage >= add.shockwave.damage
        ? target.shockwave
        : add.shockwave;
  if (add.curse)
    target.curse =
      target.curse && target.curse.damage >= add.curse.damage ? target.curse : add.curse;
  if (add.lifeOnHit) target.lifeOnHit = (target.lifeOnHit ?? 0) + add.lifeOnHit;
  if (add.dashCooldown) target.dashCooldown = (target.dashCooldown ?? 0) + add.dashCooldown;
}

/** Multiplicateur de dégâts d'un coup selon l'état de la cible. */
export function damageMultiplier(
  profile: CombatProfile,
  target: {
    burning: boolean;
    chilled: boolean;
    stunned?: boolean;
    far?: boolean;
    soaked?: boolean;
    poisoned?: boolean;
    judged?: number;
  },
): number {
  const slowed = target.soaked || target.chilled;
  return (
    1 +
    (slowed ? profile.vsSlowed : 0) +
    (target.soaked ? profile.vsSoaked : 0) +
    (target.poisoned ? profile.vsPoisoned : 0) +
    (target.burning ? profile.vsBurning : 0) +
    (target.chilled ? profile.vsChilled : 0) +
    (target.stunned ? profile.vsStunned : 0) +
    (target.far ? profile.vsFar : 0) +
    (target.judged ?? 0)
  );
}
