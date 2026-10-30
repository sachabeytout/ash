import { describe, expect, it } from 'vitest';
import { rollAffix, volatileDamage } from '../../src/core/affixes';
import { createRng } from '../../src/core/rng';
import { AFFIX_IDS, VOLATILE_BLAST } from '../../src/data/affixes';

describe('Marques de l’Oiseleur', () => {
  it('aucune marque dans les Bas-Fonds, ni sur une élite', () => {
    const rng = createRng(3);
    for (let i = 0; i < 500; i++) {
      expect(rollAffix(rng, 0, false)).toBeNull();
      expect(rollAffix(rng, 3, true)).toBeNull();
    }
  });

  it('les marques deviennent plus fréquentes avec les biomes, et toutes finissent par sortir', () => {
    const count = (biome: number) => {
      const rng = createRng(11);
      let n = 0;
      for (let i = 0; i < 2000; i++) if (rollAffix(rng, biome, false)) n++;
      return n;
    };
    expect(count(1)).toBeGreaterThan(0);
    expect(count(3)).toBeGreaterThan(count(1));
    const seen = new Set<string>();
    const rng = createRng(5);
    for (let i = 0; i < 2000; i++) {
      const a = rollAffix(rng, 3, false);
      if (a) seen.add(a);
    }
    expect(seen.size).toBe(AFFIX_IDS.length);
  });

  it('l’explosion de l’Instable est toujours annoncée au moins 0,5 s avant', () => {
    expect(VOLATILE_BLAST.delayMs).toBeGreaterThanOrEqual(500);
    expect(volatileDamage(3)).toBeGreaterThan(volatileDamage(1));
  });
});
