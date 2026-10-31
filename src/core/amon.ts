import type { BiomeDef } from '../data/biomes';
import { GOD_IDS, type GodId } from '../data/gods';
import { createRng } from './rng';
import type { DoorReward } from './run/rewards';
import { specialRooms } from './run/special';

/**
 * Le Regard d'Amon : une fois par monde, Amon (le roi caché) observe Ash pendant une salle de combat
 * et lui lance un défi discret. Réussi : à la fin de la salle, une faveur royale (Ash choisit le dieu
 * de la prochaine porte). Raté : rien de grave, Amon regardera de nouveau dans une salle suivante.
 * Pas de porte, pas de prix à payer.
 */
export type AmonChallenge = 'untouched' | 'frenzy' | 'power';
export const AMON_CHALLENGES: readonly AmonChallenge[] = ['untouched', 'frenzy', 'power'];

/** « Frénésie » : vaincre ce nombre d'ennemis dans ce laps de temps. */
export const AMON_FRENZY_KILLS = 3;
export const AMON_FRENZY_MS = 3000;
/** « Puissance » : vaincre ce nombre d'ennemis avec l'attaque puissante. */
export const AMON_POWER_KILLS = 3;
/** Nombre de dieux proposés par la faveur royale. */
export const AMON_GOD_CHOICES = 3;

/** Salles où Amon peut regarder : combats simples (ni fontaine, ni salle spéciale, ni juste avant le boss), dès la 2e. */
export function amonCandidates(seed: number, biomeIndex: number, biome: BiomeDef): number[] {
  const special = specialRooms(seed, biomeIndex, biome);
  const taken = [special.event, special.trial, special.challenge];
  const rooms: number[] = [];
  for (let room = 2; room < biome.rooms; room++) {
    if (biome.fountainRooms.includes(room) || taken.includes(room)) continue;
    rooms.push(room);
  }
  return rooms;
}

/** Première salle observée du monde, fixée par la graine (on garde des salles après pour retenter). */
export function amonStartRoom(seed: number, biomeIndex: number, biome: BiomeDef): number | null {
  const rooms = amonCandidates(seed, biomeIndex, biome);
  if (rooms.length === 0) return null;
  const firstHalf = rooms.slice(0, Math.max(1, Math.ceil(rooms.length / 2)));
  const rng = createRng((seed ^ Math.imul(biomeIndex + 41, 0x5bd1e995)) >>> 0);
  return rng.pick(firstHalf);
}

/** Le défi de cette salle, ou null si Amon ne regarde pas (déjà accordé dans ce monde, trop tôt…). */
export function amonChallengeFor(
  run: { seed: number; biome: number; room: number; amonBiome: number },
  biome: BiomeDef,
): AmonChallenge | null {
  if (run.amonBiome === run.biome) return null;
  const start = amonStartRoom(run.seed, run.biome, biome);
  if (start === null || run.room < start) return null;
  if (!amonCandidates(run.seed, run.biome, biome).includes(run.room)) return null;
  const rng = createRng((run.seed ^ Math.imul(run.biome * 64 + run.room + 3, 0x27d4eb2f)) >>> 0);
  return rng.pick(AMON_CHALLENGES);
}

export interface AmonWatch {
  challenge: AmonChallenge;
  state: 'watching' | 'won' | 'failed';
  /** Instants des dernières victoires (frénésie). */
  kills: number[];
  /** Ennemis vaincus avec l'attaque puissante. */
  powerKills: number;
}

export type AmonEvent = { type: 'hurt' } | { type: 'kill'; at: number; power: boolean };

export function newAmonWatch(challenge: AmonChallenge): AmonWatch {
  return { challenge, state: 'watching', kills: [], powerKills: 0 };
}

/** Fait avancer le défi. Renvoie vrai si quelque chose d'affiché a changé. */
export function amonEvent(w: AmonWatch, e: AmonEvent): boolean {
  if (w.state !== 'watching') return false;
  if (e.type === 'hurt') {
    if (w.challenge !== 'untouched') return false;
    w.state = 'failed';
    return true;
  }
  if (w.challenge === 'frenzy') {
    w.kills = w.kills.filter((at) => e.at - at < AMON_FRENZY_MS);
    w.kills.push(e.at);
    if (w.kills.length >= AMON_FRENZY_KILLS) w.state = 'won';
    return true;
  }
  if (w.challenge === 'power' && e.power) {
    w.powerKills += 1;
    if (w.powerKills >= AMON_POWER_KILLS) w.state = 'won';
    return true;
  }
  return false;
}

/** Salle terminée : « sans être touché » est réussi ; un défi pas encore réussi est raté. */
export function amonRoomCleared(w: AmonWatch): AmonWatch['state'] {
  if (w.state === 'watching') w.state = w.challenge === 'untouched' ? 'won' : 'failed';
  return w.state;
}

/** Les dieux proposés par la faveur royale (différents, fixés par la graine). */
export function amonGods(seed: number, biomeIndex: number, room: number): GodId[] {
  const rng = createRng((seed ^ Math.imul(biomeIndex * 64 + room + 17, 0x165667b1)) >>> 0);
  const pool = [...GOD_IDS];
  const gods: GodId[] = [];
  while (gods.length < AMON_GOD_CHOICES && pool.length > 0)
    gods.push(pool.splice(Math.floor(rng.next() * pool.length), 1)[0] as GodId);
  return gods;
}

/** Les portes de la salle : la porte de don mène au dieu choisi (une porte devient un don s'il n'y en a pas). */
export function applyRoyalFavor(doors: readonly DoorReward[], god: GodId): DoorReward[] {
  const result = [...doors];
  const i = result.findIndex((d) => d.kind === 'boon');
  result[i >= 0 ? i : 0] = { kind: 'boon', god };
  return result;
}
