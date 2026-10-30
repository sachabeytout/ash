import type { RunSummary } from './run/state';
import type { SaveData } from './save/schema';

/** Fin de run : la progression permanente est créditée et la run en cours effacée. */
export function finishRun(save: SaveData, summary: RunSummary): void {
  const meta = save.meta;
  meta.xp += summary.xp;
  meta.totalXp += summary.xp;
  meta.weaponParts += summary.weaponParts;
  meta.runs += 1;
  if (summary.outcome === 'death') meta.deaths += 1;
  else meta.clears += 1;
  save.run = null;
}
