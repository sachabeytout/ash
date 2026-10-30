export type EnemyId =
  | 'prowler'
  | 'gunner'
  | 'brute'
  | 'stalker'
  | 'wolfbot'
  | 'frostcaster'
  | 'runewarden'
  | 'einherjar'
  | 'hoplite'
  | 'harpy'
  | 'oracle'
  | 'minotaur';

/** Attaque au corps à corps : télégraphe (zone qui se remplit) puis coup. */
interface MeleeAttack {
  kind: 'melee';
  triggerRange: number;
  range: number;
  arcDeg: number;
  lunge: number;
}

/** Tir : une ligne de visée s'affiche, puis le projectile part. */
interface ShotAttack {
  kind: 'shot';
  preferredDistance: number;
  projectileSpeed: number;
  projectileRadius: number;
  /** Plusieurs projectiles en éventail (une ligne de visée par projectile). */
  count?: number;
  spreadDeg?: number;
}

/** Runes : des cercles apparaissent sous Ash et autour, puis explosent. On sort des cercles. */
interface RunesAttack {
  kind: 'runes';
  triggerRange: number;
  count: number;
  radius: number;
  /** Écart des cercles autour de la position d'Ash (px). */
  spread: number;
}

/** Charge : une bande au sol montre la trajectoire, puis l'ennemi fonce en ligne droite. */
interface ChargeAttack {
  kind: 'charge';
  triggerRange: number;
  distance: number;
  /** Largeur de la bande dangereuse (px). */
  width: number;
  /** Charges enchaînées (le Minotaure), chacune réannoncée par un télégraphe plus court. */
  repeat?: number;
  repeatTelegraphMs?: number;
}

/** Rayon : une ligne fine vise Ash, se fige, puis un rayon épais part sur toute la ligne. */
interface BeamAttack {
  kind: 'beam';
  preferredDistance: number;
  length: number;
  width: number;
}

export interface EnemyDef {
  id: EnemyId;
  nameKey: string;
  maxHp: number;
  radius: number;
  speed: number;
  damage: number;
  /** Durée du télégraphe : plus l'attaque est forte, plus il est long. */
  telegraphMs: number;
  activeMs: number;
  recoveryMs: number;
  cooldownMs: number;
  /** Résistance au recul (0 = aucune, 1 = immobile). */
  poise: number;
  /** Couleur du corps (froide) ; les attaques ennemies sont toujours rouge-magenta. */
  color: number;
  attack: MeleeAttack | ShotAttack | ChargeAttack | RunesAttack | BeamAttack;
  /** Coût dans le « budget » d'une vague. */
  threat: number;
  /** Élite : plus coriace, marqué d'une couronne, rapporte de l'XP. */
  elite?: { xp: number };
  /** Bouclier frontal : les coups venus de face sont presque tous bloqués (il faut le contourner). */
  shield?: { arcDeg: number; blocked: number };
}

export const ENEMIES: Record<EnemyId, EnemyDef> = {
  prowler: {
    id: 'prowler',
    nameKey: 'enemy.prowler',
    maxHp: 30,
    radius: 7,
    speed: 70,
    damage: 7,
    telegraphMs: 550,
    activeMs: 120,
    recoveryMs: 650,
    cooldownMs: 400,
    poise: 0,
    color: 0x6b8cff,
    attack: { kind: 'melee', triggerRange: 36, range: 34, arcDeg: 110, lunge: 26 },
    threat: 1,
  },
  gunner: {
    id: 'gunner',
    nameKey: 'enemy.gunner',
    maxHp: 22,
    radius: 6,
    speed: 55,
    damage: 6,
    telegraphMs: 750,
    activeMs: 0,
    recoveryMs: 500,
    cooldownMs: 1400,
    poise: 0,
    color: 0x4de1c1,
    attack: { kind: 'shot', preferredDistance: 105, projectileSpeed: 140, projectileRadius: 3 },
    threat: 1,
  },
  brute: {
    id: 'brute',
    nameKey: 'enemy.brute',
    maxHp: 90,
    radius: 11,
    speed: 42,
    damage: 13,
    telegraphMs: 900,
    activeMs: 160,
    recoveryMs: 900,
    cooldownMs: 700,
    poise: 0.7,
    color: 0x9a6bff,
    attack: { kind: 'melee', triggerRange: 44, range: 46, arcDeg: 360, lunge: 0 },
    threat: 3,
  },
  // Élite : le Traqueur charge en ligne droite. La bande au sol montre la trajectoire : on esquive sur le côté.
  stalker: {
    id: 'stalker',
    nameKey: 'enemy.stalker',
    maxHp: 170,
    radius: 9,
    speed: 58,
    damage: 14,
    telegraphMs: 850,
    activeMs: 280,
    recoveryMs: 850,
    cooldownMs: 700,
    poise: 0.6,
    color: 0xb8a8ff,
    attack: { kind: 'charge', triggerRange: 150, distance: 170, width: 18 },
    threat: 4,
    elite: { xp: 15 },
  },

  // ---------- Givre-Serveur ----------
  // Loup-relais : rapide et fragile, chasse en meute, morsure bondissante.
  wolfbot: {
    id: 'wolfbot',
    nameKey: 'enemy.wolfbot',
    maxHp: 26,
    radius: 7,
    speed: 96,
    damage: 7,
    telegraphMs: 520,
    activeMs: 120,
    recoveryMs: 700,
    cooldownMs: 600,
    poise: 0,
    color: 0x9ab4ff,
    attack: { kind: 'melee', triggerRange: 50, range: 26, arcDeg: 90, lunge: 40 },
    threat: 1,
  },
  // Givreur : trois éclats de glace en éventail.
  frostcaster: {
    id: 'frostcaster',
    nameKey: 'enemy.frostcaster',
    maxHp: 30,
    radius: 7,
    speed: 50,
    damage: 6,
    telegraphMs: 850,
    activeMs: 0,
    recoveryMs: 600,
    cooldownMs: 1600,
    poise: 0,
    color: 0x6fd6c8,
    attack: {
      kind: 'shot',
      preferredDistance: 115,
      projectileSpeed: 120,
      projectileRadius: 3,
      count: 3,
      spreadDeg: 26,
    },
    threat: 2,
  },
  // Gardien runique : lent et solide, ses runes explosent sous les pieds.
  runewarden: {
    id: 'runewarden',
    nameKey: 'enemy.runewarden',
    maxHp: 110,
    radius: 10,
    speed: 36,
    damage: 12,
    telegraphMs: 1000,
    activeMs: 150,
    recoveryMs: 900,
    cooldownMs: 1500,
    poise: 0.8,
    color: 0x7a9cc6,
    attack: { kind: 'runes', triggerRange: 170, count: 3, radius: 18, spread: 34 },
    threat: 3,
  },
  // Élite : l'Einherjar, guerrier au bouclier. De face, presque invulnérable ; il faut le prendre à revers.
  einherjar: {
    id: 'einherjar',
    nameKey: 'enemy.einherjar',
    maxHp: 200,
    radius: 9,
    speed: 52,
    damage: 15,
    telegraphMs: 850,
    activeMs: 300,
    recoveryMs: 1100,
    cooldownMs: 600,
    poise: 0.85,
    color: 0xd0d8ff,
    attack: { kind: 'charge', triggerRange: 140, distance: 150, width: 20 },
    threat: 4,
    elite: { xp: 15 },
    shield: { arcDeg: 120, blocked: 0.15 },
  },

  // ---------- Olympe Corporatif ----------
  // Hoplite-Sécurité : estoc de lance long et étroit (on l'esquive sur le côté).
  hoplite: {
    id: 'hoplite',
    nameKey: 'enemy.hoplite',
    maxHp: 60,
    radius: 8,
    speed: 60,
    damage: 11,
    telegraphMs: 650,
    activeMs: 140,
    recoveryMs: 700,
    cooldownMs: 700,
    poise: 0.3,
    color: 0xe8d9a8,
    attack: { kind: 'melee', triggerRange: 64, range: 62, arcDeg: 30, lunge: 30 },
    threat: 2,
  },
  // Harpie-drone : pique en ligne droite sur une courte distance.
  harpy: {
    id: 'harpy',
    nameKey: 'enemy.harpy',
    maxHp: 34,
    radius: 7,
    speed: 88,
    damage: 8,
    telegraphMs: 600,
    activeMs: 200,
    recoveryMs: 750,
    cooldownMs: 800,
    poise: 0,
    color: 0x9fe0ff,
    attack: { kind: 'charge', triggerRange: 120, distance: 120, width: 14 },
    threat: 1,
  },
  // Oracle : rayon laser annoncé par une ligne fine.
  oracle: {
    id: 'oracle',
    nameKey: 'enemy.oracle',
    maxHp: 40,
    radius: 7,
    speed: 44,
    damage: 10,
    telegraphMs: 950,
    activeMs: 260,
    recoveryMs: 700,
    cooldownMs: 1700,
    poise: 0,
    color: 0xc8b8ff,
    attack: { kind: 'beam', preferredDistance: 130, length: 260, width: 12 },
    threat: 2,
  },
  // Élite : le Minotaure-Ω enchaîne trois charges ; chacune est réannoncée.
  minotaur: {
    id: 'minotaur',
    nameKey: 'enemy.minotaur',
    maxHp: 260,
    radius: 11,
    speed: 50,
    damage: 15,
    telegraphMs: 850,
    activeMs: 300,
    recoveryMs: 1200,
    cooldownMs: 800,
    poise: 0.85,
    color: 0xd8b48a,
    attack: {
      kind: 'charge',
      triggerRange: 150,
      distance: 170,
      width: 24,
      repeat: 3,
      repeatTelegraphMs: 550,
    },
    threat: 4,
    elite: { xp: 20 },
  },
};
