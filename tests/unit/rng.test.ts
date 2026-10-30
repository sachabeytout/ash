import { describe, expect, it } from 'vitest';
import { createRng } from '../../src/core/rng';

describe('createRng', () => {
  it('donne la même suite pour la même graine', () => {
    const a = createRng(42);
    const b = createRng(42);
    const seqA = Array.from({ length: 20 }, () => a.next());
    const seqB = Array.from({ length: 20 }, () => b.next());
    expect(seqA).toEqual(seqB);
  });

  it('donne des suites différentes pour des graines différentes', () => {
    expect(createRng(1).next()).not.toEqual(createRng(2).next());
  });

  it('reste dans les bornes', () => {
    const rng = createRng(7);
    for (let i = 0; i < 1000; i++) {
      const f = rng.next();
      expect(f).toBeGreaterThanOrEqual(0);
      expect(f).toBeLessThan(1);
      const n = rng.int(3, 5);
      expect(n).toBeGreaterThanOrEqual(3);
      expect(n).toBeLessThanOrEqual(5);
    }
  });

  it('reprend exactement depuis un état sauvegardé', () => {
    const rng = createRng(123);
    rng.next();
    rng.next();
    const resumed = createRng(rng.state);
    expect(resumed.next()).toEqual(rng.next());
  });

  it('refuse de piocher dans une liste vide', () => {
    expect(() => createRng(1).pick([])).toThrow();
  });
});
