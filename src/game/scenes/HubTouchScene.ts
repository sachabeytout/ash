import Phaser from 'phaser';
import type { Controls } from '../input/Controls';
import { TouchControls } from '../input/TouchControls';

export interface HubTouchData {
  controls: Controls;
  onUse: () => void;
}

/**
 * Commandes tactiles de la Cage (retours du 02/11, point 7) : le même joystick que dans les salles et
 * un bouton « Utiliser ». Scène à part, au-dessus de la Cage, pour que les commandes restent fixes à
 * l'écran pendant que la caméra suit Ash ; endormie quand une fenêtre est ouverte.
 */
export class HubTouchScene extends Phaser.Scene {
  private touch: TouchControls | null = null;

  constructor() {
    super('hubTouch');
  }

  create(data: HubTouchData): void {
    this.touch = new TouchControls(this, data.controls, { mode: 'hub', onUse: data.onUse });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => (this.touch = null));
  }

  /** Ce toucher est-il pour un bouton tactile (et pas pour la salle dessous) ? */
  coversPointer(p: Phaser.Input.Pointer): boolean {
    return this.touch?.coversPointer(p) ?? false;
  }

  /** Le bouton « Utiliser » n'apparaît que près d'un personnage, de la porte ou d'un objet. */
  setUseReady(ready: boolean): void {
    this.touch?.setUseReady(ready);
  }
}
