import Phaser from 'phaser';
import type { GodDef } from '../data/gods';

/** Icône d'un dieu (soleil, vague, lune, éclair, scorpion, chacal, chat, ânkh, bouclier) : la forme suffit à les distinguer. */
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
    case 'scorpion': {
      // Scorpion de Serket : corps, deux pinces, queue qui remonte en arc jusqu'au dard.
      const v = (px: number, py: number) => new Phaser.Math.Vector2(x + px * size, y + py * size);
      g.fillEllipse(x - size * 0.1, y + size * 0.35, size * 0.6, size * 0.8);
      g.lineBetween(x - size * 0.25, y + size * 0.1, x - size * 0.7, y - size * 0.25);
      g.lineBetween(x + size * 0.05, y + size * 0.1, x + size * 0.15, y - size * 0.3);
      g.fillCircle(x - size * 0.75, y - size * 0.35, size * 0.18);
      g.fillCircle(x + size * 0.15, y - size * 0.42, size * 0.15);
      g.strokePoints([v(0, 0.7), v(0.5, 0.55), v(0.7, 0.05), v(0.6, -0.45), v(0.3, -0.75)], false);
      g.fillTriangle(
        x + size * 0.38,
        y - size * 0.92,
        x + size * 0.38,
        y - size * 0.55,
        x + size * 0.08,
        y - size * 0.7,
      );
      break;
    }
    case 'wave': {
      // Vague de Sobek : deux crêtes qui s'enroulent (lignes brisées, lisibles en petit).
      const v = (px: number, py: number) => new Phaser.Math.Vector2(x + px * size, y + py * size);
      for (const dy of [-0.35, 0.35]) {
        g.strokePoints(
          [
            v(-0.9, dy + 0.2),
            v(-0.55, dy - 0.25),
            v(-0.15, dy + 0.2),
            v(0.25, dy - 0.25),
            v(0.65, dy + 0.2),
            v(0.9, dy),
          ],
          false,
        );
      }
      break;
    }
    case 'ankh': {
      // Ânkh d'Isis : boucle, barre, tige.
      g.strokeEllipse(x, y - size * 0.45, size * 0.7, size * 0.9);
      g.lineBetween(x - size * 0.6, y + size * 0.05, x + size * 0.6, y + size * 0.05);
      g.lineBetween(x, y, x, y + size);
      break;
    }
  }
}

/** Or d'Amon (le roi caché) : son œil et sa faveur royale. */
export const AMON_COLOR = 0xffd36b;

/** L'œil d'Amon : amande, pupille et trait en dessous (forme propre, lisible sans la couleur). */
export function drawAmonEye(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  size: number,
  color = AMON_COLOR,
  open = true,
): void {
  g.lineStyle(Math.max(1.5, size / 5), color, 1);
  if (!open) {
    g.lineBetween(x - size, y, x + size, y);
    g.lineBetween(x - size * 0.6, y + size * 0.15, x - size * 0.7, y + size * 0.45);
    g.lineBetween(x + size * 0.6, y + size * 0.15, x + size * 0.7, y + size * 0.45);
    return;
  }
  g.strokeEllipse(x, y, size * 2, size * 1.05);
  g.fillStyle(color, 1).fillCircle(x, y, size * 0.32);
  g.lineBetween(x - size * 0.2, y + size * 0.55, x - size * 0.2, y + size * 1.05);
  g.lineBetween(x - size * 0.2, y + size * 1.05, x + size * 0.45, y + size * 1.2);
}
