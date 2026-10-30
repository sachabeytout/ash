import type { BiomeDef } from '../../data/biomes';
import { getBoon } from '../../data/boons';
import type { GodId } from '../../data/gods';
import type { WeaponId } from '../../data/weapons';
import { mainValue, takeBoon, type BoonOffer, type OwnedBoon } from '../boons/boons';
import { heatModifiers, type HeatLevels } from '../heat';
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
  /** Niveau de forge de l'arme, figé au début de la run. */
  weaponLevel: number;
  /** « Dernier souffle » de Hel déjà utilisé pendant cette run. */
  lastBreathUsed: boolean;
  /** Mesures d'urgence actives pour cette run (figées au départ). */
  heat: HeatLevels;
}

export interface RunSummary {
  outcome: 'death' | 'cleared';
  /** Biome atteint (0 = Bas-Fonds). */
  biome: number;
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
  weaponLevel = 0,
  heat: HeatLevels = {},
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
    weaponLevel,
    lastBreathUsed: false,
    heat: { ...heat },
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
  if (heatModifiers(run.heat).noRest) return 0; // Mesure « Sans répit »
  const healed = Math.max(0, Math.min(run.maxHp - run.hp, run.perks.healPerRoom));
  run.hp += healed;
  return healed;
}

export type RoomKind = 'shop' | 'combat' | 'fountain' | 'boss';

/** Salle 0 = marchand, 1…N = combats (certaines sont des fontaines), N + 1 = boss. */
export function roomKind(run: RunState, biome: BiomeDef): RoomKind {
  if (run.room <= 0) return 'shop';
  if (run.room > biome.rooms) return 'boss';
  return biome.fountainRooms.includes(run.room) ? 'fountain' : 'combat';
}

/** Fontaine : soigne une part de la vie max (rien avec « Sans répit »). */
export const FOUNTAIN_HEAL = 0.3;

export function drinkFountain(run: RunState): number {
  if (heatModifiers(run.heat).noRest) return 0;
  const healed = Math.max(0, Math.min(run.maxHp - run.hp, Math.round(run.maxHp * FOUNTAIN_HEAL)));
  run.hp += healed;
  return healed;
}

/** Salles traversées depuis le début de la run (biomes précédents : salles + boss). */
export function depth(run: RunState, roomsPerBiome = 11): number {
  return run.biome * roomsPerBiome + Math.max(0, run.room);
}

/** Boss vaincu : biome suivant (en passant par le marchand), ou run gagnée s'il n'y en a plus. */
export function afterBoss(run: RunState, biomeCount: number): 'nextBiome' | 'cleared' {
  if (run.biome + 1 >= biomeCount) return 'cleared';
  run.biome += 1;
  run.room = 0;
  return 'nextBiome';
}

/** Ce qui est conservé à la mort : tout l'XP et les pièces d'arme (une mort fait toujours progresser). */
export function summarize(
  run: RunState,
  outcome: RunSummary['outcome'],
  killedBy?: string,
): RunSummary {
  return {
    outcome,
    biome: run.biome,
    room: run.room,
    elapsedMs: run.elapsedMs,
    // Chaque salle traversée rapporte un peu d'XP ; les Mesures d'urgence multiplient les gains.
    xp: Math.round((run.xp + depth(run) * 2) * heatModifiers(run.heat).reward),
    weaponParts: Math.round(run.weaponParts * heatModifiers(run.heat).reward),
    ...(killedBy ? { killedBy } : {}),
  };
}
