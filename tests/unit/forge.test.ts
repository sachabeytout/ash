import { describe, expect, it } from 'vitest';
import { assistReduction, reducedDamage } from '../../src/core/assist';
import { forgeLevel, nextForgeLevel, upgradeWeapon, weaponBonuses } from '../../src/core/forge';
import { migrate } from '../../src/core/save/migrations';
import { SAVE_VERSION, defaultMeta } from '../../src/core/save/schema';
import { FORGE } from '../../src/data/forge';
import { WEAPONS } from '../../src/data/weapons';
import { allDictionaries } from '../../src/i18n';

describe('forge de Brokk', () => {
  it('chaque arme a des niveaux aux coûts croissants et des textes', () => {
    for (const id of Object.keys(WEAPONS) as (keyof typeof WEAPONS)[]) {
      const levels = FORGE[id];
      expect(levels.length).toBeGreaterThan(0);
      levels.forEach((l, i) => {
        if (i > 0) expect(l.cost).toBeGreaterThanOrEqual(levels[i - 1]?.cost ?? 0);
        for (const dict of Object.values(allDictionaries))
          expect(dict[l.descKey], l.descKey).toBeDefined();
      });
    }
  });

  it('améliore avec les pièces d’arme, sinon rien ne change', () => {
    const meta = defaultMeta();
    expect(upgradeWeapon(meta, 'katana')).toBe(false);
    meta.weaponParts = 3;
    expect(upgradeWeapon(meta, 'katana')).toBe(true);
    expect(forgeLevel(meta, 'katana')).toBe(1);
    expect(meta.weaponParts).toBe(2);
    expect(upgradeWeapon(meta, 'katana')).toBe(true);
    expect(meta.weaponParts).toBe(0);
    expect(forgeLevel(meta, 'twinBlades')).toBe(0);
  });

  it('niveau maximum', () => {
    const meta = defaultMeta();
    meta.weaponParts = 999;
    while (upgradeWeapon(meta, 'twinBlades'));
    expect(nextForgeLevel(meta, 'twinBlades')).toBeUndefined();
  });

  it('les bonus se cumulent', () => {
    expect(weaponBonuses('katana', 0).damage).toBe(0);
    const b = weaponBonuses('katana', FORGE.katana.length);
    expect(b.damage).toBeCloseTo(0.16);
    expect(b.powerDamage).toBeGreaterThan(0);
    expect(b.superGain).toBeGreaterThan(0);
  });
});

describe('Bénédiction du Phénix', () => {
  it('rien si désactivée ; 20 % puis +2 % par mort, plafonné à 80 %', () => {
    expect(assistReduction(false, 10)).toBe(0);
    expect(assistReduction(true, 0)).toBeCloseTo(0.2);
    expect(assistReduction(true, 5)).toBeCloseTo(0.3);
    expect(assistReduction(true, 1000)).toBeCloseTo(0.8);
  });

  it('un coup fait toujours au moins 1 dégât', () => {
    expect(reducedDamage(10, 0.2)).toBe(8);
    expect(reducedDamage(1, 0.8)).toBe(1);
  });
});

describe('migration v1 → v2', () => {
  it('garde toute la progression et ajoute la forge', () => {
    const save = migrate({
      version: 1,
      meta: { xp: 40, weaponParts: 5, deaths: 3, clears: 1, skills: { thoth_vigor: 1 } },
      run: null,
      settings: { musicVolume: 0.3 },
    });
    expect(save.version).toBe(SAVE_VERSION);
    expect(save.meta.xp).toBe(40);
    expect(save.meta.weaponParts).toBe(5);
    expect(save.meta.skills).toEqual({ thoth_vigor: 1 });
    expect(save.meta.forge).toEqual({});
    expect(save.meta.assistDeaths).toBe(0);
    expect(save.settings.musicVolume).toBe(0.3);
    expect(save.settings.assist).toBe(false);
  });
});
