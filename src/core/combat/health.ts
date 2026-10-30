export interface Health {
  hp: number;
  maxHp: number;
  /** Bouclier temporaire (Porte-bouclier) : absorbe les dégâts avant les PV. */
  ward?: number;
}

export interface DamageResult {
  dealt: number;
  killed: boolean;
}

/** Inflige des dégâts (arrondis, jamais négatifs) et indique si la cible est morte. */
export function applyDamage(target: Health, amount: number): DamageResult {
  let rest = Math.max(0, Math.round(amount));
  if (target.ward && target.ward > 0) {
    const absorbed = Math.min(target.ward, rest);
    target.ward -= absorbed;
    rest -= absorbed;
  }
  const dealt = Math.min(target.hp, rest);
  target.hp -= dealt;
  return { dealt, killed: target.hp <= 0 };
}

export function heal(target: Health, amount: number): number {
  const healed = Math.max(0, Math.min(target.maxHp - target.hp, Math.round(amount)));
  target.hp += healed;
  return healed;
}
