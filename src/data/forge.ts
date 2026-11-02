import type { StepMod } from '../core/combat/engraving';
import type { WeaponId } from './weapons';

/**
 * Forge de Ptah : chaque arme s'améliore avec les pièces d'arme (progression permanente).
 * Un niveau = un effet qui s'ajoute aux précédents.
 */
export type ForgeEffect =
  /** Dégâts de toutes les attaques (0,08 = +8 %). */
  | { type: 'damage'; value: number }
  /** Dégâts de l'attaque puissante seulement. */
  | { type: 'powerDamage'; value: number }
  /** La jauge de Super se remplit plus vite. */
  | { type: 'superGain'; value: number }
  /** Le Super fait plus de dégâts. */
  | { type: 'superDamage'; value: number }
  /** Frappes et tourbillons d'élan plus forts (0,25 = +25 %). */
  | { type: 'strikeDamage'; value: number }
  /** Chaque ennemi vaincu rend des PV. */
  | { type: 'killHeal'; value: number }
  /** Le dash se recharge plus vite (0,15 = −15 %). */
  | { type: 'dashCooldown'; value: number }
  /** Un tir d'attaque sur `value` part en double. */
  | { type: 'doubleShot'; value: number }
  /** Une parade réussie rend des PV. */
  | { type: 'parryHeal'; value: number }
  /** Une parade réussie remplit la jauge de Super (fraction). */
  | { type: 'parrySuper'; value: number }
  /** Change les coups de l'arme, comme une gravure (attaque, attaque spéciale, ou les deux). */
  | { type: 'mod'; slot: 'all' | 'attack' | 'power'; mod: StepMod };

export interface ForgeLevel {
  cost: number;
  effect: ForgeEffect;
  /** Texte du palier ; `{value}` = valeur de l'effet (en % pour les fractions). */
  descKey: string;
}

/** Niveaux 1 à 5, communs à toutes les armes. */
const BASE: readonly ForgeLevel[] = [
  // Prix relevés au retour F12 (0.72.0) : 2, 3, 4, 6, 8 (avant 1 à 5). Les niveaux déjà forgés restent.
  { cost: 2, effect: { type: 'damage', value: 0.08 }, descKey: 'forge.damage' },
  { cost: 3, effect: { type: 'powerDamage', value: 0.2 }, descKey: 'forge.powerDamage' },
  { cost: 4, effect: { type: 'superGain', value: 0.25 }, descKey: 'forge.superGain' },
  { cost: 6, effect: { type: 'damage', value: 0.08 }, descKey: 'forge.damage' },
  { cost: 8, effect: { type: 'superDamage', value: 0.3 }, descKey: 'forge.superDamage' },
];

/** Prix des niveaux 6 à 10 (retour F12, 0.73.0). */
const HIGH_COSTS = [9, 10, 12, 14, 16] as const;

/**
 * Niveaux 6 à 10 (retour F12, option 1) : 7 et 9 communs (dégâts, élan), 6, 8 et 10 propres à l'arme.
 * Ils évitent de reprendre les effets des gravures.
 */
function tiers(
  weapon: WeaponId,
  six: ForgeEffect,
  eight: ForgeEffect,
  ten: ForgeEffect,
): readonly ForgeLevel[] {
  const own = (n: number, effect: ForgeEffect): ForgeLevel => ({
    cost: HIGH_COSTS[n - 6] ?? 16,
    effect,
    descKey: `forge.${weapon}.${n}`,
  });
  return [
    ...BASE,
    own(6, six),
    { cost: HIGH_COSTS[1], effect: { type: 'damage', value: 0.08 }, descKey: 'forge.damage' },
    own(8, eight),
    { cost: HIGH_COSTS[3], effect: { type: 'strikeDamage', value: 0.25 }, descKey: 'forge.strike' },
    own(10, ten),
  ];
}

const mod = (slot: 'all' | 'attack' | 'power', m: StepMod): ForgeEffect => ({
  type: 'mod',
  slot,
  mod: m,
});

/** Niveaux de forge de chaque arme : 1 à 5 communs, 6 à 10 propres à l'arme. */
export const FORGE: Record<WeaponId, readonly ForgeLevel[]> = {
  // Khépesh : lame plus longue, coup final plus lourd, chaque victime rend 1 PV.
  katana: tiers(
    'katana',
    mod('all', { rangeAdd: 5 }),
    mod('attack', { finisher: { damageMul: 1.3 } }),
    { type: 'killHeal', value: 1 },
  ),
  // Dagues : plus rapides, coups critiques, dash plus vite rechargé.
  twinBlades: tiers(
    'twinBlades',
    mod('all', { tempoMul: 0.9 }),
    mod('all', { fx: { crit: 0.08 } }),
    { type: 'dashCooldown', value: 0.15 },
  ),
  // Ouas : orbes plus lointains, zone plus grande, orbes qui traversent.
  staff: tiers(
    'staff',
    mod('attack', { projectile: { rangeMul: 1.2 } }),
    mod('power', { zone: { radiusAdd: 7 } }),
    mod('attack', { projectile: { pierceAdd: 1 } }),
  ),
  // Arc de Neith : flèches plus rapides et lointaines, flèche chargée plus forte, tir double.
  crossbow: tiers(
    'crossbow',
    mod('all', { projectile: { speedMul: 1.15, rangeMul: 1.1 } }),
    { type: 'powerDamage', value: 0.25 },
    { type: 'doubleShot', value: 4 },
  ),
  // Disque solaire : retour plus rapide, petite brûlure, disque plus grand (il traverse déjà tout).
  disc: tiers(
    'disc',
    mod('all', { projectile: { speedMul: 1.2 } }),
    mod('all', { fx: { burn: { dps: 2, durationMs: 2500 } } }),
    mod('all', { projectile: { radiusAdd: 3 } }),
  ),
  // Chaîne du pressoir : plus de portée, grappin qui étourdit, fouet plus large.
  chain: tiers(
    'chain',
    mod('all', { rangeAdd: 9 }),
    mod('power', { fx: { stun: { chance: 1, durationMs: 500 } } }),
    mod('attack', { arcAdd: 30 }),
  ),
  // Lame de l'Aube : parade plus facile, parade qui soigne, parade qui remplit le Super.
  dawnblade: tiers(
    'dawnblade',
    mod('power', { activeMul: 1.25 }),
    { type: 'parryHeal', value: 3 },
    { type: 'parrySuper', value: 0.1 },
  ),
};

/** Armes de départ ; les autres se débloquent chez Ptah contre des pièces d'arme. */
export const STARTING_WEAPONS: readonly WeaponId[] = ['katana', 'twinBlades'];
export const UNLOCK_COST: Partial<Record<WeaponId, number>> = {
  staff: 8,
  crossbow: 8,
  disc: 12,
  chain: 12,
};
