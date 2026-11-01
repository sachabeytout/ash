/** Caractéristiques de base d'Ash (avant dons et compétences). */
export const PLAYER = {
  maxHp: 50,
  radius: 6,
  /** Vitesse de déplacement (px/s) et inertie. */
  speed: 112,
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
  /** Jauge de Super : elle se remplit en frappant et (plus vite) en étant touché. */
  superGauge: { perDamageDealt: 1 / 240, perDamageTaken: 1 / 45 },
  /**
   * Visée automatique légère des attaques (pas du dash) : un ennemi tout proche est visé même un peu
   * de côté (`near`), un ennemi plus loin seulement s'il est à peu près devant (`far`).
   */
  aimAssist: { near: { coneDeg: 150, range: 70 }, far: { coneDeg: 70, range: 140 } },
  /** Super (retour F6) : visée automatique sur l'ennemi le plus proche dans ce rayon, quelle que soit la direction. */
  superAimRange: 260,
} as const;
