import Phaser from 'phaser';
import { COLORS, FONT_FAMILY } from '../theme';
import { drawCartouche } from './frame';
import { onTap } from './tap';

export interface ButtonOptions {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  sub?: string;
  color: number;
  onTap: () => void;
  fontSize?: number;
}

export interface Button {
  setLabel(label: string, sub?: string): void;
  setVisible(visible: boolean): void;
  destroy(): void;
}

/** Bouton en cartouche égyptien, large zone de toucher, survol à la souris. */
export function makeButton(scene: Phaser.Scene, o: ButtonOptions): Button {
  const g = scene.add.graphics();
  const draw = (hover: boolean) => {
    g.clear();
    drawCartouche(g, o.x, o.y, o.w, o.h, o.color, hover);
  };
  draw(false);
  const label = scene.add
    .text(o.x, o.sub ? o.y - 7 : o.y, o.label, {
      fontFamily: FONT_FAMILY,
      fontSize: `${o.fontSize ?? 14}px`,
      fontStyle: 'bold',
      color: COLORS.text,
    })
    .setOrigin(0.5);
  const sub = scene.add
    .text(o.x, o.y + 11, o.sub ?? '', {
      fontFamily: FONT_FAMILY,
      fontSize: '10px',
      color: COLORS.textDim,
    })
    .setOrigin(0.5)
    .setVisible(!!o.sub);
  const zone = scene.add.zone(o.x, o.y, o.w, o.h).setInteractive({ useHandCursor: true });
  zone.on('pointerover', () => draw(true));
  zone.on('pointerout', () => draw(false));
  onTap(zone, () => o.onTap());
  return {
    setLabel(text, subText) {
      label.setText(text).setY(subText ? o.y - 7 : o.y);
      sub.setText(subText ?? '').setVisible(!!subText);
    },
    setVisible(visible) {
      [g, label, sub].forEach((obj) => obj.setVisible(visible));
      if (visible) {
        sub.setVisible(sub.text !== '');
        zone.setInteractive();
      } else zone.disableInteractive();
    },
    destroy() {
      [g, label, sub, zone].forEach((obj) => obj.destroy());
    },
  };
}
