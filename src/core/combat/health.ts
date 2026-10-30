export interface Health {
  hp: number;
  maxHp: number;
}

export interface DamageResult {
  dealt: number;
  killed: boolean;
}

/** Inflige des dégâts (arrondis, jamais négatifs) et indique si la cible est morte. */
export function applyDamage(target: Health, amount: number): DamageResult {
  const dealt = Math.max(0, Math.min(target.hp, Math.round(amount)));
  target.hp -= dealt;
  return { dealt, killed: target.hp <= 0 };
}

export function heal(target: Health, amount: number): number {
  const healed = Math.max(0, Math.min(target.maxHp - target.hp, Math.round(amount)));
  target.hp += healed;
  return healed;
}
