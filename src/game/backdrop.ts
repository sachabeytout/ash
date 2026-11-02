import Phaser from 'phaser';
import { QUALITY_PARTICLES, settings } from '../core/settings';
import { COLORS, GAME_HEIGHT, GAME_WIDTH } from './theme';

/** Textures générées par code (aucun fichier image à charger). */
export function ensureTextures(scene: Phaser.Scene): void {
  if (scene.textures.exists('ember')) return;
  const g = scene.make.graphics({}, false);
  g.fillStyle(0xffffff).fillRect(0, 0, 2, 2);
  g.generateTexture('ember', 2, 2);
  g.destroy();
}

/** Silhouette de la cage à oiseau géante, en fer sombre (retours du 02/11, point 6 : plus de néon). */
export function drawCage(scene: Phaser.Scene, alpha = 1): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics().setAlpha(alpha);
  const cx = GAME_WIDTH / 2;
  const top = 40;
  const bottom = GAME_HEIGHT - 24;
  const halfWidth = 230;
  const bars = 13;

  g.lineStyle(2, 0x3a3a42, 1);
  for (let i = 0; i < bars; i++) {
    const x = cx - halfWidth + (i * 2 * halfWidth) / (bars - 1);
    // Les barreaux se rejoignent en dôme vers le haut.
    const dome = Math.cos(((x - cx) / halfWidth) * (Math.PI / 2));
    const startY = top + (1 - dome) * 70;
    g.lineBetween(x, startY, x, bottom);
    g.lineBetween(x, startY, cx + (x - cx) * 0.15, top - 10);
  }
  g.lineStyle(3, 0x5e5e68, 0.9);
  g.lineBetween(cx - halfWidth - 8, bottom, cx + halfWidth + 8, bottom);
  g.strokeCircle(cx, top - 16, 6);
  return g;
}

/** Braises qui montent : l'empreinte du Phénix. */
export function addEmbers(scene: Phaser.Scene): Phaser.GameObjects.Particles.ParticleEmitter {
  return scene.add.particles(0, GAME_HEIGHT + 4, 'ember', {
    x: { min: -160, max: GAME_WIDTH + 160 },
    speedY: { min: -40, max: -15 },
    speedX: { min: -8, max: 8 },
    lifespan: 6000,
    // Moins de braises en qualité basse.
    frequency: 120 / QUALITY_PARTICLES[settings.quality],
    alpha: { start: 0.9, end: 0 },
    scale: { start: 1, end: 0.5 },
    tint: [COLORS.phoenix, COLORS.ember],
    blendMode: 'ADD',
  });
}

/** Grande pyramide dorée en fond (écran titre) : assises de pierre, pointe qui luit, étoiles. */
export function drawPyramid(scene: Phaser.Scene, alpha = 1): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics().setAlpha(alpha);
  const cx = GAME_WIDTH / 2;
  const apex = 18;
  const base = GAME_HEIGHT - 24;
  const half = 330;
  // Étoiles du ciel de nuit.
  for (let i = 0; i < 40; i++) {
    const x = ((i * 97.3) % (GAME_WIDTH + 200)) - 100;
    const y = 6 + ((i * 53.7) % 150);
    if (Math.abs(x - cx) < ((y - apex) / (base - apex)) * half + 6) continue;
    g.fillStyle(0xffe9d6, 0.25 + (i % 3) * 0.15).fillRect(x, y, 1.2, 1.2);
  }
  g.fillStyle(0x140f0a, 1).fillTriangle(cx, apex, cx - half, base, cx + half, base);
  g.fillStyle(0x1c150c, 1).fillTriangle(cx, apex, cx, base, cx + half, base);
  // Assises de pierre.
  g.lineStyle(1, COLORS.goldDim, 0.18);
  for (let y = apex + 16; y < base; y += 16) {
    const w = ((y - apex) / (base - apex)) * half;
    g.lineBetween(cx - w, y, cx + w, y);
  }
  g.lineStyle(1.5, COLORS.goldDim, 0.5).strokeTriangle(cx, apex, cx - half, base, cx + half, base);
  // Pyramidion doré.
  g.fillStyle(COLORS.gold, 0.6).fillTriangle(cx, apex, cx - 14, apex + 14, cx + 14, apex + 14);
  scene.add
    .image(cx, apex + 6, 'glow')
    .setTint(COLORS.gold)
    .setAlpha(0.35 * alpha)
    .setScale(1.4)
    .setBlendMode('ADD');
  return g;
}

/** Disque solaire ailé (Behedet) : le soleil entre deux grandes ailes, deux cobras de part et d'autre. */
export function drawWingedSun(g: Phaser.GameObjects.Graphics, x: number, y: number, s = 1): void {
  for (const dir of [-1, 1]) {
    for (let k = 0; k < 4; k++) {
      const len = (62 - k * 9) * s;
      const yy = y - 3 * s + k * 3.2 * s;
      g.fillStyle(k % 2 === 0 ? COLORS.gold : COLORS.lapis, 0.95);
      g.fillTriangle(
        x + dir * 9 * s,
        yy,
        x + dir * (9 * s + len),
        yy - (6 - k * 1.5) * s,
        x + dir * (9 * s + len * 0.85),
        yy + 3 * s,
      );
    }
    // Cobra dressé au bord du disque.
    g.fillStyle(COLORS.turquoise, 1).fillEllipse(x + dir * 9 * s, y + 4 * s, 3 * s, 8 * s);
  }
  g.fillStyle(COLORS.phoenix, 1).fillCircle(x, y, 8 * s);
  g.fillStyle(0xffe08a, 1).fillCircle(x - 2 * s, y - 2 * s, 3 * s);
}

/** Colonne à chapiteau de lotus (Cage) : fût cannelé, bandeaux dorés. */
export function drawLotusColumn(
  g: Phaser.GameObjects.Graphics,
  x: number,
  top: number,
  bottom: number,
): void {
  g.fillStyle(0x1a140e, 1).fillRect(x - 9, top + 10, 18, bottom - top - 10);
  g.lineStyle(1, COLORS.goldDim, 0.35);
  for (const dx of [-4, 0, 4]) g.lineBetween(x + dx, top + 14, x + dx, bottom - 8);
  g.fillStyle(COLORS.goldDim, 0.7)
    .fillRect(x - 10, top + 12, 20, 3)
    .fillRect(x - 10, bottom - 8, 20, 3);
  g.fillStyle(COLORS.lapis, 0.9).fillRect(x - 10, top + 16, 20, 2);
  // Chapiteau en bouton de lotus.
  g.fillStyle(0x2a5a4a, 1).fillTriangle(x - 15, top, x + 15, top, x, top + 12);
  g.fillStyle(COLORS.turquoise, 0.6).fillTriangle(x - 8, top, x + 8, top, x, top + 9);
  g.fillStyle(COLORS.goldDim, 0.8).fillRect(x - 16, top - 3, 32, 3);
}
