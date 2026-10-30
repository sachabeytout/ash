/**
 * Télémétrie locale (jamais envoyée) : durée et PV perdus par salle, causes de mort.
 * Sert à équilibrer le jeu à partir des parties de l'utilisateur (menu de debug caché).
 */
export interface RoomRecord {
  biome: number;
  room: number;
  ms: number;
  hpLost: number;
}

export interface TelemetryLog {
  rooms: RoomRecord[];
  deaths: Record<string, number>;
  runs: number;
}

/** On garde les dernières salles seulement (le journal reste petit). */
export const MAX_ROOMS = 300;

export function emptyLog(): TelemetryLog {
  return { rooms: [], deaths: {}, runs: 0 };
}

export function recordRoom(log: TelemetryLog, rec: RoomRecord): void {
  log.rooms.push({ ...rec, ms: Math.round(rec.ms), hpLost: Math.max(0, Math.round(rec.hpLost)) });
  if (log.rooms.length > MAX_ROOMS) log.rooms.splice(0, log.rooms.length - MAX_ROOMS);
}

export function recordRunEnd(log: TelemetryLog, deathCause?: string): void {
  log.runs += 1;
  if (deathCause) log.deaths[deathCause] = (log.deaths[deathCause] ?? 0) + 1;
}

export interface BiomeStats {
  biome: number;
  count: number;
  avgMs: number;
  avgHpLost: number;
}

export function summarizeLog(log: TelemetryLog): {
  biomes: BiomeStats[];
  topDeaths: [string, number][];
} {
  const byBiome = new Map<number, RoomRecord[]>();
  for (const r of log.rooms) byBiome.set(r.biome, [...(byBiome.get(r.biome) ?? []), r]);
  const biomes = [...byBiome.entries()]
    .sort(([a], [b]) => a - b)
    .map(([biome, rooms]) => ({
      biome,
      count: rooms.length,
      avgMs: Math.round(rooms.reduce((s, r) => s + r.ms, 0) / rooms.length),
      avgHpLost: Math.round((rooms.reduce((s, r) => s + r.hpLost, 0) / rooms.length) * 10) / 10,
    }));
  const topDeaths = Object.entries(log.deaths)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);
  return { biomes, topDeaths };
}

/** Relit un journal stocké ; un journal abîmé repart de zéro (ce n'est que de la statistique). */
export function parseLog(text: string | null): TelemetryLog {
  if (!text) return emptyLog();
  try {
    const raw = JSON.parse(text) as Partial<TelemetryLog>;
    return {
      rooms: Array.isArray(raw.rooms) ? raw.rooms.slice(-MAX_ROOMS) : [],
      deaths: typeof raw.deaths === 'object' && raw.deaths ? raw.deaths : {},
      runs: typeof raw.runs === 'number' ? raw.runs : 0,
    };
  } catch {
    return emptyLog();
  }
}
