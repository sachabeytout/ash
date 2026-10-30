/**
 * Générateur aléatoire à graine (mulberry32) : une même graine donne toujours la même suite.
 * Sert à rendre une run reproductible (débogage, tests).
 */
export interface Rng {
  /** Nombre dans [0, 1). */
  next(): number;
  /** Entier dans [min, max] (bornes incluses). */
  int(min: number, max: number): number;
  /** Élément au hasard d'une liste non vide. */
  pick<T>(items: readonly T[]): T;
  /** État interne, à sauvegarder pour reprendre la suite exactement. */
  readonly state: number;
}

export function createRng(seed: number): Rng {
  let state = seed >>> 0;

  const next = (): number => {
    state = (state + 0x6d2b79f5) >>> 0;
    let x = state;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };

  return {
    next,
    int(min, max) {
      return min + Math.floor(next() * (max - min + 1));
    },
    pick(items) {
      if (items.length === 0) throw new Error('pick() sur une liste vide');
      return items[Math.floor(next() * items.length)] as (typeof items)[number];
    },
    get state() {
      return state;
    },
  };
}

/** Graine aléatoire pour une nouvelle run. */
export function randomSeed(): number {
  return Math.floor(Math.random() * 4294967296) >>> 0;
}
