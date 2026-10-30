import type { Vec2 } from '../geometry';
import type { Rng } from '../rng';

/** Rectangle aligné sur les axes (coin haut-gauche). */
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Zone à garder libre (apparition d'Ash, portes, centre pour la fontaine ou le coffre). */
export interface KeepOut {
  x: number;
  y: number;
  r: number;
}

/**
 * Dispositions d'obstacles, en fractions de l'arène (centre du bloc, taille en px).
 * Toutes laissent de larges passages : on ne doit jamais se sentir coincé.
 */
type Block = readonly [fx: number, fy: number, w: number, h: number];

export const LAYOUTS = {
  open: [],
  pillars: [
    [0.25, 0.32, 22, 22],
    [0.75, 0.32, 22, 22],
    [0.25, 0.7, 22, 22],
    [0.75, 0.7, 22, 22],
  ],
  walls: [
    [0.28, 0.42, 76, 14],
    [0.72, 0.62, 76, 14],
  ],
  columns: [
    [0.18, 0.5, 20, 20],
    [0.36, 0.5, 20, 20],
    [0.64, 0.5, 20, 20],
    [0.82, 0.5, 20, 20],
  ],
  blocks: [
    [0.15, 0.3, 34, 30],
    [0.85, 0.3, 34, 30],
    [0.33, 0.68, 28, 28],
    [0.67, 0.68, 28, 28],
  ],
  cross: [
    [0.3, 0.5, 14, 64],
    [0.7, 0.5, 14, 64],
    [0.5, 0.33, 22, 22],
  ],
} as const satisfies Record<string, readonly Block[]>;

export type LayoutId = keyof typeof LAYOUTS;
export const LAYOUT_IDS = Object.keys(LAYOUTS) as LayoutId[];

/** Marge minimale entre un obstacle et le bord de l'arène (pour toujours pouvoir passer). */
export const WALL_GAP = 30;

/**
 * Place les obstacles d'une salle : disposition tirée au hasard (parfois en miroir), puis on retire
 * tout bloc qui toucherait une zone à garder libre ou serait trop près d'un mur.
 */
export function planObstacles(
  rng: Rng,
  arena: Rect,
  keepOut: readonly KeepOut[],
  layout: LayoutId = rng.pick(LAYOUT_IDS),
): Rect[] {
  const mirror = rng.next() < 0.5;
  const rects: Rect[] = [];
  for (const [fx, fy, w, h] of LAYOUTS[layout] as readonly Block[]) {
    const cx = arena.x + arena.w * (mirror ? 1 - fx : fx);
    const cy = arena.y + arena.h * fy;
    const r = { x: cx - w / 2, y: cy - h / 2, w, h };
    if (r.x < arena.x + WALL_GAP || r.x + r.w > arena.x + arena.w - WALL_GAP) continue;
    if (r.y < arena.y + WALL_GAP || r.y + r.h > arena.y + arena.h - WALL_GAP) continue;
    if (keepOut.some((k) => distanceToRect(k, r) < k.r)) continue;
    rects.push(r);
  }
  return rects;
}

/** Distance d'un point au rectangle (0 à l'intérieur). */
export function distanceToRect(p: Vec2, r: Rect): number {
  const dx = Math.max(r.x - p.x, 0, p.x - (r.x + r.w));
  const dy = Math.max(r.y - p.y, 0, p.y - (r.y + r.h));
  return Math.hypot(dx, dy);
}

export function insideAny(p: Vec2, rects: readonly Rect[], margin = 0): boolean {
  return rects.some((r) => distanceToRect(p, r) <= margin);
}

/**
 * Contournement simple : si on avance droit vers un obstacle proche, on glisse le long de lui
 * (même vitesse), du côté où l'on penchait déjà. Évite que les ennemis restent collés à un pilier.
 */
export function steerAround(
  pos: Vec2,
  radius: number,
  vx: number,
  vy: number,
  rects: readonly Rect[],
  lookahead = 14,
): Vec2 {
  const speed = Math.hypot(vx, vy);
  if (speed === 0) return { x: vx, y: vy };
  for (const r of rects) {
    if (distanceToRect(pos, r) > radius + lookahead) continue;
    // Direction vers le point le plus proche de l'obstacle.
    const cx = Math.max(r.x, Math.min(pos.x, r.x + r.w));
    const cy = Math.max(r.y, Math.min(pos.y, r.y + r.h));
    let nx = cx - pos.x;
    let ny = cy - pos.y;
    const n = Math.hypot(nx, ny);
    if (n === 0) continue;
    nx /= n;
    ny /= n;
    const toward = vx * nx + vy * ny;
    if (toward <= 0) continue;
    // On retire la part qui fonce dans l'obstacle et on garde la vitesse en longeant.
    let tx = vx - toward * nx;
    let ty = vy - toward * ny;
    const t = Math.hypot(tx, ty);
    if (t < speed * 0.05) {
      // Droit dessus : on choisit un côté fixe (perpendiculaire).
      tx = -ny;
      ty = nx;
    } else {
      tx /= t;
      ty /= t;
    }
    return { x: tx * speed, y: ty * speed };
  }
  return { x: vx, y: vy };
}
