import { describe, expect, it } from 'vitest';
import { assistReduction, reducedDamage } from '../../src/core/assist';
import {
  chosenWeapon,
  forgeLevel,
  isUnlocked,
  nextForgeLevel,
  selectWeapon,
  unlockWeapon,
  upgradeWeapon,
  weaponBonuses,
} from '../../src/core/forge';
import { migrate } from '../../src/core/save/migrations';
import { SAVE_VERSION, defaultMeta } from '../../src/core/save/schema';
import { FORGE, UNLOCK_COST } from '../../src/data/forge';
import { WEAPON_ORDER, WEAPONS } from '../../src/data/weapons';
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
    meta.weaponParts = 5;
    expect(upgradeWeapon(meta, 'katana')).toBe(true);
    expect(forgeLevel(meta, 'katana')).toBe(1);
    expect(meta.weaponParts).toBe(3);
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

describe('armes à débloquer', () => {
  it('katana et doubles lames dès le départ ; les autres contre des pièces', () => {
    const meta = defaultMeta();
    expect(isUnlocked(meta, 'katana')).toBe(true);
    expect(isUnlocked(meta, 'staff')).toBe(false);
    expect(unlockWeapon(meta, 'staff')).toBe(false);
    meta.weaponParts = 10;
    expect(unlockWeapon(meta, 'staff')).toBe(true);
    expect(isUnlocked(meta, 'staff')).toBe(true);
    expect(meta.weaponParts).toBe(10 - (UNLOCK_COST.staff ?? 0));
    expect(unlockWeapon(meta, 'staff')).toBe(false);
  });

  it('chaque arme a un nom traduit, un Super et une forge', () => {
    for (const id of WEAPON_ORDER) {
      for (const dict of Object.values(allDictionaries))
        expect(dict[WEAPONS[id].nameKey], id).toBeDefined();
      expect(WEAPONS[id].super.length).toBeGreaterThan(0);
      expect(FORGE[id].length).toBeGreaterThan(0);
    }
  });

  it('migration v2 → v3 : rien de perdu, aucune arme débloquée', () => {
    const save = migrate({
      version: 2,
      meta: { xp: 12, weaponParts: 7, forge: { katana: 2 }, assistDeaths: 1 },
      run: null,
      settings: {},
    });
    expect(save.meta.forge).toEqual({ katana: 2 });
    expect(save.meta.weaponParts).toBe(7);
    expect(save.meta.unlocked).toEqual([]);
  });
});

describe('râtelier de la Cage (0.30.0)', () => {
  it('on ne peut équiper qu’une arme disponible ; sinon la Katana', () => {
    const meta = defaultMeta();
    expect(chosenWeapon(meta)).toBe('katana');
    expect(selectWeapon(meta, 'staff')).toBe(false);
    expect(selectWeapon(meta, 'twinBlades')).toBe(true);
    expect(chosenWeapon(meta)).toBe('twinBlades');
    meta.selectedWeapon = 'dawnblade';
    expect(chosenWeapon(meta)).toBe('katana');
  });

  it('une sauvegarde v12 passe en v13 avec la Katana au râtelier', () => {
    const save = migrate({ version: 12, meta: { xp: 3 }, settings: {}, run: null });
    expect(save.meta.selectedWeapon).toBe('katana');
    expect(save.meta.xp).toBe(3);
  });
});
