import { describe, expect, it } from 'vitest';
import { heatModifiers, heatTotal, setHeat, type HeatLevels } from '../../src/core/heat';
import { HEAT } from '../../src/data/heat';
import { drinkFountain, newRun, onRoomCleared, summarize } from '../../src/core/run/state';
import { price } from '../../src/core/shop';
import { migrate } from '../../src/core/save/migrations';
import { SHOP_ITEMS } from '../../src/data/shop';
import { BIOMES } from '../../src/data/biomes';
import { allDictionaries } from '../../src/i18n';

describe("Mesures d'urgence", () => {
  it('chaque mesure a ses textes', () => {
    for (const h of HEAT) {
      for (const dict of Object.values(allDictionaries)) {
        expect(dict[h.nameKey], h.nameKey).toBeDefined();
        expect(dict[h.descKey], h.descKey).toBeDefined();
      }
    }
  });

  it('aucune mesure : rien ne change', () => {
    const m = heatModifiers({});
    expect(m).toEqual({
      enemyHp: 1,
      enemyDamage: 1,
      enemySpeed: 1,
      waveBudget: 1,
      shopPrice: 1,
      noRest: false,
      reward: 1,
    });
  });

  it('les niveaux sont bornés et chaque point rapporte +10 %', () => {
    const levels: HeatLevels = {};
    setHeat(levels, 'curfew', 5);
    setHeat(levels, 'noRest', 1);
    expect(levels.curfew).toBe(2);
    expect(heatTotal(levels)).toBe(3);
    const m = heatModifiers(levels);
    expect(m.enemyHp).toBeCloseTo(1.5);
    expect(m.noRest).toBe(true);
    expect(m.reward).toBeCloseTo(1.3);
    setHeat(levels, 'curfew', -3);
    expect(levels.curfew).toBe(0);
  });
});

describe('Mesures d’urgence en jeu', () => {
  it('les récompenses de fin de run sont multipliées', () => {
    const run = newRun(1, 'katana', 50, 0, 'ra', undefined, 0, 0, { curfew: 2, noRest: 1 });
    run.xp = 100;
    run.weaponParts = 10;
    const s = summarize(run, 'death');
    expect(s.xp).toBe(Math.round((100 + 2) * 1.3));
    expect(s.weaponParts).toBe(13);
  });

  it('« Sans répit » : pas de fontaine ni de soin de Thot', () => {
    const run = newRun(1, 'katana', 50, 0, 'ra', { damage: 0, healPerRoom: 5, rareBonus: 0 });
    run.hp = 20;
    expect(drinkFountain(run)).toBe(15);
    expect(onRoomCleared(run)).toBe(5);
    run.heat = { noRest: 1 };
    expect(drinkFountain(run)).toBe(0);
    expect(onRoomCleared(run)).toBe(0);
  });

  it('« Rationnement » : le marchand est plus cher', () => {
    const heal = SHOP_ITEMS.find((i) => i.id === 'heal');
    if (!heal) throw new Error('article manquant');
    expect(price(heal, heatModifiers({ rationing: 1 }).shopPrice)).toBe(
      Math.round(heal.cost * 1.4),
    );
  });

  it('migration v5 → v6 : aucune mesure active, rien de perdu', () => {
    const save = migrate({
      version: 5,
      meta: { xp: 9, clears: 2, seenDialogues: ['intro_aelia'] },
      run: { weapon: 'katana', room: 3, boons: [] },
      settings: {},
    });
    expect(save.meta.heat).toEqual({});
    expect(save.meta.clears).toBe(2);
    expect(save.meta.seenDialogues).toEqual(['intro_aelia']);
    expect(save.run?.heat).toEqual({});
  });

  it('chaque biome a une fontaine qui n’est pas une salle d’élite', () => {
    for (const b of BIOMES) {
      expect(b.fountainRooms.length).toBeGreaterThan(0);
      b.fountainRooms.forEach((r) => expect(b.eliteRooms).not.toContain(r));
    }
  });
});
