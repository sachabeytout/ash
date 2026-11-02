import { describe, expect, it } from 'vitest';
import { grappleLaunchAngle, grappleTarget, steerToward } from '../../src/core/combat/grapple';

const from = { x: 0, y: 0 };

describe('grappin de la Chaîne du pressoir', () => {
  it('prend l’ennemi le plus proche devant, même si un autre est plus près derrière', () => {
    const front = { x: 150, y: 20 };
    const behind = { x: -40, y: 0 };
    const aim = grappleTarget(from, 0, [behind, front], 200, 120);
    expect(aim?.target).toBe(front);
    expect(aim?.ahead).toBe(true);
    if (aim) expect(grappleLaunchAngle(from, 0, aim)).toBe(0);
  });

  it('personne devant : le plus proche autour, et le grappin part droit dessus', () => {
    const behind = { x: -50, y: 0 };
    const aim = grappleTarget(from, 0, [behind], 200, 120);
    expect(aim?.target).toBe(behind);
    expect(aim?.ahead).toBe(false);
    if (aim) expect(Math.abs(grappleLaunchAngle(from, 0, aim))).toBeCloseTo(Math.PI);
  });

  it('personne à portée : pas de cible', () => {
    expect(grappleTarget(from, 0, [{ x: 300, y: 0 }], 200, 120)).toBeNull();
  });

  it('se courbe vers la cible sans changer de vitesse, d’au plus le virage permis', () => {
    const v = steerToward(100, 0, from, { x: 0, y: 200 }, 0.2);
    expect(Math.hypot(v.vx, v.vy)).toBeCloseTo(100);
    expect(Math.atan2(v.vy, v.vx)).toBeCloseTo(0.2);
    const near = steerToward(100, 0, from, { x: 0, y: 10 }, 0.2);
    expect(Math.atan2(near.vy, near.vx)).toBeCloseTo(Math.PI / 2);
  });

  it('en suivant la courbe, le grappin atteint une cible placée sur le côté', () => {
    const target = { x: 120, y: 100 };
    const pos = { x: 0, y: 0 };
    let v = { vx: 480, vy: 0 };
    const dt = 1 / 60;
    let reached = false;
    for (let i = 0; i < 120 && !reached; i++) {
      v = steerToward(v.vx, v.vy, pos, target, ((540 * Math.PI) / 180) * dt);
      pos.x += v.vx * dt;
      pos.y += v.vy * dt;
      reached = Math.hypot(pos.x - target.x, pos.y - target.y) < 8;
    }
    expect(reached).toBe(true);
  });
});
