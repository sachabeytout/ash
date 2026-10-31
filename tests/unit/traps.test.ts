import { describe, expect, it } from 'vitest';
import { distanceToRect, type KeepOut, type Rect } from '../../src/core/arena/obstacles';
import {
  MINE_FUSE_MS,
  SPIKE_ARM_MS,
  SPIKE_COOLDOWN_MS,
  SPIKE_UP_MS,
  planTraps,
  stepSpike,
  trapCounts,
  type SpikeState,
} from '../../src/core/arena/traps';
import { createRng } from '../../src/core/rng';

const ARENA: Rect = { x: 40, y: 34, w: 560, h: 300 };
const KEEP: KeepOut[] = [
  { x: 320, y: 304, r: 48 },
  { x: 320, y: 50, r: 44 },
  { x: 320, y: 194, r: 44 },
];

describe('pièges', () => {
  it('jamais de piège dans les deux premières salles', () => {
    for (let seed = 0; seed < 20; seed++) {
      expect(trapCounts(1, createRng(seed))).toEqual({ spikes: 0, mines: 0 });
      expect(trapCounts(2, createRng(seed))).toEqual({ spikes: 0, mines: 0 });
    }
  });

  it('les pièges évitent les zones libres et les obstacles', () => {
    const obstacles: Rect[] = [{ x: 150, y: 120, w: 30, h: 30 }];
    for (let seed = 0; seed < 30; seed++) {
      const layout = planTraps(createRng(seed), ARENA, KEEP, obstacles, { spikes: 2, mines: 2 });
      const centers = [
        ...layout.spikes.map((r) => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 })),
        ...layout.mines,
      ];
      for (const c of centers) {
        for (const k of KEEP) expect(Math.hypot(c.x - k.x, c.y - k.y)).toBeGreaterThanOrEqual(k.r);
        for (const o of obstacles) expect(distanceToRect(c, o)).toBeGreaterThan(8);
      }
    }
  });

  it('un simple passage enclenche la trappe : les pics sortent après l’alerte, puis elle se recharge', () => {
    const s: SpikeState = { phase: 'idle', at: 0 };
    expect(stepSpike(s, 0, true)).toBe(false);
    // Ash est déjà reparti : l'alerte continue quand même.
    expect(stepSpike(s, SPIKE_ARM_MS - 1, false)).toBe(false);
    expect(s.phase).toBe('arming');
    expect(stepSpike(s, SPIKE_ARM_MS, false)).toBe(true);
    stepSpike(s, SPIKE_ARM_MS + SPIKE_UP_MS, false);
    stepSpike(s, SPIKE_ARM_MS + SPIKE_UP_MS + SPIKE_COOLDOWN_MS, false);
    expect(s.phase).toBe('idle');
    stepSpike(s, 1000, true);
    expect(stepSpike(s, 1000 + SPIKE_ARM_MS, true)).toBe(true);
    expect(s.phase).toBe('up');
    stepSpike(s, 1000 + SPIKE_ARM_MS + SPIKE_UP_MS, true);
    expect(s.phase).toBe('cooldown');
    stepSpike(s, 1000 + SPIKE_ARM_MS + SPIKE_UP_MS + SPIKE_COOLDOWN_MS, true);
    expect(s.phase).toBe('idle');
  });

  it('les pièges sont toujours annoncés au moins 0,5 s avant de frapper', () => {
    expect(SPIKE_ARM_MS).toBeGreaterThanOrEqual(500);
    expect(MINE_FUSE_MS).toBeGreaterThanOrEqual(500);
  });
});
