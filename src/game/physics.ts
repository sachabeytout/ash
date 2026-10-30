import type Phaser from 'phaser';

/** Le corps physique (dynamique) d'une image Arcade, correctement typé. */
export function bodyOf(obj: Phaser.Physics.Arcade.Image): Phaser.Physics.Arcade.Body {
  return obj.body as Phaser.Physics.Arcade.Body;
}
