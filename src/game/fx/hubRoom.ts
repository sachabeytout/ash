import Phaser from 'phaser';
import { createRng } from '../../core/rng';
import { QUALITY_PARTICLES, settings } from '../../core/settings';
import { drawLotusColumn } from '../backdrop';
import { COLORS } from '../theme';
import type { TempleTheme } from '../../data/biomes';
import { TEMPLE_WALL, drawTempleRoom } from './temple';

/**
 * La Cage (retour F11) : une salle comme celles des runs, vue de plus près, plus grande que l'écran.
 * La caméra suit Ash. Retours du 02/11 (point 6) : temple de grès éclairé au feu ; les barreaux de fer
 * sombre de l'Oiseleur courent le long des murs (c'est une prison).
 */
export const HUB_ROOM = new Phaser.Geom.Rectangle(40, 34, 520, 290);

/** Grès d'Héliopolis, comme le premier monde. */
const CAGE_TEMPLE: TempleTheme = {
  floor: 0x2a2016,
  slab: 0x1f170f,
  stone: 0x6b5236,
  stoneTop: 0x8a6a44,
  joint: 0x4a3824,
  frieze: [0x2a4a8a, 0xc08a3a, 0x3aa89a, 0xc08a3a],
  glyph: 0xd8b060,
  light: 0xff9640,
};
/** Barreaux de fer sombre (plus de lueur violette). */
const IRON = 0x3a3a42;
const IRON_TOP = 0x5e5e68;

/** Sol, murs, barreaux, colonnes, torches et coins de chaque habitant. */
export function drawHubRoom(scene: Phaser.Scene): void {
  const r = HUB_ROOM;
  const pad = 400;
  scene.add.rectangle(r.centerX, r.centerY, r.width + pad * 2, r.height + pad * 2, 0x07060d);
  drawTempleRoom(scene, r, CAGE_TEMPLE);
  // Lumière chaude du brasero d'Anii au centre.
  scene.add
    .image(r.centerX, r.centerY, 'glow')
    .setTint(0xffa040)
    .setAlpha(0.1)
    .setScale((r.width / 64) * 0.9, (r.height / 64) * 0.9)
    .setBlendMode('ADD');

  const floor = scene.add.graphics().setDepth(0.5);
  // Tapis de cercles autour du brasero (le cœur de la Cage).
  floor.lineStyle(1, COLORS.goldDim, 0.22).strokeCircle(r.centerX, r.centerY + 4, 46);
  floor.lineStyle(1, COLORS.goldDim, 0.14).strokeCircle(r.centerX, r.centerY + 4, 58);
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    floor
      .fillStyle(i % 2 ? COLORS.turquoise : COLORS.gold, 0.18)
      .fillCircle(r.centerX + Math.cos(a) * 52, r.centerY + 4 + Math.sin(a) * 52, 1.5);
  }
  // Allée dallée de la porte jusqu'au brasero.
  for (let y = r.top + 34; y < r.centerY - 50; y += 14)
    floor.fillStyle(0x3a2c1c, 1).fillRect(r.centerX - 14, y, 28, 11);
  // Un tapis sous chaque coin habité (repères au sol).
  const mat = (x: number, y: number, color: number) => {
    floor.fillStyle(color, 0.06).fillRoundedRect(x - 40, y - 26, 80, 56, 8);
    floor.lineStyle(1, color, 0.18).strokeRoundedRect(x - 40, y - 26, 80, 56, 8);
  };
  mat(r.left + 74, r.top + 72, 0xffe08a); // Ptah
  mat(r.right - 74, r.top + 72, 0x7fffc0); // Thot
  mat(r.left + 74, r.bottom - 50, 0x9ab4ff); // Archives
  mat(r.right - 74, r.bottom - 50, 0xffd36b); // Trophées

  // Détails au sol (toujours les mêmes) : fissures, sable, plumes de l'Oiseleur, maillons tombés.
  const rng = createRng(0xca6e);
  const busy = [
    { x: r.centerX, y: r.centerY, d: 70 },
    { x: r.left + 74, y: r.top + 72, d: 48 },
    { x: r.right - 74, y: r.top + 72, d: 48 },
    { x: r.left + 74, y: r.bottom - 50, d: 48 },
    { x: r.right - 74, y: r.bottom - 50, d: 48 },
    { x: r.centerX, y: r.top + 40, d: 40 },
  ];
  for (let i = 0; i < 46; i++) {
    const x = r.left + 14 + rng.next() * (r.width - 28);
    const y = r.top + 30 + rng.next() * (r.height - 40);
    if (busy.some((b) => Math.hypot(x - b.x, y - b.y) < b.d)) continue;
    const kind = rng.int(0, 5);
    if (kind <= 1) {
      // Fissure en zigzag.
      floor.lineStyle(1, 0x15100a, 1);
      let px = x;
      let py = y;
      for (let k = 0; k < 3; k++) {
        const nx = px + rng.int(-6, 6);
        const ny = py + rng.int(3, 7);
        floor.lineBetween(px, py, nx, ny);
        px = nx;
        py = ny;
      }
    } else if (kind === 2) {
      floor.fillStyle(0x2a2418, 0.6).fillEllipse(x, y, 12 + rng.int(0, 10), 4 + rng.int(0, 3));
    } else if (kind === 3) {
      // Plume de l'Oiseleur, couleur de prune éteinte.
      floor.lineStyle(1, 0x6a5a80, 0.5).lineBetween(x - 4, y + 2, x + 4, y - 2);
      floor.fillStyle(0x6a5a80, 0.35).fillEllipse(x + 1, y - 1, 7, 2.5);
    } else if (kind === 4) {
      // Maillon de chaîne tombé.
      floor
        .lineStyle(1.2, 0x4a4560, 0.9)
        .strokeEllipse(x, y, 5, 3)
        .strokeEllipse(x + 4, y + 1, 5, 3);
    } else {
      // Dalle fendue, un peu plus claire.
      floor.fillStyle(0x32261a, 1).fillRect(x - 7, y - 5, 14, 10);
      floor.lineStyle(1, 0x15100a, 1).lineBetween(x - 7, y - 5, x + 3, y + 5);
    }
  }

  const wall = scene.add.graphics().setDepth(1.5);
  // Barreaux de fer de la cage : debout au-dessus du mur du haut, scellés dans les autres murs.
  const top = r.top - TEMPLE_WALL - 3;
  for (let x = r.left + 10; x < r.right - 6; x += 14) {
    if (Math.abs(x - r.centerX) < 26) continue; // la porte
    wall.lineStyle(2, IRON, 1).lineBetween(x, top - 28, x, top);
    wall.lineStyle(0.8, IRON_TOP, 1).lineBetween(x - 0.6, top - 28, x - 0.6, top);
  }
  wall
    .lineStyle(3, IRON, 1)
    .lineBetween(r.left - TEMPLE_WALL, top - 28, r.right + TEMPLE_WALL, top - 28);
  wall
    .lineStyle(1, IRON_TOP, 1)
    .lineBetween(r.left - TEMPLE_WALL, top - 29, r.right + TEMPLE_WALL, top - 29);
  const post = (x: number, y: number) => {
    wall.fillStyle(IRON, 1).fillRect(x - 1.5, y - 1.5, 3, 3);
    wall.fillStyle(IRON_TOP, 1).fillRect(x - 1.5, y - 1.5, 3, 1);
  };
  for (let y = r.top + 14; y < r.bottom; y += 14) {
    post(r.left - TEMPLE_WALL / 2, y);
    post(r.right + TEMPLE_WALL / 2, y);
  }
  for (let x = r.left + 10; x < r.right; x += 14) post(x, r.bottom + TEMPLE_WALL / 2);

  // Colonnes de lotus dans les coins du haut et de part et d'autre de la porte.
  const cols = scene.add.graphics().setDepth(1.6);
  for (const x of [r.left + 12, r.right - 12]) drawLotusColumn(cols, x, r.top - 34, r.top + 6);
  // Torches murales (flamme qui ondule doucement).
  for (const x of [r.left + 120, r.centerX - 60, r.centerX + 60, r.right - 120]) {
    wall.fillStyle(0x3a2a1c, 1).fillRect(x - 2, r.top - 8, 4, 9);
    wall.fillStyle(0xffa040, 1).fillTriangle(x - 3, r.top - 8, x + 3, r.top - 8, x, r.top - 16);
    const glow = scene.add
      .image(x, r.top - 10, 'glow')
      .setTint(0xffa040)
      .setAlpha(0.45)
      .setScale(0.9)
      .setBlendMode('ADD')
      .setDepth(1.7);
    scene.tweens.add({
      targets: glow,
      alpha: 0.25,
      duration: 500 + ((x * 7) % 400),
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut',
    });
  }

  // Atelier de Ptah : foyer de forge qui rougeoie et outils au mur.
  const fx = r.left + 30;
  const fy = r.top + 40;
  wall.fillStyle(0x2a1a10, 1).fillRoundedRect(fx - 14, fy - 10, 28, 20, 4);
  wall.fillStyle(0xff7a2a, 0.9).fillEllipse(fx, fy + 2, 16, 8);
  wall.fillStyle(0xffd36b, 0.9).fillEllipse(fx, fy + 2, 7, 3);
  const forgeGlow = scene.add
    .image(fx, fy, 'glow')
    .setTint(0xff7a2a)
    .setAlpha(0.5)
    .setScale(1.4)
    .setBlendMode('ADD')
    .setDepth(1.7);
  scene.tweens.add({ targets: forgeGlow, alpha: 0.25, duration: 700, yoyo: true, repeat: -1 });
  wall.lineStyle(1.5, 0xc0c8d8, 0.8);
  for (const dx of [40, 48, 56]) wall.lineBetween(r.left + dx, r.top + 4, r.left + dx, r.top + 16);

  // Coin de Thot : jarres de papyrus roulés le long du mur.
  for (const dx of [30, 42, 54]) {
    const x = r.right - dx;
    wall.fillStyle(0x3a3020, 1).fillRoundedRect(x - 4, r.top + 6, 8, 12, 2);
    wall
      .fillStyle(0xe8dcc0, 1)
      .fillRect(x - 3, r.top + 2, 2, 6)
      .fillRect(x + 1, r.top + 3, 2, 5);
  }

  // Braises du Phénix qui montent de toute la salle.
  scene.add
    .particles(0, r.bottom, 'ember', {
      x: { min: r.left, max: r.right },
      speedY: { min: -26, max: -10 },
      speedX: { min: -5, max: 5 },
      lifespan: 9000,
      frequency: 220 / QUALITY_PARTICLES[settings.quality],
      alpha: { start: 0.7, end: 0 },
      scale: { start: 0.6, end: 0.3 },
      tint: [COLORS.phoenix, COLORS.ember],
      blendMode: 'ADD',
    })
    .setDepth(2);
}

/** Thot, scribe à tête d'ibis, debout derrière sa table couverte de papyrus. */
export function drawThoth(g: Phaser.GameObjects.Graphics, x: number, y: number): void {
  // Corps : pagne de lin clair, torse, bras qui tient le calame.
  g.fillStyle(0x2a5a7a, 1).fillRect(x - 6, y - 14, 12, 10); // collier-pectoral bleu
  g.fillStyle(0x6a4a30, 1).fillRect(x - 5, y - 6, 10, 6); // torse
  g.fillStyle(0xe8dcc0, 1).fillRect(x - 6, y, 12, 9); // pagne
  g.fillStyle(0x6a4a30, 1)
    .fillRect(x - 5, y + 9, 3, 6)
    .fillRect(x + 2, y + 9, 3, 6);
  g.fillStyle(COLORS.gold, 1).fillRect(x - 6, y - 15, 12, 2);
  // Tête d'ibis noire, long bec courbé, œil turquoise.
  g.fillStyle(0x14121c, 1).fillCircle(x, y - 19, 5);
  g.lineStyle(2, 0x14121c, 1);
  g.beginPath();
  g.arc(x + 12, y - 19, 10, Math.PI * 1.05, Math.PI * 1.55, false);
  g.strokePath();
  g.fillStyle(0x7fffc0, 1).fillCircle(x + 2, y - 20, 1.2);
  // Perruque tripartite bleue qui tombe sur les épaules.
  g.fillStyle(0x2a3a8a, 1).fillRect(x - 6, y - 19, 3, 8);
  // Table de scribe devant lui, papyrus déroulé, palette et calame.
  g.fillStyle(0x4a3020, 1).fillRect(x - 16, y + 6, 32, 5);
  g.fillRect(x - 14, y + 11, 3, 6).fillRect(x + 11, y + 11, 3, 6);
  g.fillStyle(0xe8dcc0, 1).fillRect(x - 13, y + 3, 16, 4);
  g.lineStyle(0.8, 0x6a5a40, 1).lineBetween(x - 11, y + 5, x + 1, y + 5);
  g.fillStyle(0x14121c, 1).fillRect(x + 6, y + 3, 7, 3);
  g.lineStyle(1, 0x7fffc0, 0.9).lineBetween(x + 6, y - 4, x + 3, y + 3);
}
