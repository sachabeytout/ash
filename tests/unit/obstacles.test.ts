import { describe, expect, it } from 'vitest';
import {
  LAYOUT_IDS,
  WALL_GAP,
  distanceToRect,
  insideAny,
  planObstacles,
  steerAround,
  type KeepOut,
  type Rect,
} from '../../src/core/arena/obstacles';
import { createRng } from '../../src/core/rng';

const ARENA: Rect = { x: 40, y: 34, w: 560, h: 300 };
const KEEP: KeepOut[] = [
  { x: 320, y: 304, r: 48 },
  { x: 200, y: 50, r: 44 },
  { x: 320, y: 50, r: 44 },
  { x: 440, y: 50, r: 44 },
  { x: 320, y: 195, r: 44 },
];

/** Toutes les cases libres (Ash a ~8 px de rayon) sont-elles reliées à son point d'apparition ? */
function allReachable(rects: readonly Rect[]): boolean {
  const cell = 8;
  const cols = Math.floor(ARENA.w / cell);
  const rows = Math.floor(ARENA.h / cell);
  const free = (c: number, r: number) =>
    !insideAny({ x: ARENA.x + (c + 0.5) * cell, y: ARENA.y + (r + 0.5) * cell }, rects, 9);
  const seen = new Set<number>();
  const start = [Math.floor((320 - ARENA.x) / cell), Math.floor((304 - ARENA.y) / cell)] as const;
  const stack: [number, number][] = [[start[0], start[1]]];
  while (stack.length > 0) {
    const [c, r] = stack.pop() ?? [0, 0];
    if (c < 0 || r < 0 || c >= cols || r >= rows) continue;
    const key = r * cols + c;
    if (seen.has(key) || !free(c, r)) continue;
    seen.add(key);
    stack.push([c + 1, r], [c - 1, r], [c, r + 1], [c, r - 1]);
  }
  let total = 0;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) if (free(c, r)) total++;
  return seen.size === total;
}

describe('obstacles des arènes', () => {
  it('chaque disposition respecte les zones libres et les marges, et tout reste accessible', () => {
    for (const layout of LAYOUT_IDS) {
      for (let seed = 0; seed < 10; seed++) {
        const rects = planObstacles(createRng(seed), ARENA, KEEP, layout);
        for (const r of rects) {
          expect(r.x).toBeGreaterThanOrEqual(ARENA.x + WALL_GAP);
          expect(r.y).toBeGreaterThanOrEqual(ARENA.y + WALL_GAP);
          expect(r.x + r.w).toBeLessThanOrEqual(ARENA.x + ARENA.w - WALL_GAP);
          expect(r.y + r.h).toBeLessThanOrEqual(ARENA.y + ARENA.h - WALL_GAP);
          for (const k of KEEP) expect(distanceToRect(k, r)).toBeGreaterThanOrEqual(k.r);
        }
        expect(allReachable(rects)).toBe(true);
      }
    }
  });

  it('les dispositions non vides gardent leurs blocs avec les zones libres de l’arène', () => {
    for (const layout of LAYOUT_IDS) {
      if (layout === 'open') continue;
      expect(planObstacles(createRng(1), ARENA, KEEP, layout).length).toBeGreaterThan(0);
    }
  });

  it('est reproductible avec la même graine', () => {
    expect(planObstacles(createRng(7), ARENA, KEEP)).toEqual(
      planObstacles(createRng(7), ARENA, KEEP),
    );
  });

  it('un ennemi qui fonce sur un pilier le longe à la même vitesse', () => {
    const pillar: Rect = { x: 100, y: 90, w: 20, h: 20 };
    const v = steerAround({ x: 80, y: 100 }, 8, 50, 0, [pillar]);
    expect(Math.hypot(v.x, v.y)).toBeCloseTo(50);
    expect(Math.abs(v.x)).toBeLessThan(1);
    // De biais : il garde le côté vers lequel il penchait.
    const slanted = steerAround({ x: 80, y: 100 }, 8, 40, 30, [pillar]);
    expect(slanted.y).toBeGreaterThan(0);
    // Loin de l'obstacle, ou en s'éloignant : rien ne change.
    expect(steerAround({ x: 20, y: 100 }, 8, 50, 0, [pillar])).toEqual({ x: 50, y: 0 });
    expect(steerAround({ x: 80, y: 100 }, 8, -50, 0, [pillar])).toEqual({ x: -50, y: 0 });
  });
});
