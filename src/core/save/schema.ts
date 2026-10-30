import { DEFAULT_SETTINGS, type Settings } from '../settings';
import type { RunState } from '../run/state';

/** Version actuelle du format. Tout changement de format = nouvelle version + migration (voir migrations.ts). */
export const SAVE_VERSION = 1;

/** Progression permanente (conservée entre les runs). */
export interface MetaState {
  /** XP disponible pour l'arbre de Thot. */
  xp: number;
  /** XP gagnée depuis le début (statistique). */
  totalXp: number;
  weaponParts: number;
  runs: number;
  deaths: number;
  clears: number;
  /** Niveau de chaque compétence de l'arbre de Thot. */
  skills: Record<string, number>;
}

export interface SaveData {
  version: typeof SAVE_VERSION;
  meta: MetaState;
  /** Run en cours, telle qu'elle était à l'entrée de la salle (null = pas de run en cours). */
  run: RunState | null;
  settings: Settings;
  savedAt: number;
}

export function defaultMeta(): MetaState {
  return { xp: 0, totalXp: 0, weaponParts: 0, runs: 0, deaths: 0, clears: 0, skills: {} };
}

export function defaultSave(): SaveData {
  return {
    version: SAVE_VERSION,
    meta: defaultMeta(),
    run: null,
    settings: { ...DEFAULT_SETTINGS },
    savedAt: 0,
  };
}
