import { PLAYER } from '../../data/player';

/** Remplit la jauge de Super (0 à 1) selon les dégâts infligés et reçus. */
export function gainSuper(gauge: number, dealt: number, taken = 0): number {
  const gain = dealt * PLAYER.superGauge.perDamageDealt + taken * PLAYER.superGauge.perDamageTaken;
  return Math.min(1, gauge + gain);
}

export function superReady(gauge: number): boolean {
  return gauge >= 1;
}
