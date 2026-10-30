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
}

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
  },
  twinBlades: {
    id: 'twinBlades',
    nameKey: 'weapon.twinBlades',
    color: 0x9ff6ff,
    comboWindowMs: 200,
    combo: [
      {
        damage: 6,
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
        damage: 6,
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
        damage: 6,
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
        damage: 14,
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
      damage: 18,
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
  },
};
