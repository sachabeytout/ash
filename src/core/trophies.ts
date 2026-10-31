import { BOSSES, type BossId } from '../data/bosses';
import { GOD_IDS } from '../data/gods';
import { SKILLS } from '../data/skills';
import { TROPHIES, type TrophyDef, type TrophyId } from '../data/trophies';
import { WEAPON_ORDER } from '../data/weapons';
import { codexCount, codexProgress } from './codex';
import { skillLevel } from './meta';
import type { MetaState } from './save/schema';

/** Où en est le joueur pour ce trophée (même unité que `goal`). */
export function trophyProgress(meta: MetaState, id: TrophyId): number {
  const r = meta.records;
  switch (id) {
    case 'firstEscape':
    case 'fiveEscapes':
    case 'legend':
      return meta.clears;
    case 'threeWeapons':
    case 'allWeapons':
      return WEAPON_ORDER.filter((w) => (r.clearsByWeapon[w] ?? 0) > 0).length;
    case 'hunter':
    case 'scourge':
      return r.totalKills;
    case 'guardians':
      return (Object.keys(BOSSES) as BossId[]).filter((b) => codexCount(meta, `boss.${b}`) > 0)
        .length;
    case 'unchained':
      return r.variantsBeaten.length;
    case 'pantheon':
      return GOD_IDS.filter((g) => codexCount(meta, `god.${g}`) > 0).length;
    case 'archivist': {
      const { found, total } = codexProgress(meta);
      return total > 0 ? Math.floor((found / total) * 100) : 0;
    }
    case 'swift':
      // Minutes de la victoire la plus rapide (0 = aucune victoire).
      return r.fastestClearMs > 0 ? Math.ceil(r.fastestClearMs / 60000) : 0;
    case 'pressure':
    case 'inferno':
      return r.bestHeatClear;
    case 'stubborn':
      return meta.runs;
    case 'thothMaster':
      return SKILLS.filter((s) => skillLevel(meta, s) >= s.costs.length).length;
  }
}

export function trophyEarned(meta: MetaState, def: TrophyDef): boolean {
  const value = trophyProgress(meta, def.id);
  // Le seul trophée « en dessous de » : une victoire assez rapide.
  if (def.id === 'swift') return value > 0 && value <= def.goal;
  return value >= def.goal;
}

/**
 * Remet les trophées nouvellement gagnés (récompense créditée une seule fois). Les trophées
 * comptent aussi la progression d'avant leur arrivée dans le jeu.
 */
export function claimTrophies(meta: MetaState): TrophyDef[] {
  const got: TrophyDef[] = [];
  for (const def of TROPHIES) {
    if (meta.trophies.includes(def.id) || !trophyEarned(meta, def)) continue;
    meta.trophies.push(def.id);
    meta.xp += def.reward.xp;
    meta.totalXp += def.reward.xp;
    meta.weaponParts += def.reward.weaponParts;
    got.push(def);
  }
  return got;
}

/** Une variante de boss vaincue (trophée « Sans chaînes »). */
export function recordVariantBeaten(meta: MetaState, boss: BossId): void {
  if (!meta.records.variantsBeaten.includes(boss)) meta.records.variantsBeaten.push(boss);
}
