/** Caractéristiques de base d'Ash (avant dons et compétences). */
export const PLAYER = {
  /** 70 PV depuis la 0.62.0 (retour F3 : le jeu était trop punitif ; avant : 50). */
  maxHp: 70,
  /** Part des dégâts ennemis réellement reçue (0,75 = −25 %, retour F3, 0.62.0). Pièges et boss compris. */
  damageTakenScale: 0.75,
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
} as const;
