import Phaser from 'phaser';
import type { GodDef } from '../data/gods';

/** Icône d'un dieu : soleil (Râ), éclair (Zeus), flocon (Skadi). La forme suffit à les distinguer. */
export function drawGodIcon(
  g: Phaser.GameObjects.Graphics,
  god: GodDef,
  x: number,
  y: number,
  size: number,
  color = god.color,
): void {
  g.fillStyle(color, 1).lineStyle(Math.max(1.5, size / 6), color, 1);
  switch (god.icon) {
    case 'sun': {
      g.fillCircle(x, y, size * 0.42);
      for (let i = 0; i < 8; i++) {
        const a = (i * Math.PI) / 4;
        g.lineBetween(
          x + Math.cos(a) * size * 0.6,
          y + Math.sin(a) * size * 0.6,
          x + Math.cos(a) * size * 0.95,
          y + Math.sin(a) * size * 0.95,
        );
      }
      break;
    }
    case 'bolt': {
      const s = size;
      const pts = [
        [0.15, -1],
        [-0.55, 0.1],
        [-0.05, 0.1],
        [-0.2, 1],
        [0.55, -0.15],
        [0.05, -0.15],
        [0.3, -1],
      ].map(([px, py]) => new Phaser.Math.Vector2(x + (px ?? 0) * s, y + (py ?? 0) * s));
      g.fillPoints(pts, true);
      break;
    }
    case 'flake': {
      for (let i = 0; i < 3; i++) {
        const a = (i * Math.PI) / 3;
        const dx = Math.cos(a) * size;
        const dy = Math.sin(a) * size;
        g.lineBetween(x - dx, y - dy, x + dx, y + dy);
      }
      for (let i = 0; i < 6; i++) {
        const a = (i * Math.PI) / 3;
        const bx = x + Math.cos(a) * size * 0.6;
        const by = y + Math.sin(a) * size * 0.6;
        for (const side of [-1, 1]) {
          const b = a + side * 0.7;
          g.lineBetween(bx, by, bx + Math.cos(b) * size * 0.3, by + Math.sin(b) * size * 0.3);
        }
      }
      break;
    }
  }
}
