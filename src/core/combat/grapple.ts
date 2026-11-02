import { angleDelta, nearestInCone, type Vec2 } from '../geometry';

/** Cible du grappin, et si elle est devant (le grappin part alors dans la direction visée). */
export interface GrappleAim<T extends Vec2> {
  target: T;
  ahead: boolean;
}

/**
 * Grappin (retour du 02/11) : l'ennemi le plus proche dans le cône `coneDeg` devant (direction `aim`),
 * sinon le plus proche tout autour, jusqu'à `range`. Null s'il n'y a personne à portée.
 */
export function grappleTarget<T extends Vec2>(
  from: Vec2,
  aim: number,
  targets: readonly T[],
  range: number,
  coneDeg: number,
): GrappleAim<T> | null {
  const ahead = nearestInCone(from, aim, range, coneDeg, targets);
  if (ahead) return { target: ahead, ahead: true };
  const around = nearestInCone(from, aim, range, 360, targets);
  return around ? { target: around, ahead: false } : null;
}

/** Direction de départ du grappin : celle visée si la cible est devant, sinon droit sur la cible. */
export function grappleLaunchAngle(from: Vec2, aim: number, chosen: GrappleAim<Vec2>): number {
  return chosen.ahead ? aim : Math.atan2(chosen.target.y - from.y, chosen.target.x - from.x);
}

/**
 * Courbe le vol d'un projectile vers sa cible : la direction tourne d'au plus `maxTurn` radians,
 * la vitesse ne change pas. Tout près de la cible, il fonce droit dessus (il ne peut plus la rater).
 */
export function steerToward(
  vx: number,
  vy: number,
  from: Vec2,
  to: Vec2,
  maxTurn: number,
  snapDistance = 24,
): { vx: number; vy: number } {
  const speed = Math.hypot(vx, vy);
  if (speed === 0) return { vx, vy };
  const want = Math.atan2(to.y - from.y, to.x - from.x);
  const dist = Math.hypot(to.x - from.x, to.y - from.y);
  const current = Math.atan2(vy, vx);
  let angle = want;
  if (dist > snapDistance && angleDelta(current, want) > maxTurn) {
    // Tourne du côté le plus court, d'au plus `maxTurn`.
    const diff = Math.atan2(Math.sin(want - current), Math.cos(want - current));
    angle = current + Math.sign(diff) * maxTurn;
  }
  return { vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed };
}
