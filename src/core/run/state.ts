import { getBoon } from '../../data/boons';
import type { GodId } from '../../data/gods';
import type { WeaponId } from '../../data/weapons';
import { mainValue, takeBoon, type BoonOffer, type OwnedBoon } from '../boons/boons';
import type { RewardKind } from './rewards';

/** Bonus permanents (arbre de Thot) figés au début de la run. */
export interface RunPerks {
  /** Bonus de dégâts (0,05 = +5 %). */
  damage: number;
  /** PV rendus à chaque salle terminée. */
  healPerRoom: number;
  /** Chances de rareté en plus pour les dons. */
  rareBonus: number;
}

export const NO_PERKS: RunPerks = { damage: 0, healPerRoom: 0, rareBonus: 0 };

/** État d'une run en cours (sérialisable : c'est ce qui est sauvegardé à chaque entrée de salle). */
export interface RunState {
  seed: number;
  weapon: WeaponId;
  biome: number;
  /** Salle actuelle, à partir de 1. */
  room: number;
  hp: number;
  maxHp: number;
  damageBonus: number;
  shards: number;
  xp: number;
  weaponParts: number;
  startedAt: number;
  elapsedMs: number;
  boons: OwnedBoon[];
  /** Un dieu attend qu'Ash choisisse son don (au début de la salle). */
  pendingBoon: GodId | null;
  /** Jauge de Super, de 0 à 1. */
  superGauge: number;
  perks: RunPerks;
}

export interface RunSummary {
  outcome: 'death' | 'cleared';
  room: number;
  killedBy?: string;
  elapsedMs: number;
  xp: number;
  weaponParts: number;
}

export function newRun(
  seed: number,
  weapon: WeaponId,
  maxHp: number,
  now: number,
  firstGod: GodId,
  perks: RunPerks = NO_PERKS,
  superGauge = 0,
): RunState {
  return {
    seed,
    weapon,
    biome: 0,
    room: 1,
    hp: maxHp,
    maxHp,
    damageBonus: perks.damage,
    shards: 0,
    xp: 0,
    weaponParts: 0,
    startedAt: now,
    elapsedMs: 0,
    boons: [],
    // Un premier don dès le départ : la run commence avec un pouvoir.
    pendingBoon: firstGod,
    superGauge,
    perks,
  };
}

/** Applique la récompense d'une porte (le don, lui, se choisit au début de la salle suivante). */
export function applyReward(run: RunState, reward: RewardKind, god?: GodId): void {
  switch (reward) {
    case 'boon':
      run.pendingBoon = god ?? 'ra';
      break;
    case 'shards':
      run.shards += 25;
      break;
    case 'weaponMod':
      run.damageBonus += 0.1;
      break;
    case 'xp':
      run.xp += 20;
      break;
    case 'weaponParts':
      run.weaponParts += 1;
      break;
  }
}

/** Ash choisit un don : il remplace celui de la même action ; un don de vie agrandit la barre de vie. */
export function chooseBoon(run: RunState, offer: BoonOffer): void {
  run.boons = takeBoon(run.boons, offer);
  run.pendingBoon = null;
  const def = getBoon(offer.id);
  if (def?.effect.type === 'maxHp') {
    const amount = mainValue(def.effect, offer.rarity);
    run.maxHp += amount;
    run.hp += amount;
  }
}

/** Salle terminée : les braises de Thot soignent un peu. */
export function onRoomCleared(run: RunState): number {
  const healed = Math.max(0, Math.min(run.maxHp - run.hp, run.perks.healPerRoom));
  run.hp += healed;
  return healed;
}

/** Ce qui est conservé à la mort : tout l'XP et les pièces d'arme (une mort fait toujours progresser). */
export function summarize(
  run: RunState,
  outcome: RunSummary['outcome'],
  killedBy?: string,
): RunSummary {
  return {
    outcome,
    room: run.room,
    elapsedMs: run.elapsedMs,
    xp: run.xp + run.room * 2,
    weaponParts: run.weaponParts,
    ...(killedBy ? { killedBy } : {}),
  };
}
