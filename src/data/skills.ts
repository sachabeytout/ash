/**
 * Arbre de Thot (retour F9, 0.69.0) : compétences permanentes achetées avec le Papyrus (l'XP),
 * en trois branches. Chaque compétence demande un niveau de la précédente dans sa branche.
 */
export type SkillEffect =
  | 'maxHp'
  | 'damage'
  | 'healPerRoom'
  | 'rareBonus'
  | 'superStart'
  | 'startShards'
  | 'dashCooldown'
  | 'revive'
  | 'fountainHeal'
  | 'bossHp'
  | 'strikeDamage'
  | 'powerDamage'
  | 'superDamage'
  | 'giantSlayer'
  | 'startEngraving'
  | 'shopDiscount'
  | 'rareFirst'
  | 'extraChoice';

/** Corps : vie et survie. Lame : dégâts et armes. Esprit : dons, Super et ressources. */
export type SkillBranch = 'body' | 'blade' | 'spirit';
export const SKILL_BRANCHES: readonly SkillBranch[] = ['body', 'blade', 'spirit'];

export interface SkillDef {
  id: string;
  branch: SkillBranch;
  /** Compétence précédente dans la branche (un niveau suffit pour débloquer celle-ci). */
  requires?: string;
  nameKey: string;
  /** Description avec {value} = effet total au niveau affiché. */
  descKey: string;
  effect: SkillEffect;
  /** Effet gagné par niveau (PV, fraction de dégâts, PV par salle, chance, fraction de jauge). */
  perLevel: number;
  /** Coût en Papyrus de chaque niveau (la longueur = niveau maximum). */
  costs: readonly number[];
}

const skill = (
  id: string,
  branch: SkillBranch,
  requires: string | undefined,
  effect: SkillEffect,
  perLevel: number,
  costs: readonly number[],
): SkillDef => ({
  id,
  branch,
  ...(requires ? { requires } : {}),
  nameKey: `skill.${id}`,
  descKey: `skill.${id}.desc`,
  effect,
  perLevel,
  costs,
});

export const SKILLS: readonly SkillDef[] = [
  // ---------- Corps ----------
  skill('thoth_vigor', 'body', undefined, 'maxHp', 8, [30, 60, 100]),
  skill('thoth_embers', 'body', 'thoth_vigor', 'healPerRoom', 3, [50, 100]),
  skill('thoth_ibis', 'body', 'thoth_embers', 'dashCooldown', 0.1, [70, 140]),
  skill('thoth_spring', 'body', 'thoth_ibis', 'fountainHeal', 0.15, [90, 160]),
  skill('thoth_ashHeart', 'body', 'thoth_spring', 'bossHp', 4, [120, 200]),
  skill('thoth_rebirth', 'body', 'thoth_ashHeart', 'revive', 1, [250, 450]),
  // ---------- Lame ----------
  skill('thoth_edge', 'blade', undefined, 'damage', 0.05, [40, 80, 130]),
  skill('thoth_falcon', 'blade', 'thoth_edge', 'strikeDamage', 0.15, [60, 120]),
  skill('thoth_ptahArm', 'blade', 'thoth_falcon', 'powerDamage', 0.1, [70, 130, 190]),
  skill('thoth_giant', 'blade', 'thoth_ptahArm', 'giantSlayer', 0.08, [100, 180]),
  skill('thoth_wrath', 'blade', 'thoth_giant', 'superDamage', 0.15, [120, 200]),
  skill('thoth_chisel', 'blade', 'thoth_wrath', 'startEngraving', 1, [300]),
  // ---------- Esprit ----------
  skill('thoth_favor', 'spirit', undefined, 'rareBonus', 0.08, [60, 120]),
  skill('thoth_spark', 'spirit', 'thoth_favor', 'superStart', 0.25, [45, 90]),
  skill('thoth_purse', 'spirit', 'thoth_spark', 'startShards', 15, [40, 80, 120]),
  skill('thoth_haggle', 'spirit', 'thoth_purse', 'shopDiscount', 0.1, [80, 150]),
  skill('thoth_firstFavor', 'spirit', 'thoth_haggle', 'rareFirst', 1, [150]),
  skill('thoth_eye', 'spirit', 'thoth_firstFavor', 'extraChoice', 1, [350]),
];

/** Renaissance : part des PV max retrouvés en se relevant. */
export const REVIVE_HP = 0.4;
