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

// Retour F12 (0.72.0) : prix ×1,5 et des niveaux en plus pour la plupart des compétences.
export const SKILLS: readonly SkillDef[] = [
  // ---------- Corps ----------
  skill('thoth_vigor', 'body', undefined, 'maxHp', 8, [45, 90, 150, 220, 300]),
  skill('thoth_embers', 'body', 'thoth_vigor', 'healPerRoom', 3, [75, 150, 240]),
  skill('thoth_ibis', 'body', 'thoth_embers', 'dashCooldown', 0.1, [105, 210, 320]),
  skill('thoth_spring', 'body', 'thoth_ibis', 'fountainHeal', 0.15, [135, 240, 360]),
  skill('thoth_ashHeart', 'body', 'thoth_spring', 'bossHp', 4, [180, 300, 450]),
  skill('thoth_rebirth', 'body', 'thoth_ashHeart', 'revive', 1, [375, 675]),
  // ---------- Lame ----------
  skill('thoth_edge', 'blade', undefined, 'damage', 0.05, [60, 120, 195, 280, 380]),
  skill('thoth_falcon', 'blade', 'thoth_edge', 'strikeDamage', 0.15, [90, 180, 280]),
  skill('thoth_ptahArm', 'blade', 'thoth_falcon', 'powerDamage', 0.1, [105, 195, 285, 390]),
  skill('thoth_giant', 'blade', 'thoth_ptahArm', 'giantSlayer', 0.08, [150, 270, 400]),
  skill('thoth_wrath', 'blade', 'thoth_giant', 'superDamage', 0.15, [180, 300, 450]),
  skill('thoth_chisel', 'blade', 'thoth_wrath', 'startEngraving', 1, [450]),
  // ---------- Esprit ----------
  skill('thoth_favor', 'spirit', undefined, 'rareBonus', 0.08, [90, 180, 280]),
  skill('thoth_spark', 'spirit', 'thoth_favor', 'superStart', 0.25, [70, 135, 210]),
  skill('thoth_purse', 'spirit', 'thoth_spark', 'startShards', 15, [60, 120, 180, 260]),
  skill('thoth_haggle', 'spirit', 'thoth_purse', 'shopDiscount', 0.1, [120, 225, 340]),
  skill('thoth_firstFavor', 'spirit', 'thoth_haggle', 'rareFirst', 1, [225]),
  skill('thoth_eye', 'spirit', 'thoth_firstFavor', 'extraChoice', 1, [525]),
];

/** Renaissance : part des PV max retrouvés en se relevant. */
export const REVIVE_HP = 0.4;
