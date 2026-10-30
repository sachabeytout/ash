import { describe, expect, it } from 'vitest';
import { newRun } from '../../src/core/run/state';
import {
  TRIAL_BASE_MS,
  chestLoot,
  openChest,
  trialCandidates,
  trialRoom,
  trialTimeMs,
} from '../../src/core/run/trial';
import { BIOMES } from '../../src/data/biomes';

describe('épreuves de Vesper', () => {
  it('chaque biome a au moins une salle possible, jamais élite, fontaine ou trop tôt', () => {
    for (const biome of BIOMES) {
      const rooms = trialCandidates(biome);
      expect(rooms.length).toBeGreaterThan(0);
      for (const room of rooms) {
        expect(room).toBeGreaterThanOrEqual(3);
        expect(room).toBeLessThan(biome.rooms);
        expect(biome.eliteRooms).not.toContain(room);
        expect(biome.fountainRooms).not.toContain(room);
      }
    }
  });

  it('la salle-épreuve dépend de la graine et reste la même à la reprise', () => {
    const biome = BIOMES[0];
    if (!biome) throw new Error('biome manquant');
    expect(trialRoom(42, 0, biome)).toBe(trialRoom(42, 0, biome));
    const seen = new Set<number | null>();
    for (let seed = 0; seed < 40; seed++) seen.add(trialRoom(seed, 0, biome));
    expect(seen.size).toBeGreaterThan(1);
    for (const room of seen) expect(trialCandidates(biome)).toContain(room);
  });

  it('le temps accordé grandit avec le nombre d’ennemis ; l’élite compte double', () => {
    expect(trialTimeMs([])).toBe(TRIAL_BASE_MS);
    const small = trialTimeMs([['prowler', 'prowler']]);
    const big = trialTimeMs([['prowler', 'prowler'], ['prowler']]);
    expect(big).toBeGreaterThan(small);
    expect(trialTimeMs([['stalker']], 'stalker')).toBeGreaterThan(trialTimeMs([['prowler']]));
  });

  it('le coffre rapporte des éclats et de l’XP, plus dans les biomes lointains', () => {
    const run = newRun(1, 'katana', 50, 0, 'ra');
    const before = { shards: run.shards, xp: run.xp };
    openChest(run, chestLoot(0));
    expect(run.shards).toBeGreaterThan(before.shards);
    expect(run.xp).toBeGreaterThan(before.xp);
    expect(chestLoot(3).shards).toBeGreaterThan(chestLoot(0).shards);
  });
});
