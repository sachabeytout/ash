import {
  emptyLog,
  parseLog,
  recordRoom,
  recordRunEnd,
  type RoomRecord,
  type TelemetryLog,
} from '../core/telemetry';

const KEY = 'ash.telemetry';

/** Journal de jeu local (séparé de la sauvegarde : le perdre n'a aucune importance). */
class Telemetry {
  private log: TelemetryLog | null = null;
  /** Outils de debug (menu caché) : afficher les images par seconde. */
  showFps = false;

  get data(): TelemetryLog {
    if (!this.log) {
      try {
        this.log = parseLog(window.localStorage.getItem(KEY));
      } catch {
        this.log = emptyLog();
      }
    }
    return this.log;
  }

  room(rec: RoomRecord): void {
    recordRoom(this.data, rec);
    this.persist();
  }

  runEnd(deathCause?: string): void {
    recordRunEnd(this.data, deathCause);
    this.persist();
  }

  clear(): void {
    this.log = emptyLog();
    this.persist();
  }

  private persist(): void {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(this.data));
    } catch {
      // Stockage indisponible : la télémétrie est facultative.
    }
  }
}

export const telemetry = new Telemetry();
