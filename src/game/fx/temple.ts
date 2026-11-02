import Phaser from 'phaser';
import type { TempleTheme } from '../../data/biomes';

/** Épaisseur des murs des salles de temple (retours du 02/11, point 6). */
export const TEMPLE_WALL = 14;

/**
 * Salle de temple éclairée au feu (retours du 02/11, point 6), commune aux salles des runs, à la Cage
 * et au comptoir de Ratatosk : sol de grandes dalles, murs tout autour de `room` (blocs de pierre ou
 * planches), frise peinte au-dessus du mur du haut, braseros ou lanternes dans les coins.
 */
export function drawTempleRoom(
  scene: Phaser.Scene,
  room: Phaser.Geom.Rectangle,
  t: TempleTheme,
): void {
  const a = room;
  const wall = TEMPLE_WALL;
  scene.add.rectangle(a.centerX, a.centerY, a.width, a.height, t.floor);
  // Dalles (ou lattes) en appareil décalé, à peine visibles : le sol reste calme pour lire le combat.
  const floor = scene.add.graphics().setDepth(0.4);
  floor.lineStyle(1, t.slab, 0.5);
  const rowH = t.walls === 'planks' ? 16 : 24;
  const colW = t.walls === 'planks' ? 64 : 36;
  for (let y = a.top, row = 0; y < a.bottom; y += rowH, row++) {
    if (y > a.top) floor.lineBetween(a.left, y, a.right, y);
    for (let x = a.left + (row % 2) * (colW / 2); x < a.right; x += colW)
      if (x > a.left) floor.lineBetween(x, y, x, Math.min(a.bottom, y + rowH));
  }
  // Lumière chaude qui baigne la salle.
  scene.add
    .image(a.centerX, a.centerY, 'glow')
    .setTint(t.light)
    .setAlpha(0.06)
    .setScale((a.width / 64) * 1.2, (a.height / 64) * 1.2)
    .setBlendMode('ADD');
  const g = scene.add.graphics().setDepth(1.4);
  // Murs tout autour, joints, arête éclairée côté salle.
  g.fillStyle(t.stone, 1)
    .fillRect(a.left - wall, a.top - wall, a.width + wall * 2, wall)
    .fillRect(a.left - wall, a.bottom, a.width + wall * 2, wall)
    .fillRect(a.left - wall, a.top, wall, a.height)
    .fillRect(a.right, a.top, wall, a.height);
  g.lineStyle(1, t.joint, 1);
  if (t.walls === 'planks') drawPlankJoints(g, a, wall);
  else drawBlockJoints(g, a, wall);
  g.lineStyle(1.5, t.stoneTop, 1).strokeRectShape(a);
  // Frise peinte au-dessus du mur du haut (aucune si la liste de couleurs est vide).
  if (t.frieze.length > 0) {
    for (let x = a.left - wall, i = 0; x < a.right + wall; x += 6, i++) {
      g.fillStyle(t.frieze[i % t.frieze.length] ?? t.glyph, 1).fillRect(x, a.top - wall - 3, 5, 3);
    }
  }
  // Braseros (ou lanternes) dans les quatre coins, avec une lueur qui vacille.
  const inset = 9;
  for (const [x, y] of [
    [a.left + inset, a.top + inset],
    [a.right - inset, a.top + inset],
    [a.left + inset, a.bottom - inset],
    [a.right - inset, a.bottom - inset],
  ] as const) {
    if (t.corner === 'lantern') {
      g.fillStyle(0x2a1c12, 1).fillRect(x - 4, y - 6, 8, 12);
      g.fillStyle(0xffc46b, 1).fillRect(x - 2, y - 3, 4, 6);
      g.lineStyle(1, 0x5a3a1c, 1).lineBetween(x, y - 6, x, y - 10);
    } else {
      g.fillStyle(0x3a2a1c, 1).fillCircle(x, y, 5);
      g.fillStyle(0xff7a2a, 1).fillCircle(x, y, 3.6);
      g.fillStyle(0xffd36b, 1).fillCircle(x, y - 0.5, 2);
    }
    const light = scene.add
      .image(x, y, 'glow')
      .setTint(t.light)
      .setAlpha(0.55)
      .setScale(1.6)
      .setBlendMode('ADD')
      .setDepth(1.5);
    scene.tweens.add({
      targets: light,
      alpha: 0.38,
      scale: 1.45,
      duration: 380 + ((x + y) % 7) * 60,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut',
    });
  }
}

/** Blocs de pierre : deux rangées par mur, joints décalés. */
function drawBlockJoints(
  g: Phaser.GameObjects.Graphics,
  a: Phaser.Geom.Rectangle,
  wall: number,
): void {
  for (const y of [a.top - wall, a.bottom]) {
    g.lineBetween(a.left - wall, y + wall / 2, a.right + wall, y + wall / 2);
    for (let x = a.left - wall, i = 0; x < a.right + wall; x += 16, i++) {
      const off = i % 2 === 0 ? 0 : wall / 2;
      g.lineBetween(x, y + off, x, y + off + wall / 2);
    }
  }
  for (const x of [a.left - wall, a.right]) {
    g.lineBetween(x + wall / 2, a.top, x + wall / 2, a.bottom);
    for (let y = a.top, i = 0; y < a.bottom; y += 16, i++) {
      const off = i % 2 === 0 ? 0 : wall / 2;
      g.lineBetween(x + off, y, x + off + wall / 2, y);
    }
  }
}

/** Planches de bois : longues lames dans le sens du mur, quelques clous. */
function drawPlankJoints(
  g: Phaser.GameObjects.Graphics,
  a: Phaser.Geom.Rectangle,
  wall: number,
): void {
  for (const y of [a.top - wall, a.bottom]) {
    for (const k of [wall / 3, (wall * 2) / 3])
      g.lineBetween(a.left - wall, y + k, a.right + wall, y + k);
    for (let x = a.left - wall + 30; x < a.right + wall; x += 60) g.lineBetween(x, y, x, y + wall);
  }
  for (const x of [a.left - wall, a.right]) {
    for (const k of [wall / 3, (wall * 2) / 3]) g.lineBetween(x + k, a.top, x + k, a.bottom);
    for (let y = a.top + 30; y < a.bottom; y += 60) g.lineBetween(x, y, x + wall, y);
  }
}
