import type { Vec2 } from '../geometry';
import type { Rng } from '../rng';
import { distanceToRect, type KeepOut, type Rect } from './obstacles';

/**
 * Pièges des salles de combat (à partir de la 3e salle d'un monde) :
 * - trappe à pics : rester dessus trop longtemps fait sortir les pics (alerte avant) ;
 * - explosif : passer à côté allume une courte mèche (cercle d'alerte), puis il explose.
 * Les deux blessent aussi les ennemis.
 */
export const SPIKE_SIZE = 24;
/** Temps à rester sur la trappe avant que les pics sortent (l'alerte dure tout ce temps). */
export const SPIKE_ARM_MS = 650;
export const SPIKE_UP_MS = 450;
export const SPIKE_COOLDOWN_MS = 900;

export const MINE_TRIGGER_RADIUS = 30;
/** Mèche courte, mais toujours annoncée au moins 0,5 s. */
export const MINE_FUSE_MS = 700;
export const MINE_RADIUS = 40;

export function spikeDamage(biomeIndex: number): number {
  return 8 + 2 * biomeIndex;
}

export function mineDamage(biomeIndex: number): number {
  return 10 + 2 * biomeIndex;
}

/** Nombre de pièges selon la salle (jamais dans les deux premières). */
export function trapCounts(room: number, rng: Rng): { spikes: number; mines: number } {
  if (room < 3) return { spikes: 0, mines: 0 };
  const extra = room >= 6 ? 1 : 0;
  return { spikes: rng.int(0, 2) + extra, mines: room >= 4 ? rng.int(0, 1) + extra : 0 };
}

export interface TrapLayout {
  spikes: Rect[];
  mines: Vec2[];
}

/**
 * Place les pièges loin des zones libres (entrée, portes, centre), des obstacles et les uns des
 * autres. Si une place n'est pas trouvée, le piège est simplement omis.
 */
export function planTraps(
  rng: Rng,
  arena: Rect,
  keepOut: readonly KeepOut[],
  obstacles: readonly Rect[],
  counts: { spikes: number; mines: number },
): TrapLayout {
  const margin = 40;
  const taken: Vec2[] = [];
  const free = (p: Vec2, size: number): boolean =>
    keepOut.every((k) => Math.hypot(p.x - k.x, p.y - k.y) >= k.r + size) &&
    obstacles.every((o) => distanceToRect(p, o) >= size + 8) &&
    taken.every((t) => Math.hypot(p.x - t.x, p.y - t.y) >= 70);
  const pick = (size: number): Vec2 | null => {
    for (let i = 0; i < 30; i++) {
      const p = {
        x: arena.x + margin + rng.next() * (arena.w - margin * 2),
        y: arena.y + margin + rng.next() * (arena.h - margin * 2),
      };
      if (free(p, size)) {
        taken.push(p);
        return p;
      }
    }
    return null;
  };
  const spikes: Rect[] = [];
  for (let i = 0; i < counts.spikes; i++) {
    const p = pick(SPIKE_SIZE);
    if (p)
      spikes.push({
        x: p.x - SPIKE_SIZE / 2,
        y: p.y - SPIKE_SIZE / 2,
        w: SPIKE_SIZE,
        h: SPIKE_SIZE,
      });
  }
  const mines: Vec2[] = [];
  for (let i = 0; i < counts.mines; i++) {
    const p = pick(MINE_RADIUS);
    if (p) mines.push(p);
  }
  return { spikes, mines };
}

export type SpikePhase = 'idle' | 'arming' | 'up' | 'cooldown';

export interface SpikeState {
  phase: SpikePhase;
  at: number;
}

/**
 * Une étape de la trappe à pics. `occupied` : Ash est dessus. Renvoie vrai à l'instant où les pics
 * sortent (c'est là que les dégâts tombent). Quitter la trappe pendant l'alerte l'annule.
 */
export function stepSpike(s: SpikeState, now: number, occupied: boolean): boolean {
  switch (s.phase) {
    case 'idle':
      if (occupied) {
        s.phase = 'arming';
        s.at = now;
      }
      return false;
    case 'arming':
      if (!occupied) {
        s.phase = 'idle';
        return false;
      }
      if (now - s.at < SPIKE_ARM_MS) return false;
      s.phase = 'up';
      s.at = now;
      return true;
    case 'up':
      if (now - s.at >= SPIKE_UP_MS) {
        s.phase = 'cooldown';
        s.at = now;
      }
      return false;
    case 'cooldown':
      if (now - s.at >= SPIKE_COOLDOWN_MS) s.phase = 'idle';
      return false;
  }
}
