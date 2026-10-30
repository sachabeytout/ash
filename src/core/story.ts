import { DIALOGUES, type DialogueCondition, type DialogueDef, type LastRun } from '../data/story';
import type { MetaState } from './save/schema';

function matches(c: DialogueCondition, meta: MetaState, last: LastRun | undefined): boolean {
  if (c.minRuns !== undefined && meta.runs < c.minRuns) return false;
  if (c.maxRuns !== undefined && meta.runs > c.maxRuns) return false;
  if (c.minDeaths !== undefined && meta.deaths < c.minDeaths) return false;
  if (c.victories !== undefined) {
    // Étape de l'histoire : au moins ce nombre de victoires (rattrapage si une étape a été manquée).
    if (meta.clears < c.victories) return false;
  }
  if (c.lastOutcome !== undefined && last?.outcome !== c.lastOutcome) return false;
  if (c.diedToBossOf !== undefined) {
    if (!last || last.outcome !== 'death' || !last.atBoss || last.biome !== c.diedToBossOf)
      return false;
  }
  if (c.reachedBiome !== undefined && (last?.biome ?? -1) < c.reachedBiome) return false;
  return true;
}

/**
 * Le dialogue à jouer en revenant dans la Cage : le plus prioritaire parmi ceux pas encore vus.
 * Les étapes de victoire passent dans l'ordre (la 3e attend que la 2e ait été dite).
 */
export function nextDialogue(meta: MetaState, last: LastRun | undefined): DialogueDef | undefined {
  const seen = new Set(meta.seenDialogues);
  const candidates = DIALOGUES.filter((d) => {
    if (seen.has(d.id) || !matches(d.condition, meta, last)) return false;
    const v = /^victory_(\d+)$/.exec(d.id);
    if (v && Number(v[1]) > 1 && !seen.has(`victory_${Number(v[1]) - 1}`)) return false;
    return true;
  });
  return candidates.sort((a, b) => b.priority - a.priority)[0];
}

export function markSeen(meta: MetaState, id: string): void {
  if (!meta.seenDialogues.includes(id)) meta.seenDialogues.push(id);
}
