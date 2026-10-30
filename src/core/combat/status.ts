import { STATUS } from '../../data/status';

/** États d'un ennemi : brûlure (dégâts dans le temps) et givre (ralentit, puis gèle sur place). */
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
  s.chill += stacks;
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
  if (now >= s.chillUntil) return 1;
  return Math.max(0.2, 1 - s.chill * STATUS.chill.slowPerStack);
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
