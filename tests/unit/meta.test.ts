import { describe, expect, it } from 'vitest';
import { buySkill, nextCost, runBonuses, skillLevel } from '../../src/core/meta';
import { defaultMeta } from '../../src/core/save/schema';
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
