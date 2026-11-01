/** Arbre de Thot : compétences permanentes achetées avec l'XP (une mort fait toujours progresser). */
export type SkillEffect =
  | 'maxHp'
  | 'damage'
  | 'healPerRoom'
  | 'rareBonus'
  | 'superStart'
  | 'startShards'
  | 'dashCooldown'
  | 'revive'
  | 'armor';

export interface SkillDef {
  id: string;
  nameKey: string;
  /** Description avec {value} = effet total au niveau affiché. */
  descKey: string;
  effect: SkillEffect;
  /** Effet gagné par niveau (PV, fraction de dégâts, PV par salle, chance, fraction de jauge). */
  perLevel: number;
  /** Coût en XP de chaque niveau (la longueur = niveau maximum). */
  costs: readonly number[];
}

export const SKILLS: readonly SkillDef[] = [
  {
    id: 'thoth_vigor',
    nameKey: 'skill.thoth_vigor',
    descKey: 'skill.thoth_vigor.desc',
    effect: 'maxHp',
    perLevel: 8,
    costs: [30, 60, 100],
  },
  {
    id: 'thoth_edge',
    nameKey: 'skill.thoth_edge',
    descKey: 'skill.thoth_edge.desc',
    effect: 'damage',
    perLevel: 0.05,
    costs: [40, 80, 130],
  },
  {
    id: 'thoth_embers',
    nameKey: 'skill.thoth_embers',
    descKey: 'skill.thoth_embers.desc',
    effect: 'healPerRoom',
    perLevel: 3,
    costs: [50, 100],
  },
  {
    id: 'thoth_favor',
    nameKey: 'skill.thoth_favor',
    descKey: 'skill.thoth_favor.desc',
    effect: 'rareBonus',
    perLevel: 0.08,
    costs: [60, 120],
  },
  {
    id: 'thoth_spark',
    nameKey: 'skill.thoth_spark',
    descKey: 'skill.thoth_spark.desc',
    effect: 'superStart',
    perLevel: 0.25,
    costs: [45, 90],
  },
  {
    id: 'thoth_purse',
    nameKey: 'skill.thoth_purse',
    descKey: 'skill.thoth_purse.desc',
    effect: 'startShards',
    perLevel: 15,
    costs: [40, 80, 120],
  },
  {
    id: 'thoth_ibis',
    nameKey: 'skill.thoth_ibis',
    descKey: 'skill.thoth_ibis.desc',
    effect: 'dashCooldown',
    perLevel: 0.1,
    costs: [70, 140],
  },
  {
    id: 'thoth_rebirth',
    nameKey: 'skill.thoth_rebirth',
    descKey: 'skill.thoth_rebirth.desc',
    effect: 'revive',
    perLevel: 1,
    costs: [250, 450],
  },
  {
    id: 'thoth_ash',
    nameKey: 'skill.thoth_ash',
    descKey: 'skill.thoth_ash.desc',
    effect: 'armor',
    perLevel: 0.05,
    costs: [60, 110, 170],
  },
];

/** Renaissance : part des PV max retrouvés en se relevant. */
export const REVIVE_HP = 0.4;
