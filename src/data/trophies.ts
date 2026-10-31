/**
 * Trophées : de grands objectifs sur plusieurs runs, pour donner envie de rejouer (autres armes,
 * autres dieux, Mesures d'urgence…). Chaque trophée rapporte une fois de l'XP et/ou des pièces d'arme.
 * La condition est calculée par `src/core/trophies.ts` à partir de la progression.
 */
export type TrophyId =
  | 'firstEscape'
  | 'fiveEscapes'
  | 'legend'
  | 'threeWeapons'
  | 'allWeapons'
  | 'hunter'
  | 'scourge'
  | 'guardians'
  | 'unchained'
  | 'pantheon'
  | 'archivist'
  | 'swift'
  | 'pressure'
  | 'inferno'
  | 'stubborn'
  | 'thothMaster';

export interface TrophyDef {
  id: TrophyId;
  /** Nom et description : `trophy.<id>` et `trophy.<id>.desc` (avec {goal}). */
  goal: number;
  reward: { xp: number; weaponParts: number };
}

export const TROPHIES: readonly TrophyDef[] = [
  { id: 'firstEscape', goal: 1, reward: { xp: 60, weaponParts: 0 } },
  { id: 'fiveEscapes', goal: 5, reward: { xp: 150, weaponParts: 2 } },
  { id: 'legend', goal: 10, reward: { xp: 300, weaponParts: 4 } },
  { id: 'threeWeapons', goal: 3, reward: { xp: 0, weaponParts: 3 } },
  { id: 'allWeapons', goal: 7, reward: { xp: 250, weaponParts: 6 } },
  { id: 'hunter', goal: 500, reward: { xp: 100, weaponParts: 0 } },
  { id: 'scourge', goal: 2500, reward: { xp: 250, weaponParts: 2 } },
  { id: 'guardians', goal: 4, reward: { xp: 150, weaponParts: 0 } },
  { id: 'unchained', goal: 4, reward: { xp: 200, weaponParts: 3 } },
  { id: 'pantheon', goal: 9, reward: { xp: 120, weaponParts: 0 } },
  { id: 'archivist', goal: 100, reward: { xp: 200, weaponParts: 2 } },
  // Victoire en moins de `goal` minutes.
  { id: 'swift', goal: 25, reward: { xp: 0, weaponParts: 3 } },
  // Victoire avec au moins `goal` points de Mesures d'urgence.
  { id: 'pressure', goal: 4, reward: { xp: 150, weaponParts: 2 } },
  { id: 'inferno', goal: 8, reward: { xp: 400, weaponParts: 5 } },
  { id: 'stubborn', goal: 50, reward: { xp: 150, weaponParts: 0 } },
  { id: 'thothMaster', goal: 8, reward: { xp: 0, weaponParts: 4 } },
];
