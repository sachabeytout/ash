import type { AttackStep } from '../core/combat/attack';

export type WeaponId =
  'katana' | 'twinBlades' | 'staff' | 'crossbow' | 'disc' | 'chain' | 'dawnblade';

/** Ordre d'affichage dans la Cage (touches 1 à 6). */
export const WEAPON_ORDER: readonly WeaponId[] = [
  'katana',
  'twinBlades',
  'staff',
  'crossbow',
  'disc',
  'chain',
  'dawnblade',
];

export interface WeaponDef {
  id: WeaponId;
  nameKey: string;
  /** Couleur du tranchant (couleurs chaudes réservées au joueur). */
  color: number;
  combo: readonly AttackStep[];
  /** Temps laissé après un coup pour enchaîner le suivant. */
  comboWindowMs: number;
  power: AttackStep;
  /** Super : suite de coups joués d'un trait, Ash est invincible pendant toute la durée. */
  superNameKey: string;
  super: readonly AttackStep[];
}

/** Un tour du tourbillon du Super des doubles lames. */
const STORM_SPIN: AttackStep = {
  damage: 9,
  windupMs: 0,
  activeMs: 70,
  recoveryMs: 40,
  range: 48,
  arcDeg: 360,
  lunge: 0,
  knockback: 50,
  hitstopMs: 18,
  shake: 0,
};

/** Coup « à distance » : pas de zone de frappe, le projectile ou la zone fait les dégâts. */
function ranged(
  timing: { windupMs: number; activeMs: number; recoveryMs: number },
  extra: Pick<AttackStep, 'projectile' | 'zone'> & {
    lunge?: number;
    hitstopMs?: number;
    shake?: number;
  },
): AttackStep {
  return {
    damage: 0,
    range: 0,
    arcDeg: 0,
    knockback: 0,
    lunge: extra.lunge ?? 0,
    hitstopMs: extra.hitstopMs ?? 30,
    shake: extra.shake ?? 0,
    ...timing,
    ...(extra.projectile ? { projectile: extra.projectile } : {}),
    ...(extra.zone ? { zone: extra.zone } : {}),
  };
}

const ORB = {
  damage: 9,
  speed: 260,
  radius: 4,
  range: 220,
  pierce: 0,
  knockback: 40,
  look: 'orb',
} as const;
const BOLT = {
  damage: 8,
  speed: 430,
  radius: 3,
  range: 300,
  pierce: 0,
  knockback: 30,
  look: 'bolt',
} as const;
const DISC = {
  damage: 14,
  speed: 300,
  radius: 6,
  range: 150,
  pierce: 99,
  knockback: 60,
  look: 'disc',
  returns: true,
} as const;
const LASH: AttackStep = {
  damage: 12,
  windupMs: 80,
  activeMs: 70,
  recoveryMs: 190,
  range: 58,
  arcDeg: 40,
  lunge: 4,
  knockback: 60,
  hitstopMs: 40,
  shake: 0,
};
const WHIRL: AttackStep = {
  damage: 14,
  windupMs: 0,
  activeMs: 90,
  recoveryMs: 50,
  range: 70,
  arcDeg: 360,
  lunge: 0,
  knockback: 60,
  hitstopMs: 20,
  shake: 0,
};

export const WEAPONS: Record<WeaponId, WeaponDef> = {
  katana: {
    id: 'katana',
    nameKey: 'weapon.katana',
    color: 0xffd9a0,
    comboWindowMs: 260,
    combo: [
      {
        damage: 11,
        windupMs: 70,
        activeMs: 70,
        recoveryMs: 170,
        range: 30,
        arcDeg: 150,
        lunge: 8,
        knockback: 70,
        hitstopMs: 45,
        shake: 0,
      },
      {
        damage: 11,
        windupMs: 70,
        activeMs: 70,
        recoveryMs: 170,
        range: 30,
        arcDeg: 150,
        lunge: 8,
        knockback: 70,
        hitstopMs: 45,
        shake: 0,
      },
      {
        damage: 22,
        windupMs: 140,
        activeMs: 90,
        recoveryMs: 300,
        range: 36,
        arcDeg: 200,
        lunge: 16,
        knockback: 190,
        hitstopMs: 85,
        shake: 0.004,
      },
    ],
    // Estoc : anticipation plus longue, longue portée étroite qui traverse les ennemis.
    power: {
      damage: 34,
      windupMs: 260,
      activeMs: 110,
      recoveryMs: 320,
      range: 70,
      arcDeg: 34,
      lunge: 42,
      knockback: 230,
      hitstopMs: 90,
      shake: 0.006,
    },
    // Taille de l'Aube : Ash fonce en avant et tranche tout sur son passage.
    superNameKey: 'super.katana',
    super: [
      {
        damage: 55,
        windupMs: 140,
        activeMs: 170,
        recoveryMs: 260,
        range: 52,
        arcDeg: 120,
        lunge: 110,
        knockback: 260,
        hitstopMs: 110,
        shake: 0.008,
      },
    ],
  },
  twinBlades: {
    id: 'twinBlades',
    nameKey: 'weapon.twinBlades',
    color: 0x9ff6ff,
    comboWindowMs: 200,
    combo: [
      {
        damage: 7,
        windupMs: 40,
        activeMs: 50,
        recoveryMs: 100,
        range: 24,
        arcDeg: 120,
        lunge: 6,
        knockback: 30,
        hitstopMs: 25,
        shake: 0,
      },
      {
        damage: 7,
        windupMs: 40,
        activeMs: 50,
        recoveryMs: 100,
        range: 24,
        arcDeg: 120,
        lunge: 6,
        knockback: 30,
        hitstopMs: 25,
        shake: 0,
      },
      {
        damage: 7,
        windupMs: 40,
        activeMs: 50,
        recoveryMs: 100,
        range: 24,
        arcDeg: 120,
        lunge: 6,
        knockback: 30,
        hitstopMs: 25,
        shake: 0,
      },
      {
        damage: 17,
        windupMs: 80,
        activeMs: 70,
        recoveryMs: 220,
        range: 28,
        arcDeg: 180,
        lunge: 12,
        knockback: 140,
        hitstopMs: 60,
        shake: 0.003,
      },
    ],
    // Tourbillon : frappe tout autour d'Ash.
    power: {
      damage: 22,
      windupMs: 160,
      activeMs: 160,
      recoveryMs: 260,
      range: 38,
      arcDeg: 360,
      lunge: 0,
      knockback: 160,
      hitstopMs: 60,
      shake: 0.004,
    },
    // Tempête de lames : cinq tours de tourbillon, le dernier repousse tout.
    superNameKey: 'super.twinBlades',
    super: [
      { ...STORM_SPIN, windupMs: 110 },
      STORM_SPIN,
      STORM_SPIN,
      STORM_SPIN,
      {
        ...STORM_SPIN,
        damage: 20,
        range: 56,
        knockback: 220,
        hitstopMs: 70,
        recoveryMs: 220,
        shake: 0.006,
      },
    ],
  },
  // Bâton à pierre : orbes à distance ; la puissante fait exploser une zone au sol devant Ash.
  staff: {
    id: 'staff',
    nameKey: 'weapon.staff',
    color: 0xffd27a,
    comboWindowMs: 260,
    combo: [
      ranged({ windupMs: 90, activeMs: 40, recoveryMs: 200 }, { projectile: ORB }),
      ranged({ windupMs: 90, activeMs: 40, recoveryMs: 200 }, { projectile: ORB }),
      ranged(
        { windupMs: 140, activeMs: 50, recoveryMs: 300 },
        { projectile: { ...ORB, damage: 12, count: 3, spreadDeg: 24 } },
      ),
    ],
    power: ranged(
      { windupMs: 280, activeMs: 60, recoveryMs: 300 },
      {
        zone: { damage: 30, radius: 34, delayMs: 450, distance: 70, knockback: 160 },
        shake: 0.004,
      },
    ),
    superNameKey: 'super.staff',
    super: [
      ranged(
        { windupMs: 150, activeMs: 60, recoveryMs: 500 },
        {
          zone: {
            damage: 36,
            radius: 30,
            delayMs: 350,
            distance: 0,
            knockback: 180,
            count: 6,
            spread: 62,
          },
          shake: 0.006,
        },
      ),
    ],
  },
  // Arbalète : carreaux rapides ; la puissante, chargée, traverse les ennemis.
  crossbow: {
    id: 'crossbow',
    nameKey: 'weapon.crossbow',
    color: 0xff9f6a,
    comboWindowMs: 220,
    combo: [
      ranged({ windupMs: 50, activeMs: 30, recoveryMs: 150 }, { projectile: BOLT }),
      ranged({ windupMs: 50, activeMs: 30, recoveryMs: 150 }, { projectile: BOLT }),
    ],
    power: ranged(
      { windupMs: 380, activeMs: 40, recoveryMs: 260 },
      {
        projectile: { ...BOLT, damage: 36, speed: 540, pierce: 5, range: 360, knockback: 120 },
        shake: 0.003,
      },
    ),
    superNameKey: 'super.crossbow',
    super: [
      ranged(
        { windupMs: 160, activeMs: 40, recoveryMs: 450 },
        { projectile: { ...BOLT, damage: 16, pierce: 2, count: 9, spreadDeg: 90 }, shake: 0.005 },
      ),
    ],
  },
  // Disque d'Hélios : il part et revient ; le rattraper renforce le lancer suivant.
  disc: {
    id: 'disc',
    nameKey: 'weapon.disc',
    color: 0xffe08a,
    comboWindowMs: 260,
    combo: [ranged({ windupMs: 80, activeMs: 40, recoveryMs: 260 }, { projectile: DISC })],
    power: ranged(
      { windupMs: 260, activeMs: 50, recoveryMs: 320 },
      { projectile: { ...DISC, damage: 26, radius: 9, range: 200, knockback: 140 } },
    ),
    superNameKey: 'super.disc',
    super: [
      ranged(
        { windupMs: 150, activeMs: 50, recoveryMs: 600 },
        { projectile: { ...DISC, damage: 20, count: 8, spreadDeg: 360 }, shake: 0.005 },
      ),
    ],
  },
  // Gleipnir : chaîne de plasma ; fouet long, et grappin en attaque puissante.
  chain: {
    id: 'chain',
    nameKey: 'weapon.chain',
    color: 0xffb86a,
    comboWindowMs: 240,
    combo: [
      LASH,
      LASH,
      { ...LASH, damage: 18, range: 66, arcDeg: 60, recoveryMs: 280, knockback: 150, shake: 0.003 },
    ],
    power: ranged(
      { windupMs: 150, activeMs: 40, recoveryMs: 280 },
      {
        projectile: {
          damage: 14,
          speed: 480,
          radius: 5,
          range: 200,
          pierce: 0,
          knockback: 0,
          look: 'chain',
          grapple: true,
        },
      },
    ),
    superNameKey: 'super.chain',
    super: [
      { ...WHIRL, windupMs: 120 },
      WHIRL,
      WHIRL,
      WHIRL,
      { ...WHIRL, damage: 28, range: 76, knockback: 220, recoveryMs: 260, shake: 0.006 },
    ],
  },
  // Lame de l'Aube (légendaire, 5e victoire) : épée longue, lente et lourde ; la puissante est une garde.
  dawnblade: {
    id: 'dawnblade',
    nameKey: 'weapon.dawnblade',
    color: 0xfff0c0,
    comboWindowMs: 300,
    combo: [
      {
        damage: 20,
        windupMs: 150,
        activeMs: 90,
        recoveryMs: 280,
        range: 44,
        arcDeg: 170,
        lunge: 10,
        knockback: 160,
        hitstopMs: 70,
        shake: 0.003,
      },
      {
        damage: 20,
        windupMs: 150,
        activeMs: 90,
        recoveryMs: 280,
        range: 44,
        arcDeg: 170,
        lunge: 10,
        knockback: 160,
        hitstopMs: 70,
        shake: 0.003,
      },
      {
        damage: 36,
        windupMs: 220,
        activeMs: 110,
        recoveryMs: 360,
        range: 50,
        arcDeg: 200,
        lunge: 18,
        knockback: 260,
        hitstopMs: 100,
        shake: 0.006,
      },
    ],
    // Garde : pendant 0,36 s, un coup reçu est annulé et Ash riposte (dégâts énormes autour de lui).
    power: {
      damage: 0,
      windupMs: 40,
      activeMs: 360,
      recoveryMs: 260,
      range: 0,
      arcDeg: 0,
      lunge: 0,
      knockback: 0,
      hitstopMs: 0,
      shake: 0,
      parry: { damage: 70, range: 64, arcDeg: 240, knockback: 280 },
    },
    superNameKey: 'super.dawnblade',
    super: [
      {
        damage: 90,
        windupMs: 200,
        activeMs: 160,
        recoveryMs: 400,
        range: 96,
        arcDeg: 360,
        lunge: 0,
        knockback: 300,
        hitstopMs: 140,
        shake: 0.01,
      },
    ],
  },
};
