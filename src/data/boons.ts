import type { GodId } from './gods';

/** Action à laquelle un don s'attache. Un seul don par action ; les dons passifs se cumulent. */
export type BoonSlot = 'attack' | 'power' | 'dash' | 'super' | 'passive';
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
  /** Trempé (Sobek) : ralenti ; conduit la foudre et gèle plus vite (voir data/status). */
  | { type: 'soak'; on: Trigger; slow: number; durationMs: number }
  /** Venin (Serket) : doses cumulées, chacune fait `dps` dégâts par seconde. */
  | { type: 'venom'; on: Trigger; stacks: number; dps: number }
  /** Dégâts en plus contre les ennemis qui brûlent / givrés / étourdis / loin / trempés / empoisonnés. */
  | {
      type: 'damageVs';
      status: 'burning' | 'chilled' | 'stunned' | 'far' | 'soaked' | 'poisoned';
      bonus: number;
    }
  | { type: 'maxHp'; amount: number }
  /** Quand Ash est touché, la foudre frappe l'ennemi le plus proche. */
  | { type: 'retaliate'; damage: number; range: number }
  /** Duo Râ + Khonsou : un ennemi gelé qui brûle explose. */
  | { type: 'thermalShock'; damage: number; radius: number }
  /** Passif : la brûlure dure plus longtemps. */
  | { type: 'burnDuration'; bonus: number }
  // ---------- Anubis : fêlure et exécution ; Isis : soin ----------
  /** Exécute un ennemi (hors boss) sous ce pourcentage de vie. */
  | { type: 'execute'; on: Trigger; threshold: number }
  /** Passif : l'attaque et l'attaque puissante exécutent sous ce pourcentage de vie. */
  | { type: 'executeAll'; threshold: number }
  /** Le dash « juge » les ennemis proches : ils subissent plus de dégâts un moment. */
  | { type: 'judge'; on: Trigger; bonus: number; durationMs: number }
  | { type: 'healOnKill'; amount: number }
  // ---------- Bastet : vitesse, critiques ----------
  /** Chance de coup critique (dégâts doublés). */
  | { type: 'crit'; on: Trigger; chance: number }
  | { type: 'dashCooldown'; on: Trigger; bonus: number }
  | { type: 'speed'; bonus: number }
  | { type: 'critDamage'; bonus: number }
  // ---------- Neith : protection ----------
  /** Bouclier de Saïs : les premiers coups reçus dans chaque salle sont bloqués. */
  | { type: 'aegis'; charges: number }
  /** Les ennemis touchés font moins de dégâts un moment. */
  | { type: 'weaken'; on: Trigger; reduction: number; durationMs: number }
  /** Bouclier qui absorbe des dégâts. */
  | { type: 'barrier'; on: Trigger; amount: number }
  /** Le dash détruit les projectiles ennemis proches. */
  | { type: 'deflect'; on: Trigger; radius: number }
  // ---------- Neith : flèches croisées ----------
  /** Des flèches partent vers les ennemis les plus proches. */
  | { type: 'arrows'; on: Trigger; damage: number; count: number }
  // ---------- Seth / Sobek : choc ----------
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
  // ---------- Serket (dard) / Isis (soin) ----------
  /** Maudit : à sa mort, l'ennemi explose et blesse ses voisins. */
  | { type: 'curse'; on: Trigger; damage: number; radius: number }
  | { type: 'lifeOnHit'; on: Trigger; amount: number }
  /** Une fois par run, un coup mortel laisse Ash en vie. */
  | { type: 'lastBreath'; hp: number }
  // ---------- Duos et passifs de renfort ----------
  | { type: 'stormStun'; durationMs: number }
  /** Passifs de renfort : rebonds d'éclair, charges de givre, seuil d'exécution, flèches, malédiction. */
  | { type: 'chainBounces'; bonus: number }
  | { type: 'chillStacks'; bonus: number }
  | { type: 'executeBonus'; bonus: number }
  | { type: 'arrowCount'; bonus: number }
  | { type: 'curseDamage'; bonus: number }
  /** Duo Neith + Seth : quand le Bouclier de Saïs bloque un coup, la foudre frappe en chaîne. */
  | { type: 'aegisStorm'; damage: number }
  /** Duo Râ + Serket : les explosions du dard enflamment les ennemis touchés. */
  | { type: 'blackSun'; dps: number; durationMs: number }
  /** Duo Bastet + Seth : les coups critiques étourdissent. */
  | { type: 'critStun'; durationMs: number }
  /** Duo Râ + Isis : un ennemi qui brûle soigne Ash en mourant. */
  | { type: 'embalm'; amount: number }
  | { type: 'judgementDay'; threshold: number }
  | { type: 'nightHunt'; chance: number }
  | { type: 'aegisCharge'; charges: number }
  | { type: 'stunDuration'; bonus: number }
  /** Isis : chaque salle terminée rend des PV. */
  | { type: 'roomHeal'; amount: number }
  /** Passif de Serket : venin plus fort. */
  | { type: 'venomPotency'; bonus: number }
  /** Duo Seth + Sobek : chaque éclair frappe aussi tous les ennemis trempés. */
  | { type: 'conduct'; damage: number };

/** Depuis la 0.57.0, les anciennes amplifications sont des dons passifs normaux (avec rareté). */
export type BoonKind = 'normal' | 'duo';

export interface BoonDef {
  id: string;
  /** Dieu qui l'offre (deux pour un duo). */
  gods: readonly GodId[];
  kind: BoonKind;
  nameKey: string;
  /** Description avec la variable {value} (valeur principale, selon la rareté). */
  descKey: string;
  effect: BoonEffect;
  /** Passif qui renforce un autre don : n'apparaît que si l'un de ces dons est déjà obtenu (jamais inutile). */
  requiresAny?: readonly string[];
}

export type Rarity = 'common' | 'rare' | 'epic' | 'duo';

/** Multiplicateur de la valeur principale selon la rareté. */
export const RARITY_POWER: Record<Rarity, number> = {
  common: 1,
  rare: 1.5,
  epic: 2,
  duo: 1,
};

/** Chances de rareté d'un don normal (le reste est commun). */
export const RARITY_ODDS = { rare: 0.22, epic: 0.06 } as const;

/** Rayon autour d'Ash touché par un don de dash (brûlure, givre). */
export const DASH_AURA_RADIUS = 34;
/** Portée de recherche d'une cible pour la foudre du dash. */
export const DASH_BOLT_RANGE = 110;

export const BOONS: readonly BoonDef[] = [
  // ---------- Râ : le feu (brûlure) ----------
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
  // ---------- Sobek : l'eau (trempé : ralenti, conduit la foudre, gèle plus vite) ----------
  {
    id: 'sobek_attack',
    gods: ['sobek'],
    kind: 'normal',
    nameKey: 'boon.sobek_attack',
    descKey: 'boon.sobek_attack.desc',
    effect: { type: 'soak', on: 'attack', slow: 0.2, durationMs: 3000 },
  },
  {
    id: 'sobek_power',
    gods: ['sobek'],
    kind: 'normal',
    nameKey: 'boon.sobek_power',
    descKey: 'boon.sobek_power.desc',
    effect: { type: 'soak', on: 'power', slow: 0.35, durationMs: 4000 },
  },
  {
    id: 'sobek_dash',
    gods: ['sobek'],
    kind: 'normal',
    nameKey: 'boon.sobek_dash',
    descKey: 'boon.sobek_dash.desc',
    effect: { type: 'shockwave', on: 'dash', damage: 10, radius: 38, knockback: 200 },
  },
  {
    id: 'sobek_flood',
    gods: ['sobek'],
    kind: 'normal',
    nameKey: 'boon.sobek_flood',
    descKey: 'boon.sobek_flood.desc',
    effect: { type: 'damageVs', status: 'soaked', bonus: 0.2 },
  },
  // ---------- Khonsou : la glace (givre, puis gel) ----------
  {
    id: 'khonsou_attack',
    gods: ['khonsou'],
    kind: 'normal',
    nameKey: 'boon.khonsou_attack',
    descKey: 'boon.khonsou_attack.desc',
    effect: { type: 'chill', on: 'attack', stacks: 1 },
  },
  {
    id: 'khonsou_power',
    gods: ['khonsou'],
    kind: 'normal',
    nameKey: 'boon.khonsou_power',
    descKey: 'boon.khonsou_power.desc',
    effect: { type: 'chill', on: 'power', stacks: 3 },
  },
  {
    id: 'khonsou_dash',
    gods: ['khonsou'],
    kind: 'normal',
    nameKey: 'boon.khonsou_dash',
    descKey: 'boon.khonsou_dash.desc',
    effect: { type: 'chill', on: 'dash', stacks: 2 },
  },
  {
    id: 'khonsou_heart',
    gods: ['khonsou'],
    kind: 'normal',
    nameKey: 'boon.khonsou_heart',
    descKey: 'boon.khonsou_heart.desc',
    effect: { type: 'damageVs', status: 'chilled', bonus: 0.15 },
  },
  // ---------- Seth : la foudre (éclairs en chaîne, étourdissement) ----------
  {
    id: 'seth_attack',
    gods: ['seth'],
    kind: 'normal',
    nameKey: 'boon.seth_attack',
    descKey: 'boon.seth_attack.desc',
    effect: { type: 'chain', on: 'attack', damage: 6, bounces: 2, range: 70 },
  },
  {
    id: 'seth_power',
    gods: ['seth'],
    kind: 'normal',
    nameKey: 'boon.seth_power',
    descKey: 'boon.seth_power.desc',
    effect: { type: 'bolt', on: 'power', damage: 14, radius: 26 },
  },
  {
    id: 'seth_dash',
    gods: ['seth'],
    kind: 'normal',
    nameKey: 'boon.seth_dash',
    descKey: 'boon.seth_dash.desc',
    effect: { type: 'stun', on: 'dash', chance: 100, durationMs: 600, scales: 'duration' },
  },
  {
    id: 'seth_riposte',
    gods: ['seth'],
    kind: 'normal',
    nameKey: 'boon.seth_riposte',
    descKey: 'boon.seth_riposte.desc',
    effect: { type: 'retaliate', damage: 20, range: 140 },
  },
  // ---------- Serket : le poison (doses de venin cumulées) ----------
  {
    id: 'serket_attack',
    gods: ['serket'],
    kind: 'normal',
    nameKey: 'boon.serket_attack',
    descKey: 'boon.serket_attack.desc',
    effect: { type: 'venom', on: 'attack', stacks: 1, dps: 2 },
  },
  {
    id: 'serket_power',
    gods: ['serket'],
    kind: 'normal',
    nameKey: 'boon.serket_power',
    descKey: 'boon.serket_power.desc',
    effect: { type: 'venom', on: 'power', stacks: 3, dps: 2 },
  },
  {
    id: 'serket_dash',
    gods: ['serket'],
    kind: 'normal',
    nameKey: 'boon.serket_dash',
    descKey: 'boon.serket_dash.desc',
    effect: { type: 'curse', on: 'dash', damage: 15, radius: 36 },
  },
  {
    id: 'serket_toxin',
    gods: ['serket'],
    kind: 'normal',
    nameKey: 'boon.serket_toxin',
    descKey: 'boon.serket_toxin.desc',
    effect: { type: 'damageVs', status: 'poisoned', bonus: 0.2 },
  },
  // ---------- Anubis : le brisement (fêlure) et l'exécution ----------
  {
    id: 'anubis_break',
    gods: ['anubis'],
    kind: 'normal',
    nameKey: 'boon.anubis_break',
    descKey: 'boon.anubis_break.desc',
    effect: { type: 'judge', on: 'attack', bonus: 0.15, durationMs: 4000 },
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
    id: 'anubis_weigh',
    gods: ['anubis'],
    kind: 'normal',
    nameKey: 'boon.anubis_weigh',
    descKey: 'boon.anubis_weigh.desc',
    effect: { type: 'executeAll', threshold: 8 },
  },
  // ---------- Bastet : la force (critiques, vitesse, vie) ----------
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
  {
    id: 'bastet_lives',
    gods: ['bastet'],
    kind: 'normal',
    nameKey: 'boon.bastet_lives',
    descKey: 'boon.bastet_lives.desc',
    effect: { type: 'maxHp', amount: 15 },
  },
  // ---------- Isis : le soin ----------
  {
    id: 'isis_soul',
    gods: ['isis'],
    kind: 'normal',
    nameKey: 'boon.isis_soul',
    descKey: 'boon.isis_soul.desc',
    effect: { type: 'healOnKill', amount: 2 },
  },
  {
    id: 'isis_attack',
    gods: ['isis'],
    kind: 'normal',
    nameKey: 'boon.isis_attack',
    descKey: 'boon.isis_attack.desc',
    effect: { type: 'barrier', on: 'attack', amount: 3 },
  },
  {
    id: 'isis_dash',
    gods: ['isis'],
    kind: 'normal',
    nameKey: 'boon.isis_dash',
    descKey: 'boon.isis_dash.desc',
    effect: { type: 'barrier', on: 'dash', amount: 6 },
  },
  {
    id: 'isis_power',
    gods: ['isis'],
    kind: 'normal',
    nameKey: 'boon.isis_power',
    descKey: 'boon.isis_power.desc',
    effect: { type: 'lifeOnHit', on: 'power', amount: 1 },
  },
  {
    id: 'isis_dew',
    gods: ['isis'],
    kind: 'normal',
    nameKey: 'boon.isis_dew',
    descKey: 'boon.isis_dew.desc',
    effect: { type: 'roomHeal', amount: 4 },
  },
  {
    id: 'isis_last',
    gods: ['isis'],
    kind: 'normal',
    nameKey: 'boon.isis_last',
    descKey: 'boon.isis_last.desc',
    effect: { type: 'lastBreath', hp: 10 },
  },
  // ---------- Neith : le bouclier ----------
  {
    id: 'neith_aegis',
    gods: ['neith'],
    kind: 'normal',
    nameKey: 'boon.neith_aegis',
    descKey: 'boon.neith_aegis.desc',
    effect: { type: 'aegis', charges: 1 },
  },
  {
    id: 'neith_attack',
    gods: ['neith'],
    kind: 'normal',
    nameKey: 'boon.neith_attack',
    descKey: 'boon.neith_attack.desc',
    effect: { type: 'weaken', on: 'attack', reduction: 0.2, durationMs: 4000 },
  },
  {
    id: 'neith_power',
    gods: ['neith'],
    kind: 'normal',
    nameKey: 'boon.neith_power',
    descKey: 'boon.neith_power.desc',
    effect: { type: 'barrier', on: 'power', amount: 6 },
  },
  {
    id: 'neith_dash',
    gods: ['neith'],
    kind: 'normal',
    nameKey: 'boon.neith_dash',
    descKey: 'boon.neith_dash.desc',
    effect: { type: 'deflect', on: 'dash', radius: 40 },
  },
  // ---------- Duos (deux dieux) ----------
  {
    id: 'duo_thermal',
    gods: ['ra', 'khonsou'],
    kind: 'duo',
    nameKey: 'boon.duo_thermal',
    descKey: 'boon.duo_thermal.desc',
    effect: { type: 'thermalShock', damage: 30, radius: 44 },
  },
  {
    id: 'duo_storm',
    gods: ['seth', 'sobek'],
    kind: 'duo',
    nameKey: 'boon.duo_storm',
    descKey: 'boon.duo_storm.desc',
    effect: { type: 'conduct', damage: 10 },
  },
  {
    id: 'duo_judgement',
    gods: ['anubis', 'serket'],
    kind: 'duo',
    nameKey: 'boon.duo_judgement',
    descKey: 'boon.duo_judgement.desc',
    effect: { type: 'judgementDay', threshold: 25 },
  },
  {
    id: 'duo_hunt',
    gods: ['bastet', 'neith'],
    kind: 'duo',
    nameKey: 'boon.duo_hunt',
    descKey: 'boon.duo_hunt.desc',
    effect: { type: 'nightHunt', chance: 10 },
  },
  {
    id: 'duo_aegis_storm',
    gods: ['neith', 'seth'],
    kind: 'duo',
    nameKey: 'boon.duo_aegis_storm',
    descKey: 'boon.duo_aegis_storm.desc',
    effect: { type: 'aegisStorm', damage: 24 },
  },
  {
    id: 'duo_black_sun',
    gods: ['ra', 'serket'],
    kind: 'duo',
    nameKey: 'boon.duo_black_sun',
    descKey: 'boon.duo_black_sun.desc',
    effect: { type: 'blackSun', dps: 6, durationMs: 3000 },
  },
  {
    id: 'duo_thunder_claws',
    gods: ['bastet', 'seth'],
    kind: 'duo',
    nameKey: 'boon.duo_thunder_claws',
    descKey: 'boon.duo_thunder_claws.desc',
    effect: { type: 'critStun', durationMs: 450 },
  },
  {
    id: 'duo_embalm',
    gods: ['ra', 'isis'],
    kind: 'duo',
    nameKey: 'boon.duo_embalm',
    descKey: 'boon.duo_embalm.desc',
    effect: { type: 'embalm', amount: 3 },
  },
  // ---------- Dons de Super (0.57.0) : un par dieu, la case « Super » ----------
  {
    id: 'ra_super',
    gods: ['ra'],
    kind: 'normal',
    nameKey: 'boon.ra_super',
    descKey: 'boon.ra_super.desc',
    effect: { type: 'burn', on: 'super', dps: 10, durationMs: 4000 },
  },
  {
    id: 'sobek_super',
    gods: ['sobek'],
    kind: 'normal',
    nameKey: 'boon.sobek_super',
    descKey: 'boon.sobek_super.desc',
    effect: { type: 'soak', on: 'super', slow: 0.4, durationMs: 5000 },
  },
  {
    id: 'khonsou_super',
    gods: ['khonsou'],
    kind: 'normal',
    nameKey: 'boon.khonsou_super',
    descKey: 'boon.khonsou_super.desc',
    effect: { type: 'chill', on: 'super', stacks: 3 },
  },
  {
    id: 'seth_super',
    gods: ['seth'],
    kind: 'normal',
    nameKey: 'boon.seth_super',
    descKey: 'boon.seth_super.desc',
    effect: { type: 'bolt', on: 'super', damage: 12, radius: 34 },
  },
  {
    id: 'serket_super',
    gods: ['serket'],
    kind: 'normal',
    nameKey: 'boon.serket_super',
    descKey: 'boon.serket_super.desc',
    effect: { type: 'venom', on: 'super', stacks: 4, dps: 2 },
  },
  {
    id: 'anubis_super',
    gods: ['anubis'],
    kind: 'normal',
    nameKey: 'boon.anubis_super',
    descKey: 'boon.anubis_super.desc',
    effect: { type: 'execute', on: 'super', threshold: 20 },
  },
  {
    id: 'bastet_super',
    gods: ['bastet'],
    kind: 'normal',
    nameKey: 'boon.bastet_super',
    descKey: 'boon.bastet_super.desc',
    effect: { type: 'crit', on: 'super', chance: 35 },
  },
  {
    id: 'isis_super',
    gods: ['isis'],
    kind: 'normal',
    nameKey: 'boon.isis_super',
    descKey: 'boon.isis_super.desc',
    effect: { type: 'lifeOnHit', on: 'super', amount: 1 },
  },
  {
    id: 'neith_super',
    gods: ['neith'],
    kind: 'normal',
    nameKey: 'boon.neith_super',
    descKey: 'boon.neith_super.desc',
    effect: { type: 'barrier', on: 'super', amount: 12 },
  },
  // ---------- Passifs qui renforcent un don déjà obtenu (anciennes « amplifications ») ----------
  {
    id: 'amp_noon',
    gods: ['ra'],
    kind: 'normal',
    nameKey: 'boon.amp_noon',
    descKey: 'boon.amp_noon.desc',
    effect: { type: 'burnDuration', bonus: 0.5 },
    requiresAny: ['ra_attack', 'ra_power', 'ra_dash'],
  },
  {
    id: 'amp_winter',
    gods: ['khonsou'],
    kind: 'normal',
    nameKey: 'boon.amp_winter',
    descKey: 'boon.amp_winter.desc',
    effect: { type: 'chillStacks', bonus: 1 },
    requiresAny: ['khonsou_attack', 'khonsou_power', 'khonsou_dash'],
  },
  {
    id: 'amp_arc',
    gods: ['seth'],
    kind: 'normal',
    nameKey: 'boon.amp_arc',
    descKey: 'boon.amp_arc.desc',
    effect: { type: 'chainBounces', bonus: 2 },
    requiresAny: ['seth_attack'],
  },
  {
    id: 'amp_thunder',
    gods: ['seth'],
    kind: 'normal',
    nameKey: 'boon.amp_thunder',
    descKey: 'boon.amp_thunder.desc',
    effect: { type: 'stunDuration', bonus: 0.5 },
    requiresAny: ['seth_dash'],
  },
  {
    id: 'amp_plague',
    gods: ['serket'],
    kind: 'normal',
    nameKey: 'boon.amp_plague',
    descKey: 'boon.amp_plague.desc',
    effect: { type: 'venomPotency', bonus: 0.5 },
    requiresAny: ['serket_attack', 'serket_power'],
  },
  {
    id: 'amp_scales',
    gods: ['anubis'],
    kind: 'normal',
    nameKey: 'boon.amp_scales',
    descKey: 'boon.amp_scales.desc',
    effect: { type: 'executeBonus', bonus: 5 },
    requiresAny: ['anubis_weigh', 'anubis_power'],
  },
  {
    id: 'amp_claws',
    gods: ['bastet'],
    kind: 'normal',
    nameKey: 'boon.amp_claws',
    descKey: 'boon.amp_claws.desc',
    effect: { type: 'critDamage', bonus: 0.5 },
    requiresAny: ['bastet_attack', 'bastet_power'],
  },
  {
    id: 'amp_aegis',
    gods: ['neith'],
    kind: 'normal',
    nameKey: 'boon.amp_aegis',
    descKey: 'boon.amp_aegis.desc',
    effect: { type: 'aegisCharge', charges: 1 },
    requiresAny: ['neith_aegis'],
  },
];

export function getBoon(id: string): BoonDef | undefined {
  return BOONS.find((b) => b.id === id);
}

export function slotOf(effect: BoonEffect): BoonSlot {
  return 'on' in effect ? effect.on : 'passive';
}
