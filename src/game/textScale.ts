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
  // Les textes sont lissés (filtre linéaire) même si le jeu est en pixel art : sans ça, les petites
  // lettres échantillonnées « au plus proche » paraissent irrégulières, comme floues.
  const textProto = Phaser.GameObjects.Text.prototype as unknown as {
    updateText: () => Phaser.GameObjects.Text;
  };
  const updateText = textProto.updateText;
  textProto.updateText = function (this: Phaser.GameObjects.Text) {
    const result = updateText.call(this);
    this.texture.setFilter(Phaser.Textures.FilterMode.LINEAR);
    return result;
  };
  const original = proto.text;
  proto.text = function (this: { scene: Phaser.Scene }, x, y, text, style) {
    const resolution = RENDER_SCALE * (SCENE_ZOOM[this.scene.sys.settings.key] ?? 1);
    const fontSize = scaledFontSize(style?.fontSize, settings.textSize);
    style = { ...style, resolution, ...(fontSize === undefined ? {} : { fontSize }) };
    return original.call(this, x, y, text, style);
  };
}
