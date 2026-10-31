import { describe, expect, it } from 'vitest';
import { finishRun } from '../../src/core/meta';
import { migrate } from '../../src/core/save/migrations';
import { defaultSave } from '../../src/core/save/schema';
import {
  claimTrophies,
  recordVariantBeaten,
  trophyEarned,
  trophyProgress,
} from '../../src/core/trophies';
import { BOSSES } from '../../src/data/bosses';
import { GOD_IDS } from '../../src/data/gods';
import { SKILLS } from '../../src/data/skills';
import { TROPHIES } from '../../src/data/trophies';
import { WEAPON_ORDER } from '../../src/data/weapons';
import fr from '../../src/i18n/fr.json';

const get = (id: string) => {
  const def = TROPHIES.find((t) => t.id === id);
  if (!def) throw new Error(`trophée inconnu : ${id}`);
  return def;
};

describe('trophées', () => {
  it('les objectifs collent au contenu du jeu et chaque trophée a un nom', () => {
    expect(get('allWeapons').goal).toBe(WEAPON_ORDER.length);
    expect(get('pantheon').goal).toBe(GOD_IDS.length);
    expect(get('guardians').goal).toBe(Object.keys(BOSSES).length);
    expect(get('unchained').goal).toBe(Object.keys(BOSSES).length);
    expect(get('thothMaster').goal).toBe(SKILLS.length);
    const texts = fr as unknown as Record<string, string>;
    for (const t of TROPHIES) {
      expect(texts[`trophy.${t.id}`]).toBeTruthy();
      expect(texts[`trophy.${t.id}.desc`]).toBeTruthy();
      expect(t.reward.xp + t.reward.weaponParts).toBeGreaterThan(0);
    }
  });

  it('une victoire remet « Première évasion » une seule fois, avec sa récompense', () => {
    const save = defaultSave();
    finishRun(save, {
      outcome: 'cleared',
      biome: 3,
      room: 7,
      elapsedMs: 30 * 60000,
      xp: 0,
      weaponParts: 0,
      weapon: 'katana',
      kills: 10,
    });
    const got = claimTrophies(save.meta);
    expect(got.map((t) => t.id)).toEqual(['firstEscape']);
    expect(save.meta.xp).toBe(get('firstEscape').reward.xp);
    expect(claimTrophies(save.meta)).toEqual([]);
    expect(save.meta.xp).toBe(get('firstEscape').reward.xp);
  });

  it('victoire rapide, Mesures d’urgence et variantes de boss sont suivies', () => {
    const save = defaultSave();
    save.meta.heat = { curfew: 2, patrols: 2 };
    finishRun(save, {
      outcome: 'cleared',
      biome: 3,
      room: 7,
      elapsedMs: 20 * 60000,
      xp: 0,
      weaponParts: 0,
      weapon: 'staff',
    });
    expect(trophyEarned(save.meta, get('swift'))).toBe(true);
    expect(trophyProgress(save.meta, 'pressure')).toBe(4);
    expect(trophyEarned(save.meta, get('pressure'))).toBe(true);
    expect(trophyEarned(save.meta, get('inferno'))).toBe(false);
    recordVariantBeaten(save.meta, 'ammit');
    recordVariantBeaten(save.meta, 'ammit');
    expect(trophyProgress(save.meta, 'unchained')).toBe(1);
  });

  it('la progression d’avant les trophées compte (migration v13 → v14)', () => {
    const save = migrate({
      version: 13,
      meta: {
        clears: 6,
        runs: 60,
        records: { totalKills: 700, clearsByWeapon: { katana: 6 } },
      },
      settings: {},
      run: null,
    });
    expect(save.meta.trophies).toEqual([]);
    expect(save.meta.records.variantsBeaten).toEqual([]);
    const got = claimTrophies(save.meta).map((t) => t.id);
    expect(got).toEqual(
      expect.arrayContaining(['firstEscape', 'fiveEscapes', 'hunter', 'stubborn']),
    );
    expect(got).not.toContain('legend');
  });
});
