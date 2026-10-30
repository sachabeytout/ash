import type { GodId } from './gods';

/** Action à laquelle un don s'attache. Un seul don par action ; les dons passifs se cumulent. */
export type BoonSlot = 'attack' | 'power' | 'dash' | 'passive';
export type Trigger = Exclude<BoonSlot, 'passive'>;

export type BoonEffect =
  /** Brûlure : dégâts par seconde pendant une durée. */
  | { type: 'burn'; on: Trigger; dps: number; durationMs: number }
  /** Givre : charges qui ralentissent, puis gèlent sur place. */
  | { type: 'chill'; on: Trigger; stacks: number }
  /** Éclair en chaîne : rebondit d'ennemi en ennemi. */
  | { type: 'chain'; on: Trigger; damage: number; bounces: number; range: number }
  /** Foudre qui tombe sur la cible et touche autour d'elle. */
  | { type: 'bolt'; on: Trigger; damage: number; radius: number }
  /** Dégâts en plus contre les ennemis qui brûlent / sont givrés / étourdis / loin d'Ash. */
  | { type: 'damageVs'; status: 'burning' | 'chilled' | 'stunned' | 'far'; bonus: number }
  | { type: 'maxHp'; amount: number }
  /** Quand Ash est touché, la foudre frappe l'ennemi le plus proche. */
  | { type: 'retaliate'; damage: number; range: number }
  /** Duo Râ + Skadi : un ennemi gelé qui brûle explose. */
  | { type: 'thermalShock'; damage: number; radius: number }
  /** Amplification : la brûlure dure plus longtemps. */
  | { type: 'burnDuration'; bonus: number }
  // ---------- Anubis : jugement ----------
  /** Exécute un ennemi (hors boss) sous ce pourcentage de vie. */
  | { type: 'execute'; on: Trigger; threshold: number }
  /** Le dash « juge » les ennemis proches : ils subissent plus de dégâts un moment. */
  | { type: 'judge'; on: Trigger; bonus: number; durationMs: number }
  | { type: 'healOnKill'; amount: number }
  // ---------- Bastet : vitesse, critiques ----------
  /** Chance de coup critique (dégâts doublés). */
  | { type: 'crit'; on: Trigger; chance: number }
  | { type: 'dashCooldown'; on: Trigger; bonus: number }
  | { type: 'speed'; bonus: number }
  | { type: 'critDamage'; bonus: number }
  // ---------- Athéna : protection ----------
  /** Égide : les premiers coups reçus dans chaque salle sont bloqués. */
  | { type: 'aegis'; charges: number }
  /** Les ennemis touchés font moins de dégâts un moment. */
  | { type: 'weaken'; on: Trigger; reduction: number; durationMs: number }
  /** Bouclier qui absorbe des dégâts. */
  | { type: 'barrier'; on: Trigger; amount: number }
  /** Le dash détruit les projectiles ennemis proches. */
  | { type: 'deflect'; on: Trigger; radius: number }
  // ---------- Artémis : chasse ----------
  /** Des flèches partent vers les ennemis les plus proches. */
  | { type: 'arrows'; on: Trigger; damage: number; count: number }
  // ---------- Thor : choc ----------
  /** Étourdit (l'ennemi s'arrête) ; `scales` dit si la rareté augmente la chance ou la durée. */
  | {
      type: 'stun';
      on: Trigger;
      chance: number;
      durationMs: number;
      scales: 'chance' | 'duration';
    }
  /** Onde autour d'Ash : dégâts et recul. */
  | { type: 'shockwave'; on: Trigger; damage: number; radius: number; knockback: number }
  // ---------- Hel : malédiction ----------
  /** Maudit : à sa mort, l'ennemi explose et blesse ses voisins. */
  | { type: 'curse'; on: Trigger; damage: number; radius: number }
  | { type: 'lifeOnHit'; on: Trigger; amount: number }
  /** Une fois par run, un coup mortel laisse Ash en vie. */
  | { type: 'lastBreath'; hp: number }
  // ---------- Duos et amplifications ----------
  | { type: 'stormStun'; durationMs: number }
  | { type: 'judgementDay'; threshold: number }
  | { type: 'nightHunt'; chance: number }
  | { type: 'aegisCharge'; charges: number }
  | { type: 'stunDuration'; bonus: number };

export type BoonKind = 'normal' | 'duo' | 'amp';

export interface BoonDef {
  id: string;
  /** Dieu qui l'offre (deux pour un duo). */
  gods: readonly GodId[];
  kind: BoonKind;
  nameKey: string;
  /** Description avec la variable {value} (valeur principale, selon la rareté). */
  descKey: string;
  effect: BoonEffect;
  /** Amplification : n'apparaît que si l'un de ces dons est déjà obtenu. */
  requiresAny?: readonly string[];
}

export type Rarity = 'common' | 'rare' | 'epic' | 'duo' | 'amp';

/** Multiplicateur de la valeur principale selon la rareté. */
export const RARITY_POWER: Record<Rarity, number> = {
  common: 1,
  rare: 1.5,
  epic: 2,
  duo: 1,
  amp: 1,
};

/** Chances de rareté d'un don normal (le reste est commun). */
export const RARITY_ODDS = { rare: 0.22, epic: 0.06 } as const;

/** Rayon autour d'Ash touché par un don de dash (brûlure, givre). */
export const DASH_AURA_RADIUS = 34;
/** Portée de recherche d'une cible pour la foudre du dash. */
export const DASH_BOLT_RANGE = 110;

export const BOONS: readonly BoonDef[] = [
  // ---------- Râ : brûlure ----------
  {
    id: 'ra_attack',
    gods: ['ra'],
    kind: 'normal',
    nameKey: 'boon.ra_attack',
    descKey: 'boon.ra_attack.desc',
    effect: { type: 'burn', on: 'attack', dps: 4, durationMs: 3000 },
  },
  {
    id: 'ra_power',
    gods: ['ra'],
    kind: 'normal',
    nameKey: 'boon.ra_power',
    descKey: 'boon.ra_power.desc',
    effect: { type: 'burn', on: 'power', dps: 8, durationMs: 4000 },
  },
  {
    id: 'ra_dash',
    gods: ['ra'],
    kind: 'normal',
    nameKey: 'boon.ra_dash',
    descKey: 'boon.ra_dash.desc',
    effect: { type: 'burn', on: 'dash', dps: 5, durationMs: 3000 },
  },
  {
    id: 'ra_eye',
    gods: ['ra'],
    kind: 'normal',
    nameKey: 'boon.ra_eye',
    descKey: 'boon.ra_eye.desc',
    effect: { type: 'damageVs', status: 'burning', bonus: 0.2 },
  },
  {
    id: 'ra_hearth',
    gods: ['ra'],
    kind: 'normal',
    nameKey: 'boon.ra_hearth',
    descKey: 'boon.ra_hearth.desc',
    effect: { type: 'maxHp', amount: 15 },
  },
  // ---------- Zeus : foudre en chaîne ----------
  {
    id: 'zeus_attack',
    gods: ['zeus'],
    kind: 'normal',
    nameKey: 'boon.zeus_attack',
    descKey: 'boon.zeus_attack.desc',
    effect: { type: 'chain', on: 'attack', damage: 6, bounces: 2, range: 70 },
  },
  {
    id: 'zeus_power',
    gods: ['zeus'],
    kind: 'normal',
    nameKey: 'boon.zeus_power',
    descKey: 'boon.zeus_power.desc',
    effect: { type: 'bolt', on: 'power', damage: 14, radius: 26 },
  },
  {
    id: 'zeus_dash',
    gods: ['zeus'],
    kind: 'normal',
    nameKey: 'boon.zeus_dash',
    descKey: 'boon.zeus_dash.desc',
    effect: { type: 'bolt', on: 'dash', damage: 12, radius: 22 },
  },
  {
    id: 'zeus_riposte',
    gods: ['zeus'],
    kind: 'normal',
    nameKey: 'boon.zeus_riposte',
    descKey: 'boon.zeus_riposte.desc',
    effect: { type: 'retaliate', damage: 20, range: 140 },
  },
  // ---------- Skadi : gel ----------
  {
    id: 'skadi_attack',
    gods: ['skadi'],
    kind: 'normal',
    nameKey: 'boon.skadi_attack',
    descKey: 'boon.skadi_attack.desc',
    effect: { type: 'chill', on: 'attack', stacks: 1 },
  },
  {
    id: 'skadi_power',
    gods: ['skadi'],
    kind: 'normal',
    nameKey: 'boon.skadi_power',
    descKey: 'boon.skadi_power.desc',
    effect: { type: 'chill', on: 'power', stacks: 3 },
  },
  {
    id: 'skadi_dash',
    gods: ['skadi'],
    kind: 'normal',
    nameKey: 'boon.skadi_dash',
    descKey: 'boon.skadi_dash.desc',
    effect: { type: 'chill', on: 'dash', stacks: 2 },
  },
  {
    id: 'skadi_heart',
    gods: ['skadi'],
    kind: 'normal',
    nameKey: 'boon.skadi_heart',
    descKey: 'boon.skadi_heart.desc',
    effect: { type: 'damageVs', status: 'chilled', bonus: 0.15 },
  },
  // ---------- Duo et amplification ----------
  {
    id: 'duo_thermal',
    gods: ['ra', 'skadi'],
    kind: 'duo',
    nameKey: 'boon.duo_thermal',
    descKey: 'boon.duo_thermal.desc',
    effect: { type: 'thermalShock', damage: 30, radius: 44 },
  },
  {
    id: 'amp_noon',
    gods: ['ra'],
    kind: 'amp',
    nameKey: 'boon.amp_noon',
    descKey: 'boon.amp_noon.desc',
    effect: { type: 'burnDuration', bonus: 0.5 },
    requiresAny: ['ra_attack', 'ra_power', 'ra_dash'],
  },
  // ---------- Anubis : jugement ----------
  {
    id: 'anubis_attack',
    gods: ['anubis'],
    kind: 'normal',
    nameKey: 'boon.anubis_attack',
    descKey: 'boon.anubis_attack.desc',
    effect: { type: 'execute', on: 'attack', threshold: 10 },
  },
  {
    id: 'anubis_power',
    gods: ['anubis'],
    kind: 'normal',
    nameKey: 'boon.anubis_power',
    descKey: 'boon.anubis_power.desc',
    effect: { type: 'execute', on: 'power', threshold: 20 },
  },
  {
    id: 'anubis_dash',
    gods: ['anubis'],
    kind: 'normal',
    nameKey: 'boon.anubis_dash',
    descKey: 'boon.anubis_dash.desc',
    effect: { type: 'judge', on: 'dash', bonus: 0.25, durationMs: 4000 },
  },
  {
    id: 'anubis_soul',
    gods: ['anubis'],
    kind: 'normal',
    nameKey: 'boon.anubis_soul',
    descKey: 'boon.anubis_soul.desc',
    effect: { type: 'healOnKill', amount: 2 },
  },
  // ---------- Bastet : vitesse, critiques ----------
  {
    id: 'bastet_attack',
    gods: ['bastet'],
    kind: 'normal',
    nameKey: 'boon.bastet_attack',
    descKey: 'boon.bastet_attack.desc',
    effect: { type: 'crit', on: 'attack', chance: 10 },
  },
  {
    id: 'bastet_power',
    gods: ['bastet'],
    kind: 'normal',
    nameKey: 'boon.bastet_power',
    descKey: 'boon.bastet_power.desc',
    effect: { type: 'crit', on: 'power', chance: 20 },
  },
  {
    id: 'bastet_dash',
    gods: ['bastet'],
    kind: 'normal',
    nameKey: 'boon.bastet_dash',
    descKey: 'boon.bastet_dash.desc',
    effect: { type: 'dashCooldown', on: 'dash', bonus: 0.25 },
  },
  {
    id: 'bastet_swift',
    gods: ['bastet'],
    kind: 'normal',
    nameKey: 'boon.bastet_swift',
    descKey: 'boon.bastet_swift.desc',
    effect: { type: 'speed', bonus: 0.08 },
  },
  // ---------- Athéna : protection ----------
  {
    id: 'athena_aegis',
    gods: ['athena'],
    kind: 'normal',
    nameKey: 'boon.athena_aegis',
    descKey: 'boon.athena_aegis.desc',
    effect: { type: 'aegis', charges: 1 },
  },
  {
    id: 'athena_attack',
    gods: ['athena'],
    kind: 'normal',
    nameKey: 'boon.athena_attack',
    descKey: 'boon.athena_attack.desc',
    effect: { type: 'weaken', on: 'attack', reduction: 0.2, durationMs: 4000 },
  },
  {
    id: 'athena_power',
    gods: ['athena'],
    kind: 'normal',
    nameKey: 'boon.athena_power',
    descKey: 'boon.athena_power.desc',
    effect: { type: 'barrier', on: 'power', amount: 6 },
  },
  {
    id: 'athena_dash',
    gods: ['athena'],
    kind: 'normal',
    nameKey: 'boon.athena_dash',
    descKey: 'boon.athena_dash.desc',
    effect: { type: 'deflect', on: 'dash', radius: 40 },
  },
  // ---------- Artémis : chasse ----------
  {
    id: 'artemis_attack',
    gods: ['artemis'],
    kind: 'normal',
    nameKey: 'boon.artemis_attack',
    descKey: 'boon.artemis_attack.desc',
    effect: { type: 'arrows', on: 'attack', damage: 5, count: 1 },
  },
  {
    id: 'artemis_power',
    gods: ['artemis'],
    kind: 'normal',
    nameKey: 'boon.artemis_power',
    descKey: 'boon.artemis_power.desc',
    effect: { type: 'arrows', on: 'power', damage: 9, count: 3 },
  },
  {
    id: 'artemis_dash',
    gods: ['artemis'],
    kind: 'normal',
    nameKey: 'boon.artemis_dash',
    descKey: 'boon.artemis_dash.desc',
    effect: { type: 'arrows', on: 'dash', damage: 8, count: 3 },
  },
  {
    id: 'artemis_mark',
    gods: ['artemis'],
    kind: 'normal',
    nameKey: 'boon.artemis_mark',
    descKey: 'boon.artemis_mark.desc',
    effect: { type: 'damageVs', status: 'far', bonus: 0.15 },
  },
  // ---------- Thor : choc ----------
  {
    id: 'thor_attack',
    gods: ['thor'],
    kind: 'normal',
    nameKey: 'boon.thor_attack',
    descKey: 'boon.thor_attack.desc',
    effect: { type: 'stun', on: 'attack', chance: 12, durationMs: 800, scales: 'chance' },
  },
  {
    id: 'thor_power',
    gods: ['thor'],
    kind: 'normal',
    nameKey: 'boon.thor_power',
    descKey: 'boon.thor_power.desc',
    effect: { type: 'stun', on: 'power', chance: 100, durationMs: 700, scales: 'duration' },
  },
  {
    id: 'thor_dash',
    gods: ['thor'],
    kind: 'normal',
    nameKey: 'boon.thor_dash',
    descKey: 'boon.thor_dash.desc',
    effect: { type: 'shockwave', on: 'dash', damage: 10, radius: 38, knockback: 200 },
  },
  {
    id: 'thor_wrath',
    gods: ['thor'],
    kind: 'normal',
    nameKey: 'boon.thor_wrath',
    descKey: 'boon.thor_wrath.desc',
    effect: { type: 'damageVs', status: 'stunned', bonus: 0.25 },
  },
  // ---------- Hel : malédiction ----------
  {
    id: 'hel_attack',
    gods: ['hel'],
    kind: 'normal',
    nameKey: 'boon.hel_attack',
    descKey: 'boon.hel_attack.desc',
    effect: { type: 'curse', on: 'attack', damage: 12, radius: 36 },
  },
  {
    id: 'hel_power',
    gods: ['hel'],
    kind: 'normal',
    nameKey: 'boon.hel_power',
    descKey: 'boon.hel_power.desc',
    effect: { type: 'lifeOnHit', on: 'power', amount: 1 },
  },
  {
    id: 'hel_dash',
    gods: ['hel'],
    kind: 'normal',
    nameKey: 'boon.hel_dash',
    descKey: 'boon.hel_dash.desc',
    effect: { type: 'curse', on: 'dash', damage: 15, radius: 36 },
  },
  {
    id: 'hel_last',
    gods: ['hel'],
    kind: 'normal',
    nameKey: 'boon.hel_last',
    descKey: 'boon.hel_last.desc',
    effect: { type: 'lastBreath', hp: 10 },
  },
  // ---------- Duos ----------
  {
    id: 'duo_storm',
    gods: ['zeus', 'thor'],
    kind: 'duo',
    nameKey: 'boon.duo_storm',
    descKey: 'boon.duo_storm.desc',
    effect: { type: 'stormStun', durationMs: 500 },
  },
  {
    id: 'duo_judgement',
    gods: ['anubis', 'hel'],
    kind: 'duo',
    nameKey: 'boon.duo_judgement',
    descKey: 'boon.duo_judgement.desc',
    effect: { type: 'judgementDay', threshold: 25 },
  },
  {
    id: 'duo_hunt',
    gods: ['bastet', 'artemis'],
    kind: 'duo',
    nameKey: 'boon.duo_hunt',
    descKey: 'boon.duo_hunt.desc',
    effect: { type: 'nightHunt', chance: 10 },
  },
  // ---------- Amplifications ----------
  {
    id: 'amp_aegis',
    gods: ['athena'],
    kind: 'amp',
    nameKey: 'boon.amp_aegis',
    descKey: 'boon.amp_aegis.desc',
    effect: { type: 'aegisCharge', charges: 1 },
    requiresAny: ['athena_aegis'],
  },
  {
    id: 'amp_thunder',
    gods: ['thor'],
    kind: 'amp',
    nameKey: 'boon.amp_thunder',
    descKey: 'boon.amp_thunder.desc',
    effect: { type: 'stunDuration', bonus: 0.5 },
    requiresAny: ['thor_attack', 'thor_power'],
  },
  {
    id: 'amp_claws',
    gods: ['bastet'],
    kind: 'amp',
    nameKey: 'boon.amp_claws',
    descKey: 'boon.amp_claws.desc',
    effect: { type: 'critDamage', bonus: 0.5 },
    requiresAny: ['bastet_attack', 'bastet_power'],
  },
];

export function getBoon(id: string): BoonDef | undefined {
  return BOONS.find((b) => b.id === id);
}

export function slotOf(effect: BoonEffect): BoonSlot {
  return 'on' in effect ? effect.on : 'passive';
}
