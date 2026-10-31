import { describe, expect, it } from 'vitest';
import { buySkill, nextCost, runBonuses, skillLevel, updateRecords } from '../../src/core/meta';
import { defaultMeta } from '../../src/core/save/schema';
import { newRun } from '../../src/core/run/state';
import { migrate } from '../../src/core/save/migrations';
import { SKILLS } from '../../src/data/skills';
import { allDictionaries } from '../../src/i18n';

const vigor = SKILLS.find((s) => s.id === 'thoth_vigor');
if (!vigor) throw new Error('compétence manquante');

describe('arbre de Thot', () => {
  it('chaque compétence a des textes et des coûts croissants', () => {
    expect(new Set(SKILLS.map((s) => s.id)).size).toBe(SKILLS.length);
    for (const s of SKILLS) {
      for (const dict of Object.values(allDictionaries)) {
        expect(dict[s.nameKey], s.nameKey).toBeDefined();
        expect(dict[s.descKey], s.descKey).toBeDefined();
      }
      s.costs.forEach((c, i) => {
        if (i > 0) expect(c).toBeGreaterThan(s.costs[i - 1] ?? 0);
      });
    }
  });

  it("achète un niveau si l'XP suffit, sinon rien ne change", () => {
    const meta = defaultMeta();
    meta.xp = 29;
    expect(buySkill(meta, vigor)).toBe(false);
    expect(meta.xp).toBe(29);
    meta.xp = 95;
    expect(buySkill(meta, vigor)).toBe(true);
    expect(meta.xp).toBe(65);
    expect(skillLevel(meta, vigor)).toBe(1);
    expect(nextCost(meta, vigor)).toBe(60);
  });

  it('niveau maximum', () => {
    const meta = defaultMeta();
    meta.xp = 10_000;
    while (buySkill(meta, vigor));
    expect(skillLevel(meta, vigor)).toBe(vigor.costs.length);
    expect(nextCost(meta, vigor)).toBeNull();
  });

  it('les compétences se retrouvent dans la run', () => {
    const meta = defaultMeta();
    meta.skills = { thoth_vigor: 2, thoth_edge: 1, thoth_embers: 1, thoth_spark: 2 };
    const b = runBonuses(meta);
    expect(b.maxHpBonus).toBe(16);
    expect(b.perks.damage).toBeCloseTo(0.05);
    expect(b.perks.healPerRoom).toBe(3);
    expect(b.superStart).toBeCloseTo(0.5);
  });
});

describe('nouvelles compétences de Thot (0.27.0)', () => {
  it('bourse, pas de l’ibis et renaissance passent dans la run', () => {
    const meta = defaultMeta();
    meta.skills = { thoth_purse: 2, thoth_ibis: 1, thoth_rebirth: 1 };
    const { perks } = runBonuses(meta);
    expect(perks.startShards).toBe(30);
    expect(perks.dashCooldown).toBeCloseTo(0.1);
    expect(perks.revives).toBe(1);
    const run = newRun(1, 'katana', 50, 0, 'ra', perks);
    expect(run.shards).toBe(30);
    expect(run.revivesUsed).toBe(0);
  });

  it('une run v10 passe en v11 sans renaissance ni bonus nouveaux', () => {
    const run = newRun(9, 'katana', 50, 0, 'ra') as unknown as Record<string, unknown>;
    delete run.revivesUsed;
    run.perks = { damage: 0.05, healPerRoom: 0, rareBonus: 0 };
    const save = migrate({ version: 10, meta: {}, settings: {}, run });
    expect(save.run?.revivesUsed).toBe(0);
    expect(save.run?.perks.damage).toBe(0.05);
    expect(save.run?.perks.revives).toBe(0);
  });
});

describe('Exploits (0.28.0)', () => {
  it('les records se mettent à jour à la fin des runs', () => {
    const meta = defaultMeta();
    const base = { biome: 0, room: 3, xp: 0, weaponParts: 0 } as const;
    updateRecords(meta, { ...base, outcome: 'death', elapsedMs: 50000, rooms: 7, kills: 20 });
    updateRecords(meta, {
      ...base,
      outcome: 'cleared',
      elapsedMs: 900000,
      rooms: 41,
      kills: 150,
      weapon: 'katana',
    });
    updateRecords(meta, {
      ...base,
      outcome: 'cleared',
      elapsedMs: 800000,
      rooms: 41,
      kills: 140,
      weapon: 'katana',
    });
    expect(meta.records.bestRooms).toBe(41);
    expect(meta.records.totalKills).toBe(310);
    expect(meta.records.fastestClearMs).toBe(800000);
    expect(meta.records.clearsByWeapon.katana).toBe(2);
  });

  it('une sauvegarde v11 passe en v12 avec des records vides', () => {
    const save = migrate({ version: 11, meta: { xp: 5 }, settings: {}, run: null });
    expect(save.meta.xp).toBe(5);
    expect(save.meta.records).toEqual({
      bestRooms: 0,
      fastestClearMs: 0,
      totalKills: 0,
      clearsByWeapon: {},
      bestHeatClear: 0,
      variantsBeaten: [],
    });
  });
});
