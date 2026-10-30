import type Phaser from 'phaser';
import type { EventId } from '../../core/run/events';

/** Couleurs des évènements (jamais le rouge-magenta des dangers). */
export const EVENT_COLOR: Record<EventId, number> = {
  ember: 0xffa040,
  prisoner: 0x8ff0ff,
  anvil: 0xc0c8d8,
  well: 0x7fe7ff,
  shrine: 0x7fffc0,
};

/** Dessin de l'évènement : flamme (braise), cage à barreaux (âme), enclume. La forme suffit à les distinguer. */
export function drawEventIcon(
  g: Phaser.GameObjects.Graphics,
  id: EventId,
  x: number,
  y: number,
  scale = 1,
): void {
  const s = scale;
  const color = EVENT_COLOR[id];
  switch (id) {
    case 'ember': {
      g.fillStyle(0x2a1a10, 1).fillEllipse(x, y + 12 * s, 26 * s, 8 * s);
      g.fillStyle(color, 1).fillTriangle(
        x - 9 * s,
        y + 10 * s,
        x + 9 * s,
        y + 10 * s,
        x,
        y - 16 * s,
      );
      g.fillCircle(x, y + 4 * s, 9 * s);
      g.fillStyle(0xffe08a, 1).fillCircle(x, y + 5 * s, 4.5 * s);
      break;
    }
    case 'prisoner': {
      g.fillStyle(color, 0.85).fillCircle(x, y + 2 * s, 6 * s);
      g.lineStyle(2 * s, 0xb08cff, 1);
      g.strokeEllipse(x, y - 12 * s, 24 * s, 8 * s);
      for (let i = -2; i <= 2; i++)
        g.lineBetween(x + i * 5 * s, y - 12 * s, x + i * 5 * s, y + 14 * s);
      g.lineBetween(x - 12 * s, y + 14 * s, x + 12 * s, y + 14 * s);
      break;
    }
    case 'well': {
      // Margelle de pierre et eau qui brille.
      g.lineStyle(2 * s, 0xc0c8d8, 1).strokeEllipse(x, y + 6 * s, 26 * s, 10 * s);
      g.fillStyle(color, 0.9).fillEllipse(x, y + 6 * s, 18 * s, 6 * s);
      g.lineStyle(2 * s, 0xc0c8d8, 1).lineBetween(x - 11 * s, y + 6 * s, x - 11 * s, y - 12 * s);
      g.lineBetween(x + 11 * s, y + 6 * s, x + 11 * s, y - 12 * s);
      g.lineBetween(x - 13 * s, y - 12 * s, x + 13 * s, y - 12 * s);
      break;
    }
    case 'shrine': {
      // Terminal-autel : écran vert surmonté d'un œil.
      g.fillStyle(0x1a2a24, 1).fillRect(x - 12 * s, y - 8 * s, 24 * s, 20 * s);
      g.lineStyle(2 * s, color, 1).strokeRect(x - 12 * s, y - 8 * s, 24 * s, 20 * s);
      g.fillStyle(color, 0.9).fillRect(x - 8 * s, y - 4 * s, 16 * s, 3 * s);
      g.fillRect(x - 8 * s, y + 2 * s, 10 * s, 3 * s);
      g.lineStyle(1.5 * s, color, 1).strokeEllipse(x, y - 14 * s, 14 * s, 6 * s);
      g.fillCircle(x, y - 14 * s, 2 * s);
      break;
    }
    case 'anvil': {
      g.fillStyle(color, 1);
      g.fillRect(x - 14 * s, y - 8 * s, 24 * s, 7 * s);
      g.fillTriangle(x + 10 * s, y - 8 * s, x + 18 * s, y - 8 * s, x + 10 * s, y - 1 * s);
      g.fillRect(x - 5 * s, y - 1 * s, 10 * s, 9 * s);
      g.fillRect(x - 11 * s, y + 8 * s, 22 * s, 5 * s);
      break;
    }
  }
}
