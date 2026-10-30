/**
 * Mesures d'urgence (débloquées après la 1re victoire) : des contraintes au choix pour plus de défi.
 * Chaque niveau ajoute 1 point de « chaleur » ; chaque point rapporte plus d'XP et de pièces d'arme.
 */
export type HeatId = 'curfew' | 'patrols' | 'surveillance' | 'overclock' | 'rationing' | 'noRest';

export interface HeatDef {
  id: HeatId;
  nameKey: string;
  /** Description avec {value} = effet total au niveau affiché. */
  descKey: string;
  maxLevel: number;
  /** Effet par niveau (fraction : 0,25 = +25 %). */
  perLevel: number;
}

export const HEAT: readonly HeatDef[] = [
  {
    id: 'curfew',
    nameKey: 'heat.curfew',
    descKey: 'heat.curfew.desc',
    maxLevel: 2,
    perLevel: 0.25,
  },
  {
    id: 'patrols',
    nameKey: 'heat.patrols',
    descKey: 'heat.patrols.desc',
    maxLevel: 2,
    perLevel: 0.25,
  },
  {
    id: 'surveillance',
    nameKey: 'heat.surveillance',
    descKey: 'heat.surveillance.desc',
    maxLevel: 2,
    perLevel: 0.2,
  },
  {
    id: 'overclock',
    nameKey: 'heat.overclock',
    descKey: 'heat.overclock.desc',
    maxLevel: 2,
    perLevel: 0.15,
  },
  {
    id: 'rationing',
    nameKey: 'heat.rationing',
    descKey: 'heat.rationing.desc',
    maxLevel: 1,
    perLevel: 0.4,
  },
  { id: 'noRest', nameKey: 'heat.noRest', descKey: 'heat.noRest.desc', maxLevel: 1, perLevel: 1 },
];

/** Récompenses en plus par point de chaleur (XP et pièces d'arme). */
export const HEAT_REWARD_PER_POINT = 0.1;
/** Victoires nécessaires pour débloquer les Mesures d'urgence. */
export const HEAT_UNLOCK_VICTORIES = 1;
