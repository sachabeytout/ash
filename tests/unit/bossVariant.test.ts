import { describe, expect, it } from 'vitest';
import { bossFor, variantUnlocked } from '../../src/core/bossVariant';
import { defaultMeta } from '../../src/core/save/schema';
import { BOSSES } from '../../src/data/bosses';
import { BOSS_VARIANTS } from '../../src/data/bossVariants';
import fr from '../../src/i18n/fr.json';
import en from '../../src/i18n/en.json';

describe('variantes de boss', () => {
  it('jamais de variante tant que le boss n’a pas été battu', () => {
    const meta = defaultMeta();
    expect(variantUnlocked(meta, 'ammit')).toBe(false);
    for (let seed = 0; seed < 30; seed++)
      expect(bossFor(meta, 'ammit', seed, 0)).toBe(BOSSES.ammit);
  });

  it('une fois débloquée, la variante sort au hasard (et reste la même pour une run)', () => {
    const meta = defaultMeta();
    meta.codex['boss.ammit'] = 1;
    const picks = new Set<string>();
    for (let seed = 0; seed < 40; seed++) {
      const def = bossFor(meta, 'ammit', seed, 0);
      expect(bossFor(meta, 'ammit', seed, 0)).toBe(def);
      picks.add(def.nameKey);
    }
    expect(picks.size).toBe(2);
  });

  it('chaque variante a plus de vie, au moins une attaque en plus et un nom traduit', () => {
    for (const [id, v] of Object.entries(BOSS_VARIANTS)) {
      const base = BOSSES[id as keyof typeof BOSSES];
      expect(v.maxHp).toBeGreaterThan(base.maxHp);
      const attacks = (d: typeof v) => Object.keys(d.weights[2]).length;
      expect(attacks(v)).toBeGreaterThan(attacks(base));
      expect(fr).toHaveProperty(v.nameKey);
      expect(en).toHaveProperty(v.nameKey);
      // Chaque attaque tirée a bien ses réglages.
      for (const atk of Object.keys(v.weights[2])) expect(v).toHaveProperty(atk);
    }
  });
});
