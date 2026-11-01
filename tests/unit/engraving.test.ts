import { describe, expect, it } from 'vitest';
import {
  ENGRAVING_SLOTS,
  applyEngraving,
  freeSlots,
  isAwakened,
  rollEngravings,
} from '../../src/core/combat/engraving';
import { applyReward, newRun, takeEngraving } from '../../src/core/run/state';
import { ENGRAVINGS, getEngraving } from '../../src/data/engravings';
import { WEAPONS } from '../../src/data/weapons';
import fr from '../../src/i18n/fr.json';
import en from '../../src/i18n/en.json';
import { createRng } from '../../src/core/rng';
import { migrate } from '../../src/core/save/migrations';

const must = <T>(v: T | undefined): T => {
  if (v === undefined) throw new Error('absent');
  return v;
};

describe('Gravures de Ptah : données (retour F8)', () => {
  it('2 gravures par action et par arme, avec leurs textes en français et en anglais', () => {
    for (const weapon of Object.keys(WEAPONS)) {
      for (const slot of ENGRAVING_SLOTS) {
        const n = ENGRAVINGS.filter((e) => e.weapon === weapon && e.slot === slot).length;
        expect(n, `${weapon} ${slot}`).toBe(2);
      }
    }
    for (const dict of [fr, en] as unknown as Record<string, unknown>[]) {
      for (const e of ENGRAVINGS) {
        expect(dict[e.nameKey], e.nameKey).toBeDefined();
        expect(dict[e.descKey], e.descKey).toBeDefined();
      }
    }
    expect(new Set(ENGRAVINGS.map((e) => e.id)).size).toBe(ENGRAVINGS.length);
  });
});

describe('Gravures de Ptah : effets', () => {
  const katana = WEAPONS.katana;
  const first = must(katana.combo[0]);
  it('change la portée et les dégâts du coup', () => {
    const long = applyEngraving(first, must(getEngraving('katana_long')).mod);
    expect(long.range).toBe(first.range + 12);
    expect(long.arcDeg).toBe(Math.min(360, first.arcDeg + 20));
  });

  it('« dernier coup » : seulement sur le dernier coup du combo', () => {
    const mod = { finisher: { damageMul: 2 } };
    const n = katana.combo.length;
    expect(applyEngraving(first, mod, 0, n).damage).toBe(first.damage);
    const last = must(katana.combo[n - 1]);
    expect(applyEngraving(last, mod, n - 1, n).damage).toBe(last.damage * 2);
  });

  it('« combo qui monte » : chaque coup plus fort que le précédent', () => {
    const mod = { comboRamp: 0.15 };
    expect(applyEngraving(first, mod, 2, 3).damage).toBeCloseTo(first.damage * 1.3);
  });

  it('projectiles : nombre, rebonds, explosion', () => {
    const bolt = must(WEAPONS.crossbow.combo[0]);
    const s = applyEngraving(bolt, {
      projectile: { countAdd: 2, bounces: 1, explodeEnd: { damage: 5, radius: 9 } },
    });
    expect(s.projectile?.count).toBe(3);
    expect(s.projectile?.bounces).toBe(1);
    expect(s.projectile?.explodeEnd?.radius).toBe(9);
    expect(bolt.projectile?.count ?? 1).toBe(1); // l'arme d'origine n'est pas modifiée
  });
});

describe('Gravures de Ptah : règles', () => {
  it('choix parmi les actions pas encore gravées, de la bonne arme', () => {
    const owned = [must(getEngraving('katana_fang'))];
    const rng = createRng(4);
    const offers = rollEngravings(ENGRAVINGS, 'katana', owned, () => rng.next());
    expect(offers.length).toBe(3);
    for (const o of offers) {
      expect(o.weapon).toBe('katana');
      expect(o.slot).not.toBe('attack');
    }
  });

  it('une gravure par action ; l’arme s’éveille avec les 4', () => {
    const run = newRun(1, 'katana', 50, 0, 'ra');
    applyReward(run, 'weaponMod');
    expect(run.pendingEngraving).toBe(true);
    takeEngraving(run, 'katana_fang');
    takeEngraving(run, 'katana_long'); // même action : refusée
    takeEngraving(run, 'staff_twin'); // autre arme : refusée
    expect(run.engravings).toEqual(['katana_fang']);
    for (const id of ['katana_lion', 'katana_crescent', 'katana_harvest']) takeEngraving(run, id);
    const defs = run.engravings.map((id) => must(getEngraving(id)));
    expect(freeSlots(defs)).toEqual([]);
    expect(isAwakened(defs)).toBe(true);
    expect(rollEngravings(ENGRAVINGS, 'katana', defs, Math.random)).toEqual([]);
  });
});

describe('Gravures de Ptah : sauvegarde (v22 → v23)', () => {
  it('une run en cours commence sans gravure ; les gravures d’une autre arme sont ignorées', () => {
    const save = migrate({
      version: 22,
      meta: {},
      settings: {},
      run: newRun(3, 'katana', 50, 0, 'ra'),
    });
    expect(save.run?.engravings).toEqual([]);
    expect(save.run?.engravingBiome).toBe(-1);
    const later = migrate({
      version: 23,
      meta: {},
      settings: {},
      run: {
        ...newRun(3, 'katana', 50, 0, 'ra'),
        engravings: ['katana_fang', 'staff_twin', 'katana_long'],
      },
    });
    expect(later.run?.engravings).toEqual(['katana_fang']);
  });
});
