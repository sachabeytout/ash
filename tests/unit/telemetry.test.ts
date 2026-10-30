import { describe, expect, it } from 'vitest';
import {
  MAX_ROOMS,
  emptyLog,
  parseLog,
  recordRoom,
  recordRunEnd,
  summarizeLog,
} from '../../src/core/telemetry';

describe('télémétrie locale', () => {
  it('moyennes par biome et causes de mort les plus fréquentes', () => {
    const log = emptyLog();
    recordRoom(log, { biome: 0, room: 1, ms: 20000, hpLost: 4 });
    recordRoom(log, { biome: 0, room: 2, ms: 30000, hpLost: 6 });
    recordRoom(log, { biome: 1, room: 1, ms: 40000, hpLost: 10 });
    recordRunEnd(log, 'Rôdeur');
    recordRunEnd(log, 'Ammit');
    recordRunEnd(log, 'Rôdeur');
    const s = summarizeLog(log);
    expect(s.biomes[0]).toEqual({ biome: 0, count: 2, avgMs: 25000, avgHpLost: 5 });
    expect(s.topDeaths[0]).toEqual(['Rôdeur', 2]);
    expect(log.runs).toBe(3);
  });

  it('le journal reste petit', () => {
    const log = emptyLog();
    for (let i = 0; i < MAX_ROOMS + 50; i++)
      recordRoom(log, { biome: 0, room: 1, ms: 1, hpLost: 0 });
    expect(log.rooms).toHaveLength(MAX_ROOMS);
  });

  it('un journal abîmé repart de zéro', () => {
    expect(parseLog('{abîmé')).toEqual(emptyLog());
    expect(parseLog(null)).toEqual(emptyLog());
  });
});
