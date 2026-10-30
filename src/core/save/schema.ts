import { DEFAULT_SETTINGS, type Settings } from '../settings';
import type { WeaponId } from '../../data/weapons';
import type { HeatLevels } from '../heat';
import type { RunState } from '../run/state';

/** Version actuelle du format. Tout changement de format = nouvelle version + migration (voir migrations.ts). */
export const SAVE_VERSION = 6;

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
  /** Niveau de forge de chaque arme (Brokk). Ajouté en v2. */
  forge: Partial<Record<WeaponId, number>>;
  /** Morts survenues avec la Bénédiction du Phénix activée (elle se renforce). Ajouté en v2. */
  assistDeaths: number;
  /** Armes débloquées chez Brokk (en plus des armes de départ). Ajouté en v3. */
  unlocked: WeaponId[];
  /** Dialogues de la Cage déjà entendus. Ajouté en v5. */
  seenDialogues: string[];
  /** Mesures d'urgence choisies (niveau par mesure). Ajouté en v6. */
  heat: HeatLevels;
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
  return {
    xp: 0,
    totalXp: 0,
    weaponParts: 0,
    runs: 0,
    deaths: 0,
    clears: 0,
    skills: {},
    forge: {},
    assistDeaths: 0,
    unlocked: [],
    seenDialogues: [],
    heat: {},
  };
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
