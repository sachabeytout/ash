import type { BiomeDef } from '../../data/biomes';
import { getBoon } from '../../data/boons';
import type { GodId } from '../../data/gods';
import type { WeaponId } from '../../data/weapons';
import { mainValue, takeBoon, type BoonOffer, type OwnedBoon } from '../boons/boons';
import { heatModifiers, type HeatLevels } from '../heat';
import type { DoorReward, RewardKind } from './rewards';
import { specialRooms } from './special';

/** Bonus permanents (arbre de Thot) figés au début de la run. */
export interface RunPerks {
  /** Bonus de dégâts (0,05 = +5 %). */
  damage: number;
  /** PV rendus à chaque salle terminée. */
  healPerRoom: number;
  /** Chances de rareté en plus pour les dons. */
  rareBonus: number;
  /** Éclats au début de la run. Ajouté en v11. */
  startShards: number;
  /** Recharge du dash plus rapide (0,1 = −10 %). Ajouté en v11. */
  dashCooldown: number;
  /** Renaissances par run (Thot). Ajouté en v11. */
  revives: number;
}

export const NO_PERKS: RunPerks = {
  damage: 0,
  healPerRoom: 0,
  rareBonus: 0,
  startShards: 0,
  dashCooldown: 0,
  revives: 0,
};

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
  /** Étincelle du Phénix : Ash choisira un don à améliorer au début de la salle. Ajouté en v10. */
  pendingSpark: boolean;
  /** Jauge de Super, de 0 à 1. */
  superGauge: number;
  perks: RunPerks;
  /** Niveau de forge de l'arme, figé au début de la run. */
  weaponLevel: number;
  /** « Seconde vie » d'Isis déjà utilisée pendant cette run. */
  lastBreathUsed: boolean;
  /** Mesures d'urgence actives pour cette run (figées au départ). */
  heat: HeatLevels;
  /** Biome dont l'évènement a déjà été accepté (-1 : aucun). Empêche de le refaire après une reprise. */
  eventTaken: number;
  /** Renaissances de Thot déjà utilisées pendant cette run. Ajouté en v11. */
  revivesUsed: number;
  /** Monde où Amon a déjà accordé sa faveur royale (-1 : aucun). Ajouté en v16. */
  amonBiome: number;
  /** Récompense de la porte choisie : elle tombe à la fin de cette salle (null : aucune). Ajouté en v17. */
  roomReward: DoorReward | null;
  /** Statistiques pour le récapitulatif de fin de run. Ajoutées en v9. */
  kills: number;
  damageTaken: number;
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
  /** Pour le récapitulatif (absents d'un résumé ancien ou d'un abandon depuis la Cage). */
  weapon?: WeaponId;
  boons?: OwnedBoon[];
  rooms?: number;
  kills?: number;
  damageTaken?: number;
}

/** Note un ennemi vaincu (boss compris). */
export function recordKill(run: RunState): void {
  run.kills += 1;
}

/** Note des dégâts reçus. */
export function recordDamage(run: RunState, amount: number): void {
  run.damageTaken += Math.max(0, amount);
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
    shards: perks.startShards,
    xp: 0,
    weaponParts: 0,
    startedAt: now,
    elapsedMs: 0,
    boons: [],
    // Un premier don dès le départ : la run commence avec un pouvoir.
    pendingBoon: firstGod,
    pendingSpark: false,
    superGauge,
    perks,
    weaponLevel,
    lastBreathUsed: false,
    heat: { ...heat },
    eventTaken: -1,
    kills: 0,
    damageTaken: 0,
    revivesUsed: 0,
    amonBiome: -1,
    roomReward: null,
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
    case 'spark':
      run.pendingSpark = true;
      break;
  }
}

/**
 * Salle terminée : Ash ramasse la récompense de la porte qu'il avait choisie. Un don ou une
 * Étincelle reste à choisir (`pendingBoon` / `pendingSpark`) ; le reste est crédité tout de suite.
 */
export function takeRoomReward(run: RunState): DoorReward | null {
  const reward = run.roomReward;
  run.roomReward = null;
  if (reward) applyReward(run, reward.kind, reward.god);
  return reward;
}

/** Étincelle : le don gagne un cran de rareté (un don de vie agrandit la barre de la différence). */
export function upgradeBoon(run: RunState, offer: BoonOffer): void {
  run.pendingSpark = false;
  const owned = run.boons.find((b) => b.id === offer.id);
  if (!owned || !offer.from || owned.rarity !== offer.from) return;
  owned.rarity = offer.rarity;
  const def = getBoon(offer.id);
  if (def?.effect.type === 'maxHp') {
    const gain = mainValue(def.effect, offer.rarity) - mainValue(def.effect, offer.from);
    run.maxHp += gain;
    run.hp += gain;
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

export type RoomKind = 'shop' | 'combat' | 'fountain' | 'event' | 'boss';

/** Salle 0 = marchand, 1…N = combats (certaines sont des fontaines), N + 1 = boss. */
export function roomKind(run: RunState, biome: BiomeDef): RoomKind {
  if (run.room <= 0) return 'shop';
  if (run.room > biome.rooms) return 'boss';
  if (biome.fountainRooms.includes(run.room)) return 'fountain';
  return specialRooms(run.seed, run.biome, biome).event === run.room ? 'event' : 'combat';
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
    weapon: run.weapon,
    boons: run.boons.map((b) => ({ ...b })),
    rooms: depth(run),
    kills: run.kills,
    damageTaken: run.damageTaken,
    ...(killedBy ? { killedBy } : {}),
  };
}
