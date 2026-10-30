import Phaser from 'phaser';
import { scaledFontSize } from '../core/textScale';
import { settings } from '../core/settings';
import { RENDER_SCALE, SCENE_ZOOM } from './view';

/**
 * Applique l'option « Taille du texte » à tous les textes créés ensuite (`scene.add.text`) :
 * on ajuste la taille de police au moment de la création. Le texte est aussi rendu à la résolution
 * réelle de l'écran (zoom de la scène compris), pour rester net.
 */
export function installTextScale(): void {
  const proto = Phaser.GameObjects.GameObjectFactory.prototype as unknown as {
    text: (
      x: number,
      y: number,
      text: string | string[],
      style?: Phaser.Types.GameObjects.Text.TextStyle,
    ) => Phaser.GameObjects.Text;
  };
  const original = proto.text;
  proto.text = function (this: { scene: Phaser.Scene }, x, y, text, style) {
    const resolution = RENDER_SCALE * (SCENE_ZOOM[this.scene.sys.settings.key] ?? 1);
    const fontSize = scaledFontSize(style?.fontSize, settings.textSize);
    style = { ...style, resolution, ...(fontSize === undefined ? {} : { fontSize }) };
    return original.call(this, x, y, text, style);
  };
}
