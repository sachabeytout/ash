import type { AttackStep } from '../core/combat/attack';

export type WeaponId = 'katana' | 'twinBlades';

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
};
