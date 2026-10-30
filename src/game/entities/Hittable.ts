import type { Health } from '../../core/combat/health';
import type { StatusState } from '../../core/combat/status';

/** Ce que les coups et les dons d'Ash peuvent toucher (ennemis et boss). */
export interface Hittable {
  readonly alive: boolean;
  readonly x: number;
  readonly y: number;
  readonly radius: number;
  health: Health;
  status: StatusState;
  /** Dernier coup reçu (un coup ne touche qu'une fois). */
  lastSwingId: number;
  hit(now: number, from: { x: number; y: number }, knockback: number): void;
  freeze(now: number): void;
}
