/** Une frappe : anticipation → coup actif → récupération. Toutes les durées en ms. */
export interface AttackStep {
  damage: number;
  windupMs: number;
  activeMs: number;
  recoveryMs: number;
  /** Portée (px) et ouverture totale (degrés) de la zone touchée. */
  range: number;
  arcDeg: number;
  /** Petit élan vers l'avant pendant le coup (px). */
  lunge: number;
  knockback: number;
  /** Arrêt sur image à l'impact (ms). */
  hitstopMs: number;
  /** Tremblement de caméra à l'impact (0 = aucun). */
  shake: number;
  /** Armes à distance : projectile(s) lancé(s) au début du coup actif (la zone `range` vaut alors 0). */
  projectile?: ProjectileSpec;
  /** Zone au sol qui explose après un délai (bâton à pierre). */
  zone?: ZoneSpec;
  /** Garde (Lame de l'Aube) : un coup reçu pendant le coup actif est annulé et déclenche la riposte. */
  parry?: { damage: number; range: number; arcDeg: number; knockback: number };
}

/** Projectile d'Ash (bâton, arbalète, disque, grappin). */
export interface ProjectileSpec {
  damage: number;
  speed: number;
  radius: number;
  /** Distance maximale (px). */
  range: number;
  /** Nombre d'ennemis traversés en plus du premier. */
  pierce: number;
  knockback: number;
  look: 'orb' | 'bolt' | 'disc' | 'chain' | 'arrow';
  /** Plusieurs projectiles en éventail (360 = tout autour). */
  count?: number;
  spreadDeg?: number;
  /** Revient vers Ash (disque) une fois sa course ou ses rebonds finis. */
  returns?: boolean;
  /**
   * Disque solaire (retours du 02/11) : il n'y en a qu'un. Tant qu'il est lancé, rappuyer sur
   * l'attaque spéciale le rappelle, et l'attaque normale devient un coup de poing (`WeaponDef.unarmed`).
   */
  recallable?: boolean;
  /** Grappin : attire les petits ennemis, ou tire Ash vers les gros. */
  grapple?: boolean;
  /** Gravures (0.68.0) : rebonds vers d'autres ennemis, division au premier impact, explosion au
   *  bout de la course, disque qui tourne sur place avant de revenir (ms). */
  bounces?: number;
  split?: number;
  explodeEnd?: { damage: number; radius: number };
  hover?: number;
}

export interface ZoneSpec {
  damage: number;
  radius: number;
  delayMs: number;
  /** Distance devant Ash (0 = autour de lui). */
  distance: number;
  knockback: number;
  /** Plusieurs zones réparties en cercle autour du point visé. */
  count?: number;
  spread?: number;
}

export type AttackPhase = 'windup' | 'active' | 'recovery' | 'done';

export function totalDuration(step: AttackStep): number {
  return step.windupMs + step.activeMs + step.recoveryMs;
}

export function phaseAt(step: AttackStep, elapsedMs: number): AttackPhase {
  if (elapsedMs < step.windupMs) return 'windup';
  if (elapsedMs < step.windupMs + step.activeMs) return 'active';
  if (elapsedMs < totalDuration(step)) return 'recovery';
  return 'done';
}

/**
 * Combo au rythme : l'enchaînement n'est accepté qu'à partir de la récupération du coup en cours
 * (marteler pendant l'anticipation ne sert à rien), et jusqu'à `comboWindowMs` après la fin du coup.
 * Renvoie l'indice du prochain coup, ou 0 si le combo repart de zéro.
 */
export function nextComboIndex(
  combo: readonly AttackStep[],
  currentIndex: number,
  elapsedMs: number,
  comboWindowMs: number,
): number {
  const step = combo[currentIndex];
  if (!step) return 0;
  const recoveryStart = step.windupMs + step.activeMs;
  const windowEnd = totalDuration(step) + comboWindowMs;
  const inRhythm = elapsedMs >= recoveryStart && elapsedMs <= windowEnd;
  if (!inRhythm) return 0;
  return (currentIndex + 1) % combo.length;
}
