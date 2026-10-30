import Phaser from 'phaser';
import { BoonScene } from './scenes/BoonScene';
import { HubScene } from './scenes/HubScene';
import { PauseScene } from './scenes/PauseScene';
import { ShopScene } from './scenes/ShopScene';
import { EventScene } from './scenes/EventScene';
import { IntroScene } from './scenes/IntroScene';
import { EndingScene } from './scenes/EndingScene';
import { RunScene } from './scenes/RunScene';
import { UiScene } from './scenes/UiScene';
import { TitleScene } from './scenes/TitleScene';
import { COLORS, GAME_HEIGHT, GAME_WIDTH } from './theme';

export function createGameConfig(parent: string): Phaser.Types.Core.GameConfig {
  return {
    type: Phaser.WEBGL, // Le renderer Canvas est déprécié en Phaser 4.
    parent,
    backgroundColor: COLORS.background,
    pixelArt: true,
    scale: {
      // EXPAND : hauteur de 360 px, la largeur s'étire pour remplir les écrans allongés (pas de bandes noires).
      mode: Phaser.Scale.EXPAND,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: GAME_WIDTH,
      height: GAME_HEIGHT,
    },
    input: { activePointers: 3 }, // joystick + boutons en même temps
    // ?debug dans l'adresse affiche les zones de collision.
    // Tous les sons sont synthétisés par `audio/` : le gestionnaire de Phaser ouvrirait un 2e contexte audio.
    audio: { noAudio: true },
    physics: {
      default: 'arcade',
      arcade: { debug: new URLSearchParams(location.search).has('debug') },
    },
    scene: [
      TitleScene,
      HubScene,
      RunScene,
      UiScene,
      BoonScene,
      PauseScene,
      ShopScene,
      EventScene,
      EndingScene,
      IntroScene,
    ],
  };
}
