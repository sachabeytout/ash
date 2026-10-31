import type Phaser from 'phaser';
import { COLORS } from '../theme';

/**
 * Cadre égyptien des fenêtres (0.55.0) : fond de nuit, double filet (or + couleur de la fenêtre),
 * frises de petits blocs lapis / or / turquoise en haut et en bas, comme sur les murs des tombeaux,
 * et un losange doré à chaque coin.
 */
export function drawFrame(
  g: Phaser.GameObjects.Graphics,
  left: number,
  top: number,
  w: number,
  h: number,
  accent: number,
  alpha = 0.98,
): void {
  g.fillStyle(COLORS.panel, alpha).fillRect(left, top, w, h);
  g.lineStyle(2, COLORS.goldDim, 0.95).strokeRect(left, top, w, h);
  g.lineStyle(1, accent, 0.75).strokeRect(left + 4, top + 4, w - 8, h - 8);
  frieze(g, left + 10, top + 1, w - 20);
  frieze(g, left + 10, top + h - 4, w - 20);
  for (const [x, y] of [
    [left, top],
    [left + w, top],
    [left, top + h],
    [left + w, top + h],
  ] as const) {
    g.fillStyle(COLORS.gold, 1).fillTriangle(x - 4, y, x, y - 4, x + 4, y);
    g.fillTriangle(x - 4, y, x, y + 4, x + 4, y);
  }
}

/** Frise de petits blocs alternés (lapis, or, turquoise, or), séparés par un trait sombre. */
export function frieze(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number): void {
  const colors = [COLORS.lapis, COLORS.gold, COLORS.turquoise, COLORS.gold];
  const step = 6;
  for (let i = 0, cx = x; cx + step <= x + w; i++, cx += step) {
    g.fillStyle(colors[i % colors.length] ?? COLORS.gold, 0.85).fillRect(cx, y, step - 1.5, 3);
  }
}

/**
 * Cartouche : l'ovale allongé qui entourait le nom des pharaons. Fond de nuit, filet doré,
 * trait de la couleur d'accent à l'intérieur et la petite barre de nœud à droite.
 */
export function drawCartouche(
  g: Phaser.GameObjects.Graphics,
  cx: number,
  cy: number,
  w: number,
  h: number,
  accent: number,
  hover = false,
): void {
  const r = Math.min(h / 2, 14);
  const left = cx - w / 2;
  const top = cy - h / 2;
  g.fillStyle(COLORS.panel, 0.92).fillRoundedRect(left, top, w, h, r);
  g.lineStyle(2, COLORS.goldDim, hover ? 1 : 0.85).strokeRoundedRect(left, top, w, h, r);
  g.lineStyle(1, accent, hover ? 1 : 0.6).strokeRoundedRect(
    left + 3,
    top + 3,
    w - 6,
    h - 6,
    Math.max(1, r - 3),
  );
  g.lineStyle(2, COLORS.gold, hover ? 1 : 0.8).lineBetween(
    left + w + 3,
    top + 4,
    left + w + 3,
    top + h - 4,
  );
}

/** Cartouche décrit par son coin haut-gauche (petits boutons des fenêtres). */
export function drawCartoucheRect(
  g: Phaser.GameObjects.Graphics,
  left: number,
  top: number,
  w: number,
  h: number,
  accent: number,
): void {
  drawCartouche(g, left + w / 2, top + h / 2, w, h, accent);
}
