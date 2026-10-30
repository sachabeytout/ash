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
    case 'jackal': {
      // Tête de chacal : museau pointu, deux grandes oreilles.
      g.fillTriangle(
        x - size * 0.6,
        y - size * 0.1,
        x - size * 0.35,
        y - size,
        x - size * 0.1,
        y - size * 0.2,
      );
      g.fillTriangle(
        x + size * 0.6,
        y - size * 0.1,
        x + size * 0.35,
        y - size,
        x + size * 0.1,
        y - size * 0.2,
      );
      g.fillTriangle(x - size * 0.6, y - size * 0.2, x + size * 0.6, y - size * 0.2, x, y + size);
      break;
    }
    case 'cat': {
      // Œil de chat : amande, pupille fendue.
      g.fillEllipse(x, y, size * 1.9, size * 1.1);
      g.fillStyle(0x07060d, 1).fillRect(x - size * 0.08, y - size * 0.45, size * 0.16, size * 0.9);
      break;
    }
    case 'shield': {
      // Bouclier rond à umbo.
      g.strokeCircle(x, y, size * 0.85);
      g.fillCircle(x, y, size * 0.35);
      break;
    }
    case 'moon': {
      // Croissant de lune.
      g.fillCircle(x, y, size * 0.85);
      g.fillStyle(0x07060d, 1).fillCircle(x + size * 0.38, y - size * 0.15, size * 0.7);
      break;
    }
    case 'hammer': {
      // Marteau : tête rectangulaire, manche.
      g.fillRect(x - size * 0.8, y - size * 0.8, size * 1.6, size * 0.6);
      g.fillRect(x - size * 0.15, y - size * 0.2, size * 0.3, size * 1.1);
      break;
    }
    case 'veil': {
      // Voile de Hel : demi-visage (moitié pleine, moitié vide).
      g.strokeCircle(x, y, size * 0.8);
      g.beginPath();
      g.slice(x, y, size * 0.8, Math.PI / 2, (Math.PI * 3) / 2, false);
      g.fillPath();
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
