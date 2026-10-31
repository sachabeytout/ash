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

// ---------- Les Bas-Fonds d'Héliopolis : la ville de néon où le soleil ne se lève presque plus ----------
function lowtown({ scene, floor, wall, arena, rng, spot, topSlots }: DecorContext): void {
  const neons = [0x7fe7ff, 0xffb02e, 0x7fffc0, 0xb08cff];
  // Enseignes néon sur le mur du haut : des hiéroglyphes (ânkh, œil, scarabée, plume).
  topSlots.forEach((x, i) => {
    const color = neons[(i + rng.int(0, 3)) % neons.length] ?? 0x7fe7ff;
    const y = arena.top + 9;
    wall.fillStyle(0x0d0a14, 1).fillRect(x - 12, arena.top + 2, 24, 14);
    wall.lineStyle(1.5, color, 0.9).strokeRect(x - 12, arena.top + 2, 24, 14);
    wall.lineStyle(1.5, color, 0.85);
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
    blink(scene, x, y, color, 1, rng, true);
  });
  // Tuyaux le long des murs latéraux.
  for (const x of [arena.left + 5, arena.right - 5]) {
    wall.lineStyle(3, 0x2a2438, 1).lineBetween(x, arena.top + 30, x, arena.bottom - 30);
    wall
      .fillStyle(0x3a3450, 1)
      .fillRect(x - 3, arena.top + 90, 6, 4)
      .fillRect(x - 3, arena.top + 200, 6, 4);
  }
  // Flaques qui reflètent les néons.
  for (let i = 0; i < 4; i++) {
    const p = spot();
    const w = 26 + rng.int(0, 20);
    floor.fillStyle(0x1a2848, 0.9).fillEllipse(p.x, p.y, w, w * 0.4);
    floor
      .fillStyle(neons[i % neons.length] ?? 0x7fe7ff, 0.5)
      .fillRect(p.x - w * 0.25, p.y - 1, w * 0.4, 1.5);
  }
  // Bouches d'aération qui fument.
  for (let i = 0; i < 2; i++) {
    const p = spot();
    floor.fillStyle(0x16141e, 1).fillCircle(p.x, p.y, 7);
    floor.lineStyle(1.5, 0x4a4560, 1).strokeCircle(p.x, p.y, 7);
    floor.lineBetween(p.x - 5, p.y, p.x + 5, p.y).lineBetween(p.x, p.y - 5, p.x, p.y + 5);
    scene.add
      .particles(p.x, p.y, 'spark', {
        speedY: { min: -18, max: -8 },
        speedX: { min: -4, max: 4 },
        lifespan: 2200,
        frequency: 260 / QUALITY_PARTICLES[settings.quality],
        scale: { start: 0.6, end: 1.4 },
        alpha: { start: 0.25, end: 0 },
        tint: 0x9a94a8,
      })
      .setDepth(1.4);
  }
  // Sable apporté par le vent, éclats de céramique et fissures.
  for (let i = 0; i < 8; i++) {
    const p = spot(20);
    if (rng.next() < 0.4) floor.fillStyle(0x2a2418, 0.7).fillEllipse(p.x, p.y, 10, 4);
    else if (rng.next() < 0.5)
      floor.fillStyle(0x3a2a20, 0.9).fillTriangle(p.x, p.y, p.x + 4, p.y + 1, p.x + 1, p.y + 3);
    else
      floor
        .lineStyle(1, 0x1a1724, 1)
        .lineBetween(p.x, p.y, p.x + rng.int(-8, 8), p.y + rng.int(4, 10));
  }
  // Obélisque brisé et jarres dans les coins du bas.
  for (const [x, y] of [
    [arena.left + 16, arena.bottom - 18],
    [arena.right - 16, arena.bottom - 18],
  ] as const) {
    wall.fillStyle(0x2a2436, 1).fillTriangle(x - 6, y + 7, x + 6, y + 7, x + 3, y - 14);
    wall.fillStyle(0x3a3450, 1).fillTriangle(x - 6, y + 7, x - 1, y + 7, x + 3, y - 14);
    wall
      .lineStyle(1, 0xffb02e, 0.5)
      .lineBetween(x, y - 4, x + 2, y - 4)
      .lineBetween(x, y, x + 2, y);
    const jx = x + (x < arena.centerX ? 14 : -14);
    wall
      .fillStyle(0x4a3020, 1)
      .fillEllipse(jx, y + 2, 9, 11)
      .fillRect(jx - 2, y - 6, 4, 3);
  }
}

// ---------- Le Nil de minuit : le fleuve noir que la barque de Râ ne traverse plus ----------
function frostserver({ scene, floor, wall, arena, rng, spot, topSlots }: DecorContext): void {
  // Colonnes à chapiteau de lotus le long du mur du haut, reflet de lune entre elles.
  topSlots.forEach((x) => {
    wall.fillStyle(0x16243a, 1).fillRect(x - 5, arena.top + 4, 10, 14);
    wall.lineStyle(1, 0x3a5a7a, 1).strokeRect(x - 5, arena.top + 4, 10, 14);
    wall
      .fillStyle(0x2c4a6a, 1)
      .fillTriangle(x - 9, arena.top + 2, x + 9, arena.top + 2, x, arena.top + 8);
    wall.lineStyle(1, 0x8ff0ff, 0.5).lineBetween(x - 5, arena.top + 12, x + 5, arena.top + 12);
    blink(scene, x, arena.top + 6, 0x8ff0ff, 0.4, rng);
  });
  // Rides sur l'eau noire.
  for (let i = 0; i < 6; i++) {
    const p = spot();
    const w = 24 + rng.int(0, 30);
    floor.lineStyle(1, 0x8ff0ff, 0.12).strokeEllipse(p.x, p.y, w, w * 0.35);
    floor.lineStyle(1, 0x8ff0ff, 0.07).strokeEllipse(p.x, p.y, w * 1.6, w * 0.55);
  }
  // Reflet de la lune (pâle) sur l'eau.
  const moon = spot(60);
  floor.fillStyle(0xd8f6ff, 0.06).fillEllipse(moon.x, moon.y, 70, 22);
  floor.fillStyle(0xd8f6ff, 0.1).fillEllipse(moon.x, moon.y, 30, 8);
  // Lotus qui flottent.
  for (let i = 0; i < 3; i++) {
    const p = spot();
    floor.fillStyle(0x1c3a3a, 1).fillCircle(p.x, p.y, 5);
    floor.fillStyle(0xd8e8ff, 0.8).fillTriangle(p.x - 3, p.y, p.x + 3, p.y, p.x, p.y - 5);
    floor.fillStyle(0xb8c8ff, 0.7).fillTriangle(p.x - 5, p.y + 1, p.x - 1, p.y, p.x - 4, p.y - 3);
    floor.fillTriangle(p.x + 5, p.y + 1, p.x + 1, p.y, p.x + 4, p.y - 3);
  }
  // Papyrus le long des murs latéraux.
  for (const x of [arena.left + 8, arena.right - 8]) {
    for (let k = 0; k < 5; k++) {
      const y = arena.top + 50 + k * 50 + rng.int(-8, 8);
      const lean = (x < arena.centerX ? 1 : -1) * rng.int(1, 4);
      wall.lineStyle(1.5, 0x2a5a4a, 1).lineBetween(x, y + 14, x + lean, y);
      wall
        .fillStyle(0x3a7a5a, 1)
        .fillTriangle(x + lean - 4, y - 3, x + lean + 4, y - 3, x + lean, y + 2);
    }
  }
}

// ---------- La Douât : le monde de la nuit, ses portes gardées et ses lacs de feu ----------
function douat({ scene, floor, wall, arena, rng, spot, topSlots }: DecorContext): void {
  // Portes de la nuit (pylônes) le long du mur du haut, un œil gravé au-dessus.
  topSlots.forEach((x) => {
    wall
      .fillStyle(0x24142c, 1)
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
  // Étoiles du plafond de la nuit, reflétées au sol.
  for (let i = 0; i < 10; i++) {
    const p = spot(16);
    floor.fillStyle(0xd8c8ff, 0.25 + rng.next() * 0.3).fillRect(p.x, p.y, 1.5, 1.5);
  }
  // Colonnes de hiéroglyphes sur les murs latéraux.
  for (const x of [arena.left + 7, arena.right - 7]) {
    for (let k = 0; k < 6; k++) {
      const y = arena.top + 40 + k * 40;
      wall.lineStyle(1, 0x6a4a7a, 0.8);
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
  // Grands blocs de calcaire : joints discrets, rangées décalées.
  floor.lineStyle(1, 0x2e2416, 0.8);
  for (let y = arena.top + 44, row = 0; y < arena.bottom; y += 44, row++) {
    floor.lineBetween(arena.left, y, arena.right, y);
    for (let x = arena.left + (row % 2 ? 36 : 72); x < arena.right; x += 72)
      floor.lineBetween(x, y - 44, x, y);
  }
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
  // Frise peinte sur le mur du haut : chasse aux oiseaux au filet, comme dans les tombeaux.
  wall.fillStyle(0x2a2012, 1).fillRect(arena.left + 10, arena.top + 3, arena.width - 20, 3);
  wall.fillStyle(0x40d0c0, 0.5);
  for (let x = arena.left + 14; x < arena.right - 14; x += 8) wall.fillRect(x, arena.top + 4, 3, 1);
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
