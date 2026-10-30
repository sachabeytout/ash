import Phaser from 'phaser';
import { HubScene } from './scenes/HubScene';
import { TitleScene } from './scenes/TitleScene';
import { COLORS, GAME_HEIGHT, GAME_WIDTH } from './theme';

export function createGameConfig(parent: string): Phaser.Types.Core.GameConfig {
  return {
    type: Phaser.WEBGL, // Le renderer Canvas est déprécié en Phaser 4.
    parent,
    backgroundColor: COLORS.background,
    pixelArt: true,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: GAME_WIDTH,
      height: GAME_HEIGHT,
    },
    input: { activePointers: 3 }, // joystick + boutons en même temps
    physics: { default: 'arcade', arcade: { debug: false } },
    scene: [TitleScene, HubScene],
  };
}
