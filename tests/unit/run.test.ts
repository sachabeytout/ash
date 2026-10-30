import { describe, expect, it } from 'vitest';
import { REWARD_KINDS, rollDoorRewards } from '../../src/core/run/rewards';
import { planWaves } from '../../src/core/run/waves';
import { createRng } from '../../src/core/rng';
import { BIOMES, getBiome } from '../../src/data/biomes';
import { BOSSES } from '../../src/data/bosses';
import { afterBoss, depth, newRun, roomKind, summarize } from '../../src/core/run/state';
import { ENEMIES } from '../../src/data/enemies';

const biome = getBiome(0);
const threat = (id: keyof typeof ENEMIES) => ENEMIES[id].threat;

describe('vagues d’ennemis', () => {
  it('la première salle ne contient que des ennemis de base', () => {
    for (let seed = 0; seed < 50; seed++) {
      const waves = planWaves(biome, 1, threat, createRng(seed));
      expect(waves.length).toBeGreaterThan(0);
      expect(waves.flat().every((id) => id === 'prowler')).toBe(true);
    }
  });

  it('la menace grandit avec la profondeur', () => {
    const total = (room: number) => {
      let sum = 0;
      for (let seed = 0; seed < 100; seed++) {
        sum += planWaves(biome, room, threat, createRng(seed))
          .flat()
          .reduce((s, id) => s + threat(id), 0);
      }
      return sum;
    };
    expect(total(10)).toBeGreaterThan(total(1) * 2);
  });

  it('est reproductible avec la même graine', () => {
    expect(planWaves(biome, 6, threat, createRng(9))).toEqual(
      planWaves(biome, 6, threat, createRng(9)),
    );
  });
});

describe('récompenses des portes', () => {
  it('propose des récompenses différentes et valides', () => {
    for (let seed = 0; seed < 100; seed++) {
      const r = rollDoorRewards(createRng(seed), 2);
      expect(r).toHaveLength(2);
      expect(new Set(r).size).toBe(2);
      r.forEach((k) => expect(REWARD_KINDS).toContain(k));
    }
  });

  it('les 5 types finissent tous par sortir', () => {
    const seen = new Set<string>();
    const rng = createRng(1);
    for (let i = 0; i < 200; i++) rollDoorRewards(rng, 2).forEach((k) => seen.add(k));
    expect(seen.size).toBe(5);
  });
});

describe('données', () => {
  it('les ennemis du biome existent', () => {
    biome.roster.forEach((r) => expect(ENEMIES[r.enemy]).toBeDefined());
  });
});

describe('élite', () => {
  it('ouvre la première vague des salles d’élite, et seulement elles', () => {
    for (let seed = 0; seed < 30; seed++) {
      for (let room = 1; room <= biome.rooms; room++) {
        const waves = planWaves(biome, room, threat, createRng(seed));
        const hasElite = waves.flat().includes(biome.elite);
        expect(hasElite).toBe(biome.eliteRooms.includes(room));
        if (hasElite) expect(waves[0]?.[0]).toBe(biome.elite);
      }
    }
  });

  it('l’élite est marquée comme telle et rapporte de l’XP', () => {
    expect(ENEMIES[biome.elite].elite?.xp).toBeGreaterThan(0);
  });
});

describe('enchaînement des biomes', () => {
  it('salle 0 = marchand, 1…N = combat, N + 1 = boss', () => {
    const run = newRun(1, 'katana', 50, 0, 'ra');
    run.room = 0;
    expect(roomKind(run, biome)).toBe('shop');
    run.room = 1;
    expect(roomKind(run, biome)).toBe('combat');
    run.room = biome.rooms + 1;
    expect(roomKind(run, biome)).toBe('boss');
  });

  it('après le boss : marchand du biome suivant, puis victoire au dernier biome', () => {
    const run = newRun(1, 'katana', 50, 0, 'ra');
    run.room = biome.rooms + 1;
    expect(afterBoss(run, BIOMES.length)).toBe('nextBiome');
    expect(run.biome).toBe(1);
    expect(run.room).toBe(0);
    run.room = getBiome(1).rooms + 1;
    expect(afterBoss(run, BIOMES.length)).toBe(BIOMES.length > 2 ? 'nextBiome' : 'cleared');
  });

  it("l'XP de fin de run compte les salles des biomes précédents", () => {
    const run = newRun(1, 'katana', 50, 0, 'ra');
    run.biome = 1;
    run.room = 3;
    expect(depth(run)).toBe(14);
    expect(summarize(run, 'death').xp).toBe(28);
    expect(summarize(run, 'death').biome).toBe(1);
  });

  it('chaque biome référence des ennemis, un élite et un boss qui existent', () => {
    for (const b of BIOMES) {
      b.roster.forEach((r) => expect(ENEMIES[r.enemy], b.id).toBeDefined());
      expect(ENEMIES[b.elite].elite, b.id).toBeDefined();
      expect(BOSSES[b.boss], b.id).toBeDefined();
    }
  });
});
