/**
 * Marques de l'Oiseleur : à partir du 2e biome, certains ennemis normaux portent une marque.
 * Chacune a une forme bien à elle autour de l'ennemi (jamais seulement une couleur).
 */
export type AffixId = 'armored' | 'swift' | 'volatile';
export const AFFIX_IDS: readonly AffixId[] = ['armored', 'swift', 'volatile'];

export interface AffixDef {
  id: AffixId;
  hpMul: number;
  speedMul: number;
}

export const AFFIXES: Record<AffixId, AffixDef> = {
  /** Blindé : coins de blindage, encaisse davantage. */
  armored: { id: 'armored', hpMul: 1.6, speedMul: 1 },
  /** Rapide : chevrons derrière lui, se déplace plus vite. */
  swift: { id: 'swift', hpMul: 1, speedMul: 1.35 },
  /** Instable : couronne de pointes ; à sa mort, un cercle d'alerte puis une explosion. */
  volatile: { id: 'volatile', hpMul: 1, speedMul: 1 },
};

/** Chance qu'un ennemi normal soit marqué, par biome (aucune dans les Bas-Fonds). */
export const AFFIX_CHANCE: readonly number[] = [0, 0.08, 0.14, 0.2];

/** Explosion de l'Instable : rayon, délai d'alerte (≥ 0,5 s), dégâts selon le biome. */
export const VOLATILE_BLAST = { radius: 34, delayMs: 850, baseDamage: 6, perBiome: 2 } as const;

/** Éclats en plus pour un ennemi marqué vaincu. */
export const AFFIX_BOUNTY = 3;
