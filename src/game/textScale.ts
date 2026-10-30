import Phaser from 'phaser';
import { scaledFontSize } from '../core/textScale';
import { settings } from '../core/settings';

/**
 * Applique l'option « Taille du texte » à tous les textes créés ensuite (`scene.add.text`) :
 * on ajuste la taille de police au moment de la création.
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
  proto.text = function (x, y, text, style) {
    if (style && settings.textSize !== 'normal') {
      const fontSize = scaledFontSize(style.fontSize, settings.textSize);
      style = fontSize === undefined ? style : { ...style, fontSize };
    }
    return original.call(this, x, y, text, style);
  };
}
