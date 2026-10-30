/** Caractéristiques de base d'Ash (avant dons et compétences). */
export const PLAYER = {
  maxHp: 50,
  radius: 6,
  /** Vitesse de déplacement (px/s) et inertie. */
  speed: 125,
  acceleration: 1600,
  deceleration: 2400,
  dash: {
    distance: 64,
    durationMs: 150,
    /** Invincibilité, un peu plus longue que le dash lui-même (généreux). */
    iframesMs: 190,
    cooldownMs: 320,
  },
  /** Invincibilité après un coup reçu. */
  hurtIframesMs: 900,
  hurtKnockback: 120,
  /** Mémoire des appuis (ms). */
  inputBufferMs: 130,
  /** Aide à la visée (tactile / manette) : cône et portée. */
  aimAssist: { coneDeg: 70, range: 140 },
} as const;
