import { describe, expect, it } from 'vitest';
import { newRun, summarize } from '../../src/core/run/state';
import {
  DEFAULT_WORLD,
  WORLD_ORDER,
  getSector,
  getWorld,
  isWorldId,
  sectorOf,
} from '../../src/data/worlds';

describe('les mondes', () => {
  it('chaque monde a 4 secteurs : 10, 10, 10 puis 7 salles avant leur boss', () => {
    for (const id of WORLD_ORDER) {
      expect(getWorld(id).sectors.map((s) => s.rooms)).toEqual([10, 10, 10, 7]);
    }
  });

  it('Aaru reprend les secteurs actuels, dans l’ordre', () => {
    expect(getWorld('aaru').sectors.map((s) => s.id)).toEqual([
      'lowtown',
      'frostserver',
      'aviary',
      'douat',
    ]);
  });

  it('le secteur 4 reste le plus dur : sa dernière salle a le plus gros budget de vagues', () => {
    for (const id of WORLD_ORDER) {
      const peaks = getWorld(id).sectors.map(
        (s) => s.waveBudget.base + s.waveBudget.perRoom * (s.rooms - 1),
      );
      expect(Math.max(...peaks)).toBe(peaks[3]);
    }
  });

  it('les salles spéciales (élite, fontaine) existent dans chaque secteur', () => {
    for (const id of WORLD_ORDER) {
      for (const s of getWorld(id).sectors) {
        for (const room of [...s.eliteRooms, ...s.fountainRooms]) {
          expect(room).toBeGreaterThanOrEqual(1);
          expect(room).toBeLessThanOrEqual(s.rooms);
        }
      }
    }
  });

  it('un index hors limites donne le premier ou le dernier secteur', () => {
    expect(getSector('aaru', -3).id).toBe('lowtown');
    expect(getSector('aaru', 99).id).toBe('douat');
  });

  it('reconnaît les identifiants de monde', () => {
    expect(isWorldId('aaru')).toBe(true);
    expect(isWorldId('atlantide')).toBe(false);
    expect(isWorldId('toString')).toBe(false);
  });

  it('une run et son résumé savent dans quel monde ils sont', () => {
    const run = newRun(1, 'katana', 50, 0, 'ra');
    expect(run.world).toBe(DEFAULT_WORLD);
    run.biome = 2;
    const summary = summarize(run, 'death', 'x');
    expect(summary.world).toBe('aaru');
    expect(sectorOf(summary).id).toBe('aviary');
    expect(sectorOf({ biome: 3 }).id).toBe('douat');
  });
});
