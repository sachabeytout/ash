import type { ProjectileSpec } from '../core/combat/attack';
import type { EngravingDef, EngravingSlot, StepMod } from '../core/combat/engraving';
import type { WeaponId } from './weapons';

/** Onde de lumière (lame en croissant, rayon) : traverse tous les ennemis. */
const LIGHT_WAVE: ProjectileSpec = {
  damage: 14,
  speed: 360,
  radius: 7,
  range: 150,
  pierce: 99,
  knockback: 60,
  look: 'bolt',
};
/** Dague-étoile : part et revient. */
const STAR_DAGGER: ProjectileSpec = {
  damage: 9,
  speed: 380,
  radius: 5,
  range: 130,
  pierce: 99,
  knockback: 30,
  look: 'bolt',
  returns: true,
};
/** Anneau de projectiles tout autour d'Ash. */
const ring = (look: ProjectileSpec['look'], damage: number, count: number): ProjectileSpec => ({
  damage,
  speed: 300,
  radius: 5,
  range: 120,
  pierce: 1,
  knockback: 60,
  look,
  count,
  spreadDeg: 360,
});

const def = (weapon: WeaponId, slot: EngravingSlot, key: string, mod: StepMod): EngravingDef => ({
  id: `${weapon}_${key}`,
  weapon,
  slot,
  nameKey: `engraving.${weapon}_${key}`,
  descKey: `engraving.${weapon}_${key}.desc`,
  mod,
});

/**
 * Gravures de Ptah : 2 par action (attaque, attaque spéciale, frappe d'élan, tourbillon d'élan)
 * et par arme. Les chiffres se règlent ici ; les textes sont dans `engraving.*` (i18n).
 */
export const ENGRAVINGS: readonly EngravingDef[] = [
  // ---------- Khépesh ----------
  def('katana', 'attack', 'fang', { finisher: { hits: 2 } }),
  def('katana', 'attack', 'long', { rangeAdd: 12, arcAdd: 20 }),
  def('katana', 'power', 'lion', { lungeAdd: 50, knockbackMul: 1.6 }),
  def('katana', 'power', 'copper', { fx: { judge: { bonus: 0.25, durationMs: 4000 } } }),
  def('katana', 'dashAttack', 'crescent', { wave: LIGHT_WAVE }),
  def('katana', 'dashAttack', 'falcon', {
    lungeAdd: 30,
    fx: { stun: { chance: 1, durationMs: 450 } },
  }),
  def('katana', 'dashPower', 'harvest', { pull: 80 }),
  def('katana', 'dashPower', 'sandstorm', { rangeAdd: 16, knockbackMul: 1.4 }),
  // ---------- Dagues d'étoile ----------
  def('twinBlades', 'attack', 'stars', { finisher: { wave: STAR_DAGGER } }),
  def('twinBlades', 'attack', 'frenzy', { comboRamp: 0.15 }),
  def('twinBlades', 'power', 'meteor', { fx: { judge: { bonus: 0.3, durationMs: 3000 } } }),
  def('twinBlades', 'power', 'twins', { hits: 2, damageMul: 0.65 }),
  def('twinBlades', 'dashAttack', 'shadow', { fx: { crit: 1 } }),
  def('twinBlades', 'dashAttack', 'lunge', { lungeAdd: 30, rangeAdd: 8 }),
  def('twinBlades', 'dashPower', 'belt', { wave: ring('bolt', 8, 6) }),
  def('twinBlades', 'dashPower', 'cyclone', { hits: 2, damageMul: 0.7 }),
  // ---------- Ouas ----------
  def('staff', 'attack', 'twin', { projectile: { split: 2 } }),
  def('staff', 'attack', 'heavy', {
    projectile: { damageMul: 1.35, radiusAdd: 2, speedMul: 0.85 },
  }),
  def('staff', 'power', 'well', { echoMs: 450 }),
  def('staff', 'power', 'circle', { zone: { radiusAdd: 14 } }),
  def('staff', 'dashAttack', 'ray', {
    projectile: { pierceAdd: 99, speedMul: 1.5, rangeMul: 1.3 },
  }),
  def('staff', 'dashAttack', 'triple', { projectile: { countAdd: 2, spreadAdd: 30 } }),
  def('staff', 'dashPower', 'ring', { wave: ring('orb', 10, 6) }),
  def('staff', 'dashPower', 'rain', { zone: { countAdd: 2 } }),
  // ---------- Arc de Neith ----------
  def('crossbow', 'attack', 'southWind', { projectile: { bounces: 1 } }),
  def('crossbow', 'attack', 'quick', { tempoMul: 0.75 }),
  def('crossbow', 'power', 'neith', { projectile: { explodeEnd: { damage: 24, radius: 36 } } }),
  def('crossbow', 'power', 'heavy', { damageMul: 1.3, knockbackMul: 1.6 }),
  def('crossbow', 'dashAttack', 'roll', { projectile: { countAdd: 2, spreadAdd: 24 } }),
  def('crossbow', 'dashAttack', 'serpent', { fx: { venom: { stacks: 2, dps: 2 } } }),
  def('crossbow', 'dashPower', 'volley', { echoMs: 500 }),
  def('crossbow', 'dashPower', 'fan', { projectile: { countAdd: 3, spreadAdd: 30 } }),
  // ---------- Disque solaire ----------
  // Refonte du disque (02/11) : identifiants d'origine gardés pour les runs sauvegardées.
  // « twinSun » = Lame de midi, « swift » = Éclat, « bounce » = Éblouissement, « double » = Halo.
  def('disc', 'attack', 'twinSun', { rangeAdd: 6, tempoMul: 0.85 }),
  def('disc', 'attack', 'swift', { finisher: { wave: LIGHT_WAVE } }),
  def('disc', 'power', 'eclipse', { projectile: { hover: 1200 } }),
  def('disc', 'power', 'giant', { damageMul: 1.2, projectile: { radiusAdd: 4 } }),
  def('disc', 'dashAttack', 'bounce', { fx: { stun: { chance: 1, durationMs: 600 } } }),
  def('disc', 'dashAttack', 'edge', { fx: { judge: { bonus: 0.2, durationMs: 4000 } } }),
  def('disc', 'dashPower', 'crown', { fx: { burn: { dps: 4, durationMs: 3000 } } }),
  def('disc', 'dashPower', 'double', { rangeAdd: 14, knockbackMul: 1.5 }),
  // ---------- Chaîne du pressoir ----------
  def('chain', 'attack', 'press', { rangeAdd: 10, damageMul: 1.15 }),
  def('chain', 'attack', 'double', { hits: 2, damageMul: 0.65 }),
  // Le grappin immobilise déjà 2 s : le Garrot rend l'ennemi attrapé plus fragile pendant ce temps.
  def('chain', 'power', 'garrote', { fx: { judge: { bonus: 0.3, durationMs: 2000 } } }),
  def('chain', 'power', 'long', { projectile: { rangeMul: 1.5 } }),
  def('chain', 'dashAttack', 'sweep', { arcAdd: 100 }),
  def('chain', 'dashAttack', 'flail', { fx: { stun: { chance: 1, durationMs: 400 } } }),
  def('chain', 'dashPower', 'round', { rangeAdd: 30 }),
  def('chain', 'dashPower', 'winch', { pull: 80 }),
  // ---------- Lame de l'Aube ----------
  def('dawnblade', 'attack', 'rising', { comboRamp: 0.15 }),
  def('dawnblade', 'attack', 'solar', { finisher: { wave: LIGHT_WAVE } }),
  def('dawnblade', 'power', 'mirror', { reflect: 90 }),
  def('dawnblade', 'power', 'backlight', { damageMul: 1.4 }),
  def('dawnblade', 'dashAttack', 'ray', { wave: { ...LIGHT_WAVE, damage: 18 } }),
  def('dawnblade', 'dashAttack', 'lion', { lungeAdd: 30, damageMul: 1.2 }),
  def('dawnblade', 'dashPower', 'zenith', { fx: { lifeOnHit: 2 } }),
  def('dawnblade', 'dashPower', 'halo', { rangeAdd: 18 }),
];

export function getEngraving(id: string): EngravingDef | undefined {
  return ENGRAVINGS.find((e) => e.id === id);
}
