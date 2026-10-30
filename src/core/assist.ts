/**
 * Bénédiction du Phénix (mode assistance, sans jugement) : les dégâts reçus baissent de 20 %,
 * puis de 2 % de plus à chaque mort tant qu'il reste activé, jusqu'à 80 %.
 */
export const ASSIST = { base: 0.2, perDeath: 0.02, max: 0.8 } as const;

export function assistReduction(enabled: boolean, deathsWhileOn: number): number {
  if (!enabled) return 0;
  return Math.min(ASSIST.max, ASSIST.base + ASSIST.perDeath * Math.max(0, deathsWhileOn));
}

export function reducedDamage(amount: number, reduction: number): number {
  return Math.max(1, Math.round(amount * (1 - reduction)));
}
