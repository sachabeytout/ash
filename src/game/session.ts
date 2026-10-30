import { settings } from '../core/settings';
import type { RunState } from '../core/run/state';
import { defaultSave, type SaveData } from '../core/save/schema';
import { SaveStore } from '../core/save/store';

/**
 * La partie en mémoire et son enregistrement. Les règles (fin de run, achats…) sont dans `core/` ;
 * ici on se contente de garder la sauvegarde courante et de l'écrire au bon moment.
 */
class Session {
  save: SaveData = defaultSave();
  private store: SaveStore | null = null;
  private readOnly = false;

  load(): void {
    try {
      this.store = new SaveStore(window.localStorage);
    } catch {
      this.store = null; // stockage indisponible (navigation privée stricte) : on joue sans sauvegarde
      return;
    }
    const result = this.store.load();
    this.save = result.save;
    this.readOnly = result.readOnly;
    Object.assign(settings, this.save.settings);
  }

  /** Écrit la sauvegarde (réglages compris). */
  commit(): void {
    this.save.settings = { ...settings };
    if (this.readOnly || !this.store) return;
    this.store.write(this.save, Date.now());
  }

  /** Photo de la run à l'entrée de la salle : c'est elle qu'on reprend après une fermeture. */
  snapshotRun(run: RunState): void {
    this.save.run = structuredClone(run);
    this.commit();
  }

  /** Remplace toute la progression (import). */
  replace(save: SaveData): void {
    this.save = save;
    this.readOnly = false;
    Object.assign(settings, save.settings);
    this.commit();
  }
}

export const session = new Session();
