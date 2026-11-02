import type Phaser from 'phaser';

/**
 * Toucher fiable (retours du 02/11, point 4) : `onTap` n'est appelé que si un doigt (ou la souris) s'est
 * **posé** sur l'objet puis s'est **levé** dessus. Un doigt déjà posé avant l'apparition du menu — le
 * pouce sur le joystick quand un choix de don s'ouvre — est ignoré quand il se lève. Glisser hors de
 * l'objet annule le geste, comme pour un bouton de téléphone.
 *
 * L'objet doit déjà être interactif (`setInteractive`). Renvoie l'objet, pour enchaîner.
 */
export function onTap<T extends Phaser.GameObjects.GameObject>(target: T, callback: () => void): T {
  const pressed = new Set<number>();
  target.on('pointerdown', (pointer: Phaser.Input.Pointer) => pressed.add(pointer.id));
  target.on('pointerout', (pointer: Phaser.Input.Pointer) => pressed.delete(pointer.id));
  target.on('pointerup', (pointer: Phaser.Input.Pointer) => {
    if (pressed.delete(pointer.id)) callback();
  });
  return target;
}
