import type { AttackStep } from './attack';

/**
 * Coups d'élan : une attaque lancée pendant le dash, ou juste après, devient un coup plus fort.
 * - attaque → « Frappe d'élan » : plus de dégâts, un arc plus large et un élan vers l'avant ;
 * - attaque puissante → « Tourbillon d'élan » : la puissante frappe tout autour d'Ash.
 * Les armes à distance gagnent des projectiles plus forts (et plus nombreux pour la puissante).
 */
export const DASH_STRIKE = {
  /** Délai après la fin du dash pendant lequel l'attaque compte encore comme un coup d'élan (ms). */
  windowMs: 260,
  attack: { damage: 1.6, arcBonusDeg: 50, rangeBonus: 6, lunge: 26 },
  power: { damage: 1.4, knockback: 1.3, extraProjectiles: 2 },
} as const;

/** L'attaque part-elle assez tôt après le dash pour être un coup d'élan ? */
export function isDashStrike(now: number, lastDashEnd: number): boolean {
  return now - lastDashEnd <= DASH_STRIKE.windowMs;
}

/** Version « coup d'élan » d'un coup d'arme. */
export function dashStrikeStep(step: AttackStep, power: boolean): AttackStep {
  if (!power) {
    const a = DASH_STRIKE.attack;
    const strike: AttackStep = {
      ...step,
      damage: step.damage * a.damage,
      arcDeg: Math.min(360, step.arcDeg + a.arcBonusDeg),
      range: step.range > 0 ? step.range + a.rangeBonus : 0,
      lunge: step.lunge + a.lunge,
      hitstopMs: step.hitstopMs + 15,
    };
    if (step.projectile)
      strike.projectile = {
        ...step.projectile,
        damage: step.projectile.damage * a.damage,
        pierce: step.projectile.pierce + 1,
      };
    if (step.zone) strike.zone = { ...step.zone, damage: step.zone.damage * a.damage };
    return strike;
  }
  const p = DASH_STRIKE.power;
  const strike: AttackStep = {
    ...step,
    damage: step.damage * p.damage,
    arcDeg: step.range > 0 ? 360 : step.arcDeg,
    knockback: step.knockback * p.knockback,
    shake: Math.max(step.shake, 0.004),
  };
  if (step.projectile) {
    const count = (step.projectile.count ?? 1) + p.extraProjectiles;
    strike.projectile = {
      ...step.projectile,
      damage: step.projectile.damage * p.damage,
      count,
      spreadDeg: Math.max(step.projectile.spreadDeg ?? 0, 40),
    };
  }
  if (step.zone)
    strike.zone = {
      ...step.zone,
      damage: step.zone.damage * p.damage,
      radius: step.zone.radius * 1.25,
    };
  return strike;
}
