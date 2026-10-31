import { describe, expect, it } from 'vitest';
import { DASH_STRIKE, dashStrikeStep, isDashStrike } from '../../src/core/combat/dashStrike';
import { WEAPONS } from '../../src/data/weapons';

describe('coups d’élan (dash puis attaque)', () => {
  it('ne comptent que pendant le dash ou juste après', () => {
    expect(isDashStrike(1000, 1000)).toBe(true);
    expect(isDashStrike(1000 + DASH_STRIKE.windowMs, 1000)).toBe(true);
    expect(isDashStrike(1001 + DASH_STRIKE.windowMs, 1000)).toBe(false);
    expect(isDashStrike(0, -Infinity)).toBe(false);
  });

  it('la frappe d’élan est plus forte et plus large, la puissante frappe tout autour', () => {
    const base = WEAPONS.katana.combo[0];
    if (!base) throw new Error('katana sans combo');
    const strike = dashStrikeStep(base, false);
    expect(strike.damage).toBeGreaterThan(base.damage);
    expect(strike.arcDeg).toBeGreaterThan(base.arcDeg);
    expect(strike.lunge).toBeGreaterThan(base.lunge);
    const spin = dashStrikeStep(WEAPONS.katana.power, true);
    expect(spin.arcDeg).toBe(360);
    expect(spin.damage).toBeGreaterThan(WEAPONS.katana.power.damage);
  });

  it('les armes à distance gagnent aussi leur coup d’élan', () => {
    for (const w of Object.values(WEAPONS)) {
      const p = w.power.projectile;
      if (!p) continue;
      const spin = dashStrikeStep(w.power, true);
      expect(spin.projectile?.count).toBe((p.count ?? 1) + DASH_STRIKE.power.extraProjectiles);
      expect(spin.projectile?.damage).toBeGreaterThan(p.damage);
    }
  });
});
