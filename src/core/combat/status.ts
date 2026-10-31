import { STATUS } from '../../data/status';

/**
 * États d'un ennemi : brûlure (Râ), givre puis gel (Khonsou), trempé (Sobek), venin (Serket), étourdi (Seth),
 * fêlé (Anubis : dégâts reçus augmentés), affaibli (Neith), piqué (Serket : explose à sa mort).
 */
export interface StatusState {
  burnDps: number;
  burnUntil: number;
  /** Dégâts de brûlure accumulés pas encore infligés (on inflige des nombres entiers). */
  burnCarry: number;
  nextBurnTick: number;
  chill: number;
  chillUntil: number;
  frozenUntil: number;
  /** Le choc thermique a déjà explosé pendant ce gel (une seule fois par gel). */
  shocked: boolean;
  /** Étourdi (Seth) : l'ennemi s'arrête, sans immunité ensuite. */
  stunUntil: number;
  /** Fêlé (Anubis, brisement) : dégâts reçus augmentés. */
  judgedUntil: number;
  judgedBonus: number;
  /** Affaibli (Neith) : ses dégâts sont réduits. */
  weakenUntil: number;
  weaken: number;
  /** Piqué (dard de Serket) : explose à sa mort. */
  cursedUntil: number;
  curseDamage: number;
  curseRadius: number;
  /** Trempé (Sobek) : ralenti, conduit la foudre, gèle plus vite. */
  soakUntil: number;
  soakSlow: number;
  /** Venin (Serket) : doses cumulées, dégâts par seconde et par dose. */
  venomStacks: number;
  venomDps: number;
  venomUntil: number;
  venomCarry: number;
  nextVenomTick: number;
}

export function newStatus(): StatusState {
  return {
    burnDps: 0,
    burnUntil: 0,
    burnCarry: 0,
    nextBurnTick: 0,
    chill: 0,
    chillUntil: 0,
    frozenUntil: -Infinity,
    shocked: false,
    stunUntil: 0,
    judgedUntil: 0,
    judgedBonus: 0,
    weakenUntil: 0,
    weaken: 0,
    cursedUntil: 0,
    curseDamage: 0,
    curseRadius: 0,
    soakUntil: 0,
    soakSlow: 0,
    venomStacks: 0,
    venomDps: 0,
    venomUntil: 0,
    venomCarry: 0,
    nextVenomTick: 0,
  };
}

export function isBurning(s: StatusState, now: number): boolean {
  return now < s.burnUntil;
}

export function isFrozen(s: StatusState, now: number): boolean {
  return now < s.frozenUntil;
}

/** Une nouvelle brûlure garde la plus forte intensité et repousse la fin. */
export function applyBurn(s: StatusState, now: number, dps: number, durationMs: number): void {
  if (!isBurning(s, now)) {
    s.burnDps = 0;
    s.burnCarry = 0;
    s.nextBurnTick = now + STATUS.burn.tickMs;
  }
  s.burnDps = Math.max(s.burnDps, dps);
  s.burnUntil = Math.max(s.burnUntil, now + durationMs);
}

/** Ajoute des charges de givre. Renvoie vrai si l'ennemi vient d'être gelé. */
export function applyChill(s: StatusState, now: number, stacks: number): boolean {
  if (now < s.frozenUntil + STATUS.chill.immuneAfterThawMs) return false;
  if (now >= s.chillUntil) s.chill = 0;
  s.chill += isSoaked(s, now) ? stacks * STATUS.soak.chillMultiplier : stacks;
  s.chillUntil = now + STATUS.chill.durationMs;
  if (s.chill < STATUS.chill.freezeAt) return false;
  s.chill = 0;
  s.frozenUntil = now + STATUS.chill.freezeMs;
  s.shocked = false;
  return true;
}

/** Multiplicateur de vitesse (0 = gelé sur place). */
export function speedFactor(s: StatusState, now: number): number {
  if (isFrozen(s, now)) return 0;
  const soak = isSoaked(s, now) ? 1 - s.soakSlow : 1;
  if (now >= s.chillUntil) return soak;
  return Math.max(0.2, (1 - s.chill * STATUS.chill.slowPerStack) * soak);
}

export function isSoaked(s: StatusState, now: number): boolean {
  return now < s.soakUntil;
}

/** Trempé : garde le plus fort ralentissement et repousse la fin. */
export function applySoak(s: StatusState, now: number, slow: number, durationMs: number): void {
  s.soakSlow = isSoaked(s, now) ? Math.max(s.soakSlow, slow) : slow;
  s.soakUntil = Math.max(s.soakUntil, now + durationMs);
}

/** Multiplicateur des dégâts de foudre (un ennemi trempé conduit l'électricité). */
export function lightningFactor(s: StatusState, now: number): number {
  return isSoaked(s, now) ? STATUS.soak.lightningMultiplier : 1;
}

export function isPoisoned(s: StatusState, now: number): boolean {
  return now < s.venomUntil && s.venomStacks > 0;
}

/** Ajoute des doses de venin (plafonnées) ; la dose la plus forte donne les dégâts par dose. */
export function applyVenom(s: StatusState, now: number, stacks: number, dpsPerStack: number): void {
  if (!isPoisoned(s, now)) {
    s.venomStacks = 0;
    s.venomDps = 0;
    s.venomCarry = 0;
    s.nextVenomTick = now + STATUS.venom.tickMs;
  }
  s.venomStacks = Math.min(STATUS.venom.maxStacks, s.venomStacks + stacks);
  s.venomDps = Math.max(s.venomDps, dpsPerStack);
  s.venomUntil = now + STATUS.venom.durationMs;
}

/** Fait avancer le venin. Renvoie les dégâts à infliger maintenant. */
export function tickVenom(s: StatusState, now: number): number {
  if (s.venomStacks <= 0) return 0;
  while (now >= s.nextVenomTick && s.nextVenomTick <= s.venomUntil) {
    s.venomCarry += (s.venomStacks * s.venomDps * STATUS.venom.tickMs) / 1000;
    s.nextVenomTick += STATUS.venom.tickMs;
  }
  let damage = 0;
  if (s.venomCarry >= 1) {
    damage = Math.floor(s.venomCarry);
    s.venomCarry -= damage;
  }
  if (now >= s.venomUntil) {
    s.venomStacks = 0;
    s.venomCarry = 0;
  }
  return damage;
}

/** Fait avancer la brûlure. Renvoie les dégâts à infliger maintenant (0 la plupart du temps). */
export function tickBurn(s: StatusState, now: number): number {
  if (s.burnDps <= 0) return 0;
  let damage = 0;
  while (now >= s.nextBurnTick && s.nextBurnTick <= s.burnUntil) {
    s.burnCarry += (s.burnDps * STATUS.burn.tickMs) / 1000;
    s.nextBurnTick += STATUS.burn.tickMs;
  }
  if (s.burnCarry >= 1) {
    damage = Math.floor(s.burnCarry);
    s.burnCarry -= damage;
  }
  if (now >= s.burnUntil) {
    s.burnDps = 0;
    s.burnCarry = 0;
  }
  return damage;
}

export function isStunned(s: StatusState, now: number): boolean {
  return now < s.stunUntil;
}

export function applyStun(s: StatusState, now: number, durationMs: number): void {
  s.stunUntil = Math.max(s.stunUntil, now + durationMs);
}

/** Bonus de dégâts reçus si l'ennemi est jugé (0 sinon). */
export function judgedBonus(s: StatusState, now: number): number {
  return now < s.judgedUntil ? s.judgedBonus : 0;
}

export function applyJudge(s: StatusState, now: number, bonus: number, durationMs: number): void {
  const previous = now < s.judgedUntil ? s.judgedBonus : 0;
  s.judgedBonus = Math.max(bonus, previous);
  s.judgedUntil = now + durationMs;
}

/** Multiplicateur des dégâts infligés par un ennemi affaibli (1 sinon). */
export function weakenFactor(s: StatusState, now: number): number {
  return now < s.weakenUntil ? 1 - s.weaken : 1;
}

export function applyWeaken(
  s: StatusState,
  now: number,
  reduction: number,
  durationMs: number,
): void {
  s.weakenUntil = now + durationMs;
  s.weaken = Math.max(s.weaken, reduction);
}

export function isCursed(s: StatusState, now: number): boolean {
  return now < s.cursedUntil;
}

/** Une malédiction dure longtemps (jusqu'à la mort de l'ennemi, en pratique). */
export function applyCurse(s: StatusState, now: number, damage: number, radius: number): void {
  s.cursedUntil = now + 8000;
  s.curseDamage = Math.max(s.curseDamage, damage);
  s.curseRadius = Math.max(s.curseRadius, radius);
}
