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
import { applyEngraving, mergeStepMods } from '../../src/core/combat/engraving';
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
    expect(b.damage).toBeCloseTo(0.24);
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

describe('forge de Ptah, niveaux 6 à 10 (retour F12)', () => {
  it('10 niveaux par arme, prix 2 à 16, chaque palier a son texte', () => {
    for (const id of WEAPON_ORDER) {
      expect(
        FORGE[id].map((l) => l.cost),
        id,
      ).toEqual([2, 3, 4, 6, 8, 9, 10, 12, 14, 16]);
      for (const l of FORGE[id])
        for (const dict of Object.values(allDictionaries))
          expect(dict[l.descKey], l.descKey).toBeDefined();
    }
  });

  it('les niveaux propres à chaque arme arrivent dans les bonus', () => {
    const katana = weaponBonuses('katana', 10);
    expect(katana.strikeDamage).toBeCloseTo(0.25);
    expect(katana.killHeal).toBe(1);
    expect(katana.attackMod?.rangeAdd).toBe(5);
    expect(katana.attackMod?.finisher?.damageMul).toBeCloseTo(1.3);
    expect(katana.powerMod?.finisher).toBeUndefined();
    expect(weaponBonuses('katana', 7).killHeal).toBe(0);
    expect(weaponBonuses('twinBlades', 10).dashCooldown).toBeCloseTo(0.15);
    expect(weaponBonuses('twinBlades', 10).attackMod?.fx?.crit).toBeCloseTo(0.08);
    expect(weaponBonuses('crossbow', 10).doubleShot).toBe(4);
    expect(weaponBonuses('crossbow', 10).powerDamage).toBeCloseTo(0.45);
    expect(weaponBonuses('dawnblade', 10).parrySuper).toBeCloseTo(0.1);
    expect(weaponBonuses('dawnblade', 10).powerMod?.activeMul).toBeCloseTo(1.25);
  });

  it('forge et gravure se cumulent sur le même coup', () => {
    const merged = mergeStepMods(
      { rangeAdd: 5, tempoMul: 0.9, projectile: { rangeMul: 1.2 }, fx: { crit: 0.08 } },
      {
        rangeAdd: 4,
        tempoMul: 0.8,
        projectile: { rangeMul: 1.5, pierceAdd: 1 },
        fx: { crit: 0.1 },
      },
    );
    expect(merged?.rangeAdd).toBe(9);
    expect(merged?.tempoMul).toBeCloseTo(0.72);
    expect(merged?.projectile?.rangeMul).toBeCloseTo(1.8);
    expect(merged?.projectile?.pierceAdd).toBe(1);
    expect(merged?.fx?.crit).toBeCloseTo(0.18);
    expect(mergeStepMods(undefined, { rangeAdd: 1 })).toEqual({ rangeAdd: 1 });
  });

  it('une phase active plus longue rend la parade plus facile', () => {
    const step = WEAPONS.dawnblade.power;
    expect(applyEngraving(step, { activeMul: 1.25 }).activeMs).toBe(
      Math.round(step.activeMs * 1.25),
    );
  });
});

describe('marcher en attaquant (retour F14)', () => {
  it('l’Ouas, l’Arc et le Disque laissent marcher pendant l’attaque normale', () => {
    const walking = WEAPON_ORDER.filter((id) => (WEAPONS[id].walkWhileAttacking ?? 0) > 0);
    expect(walking).toEqual(['staff', 'crossbow', 'disc']);
    for (const id of walking) expect(WEAPONS[id].walkWhileAttacking).toBeLessThan(1);
  });
});
