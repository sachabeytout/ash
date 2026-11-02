import Phaser from 'phaser';
import type { Rng } from '../../core/rng';
import type { BiomeDef } from '../../data/biomes';
import { QUALITY_PARTICLES, settings } from '../../core/settings';

/** Remplit un polygone (points simples, sans Vector2). */
function fillPoly(g: Phaser.GameObjects.Graphics, pts: readonly { x: number; y: number }[]): void {
  g.beginPath();
  pts.forEach((p, i) => (i === 0 ? g.moveTo(p.x, p.y) : g.lineTo(p.x, p.y)));
  g.closePath();
  g.fillPath();
}

/**
 * Décor propre à chaque monde. Il reste discret (couleurs sombres, sous les personnages et les
 * pièges), n'emploie jamais le rouge-magenta des dangers et ne ressemble à aucun piège :
 * la lecture du combat passe avant tout.
 */
interface Zone {
  x: number;
  y: number;
  r: number;
}

export function drawBiomeDecor(
  scene: Phaser.Scene,
  biome: BiomeDef,
  arena: Phaser.Geom.Rectangle,
  rng: Rng,
  keepOut: readonly Zone[],
): void {
  const floor = scene.add.graphics().setDepth(0.5);
  const wall = scene.add.graphics().setDepth(1.5);
  // Un point de sol libre (loin de l'entrée, des portes et du centre).
  const spot = (margin = 40): { x: number; y: number } => {
    for (let i = 0; i < 20; i++) {
      const p = {
        x: arena.left + margin + rng.next() * (arena.width - margin * 2),
        y: arena.top + margin + rng.next() * (arena.height - margin * 2),
      };
      if (keepOut.every((k) => Math.hypot(p.x - k.x, p.y - k.y) > k.r)) return p;
    }
    return { x: arena.left + margin, y: arena.bottom - margin };
  };
  // Le long du mur du haut, hors des portes (centre ± 150).
  const topSlots = [arena.left + 34, arena.left + 90, arena.right - 90, arena.right - 34];
  const ctx: DecorContext = { scene, floor, wall, arena, rng, spot, topSlots };
  switch (biome.id) {
    case 'lowtown':
      lowtown(ctx);
      break;
    case 'frostserver':
      frostserver(ctx);
      break;
    case 'aviary':
      aviary(ctx);
      break;
    case 'douat':
      douat(ctx);
      break;
  }
}

interface DecorContext {
  scene: Phaser.Scene;
  floor: Phaser.GameObjects.Graphics;
  wall: Phaser.GameObjects.Graphics;
  arena: Phaser.Geom.Rectangle;
  rng: Rng;
  spot: (margin?: number) => { x: number; y: number };
  topSlots: number[];
}

/** Petit halo qui clignote ou grésille (néon, voyant). */
function blink(
  scene: Phaser.Scene,
  x: number,
  y: number,
  color: number,
  scale: number,
  rng: Rng,
  flicker = false,
): void {
  const glow = scene.add
    .image(x, y, 'glow')
    .setTint(color)
    .setAlpha(0.35)
    .setScale(scale)
    .setBlendMode('ADD')
    .setDepth(1.6);
  scene.tweens.add({
    targets: glow,
    alpha: flicker ? 0.1 : 0.15,
    duration: flicker ? 80 : 600 + rng.int(0, 900),
    yoyo: true,
    repeat: -1,
    repeatDelay: flicker ? 1500 + rng.int(0, 2500) : rng.int(0, 600),
  });
}

// ---------- Éléments communs aux salles de temple (retours du 02/11, point 6) ----------

/** Hiéroglyphes peints sur le mur du haut (ânkh, œil, scarabée, plume de Maât). */
function paintGlyphs(
  wall: Phaser.GameObjects.Graphics,
  arena: Phaser.Geom.Rectangle,
  slots: readonly number[],
  rng: Rng,
  paint: readonly number[],
): void {
  const y = arena.top - 7;
  slots.forEach((x, i) => {
    const color = paint[(i + rng.int(0, 3)) % paint.length] ?? 0xd8b060;
    wall.lineStyle(1.5, color, 1);
    switch ((i + rng.int(0, 3)) % 4) {
      case 0: // ânkh
        wall.strokeEllipse(x, y - 2, 4, 5).lineBetween(x - 4, y + 1, x + 4, y + 1);
        wall.lineBetween(x, y + 1, x, y + 5);
        break;
      case 1: // œil
        wall.strokeEllipse(x, y, 12, 5).fillStyle(color, 1).fillCircle(x, y, 1.5);
        wall.lineBetween(x - 1, y + 3, x - 3, y + 6);
        break;
      case 2: // scarabée
        wall.strokeEllipse(x, y, 6, 8).lineBetween(x, y - 4, x, y + 4);
        wall.lineBetween(x - 3, y - 2, x - 7, y - 4).lineBetween(x + 3, y - 2, x + 7, y - 4);
        break;
      default: // plume de Maât
        wall.lineBetween(x, y - 5, x, y + 5).strokeEllipse(x + 2, y - 1, 4, 8);
    }
  });
}

/** Colonnes à chapiteau de lotus, à moitié prises dans les murs de côté (vues de dessus). */
function wallColumns(
  wall: Phaser.GameObjects.Graphics,
  arena: Phaser.Geom.Rectangle,
  c: { stone: number; top: number; ring: number; cap: number },
): void {
  for (const x of [arena.left - 2, arena.right + 2]) {
    for (const cy of [arena.top + 70, arena.bottom - 70]) {
      wall.fillStyle(0x000000, 0.3).fillCircle(x + 1.5, cy + 2, 9);
      wall.fillStyle(c.stone, 1).fillCircle(x, cy, 9);
      wall.fillStyle(c.top, 1).fillCircle(x, cy, 7);
      wall.lineStyle(1, c.ring, 1).strokeCircle(x, cy, 5);
      wall.fillStyle(c.cap, 1).fillCircle(x, cy, 2.5);
    }
  }
}

// ---------- Héliopolis : temple de grès éclairé au feu (retours du 02/11, point 6) ----------
function lowtown({ scene, floor, wall, arena, rng, spot, topSlots }: DecorContext): void {
  paintGlyphs(wall, arena, topSlots, rng, [0xd8b060, 0x2a4a8a, 0x3aa89a, 0xc08a3a]);
  wallColumns(wall, arena, { stone: 0x8a7050, top: 0xa08560, ring: 0x3aa89a, cap: 0xc8a060 });
  // Palmiers en jarre contre les murs de côté, entre les colonnes (ils ne gênent pas le passage).
  for (const side of [-1, 1]) {
    const p = {
      x: side < 0 ? arena.left + 22 : arena.right - 22,
      y: arena.centerY + rng.int(-24, 24),
    };
    floor.fillStyle(0x000000, 0.3).fillEllipse(p.x + 2, p.y + 3, 16, 8);
    floor.fillStyle(0x7a4a2a, 1).fillCircle(p.x, p.y, 5);
    for (let k = 0; k < 7; k++) {
      const a = (k / 7) * Math.PI * 2 + rng.next();
      const fx = p.x + Math.cos(a) * 7;
      const fy = p.y + Math.sin(a) * 7;
      floor.fillStyle(k % 2 ? 0x3e6a2e : 0x4e7a34, 1);
      floor.fillTriangle(
        p.x + Math.cos(a + 0.35) * 2,
        p.y + Math.sin(a + 0.35) * 2,
        p.x + Math.cos(a - 0.35) * 2,
        p.y + Math.sin(a - 0.35) * 2,
        fx + Math.cos(a) * 5,
        fy + Math.sin(a) * 5,
      );
    }
    floor.fillStyle(0x5a3a1e, 1).fillCircle(p.x, p.y, 2.2);
  }
  // Sable apporté par le vent et fissures dans les dalles.
  for (let i = 0; i < 8; i++) {
    const p = spot(20);
    if (rng.next() < 0.55) floor.fillStyle(0x4a3a22, 0.55).fillEllipse(p.x, p.y, 14, 5);
    else
      floor
        .lineStyle(1, 0x15100a, 1)
        .lineBetween(p.x, p.y, p.x + rng.int(-8, 8), p.y + rng.int(4, 10));
  }
  // Obélisque brisé et jarres dans les coins du bas (à côté des braseros).
  for (const [x, y] of [
    [arena.left + 28, arena.bottom - 16],
    [arena.right - 28, arena.bottom - 16],
  ] as const) {
    wall.fillStyle(0x7a6040, 1).fillTriangle(x - 6, y + 7, x + 6, y + 7, x + 3, y - 14);
    wall.fillStyle(0x9a7a50, 1).fillTriangle(x - 6, y + 7, x - 1, y + 7, x + 3, y - 14);
    wall
      .lineStyle(1, 0x3a2a1a, 0.7)
      .lineBetween(x, y - 4, x + 2, y - 4)
      .lineBetween(x, y, x + 2, y);
    const jx = x + (x < arena.centerX ? 14 : -14);
    wall
      .fillStyle(0x8a5030, 1)
      .fillEllipse(jx, y + 2, 9, 11)
      .fillRect(jx - 2, y - 6, 4, 3);
  }
  void scene;
}

// ---------- Le Nil de minuit : le fleuve noir que la barque de Râ ne traverse plus ----------
function frostserver({ scene, floor, wall, arena, rng, spot, topSlots }: DecorContext): void {
  // Temple au bord du Nil, la nuit (retours du 02/11, point 6) : calcaire gris-bleu, frise argentée.
  paintGlyphs(wall, arena, topSlots, rng, [0xc8d4e8, 0x2a4a8a, 0x3aa89a, 0xc8d4e8]);
  wallColumns(wall, arena, { stone: 0x5a606c, top: 0x767c88, ring: 0x3aa89a, cap: 0xc8d4e8 });
  // Bassins d'eau sombre, rides argentées et lotus qui flottent.
  for (let i = 0; i < 3; i++) {
    const p = spot(50);
    const w = 40 + rng.int(0, 24);
    floor.fillStyle(0x0a1018, 0.95).fillEllipse(p.x, p.y, w, w * 0.45);
    floor.lineStyle(1, 0x5a6a7a, 0.8).strokeEllipse(p.x, p.y, w, w * 0.45);
    floor.lineStyle(1, 0xc8d4e8, 0.12).strokeEllipse(p.x, p.y, w * 0.6, w * 0.25);
    const lx = p.x + rng.int(-6, 6);
    const ly = p.y + rng.int(-3, 3);
    floor.fillStyle(0x1c3a3a, 1).fillCircle(lx, ly, 4);
    floor.fillStyle(0xe8e8f8, 0.85).fillTriangle(lx - 2.5, ly, lx + 2.5, ly, lx, ly - 4);
  }
  // Reflet de la lune (argent pâle) dans le plus grand bassin.
  const moon = spot(70);
  floor.fillStyle(0x0a1018, 0.95).fillEllipse(moon.x, moon.y, 76, 28);
  floor.lineStyle(1, 0x5a6a7a, 0.8).strokeEllipse(moon.x, moon.y, 76, 28);
  floor.fillStyle(0xd8e4f0, 0.1).fillEllipse(moon.x, moon.y, 46, 14);
  floor.fillStyle(0xe8f0f8, 0.22).fillEllipse(moon.x, moon.y, 16, 5);
  // Papyrus et roseaux le long des murs de côté (berges du fleuve).
  for (const x of [arena.left + 8, arena.right - 8]) {
    for (let k = 0; k < 5; k++) {
      const y = arena.top + 50 + k * 50 + rng.int(-8, 8);
      const lean = (x < arena.centerX ? 1 : -1) * rng.int(1, 4);
      wall.lineStyle(1.5, 0x2a5a4a, 1).lineBetween(x, y + 14, x + lean, y);
      wall
        .fillStyle(0x3a7a5a, 1)
        .fillTriangle(x + lean - 4, y - 3, x + lean + 4, y - 3, x + lean, y + 2);
      wall.lineStyle(1, 0x5a7a4a, 1).lineBetween(x + lean * 2, y + 14, x + lean * 3, y + 2);
    }
  }
  void scene;
}

// ---------- La Douât : le monde de la nuit, ses portes gardées et ses lacs de feu ----------
function douat({ scene, floor, wall, arena, rng, spot, topSlots }: DecorContext): void {
  // Murs de basalte noir (retours du 02/11, point 6) : hiéroglyphes peints or et vert des âmes.
  paintGlyphs(wall, arena, topSlots, rng, [0x7fd8a0, 0xc8a040, 0x7fd8a0, 0x2a4a8a]);
  // Portes de la nuit (pylônes) le long du mur du haut, un œil gravé au-dessus.
  topSlots.forEach((x) => {
    wall
      .fillStyle(0x1e1e24, 1)
      .fillTriangle(x - 13, arena.top + 18, x - 7, arena.top + 2, x - 3, arena.top + 18);
    wall.fillTriangle(x + 13, arena.top + 18, x + 7, arena.top + 2, x + 3, arena.top + 18);
    wall.fillStyle(0x07060d, 1).fillRect(x - 3, arena.top + 8, 6, 10);
    wall.lineStyle(1, 0xffb02e, 0.7).strokeEllipse(x, arena.top + 5, 8, 3.5);
    wall.fillStyle(0xffb02e, 0.9).fillCircle(x, arena.top + 5, 1);
    blink(scene, x, arena.top + 5, 0xffb02e, 0.5, rng, true);
  });
  // Lacs de feu (orange, jamais le rouge des dangers), bordés de pierre.
  for (let i = 0; i < 3; i++) {
    const p = spot();
    const w = 26 + rng.int(0, 16);
    floor.fillStyle(0x1a1018, 1).fillEllipse(p.x, p.y, w + 6, (w + 6) * 0.45);
    floor.fillStyle(0xff8a2a, 0.35).fillEllipse(p.x, p.y, w, w * 0.4);
    floor.fillStyle(0xffd27a, 0.35).fillEllipse(p.x - w * 0.15, p.y - 1, w * 0.35, w * 0.1);
    blink(scene, p.x, p.y, 0xff8a2a, 0.9, rng);
  }
  // Traces sinueuses du serpent dans la poussière.
  for (let i = 0; i < 2; i++) {
    const a = spot(40);
    floor.lineStyle(3, 0x1e1222, 1).beginPath();
    floor.moveTo(a.x, a.y);
    for (let k = 1; k <= 6; k++) floor.lineTo(a.x + k * 10, a.y + Math.sin(k * 1.3) * 7);
    floor.strokePath();
  }
  // Âmes des défunts : petites lueurs vert pâle qui flottent lentement dans la salle.
  scene.add
    .particles(0, 0, 'glow', {
      x: { min: arena.left + 20, max: arena.right - 20 },
      y: { min: arena.top + 30, max: arena.bottom - 20 },
      speedX: { min: -6, max: 6 },
      speedY: { min: -8, max: -2 },
      lifespan: 6000,
      frequency: 900 / QUALITY_PARTICLES[settings.quality],
      scale: { start: 0.18, end: 0.05 },
      alpha: { start: 0.6, end: 0 },
      tint: 0x9fe8b0,
      blendMode: 'ADD',
    })
    .setDepth(1.4);
  // Colonnes de hiéroglyphes sur les murs latéraux.
  for (const x of [arena.left + 7, arena.right - 7]) {
    for (let k = 0; k < 6; k++) {
      const y = arena.top + 40 + k * 40;
      wall.lineStyle(1, 0x7fd8a0, 0.7);
      if (k % 3 === 0) wall.strokeEllipse(x, y, 6, 3);
      else if (k % 3 === 1) wall.lineBetween(x - 3, y, x + 3, y).lineBetween(x, y - 3, x, y + 3);
      else wall.strokeCircle(x, y, 2.5);
    }
  }
  // Braises qui montent des lacs de feu.
  scene.add
    .particles(0, 0, 'spark', {
      x: { min: arena.left, max: arena.right },
      y: { min: arena.top + 30, max: arena.bottom },
      speedY: { min: -14, max: -5 },
      speedX: { min: -3, max: 3 },
      lifespan: 4000,
      frequency: 320 / QUALITY_PARTICLES[settings.quality],
      scale: { min: 0.2, max: 0.45 },
      alpha: { start: 0.6, end: 0 },
      tint: 0xffb02e,
    })
    .setDepth(1.4);
}

// ---------- La Pyramide aux cages : la pyramide dont l'Oiseleur a fait sa volière ----------
function aviary({ scene, floor, wall, arena, rng, spot, topSlots }: DecorContext): void {
  // Murs de calcaire doré (retours du 02/11, point 6) : hiéroglyphes peints sur le mur du haut.
  paintGlyphs(wall, arena, topSlots, rng, [0xd8a840, 0x2a4a9a, 0x40d0c0, 0xd8a840]);
  // Rayon de lumière dorée tombé d'un conduit vers les étoiles, avec sa poussière.
  const beamX = arena.left + arena.width * (0.3 + rng.next() * 0.4);
  const beam = scene.add.graphics().setDepth(0.6).setBlendMode('ADD');
  beam.fillStyle(0xffd36b, 0.05);
  fillPoly(beam, [
    { x: beamX - 14, y: arena.top },
    { x: beamX + 14, y: arena.top },
    { x: beamX + 70, y: arena.bottom },
    { x: beamX + 10, y: arena.bottom },
  ]);
  beam.fillStyle(0xffd36b, 0.05).fillEllipse(beamX + 40, arena.bottom - 30, 70, 26);
  scene.add
    .particles(0, 0, 'spark', {
      x: { min: beamX - 4, max: beamX + 40 },
      y: { min: arena.top + 10, max: arena.bottom - 20 },
      speedX: { min: -3, max: 3 },
      speedY: { min: -4, max: 4 },
      lifespan: 5000,
      frequency: 500 / QUALITY_PARTICLES[settings.quality],
      scale: { min: 0.15, max: 0.3 },
      alpha: { start: 0.6, end: 0 },
      tint: 0xffe08a,
      blendMode: 'ADD',
    })
    .setDepth(1.4);
  // Cages dorées suspendues (certaines vides, porte ouverte ; d'autres avec un oiseau qui luit).
  topSlots.forEach((x, i) => {
    const y = arena.top + 8;
    wall.lineStyle(1, 0x8a6a3a, 1).lineBetween(x, arena.top, x, y);
    wall.fillStyle(0x1a140c, 0.9).fillEllipse(x, y + 9, 14, 16);
    wall.lineStyle(1, 0xd8a840, 1).strokeEllipse(x, y + 9, 14, 16);
    wall.lineBetween(x - 3, y + 2, x - 3, y + 16).lineBetween(x + 3, y + 2, x + 3, y + 16);
    wall.lineStyle(1.5, 0xd8a840, 1).lineBetween(x - 7, y + 15, x + 7, y + 15);
    if (i % 2 === 0) {
      wall
        .fillStyle(0xffe08a, 1)
        .fillEllipse(x, y + 11, 5, 4)
        .fillCircle(x + 2, y + 9, 1.5);
      blink(scene, x, y + 10, 0xffd36b, 0.5, rng);
    } else {
      // Porte ouverte : Anii est passée par là.
      wall.lineStyle(1, 0xd8a840, 1).lineBetween(x + 7, y + 6, x + 12, y + 9);
    }
  });
  // Torches le long des murs latéraux, colonnes de hiéroglyphes entre elles.
  for (const x of [arena.left + 5, arena.right - 5]) {
    for (let k = 0; k < 2; k++) {
      const y = arena.top + 90 + k * 140;
      wall.fillStyle(0x4a3418, 1).fillRect(x - 2, y, 4, 8);
      wall.fillStyle(0xffa040, 1).fillTriangle(x - 3, y, x + 3, y, x, y - 7);
      wall.fillStyle(0xffe08a, 1).fillTriangle(x - 1.5, y, x + 1.5, y, x, y - 4);
      blink(scene, x, y - 3, 0xffa040, 0.8, rng);
    }
    for (let k = 0; k < 5; k++) {
      const y = arena.top + 40 + k * 46;
      if (Math.abs(y - (arena.top + 90)) < 14 || Math.abs(y - (arena.top + 230)) < 14) continue;
      wall.lineStyle(1, 0x8a6a3a, 0.8);
      if (k % 3 === 0) wall.strokeTriangle(x - 3, y + 3, x + 3, y + 3, x, y - 3);
      else if (k % 3 === 1) wall.strokeEllipse(x, y, 6, 3).strokeCircle(x, y, 0.8);
      else wall.lineBetween(x, y - 3, x, y + 3).lineBetween(x - 2, y - 1, x + 2, y - 1);
    }
  }
  // Sarcophage doré dans un coin, jarres canopes et cage vide dans l'autre.
  const flip = rng.next() < 0.5;
  const [sx, cx] = flip ? [arena.right - 20, arena.left + 22] : [arena.left + 20, arena.right - 22];
  const sy = arena.bottom - 26;
  wall.fillStyle(0x3a2810, 1).fillEllipse(sx, sy, 14, 34);
  wall.fillStyle(0xd8a840, 1).fillEllipse(sx, sy, 11, 31);
  wall
    .fillStyle(0x2a4a9a, 1)
    .fillRect(sx - 5, sy - 8, 10, 2)
    .fillRect(sx - 5, sy + 2, 10, 2);
  wall.fillStyle(0xe8c890, 1).fillCircle(sx, sy - 11, 3);
  wall.fillStyle(0x2a4a9a, 1).fillRect(sx - 4, sy - 15, 8, 2);
  const cy = arena.bottom - 16;
  for (let k = 0; k < 3; k++) {
    const jx = cx + (k - 1) * 8;
    wall.fillStyle(0xb89868, 1).fillEllipse(jx, cy, 6, 9);
    wall.fillStyle(0x8a6a3a, 1).fillCircle(jx, cy - 5, 2.2);
  }
  wall.lineStyle(1, 0x8a7a5a, 0.9).strokeEllipse(cx, cy - 18, 12, 12);
  wall.lineBetween(cx, cy - 24, cx, cy - 12).lineBetween(cx - 5, cy - 14, cx + 5, cy - 14);
  // Dunes de sable apportées par le vent, et petits tas sous les fissures du plafond.
  for (let i = 0; i < 5; i++) {
    const p = spot(24);
    const w = 18 + rng.int(0, 22);
    floor.fillStyle(0x3a2c18, 0.55).fillEllipse(p.x, p.y, w, w * 0.35);
    floor.fillStyle(0x4a3a20, 0.4).fillEllipse(p.x - w * 0.1, p.y - 1, w * 0.5, w * 0.15);
  }
  for (let i = 0; i < 2; i++) {
    const p = spot(40);
    floor.fillStyle(0x5a4426, 0.7).fillEllipse(p.x, p.y, 10, 5);
    scene.add
      .particles(p.x, p.y - 40, 'spark', {
        x: { min: -1, max: 1 },
        speedY: { min: 40, max: 55 },
        lifespan: 800,
        frequency: 70 / QUALITY_PARTICLES[settings.quality],
        scale: { min: 0.15, max: 0.25 },
        alpha: { start: 0.7, end: 0.4 },
        tint: 0xe0c080,
      })
      .setDepth(1.4);
  }
  // Plumes oubliées par les oiseaux de l'Oiseleur.
  for (let i = 0; i < 4; i++) {
    const p = spot(20);
    const a = rng.next() * Math.PI;
    floor
      .lineStyle(1, 0xd8d0e8, 0.45)
      .lineBetween(p.x, p.y, p.x + Math.cos(a) * 6, p.y + Math.sin(a) * 6);
  }
}
