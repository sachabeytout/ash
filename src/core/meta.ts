import { SKILLS, type SkillDef, type SkillEffect } from '../data/skills';
import type { RunPerks, RunSummary } from './run/state';
import type { MetaState, SaveData } from './save/schema';
import { heatTotal } from './heat';

/** Fin de run : la progression permanente est créditée et la run en cours effacée. */
export function finishRun(save: SaveData, summary: RunSummary): void {
  const meta = save.meta;
  meta.xp += summary.xp;
  meta.totalXp += summary.xp;
  meta.weaponParts += summary.weaponParts;
  meta.runs += 1;
  if (summary.outcome === 'death') {
    meta.deaths += 1;
    if (save.settings.assist) meta.assistDeaths += 1;
  } else meta.clears += 1;
  updateRecords(meta, summary);
  save.run = null;
}

/** Exploits : records battus à la fin d'une run. */
export function updateRecords(meta: MetaState, summary: RunSummary): void {
  const r = meta.records;
  r.bestRooms = Math.max(r.bestRooms, summary.rooms ?? 0);
  r.totalKills += summary.kills ?? 0;
  if (summary.outcome !== 'cleared') return;
  if (r.fastestClearMs === 0 || summary.elapsedMs < r.fastestClearMs)
    r.fastestClearMs = summary.elapsedMs;
  if (summary.weapon)
    r.clearsByWeapon[summary.weapon] = (r.clearsByWeapon[summary.weapon] ?? 0) + 1;
  r.bestHeatClear = Math.max(r.bestHeatClear, heatTotal(meta.heat));
}

export function skillLevel(meta: MetaState, skill: SkillDef): number {
  return Math.min(skill.costs.length, meta.skills[skill.id] ?? 0);
}

/** Coût du prochain niveau, ou null si la compétence est au maximum. */
export function nextCost(meta: MetaState, skill: SkillDef): number | null {
  return skill.costs[skillLevel(meta, skill)] ?? null;
}

/** Une compétence est accessible quand la précédente de sa branche a au moins un niveau. */
export function isSkillUnlocked(meta: MetaState, skill: SkillDef): boolean {
  if (!skill.requires) return true;
  const before = SKILLS.find((s) => s.id === skill.requires);
  return before === undefined || skillLevel(meta, before) > 0;
}

/** Achète le niveau suivant si le Papyrus suffit et la compétence est débloquée. */
export function buySkill(meta: MetaState, skill: SkillDef): boolean {
  const cost = nextCost(meta, skill);
  if (cost === null || meta.xp < cost || !isSkillUnlocked(meta, skill)) return false;
  meta.xp -= cost;
  meta.skills[skill.id] = skillLevel(meta, skill) + 1;
  return true;
}

/** Effet total d'un type de compétence. */
export function skillTotal(meta: MetaState, effect: SkillEffect): number {
  return SKILLS.filter((s) => s.effect === effect).reduce(
    (sum, s) => sum + skillLevel(meta, s) * s.perLevel,
    0,
  );
}

/** Ce que les compétences apportent à une nouvelle run. */
export function runBonuses(meta: MetaState): {
  maxHpBonus: number;
  perks: RunPerks;
  superStart: number;
} {
  return {
    maxHpBonus: skillTotal(meta, 'maxHp'),
    perks: {
      damage: skillTotal(meta, 'damage'),
      healPerRoom: skillTotal(meta, 'healPerRoom'),
      rareBonus: skillTotal(meta, 'rareBonus'),
      startShards: skillTotal(meta, 'startShards'),
      dashCooldown: skillTotal(meta, 'dashCooldown'),
      revives: skillTotal(meta, 'revive'),
      fountainHeal: skillTotal(meta, 'fountainHeal'),
      bossHp: skillTotal(meta, 'bossHp'),
      strikeDamage: skillTotal(meta, 'strikeDamage'),
      powerDamage: skillTotal(meta, 'powerDamage'),
      superDamage: skillTotal(meta, 'superDamage'),
      giantSlayer: skillTotal(meta, 'giantSlayer'),
      startEngraving: skillTotal(meta, 'startEngraving'),
      shopDiscount: skillTotal(meta, 'shopDiscount'),
      rareFirst: skillTotal(meta, 'rareFirst'),
      extraChoice: skillTotal(meta, 'extraChoice'),
    },
    superStart: Math.min(1, skillTotal(meta, 'superStart')),
  };
}
