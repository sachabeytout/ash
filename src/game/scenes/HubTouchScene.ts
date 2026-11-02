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

  /** Le bouton « Utiliser » s'allume devant un personnage, la porte ou un objet. */
  setUseReady(ready: boolean): void {
    this.touch?.setUseReady(ready);
  }
}
