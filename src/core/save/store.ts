import { deserialize, serialize } from './codec';
import { NewerSaveError } from './migrations';
import { defaultSave, type SaveData } from './schema';

/** Accès clé → texte (localStorage dans le navigateur, une Map dans les tests). */
export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const MAIN = 'ash.save';
const BACKUP = 'ash.save.bak';

export interface LoadResult {
  save: SaveData;
  /** D'où vient la sauvegarde chargée. */
  source: 'main' | 'backup' | 'new';
  /** Vrai si la sauvegarde vient d'une version plus récente : on n'écrit plus pour ne rien écraser. */
  readOnly: boolean;
}

/**
 * Écriture robuste : l'ancienne sauvegarde valide est d'abord copiée en secours, puis remplacée.
 * Si l'app est fermée en pleine écriture, l'une des deux reste toujours lisible.
 */
export class SaveStore {
  constructor(private readonly storage: KeyValueStorage) {}

  load(): LoadResult {
    for (const [key, source] of [
      [MAIN, 'main'],
      [BACKUP, 'backup'],
    ] as const) {
      const text = this.read(key);
      if (!text) continue;
      try {
        return { save: deserialize(text), source, readOnly: false };
      } catch (err) {
        if (err instanceof NewerSaveError)
          return { save: defaultSave(), source: 'new', readOnly: true };
      }
    }
    return { save: defaultSave(), source: 'new', readOnly: false };
  }

  /** Renvoie faux si l'écriture a échoué (stockage plein ou indisponible). */
  write(save: SaveData, now: number): boolean {
    try {
      const text = serialize({ ...save, savedAt: now });
      const previous = this.read(MAIN);
      if (previous && isValid(previous)) this.storage.setItem(BACKUP, previous);
      this.storage.setItem(MAIN, text);
      return true;
    } catch {
      return false;
    }
  }

  private read(key: string): string | null {
    try {
      return this.storage.getItem(key);
    } catch {
      return null;
    }
  }
}

function isValid(text: string): boolean {
  try {
    deserialize(text);
    return true;
  } catch {
    return false;
  }
}
