import { nearestInCone, type Vec2 } from '../geometry';

/**
 * Visée du Super (retour F6, 0.66.0) : l'ennemi le plus proche dans `range`, dans toutes les
 * directions (le Super touche à coup sûr s'il y a quelqu'un à portée). Null s'il n'y a personne :
 * le Super part alors dans la direction choisie par le joueur.
 */
export function superTarget<T extends Vec2>(
  from: Vec2,
  targets: readonly T[],
  range: number,
): T | null {
  return nearestInCone(from, 0, range, 360, targets) ?? null;
}
