import Phaser from 'phaser';
import type { Rng } from '../../core/rng';
import type { BiomeDef } from '../../data/biomes';
import { QUALITY_PARTICLES, settings } from '../../core/settings';

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
    case 'olympus':
      olympus(ctx);
      break;
    case 'aviary':
      aviary(ctx);
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

// ---------- Les Bas-Fonds : ruelles de néon ----------
function lowtown({ scene, floor, wall, arena, rng, spot, topSlots }: DecorContext): void {
  const neons = [0x7fe7ff, 0xffb02e, 0x7fffc0, 0xb08cff];
  // Enseignes néon sur le mur du haut.
  topSlots.forEach((x, i) => {
    const color = neons[(i + rng.int(0, 3)) % neons.length] ?? 0x7fe7ff;
    wall.fillStyle(0x0d0a14, 1).fillRect(x - 16, arena.top + 3, 32, 11);
    wall.lineStyle(1.5, color, 0.9).strokeRect(x - 16, arena.top + 3, 32, 11);
    wall.lineStyle(1.5, color, 0.8);
    wall.lineBetween(x - 11, arena.top + 8, x - 3, arena.top + 8);
    wall.lineBetween(x + 1, arena.top + 6, x + 1, arena.top + 11);
    wall.lineBetween(x + 5, arena.top + 8, x + 11, arena.top + 8);
    blink(scene, x, arena.top + 9, color, 1, rng, true);
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
  // Plaques d'égout qui fument.
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
  // Papiers et fissures.
  for (let i = 0; i < 8; i++) {
    const p = spot(20);
    if (rng.next() < 0.5) floor.fillStyle(0x2a2636, 0.9).fillRect(p.x, p.y, 4, 3);
    else
      floor
        .lineStyle(1, 0x1a1724, 1)
        .lineBetween(p.x, p.y, p.x + rng.int(-8, 8), p.y + rng.int(4, 10));
  }
  // Poubelles et caisses dans les coins.
  for (const [x, y] of [
    [arena.left + 16, arena.bottom - 18],
    [arena.right - 16, arena.bottom - 18],
  ] as const) {
    wall.fillStyle(0x1e2a2a, 1).fillRect(x - 7, y - 9, 14, 16);
    wall.fillStyle(0x2c3c3c, 1).fillRect(x - 8, y - 11, 16, 3);
    wall.fillStyle(0x3a2a18, 1).fillRect(x + (x < arena.centerX ? 10 : -22), y - 6, 12, 12);
  }
}

// ---------- Le Givre-Serveur : datacenter gelé ----------
function frostserver({ scene, floor, wall, arena, rng, spot, topSlots }: DecorContext): void {
  // Baies de serveurs le long du mur du haut, voyants qui clignotent.
  topSlots.forEach((x) => {
    wall.fillStyle(0x0e1622, 1).fillRect(x - 13, arena.top + 2, 26, 14);
    wall.lineStyle(1, 0x4a6a8a, 1).strokeRect(x - 13, arena.top + 2, 26, 14);
    for (let r = 0; r < 3; r++)
      wall.fillStyle(0x1c2a3a, 1).fillRect(x - 11, arena.top + 4 + r * 4, 22, 2);
    for (let k = 0; k < 2; k++) {
      const color = rng.next() < 0.5 ? 0x7fffc0 : 0x8ff0ff;
      wall.fillStyle(color, 1).fillRect(x + 6 + k * 3, arena.top + 4 + k * 4, 1.5, 1.5);
      blink(scene, x + 7 + k * 3, arena.top + 5 + k * 4, color, 0.35, rng);
    }
    // Stalactites sous la baie.
    wall.fillStyle(0xd8f6ff, 0.8);
    for (let k = -1; k <= 1; k++) {
      const h = 4 + rng.int(0, 5);
      wall.fillTriangle(
        x + k * 7 - 2,
        arena.top + 16,
        x + k * 7 + 2,
        arena.top + 16,
        x + k * 7,
        arena.top + 16 + h,
      );
    }
  });
  // Plaques de givre.
  for (let i = 0; i < 5; i++) {
    const p = spot();
    const w = 30 + rng.int(0, 30);
    floor.fillStyle(0xbfe8ff, 0.1).fillEllipse(p.x, p.y, w, w * 0.6);
    floor.lineStyle(1, 0xd8f6ff, 0.2).strokeEllipse(p.x, p.y, w, w * 0.6);
  }
  // Câbles gelés (lignes ondulées) et grilles au sol.
  for (let i = 0; i < 3; i++) {
    const a = spot(30);
    floor.lineStyle(2, 0x1c2a3a, 1).beginPath();
    floor.moveTo(a.x, a.y);
    for (let s = 1; s <= 4; s++) floor.lineTo(a.x + s * 14, a.y + Math.sin(s * 1.4) * 5);
    floor.strokePath();
  }
  for (let i = 0; i < 2; i++) {
    const p = spot();
    floor.lineStyle(1, 0x2a3a4a, 0.9).strokeRect(p.x - 9, p.y - 6, 18, 12);
    for (let k = -6; k <= 6; k += 3) floor.lineBetween(p.x + k, p.y - 6, p.x + k, p.y + 6);
  }
}

// ---------- L'Olympe Corporatif : tours de verre ----------
function olympus({ scene, floor, wall, arena, rng, spot, topSlots }: DecorContext): void {
  // Tapis pourpre de l'entrée jusqu'à la porte, liseré doré.
  const cx = arena.centerX;
  floor.fillStyle(0x2a1a40, 0.55).fillRect(cx - 14, arena.top + 30, 28, arena.height - 30);
  floor.lineStyle(1, 0xc8a050, 0.4).lineBetween(cx - 14, arena.top + 30, cx - 14, arena.bottom);
  floor.lineBetween(cx + 14, arena.top + 30, cx + 14, arena.bottom);
  // Colonnes de marbre et baies vitrées sur le mur du haut.
  topSlots.forEach((x, i) => {
    if (i % 2 === 0) {
      wall.fillStyle(0xd8d0c0, 1).fillRect(x - 5, arena.top + 2, 10, 16);
      wall
        .fillStyle(0xb8b0a0, 1)
        .fillRect(x - 7, arena.top + 2, 14, 3)
        .fillRect(x - 7, arena.top + 16, 14, 3);
      wall.lineStyle(1, 0xa89880, 1).lineBetween(x - 2, arena.top + 5, x - 2, arena.top + 16);
      wall.lineBetween(x + 2, arena.top + 5, x + 2, arena.top + 16);
    } else {
      wall.fillStyle(0x7fb8e0, 0.25).fillRect(x - 14, arena.top + 2, 28, 14);
      wall.lineStyle(1, 0xc8e8ff, 0.5).strokeRect(x - 14, arena.top + 2, 28, 14);
      wall.lineStyle(1, 0xffffff, 0.3).lineBetween(x - 10, arena.top + 14, x - 2, arena.top + 4);
    }
  });
  // Incrustations dorées (cercles) au sol.
  for (let i = 0; i < 3; i++) {
    const p = spot();
    floor.lineStyle(1, 0xc8a050, 0.45).strokeCircle(p.x, p.y, 14).strokeCircle(p.x, p.y, 9);
  }
  // Oliviers en pot dans les coins du bas.
  for (const x of [arena.left + 16, arena.right - 16]) {
    const y = arena.bottom - 16;
    wall.fillStyle(0x8a6040, 1).fillRect(x - 6, y - 2, 12, 9);
    wall
      .fillStyle(0x5a7a40, 1)
      .fillCircle(x - 4, y - 7, 5)
      .fillCircle(x + 4, y - 8, 5)
      .fillCircle(x, y - 12, 5);
  }
  // Poussière dorée qui flotte.
  scene.add
    .particles(0, 0, 'spark', {
      x: { min: arena.left, max: arena.right },
      y: { min: arena.top, max: arena.bottom },
      speedY: { min: -6, max: -2 },
      speedX: { min: -3, max: 3 },
      lifespan: 6000,
      frequency: 260 / QUALITY_PARTICLES[settings.quality],
      scale: { min: 0.2, max: 0.4 },
      alpha: { start: 0, end: 0.5, ease: 'Sine.InOut' },
      tint: 0xffe08a,
    })
    .setDepth(1.4);
  void rng;
}

// ---------- La Volière : sommet de la tour ----------
function aviary({ scene, floor, wall, arena, rng, spot, topSlots }: DecorContext): void {
  // Ombres des barreaux de la grande cage, en diagonale sur le sol.
  floor.fillStyle(0x07060d, 0.22);
  for (let x = arena.left - arena.height; x < arena.right; x += 46) {
    floor.fillTriangle(
      x,
      arena.bottom,
      x + 10,
      arena.bottom,
      x + arena.height * 0.6 + 10,
      arena.top,
    );
    floor.fillTriangle(
      x,
      arena.bottom,
      x + arena.height * 0.6,
      arena.top,
      x + arena.height * 0.6 + 10,
      arena.top,
    );
  }
  // Chaînes qui pendent du mur du haut.
  topSlots.forEach((x, i) => {
    if (i % 2 === 1) return;
    wall.lineStyle(1.5, 0x6a5a8a, 0.9);
    for (let k = 0; k < 4; k++) wall.strokeEllipse(x, arena.top + 4 + k * 5, 3, 5);
  });
  // Perchoirs avec oiseaux sur les murs latéraux.
  for (const x of [arena.left + 4, arena.right - 4]) {
    const y = arena.top + 70 + rng.int(0, 120);
    const dir = x < arena.centerX ? 1 : -1;
    wall.lineStyle(2, 0x5a4030, 1).lineBetween(x, y, x + dir * 22, y);
    wall
      .fillStyle(0x1a1626, 1)
      .fillEllipse(x + dir * 14, y - 4, 9, 7)
      .fillCircle(x + dir * 17, y - 7, 3);
    wall.fillStyle(0xd8b8ff, 1).fillCircle(x + dir * 18, y - 8, 0.8);
  }
  // Nids dans les coins.
  for (const [x, y] of [
    [arena.left + 18, arena.bottom - 14],
    [arena.right - 18, arena.bottom - 14],
  ] as const) {
    wall.fillStyle(0x4a3420, 1).fillEllipse(x, y, 22, 9);
    wall
      .lineStyle(1, 0x6a4a2a, 1)
      .lineBetween(x - 10, y - 2, x + 8, y + 2)
      .lineBetween(x - 6, y + 3, x + 10, y - 3);
    wall
      .fillStyle(0xe8e0d0, 1)
      .fillEllipse(x - 3, y - 2, 4, 3)
      .fillEllipse(x + 2, y - 3, 4, 3);
  }
  // Plumes éparpillées.
  for (let i = 0; i < 7; i++) {
    const p = spot(20);
    const a = rng.next() * Math.PI;
    floor
      .lineStyle(1, 0xd8d0e8, 0.55)
      .lineBetween(p.x, p.y, p.x + Math.cos(a) * 6, p.y + Math.sin(a) * 6);
  }
  void scene;
}
