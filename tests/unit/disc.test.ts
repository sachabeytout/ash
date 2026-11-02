import { describe, expect, it } from 'vitest';
import { applyEngraving } from '../../src/core/combat/engraving';
import { dashStrikeStep } from '../../src/core/combat/dashStrike';
import { ENGRAVINGS } from '../../src/data/engravings';
import { WEAPONS } from '../../src/data/weapons';

const disc = WEAPONS.disc;

describe('Disque solaire (retours du 02/11, point 3)', () => {
  it('en main, le combo frappe au corps à corps sans rien lancer', () => {
    expect(disc.combo).toHaveLength(3);
    for (const step of disc.combo) {
      expect(step.projectile).toBeUndefined();
      expect(step.range).toBeGreaterThan(0);
    }
  });

  it('l’attaque spéciale lance un seul disque, qui rebondit et peut être rappelé', () => {
    const p = disc.power.projectile;
    expect(p?.count ?? 1).toBe(1);
    expect(p?.recallable).toBe(true);
    expect(p?.returns).toBe(true);
    expect(p?.bounces).toBe(4);
    expect(disc.unarmed?.projectile).toBeUndefined();
  });

  it('jamais plusieurs disques : Tourbillon disque en main, Super en zone', () => {
    expect(disc.dashPower?.projectile).toBeUndefined();
    expect(disc.dashPower?.arcDeg).toBe(360);
    expect(disc.super).toHaveLength(1);
    expect(disc.super[0]?.projectile).toBeUndefined();
    expect(disc.super[0]?.zone).toBeDefined();
    // La Percée part du coup en main : elle reste au corps à corps.
    expect(dashStrikeStep(disc.combo[0] ?? disc.power, false).projectile).toBeUndefined();
  });

  it('aucune gravure du disque n’ajoute de disque', () => {
    for (const e of ENGRAVINGS.filter((g) => g.weapon === 'disc')) {
      expect(e.mod.projectile?.countAdd ?? 0, e.id).toBe(0);
      const base = e.slot === 'power' ? disc.power : (disc.combo[0] ?? disc.power);
      expect(applyEngraving(base, e.mod).projectile?.count ?? 1, e.id).toBe(1);
    }
  });
});
