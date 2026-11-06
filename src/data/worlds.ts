import { BIOMES, type BiomeDef } from './biomes';

/**
 * Les mondes de l'aventure (décisions du 05/11/2026, `docs/QUESTIONS.md` partie G). Chaque monde a 4 secteurs :
 * 10, 10 et 10 salles puis un boss, et un secteur 4 plus dur de 7 salles puis Flem. Dans le code, un secteur est un
 * « biome » (`BiomeDef`) et `RunState.biome` est l'index du secteur dans son monde.
 *
 * Ordre prévu : Valhalla → Aaru → Svarga → Yomi → Élysium. Seul Aaru (le contenu actuel, égyptien) existe pour
 * l'instant ; les autres mondes s'ajouteront ici, un par un, dans cet ordre.
 */
export type WorldId = 'aaru';

export interface WorldDef {
  id: WorldId;
  nameKey: string;
  /** Les secteurs du monde, dans l'ordre de la run. */
  sectors: readonly BiomeDef[];
}

export const WORLDS: Readonly<Record<WorldId, WorldDef>> = {
  aaru: { id: 'aaru', nameKey: 'world.aaru', sectors: BIOMES },
};

/** Ordre des mondes (sélection, déblocages). */
export const WORLD_ORDER: readonly WorldId[] = ['aaru'];

/** Monde des runs commencées avant l'arrivée des mondes (sauvegardes v24 et avant). */
export const DEFAULT_WORLD: WorldId = 'aaru';

export function isWorldId(value: unknown): value is WorldId {
  return typeof value === 'string' && Object.hasOwn(WORLDS, value);
}

export function getWorld(id: WorldId): WorldDef {
  return WORLDS[id];
}

/** Le secteur `index` d'un monde (borné au premier et au dernier secteur). */
export function getSector(world: WorldId, index: number): BiomeDef {
  const sectors = WORLDS[world].sectors;
  const sector = sectors[Math.min(Math.max(0, index), sectors.length - 1)];
  if (!sector) throw new Error(`Aucun secteur dans le monde ${world}`);
  return sector;
}

/** Le secteur où se trouve une run ou un résumé de run (sans monde : Aaru, d'avant les mondes). */
export function sectorOf(place: { world?: WorldId; biome: number }): BiomeDef {
  return getSector(place.world ?? DEFAULT_WORLD, place.biome);
}
