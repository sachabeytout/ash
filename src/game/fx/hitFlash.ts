import Phaser from 'phaser';
import { settings } from '../../core/settings';

/** Coup reçu par un ennemi : flash blanc, ou simple assombrissement si « Réduire les flashs ». */
export function hitFlash(sprite: Phaser.GameObjects.Image): void {
  if (settings.reduceFlashes) sprite.setTint(0x9a9aa8).setTintMode(Phaser.TintModes.MULTIPLY);
  else sprite.setTint(0xffffff).setTintMode(Phaser.TintModes.FILL);
}
