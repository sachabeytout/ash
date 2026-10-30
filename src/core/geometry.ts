export interface Vec2 {
  x: number;
  y: number;
}

export function length(v: Vec2): number {
  return Math.hypot(v.x, v.y);
}

/** Vecteur de longueur 1 (ou nul si le vecteur est nul). */
export function normalize(v: Vec2): Vec2 {
  const len = length(v);
  return len > 0 ? { x: v.x / len, y: v.y / len } : { x: 0, y: 0 };
}

/** Écart entre deux angles, ramené dans [0, π]. */
export function angleDelta(a: number, b: number): number {
  const d = Math.abs(a - b) % (Math.PI * 2);
  return d > Math.PI ? Math.PI * 2 - d : d;
}

/**
 * Une cible circulaire est-elle touchée par un arc d'attaque ?
 * L'arc part de `origin`, regarde vers `facing` (radians), a une portée et une ouverture totale (degrés).
 */
export function hitsArc(
  origin: Vec2,
  facing: number,
  range: number,
  arcDeg: number,
  target: Vec2,
  targetRadius: number,
): boolean {
  const dx = target.x - origin.x;
  const dy = target.y - origin.y;
  const dist = Math.hypot(dx, dy);
  if (dist > range + targetRadius) return false;
  if (dist <= targetRadius) return true; // collé au joueur : touché quel que soit l'angle
  // La cible a une largeur : on élargit l'arc de l'angle qu'elle occupe vu du joueur.
  const halfArc = (arcDeg * Math.PI) / 360 + Math.asin(Math.min(1, targetRadius / dist));
  return angleDelta(Math.atan2(dy, dx), facing) <= halfArc;
}

/** Parmi des cibles, la plus proche dans un cône (aide à la visée). */
export function nearestInCone<T extends Vec2>(
  origin: Vec2,
  facing: number,
  maxRange: number,
  coneDeg: number,
  targets: readonly T[],
): T | undefined {
  let best: T | undefined;
  let bestDist = Infinity;
  const half = (coneDeg * Math.PI) / 360;
  for (const t of targets) {
    const dist = Math.hypot(t.x - origin.x, t.y - origin.y);
    if (dist > maxRange || dist >= bestDist) continue;
    if (angleDelta(Math.atan2(t.y - origin.y, t.x - origin.x), facing) > half) continue;
    best = t;
    bestDist = dist;
  }
  return best;
}
