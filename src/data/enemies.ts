export type EnemyId = 'prowler' | 'gunner' | 'brute' | 'stalker';

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
}

/** Charge : une bande au sol montre la trajectoire, puis l'ennemi fonce en ligne droite. */
interface ChargeAttack {
  kind: 'charge';
  triggerRange: number;
  distance: number;
  /** Largeur de la bande dangereuse (px). */
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
  attack: MeleeAttack | ShotAttack | ChargeAttack;
  /** Coût dans le « budget » d'une vague. */
  threat: number;
  /** Élite : plus coriace, marqué d'une couronne, rapporte de l'XP. */
  elite?: { xp: number };
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
};
