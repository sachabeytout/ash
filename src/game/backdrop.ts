import Phaser from 'phaser';
import { COLORS, GAME_HEIGHT, GAME_WIDTH } from './theme';

/** Textures générées par code (aucun fichier image à charger). */
export function ensureTextures(scene: Phaser.Scene): void {
  if (scene.textures.exists('ember')) return;
  const g = scene.make.graphics({}, false);
  g.fillStyle(0xffffff).fillRect(0, 0, 2, 2);
  g.generateTexture('ember', 2, 2);
  g.destroy();
}

/** Silhouette de la cage à oiseau géante, en néon discret. */
export function drawCage(scene: Phaser.Scene, alpha = 1): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics().setAlpha(alpha);
  const cx = GAME_WIDTH / 2;
  const top = 40;
  const bottom = GAME_HEIGHT - 24;
  const halfWidth = 230;
  const bars = 13;

  g.lineStyle(2, COLORS.cageBar, 1);
  for (let i = 0; i < bars; i++) {
    const x = cx - halfWidth + (i * 2 * halfWidth) / (bars - 1);
    // Les barreaux se rejoignent en dôme vers le haut.
    const dome = Math.cos(((x - cx) / halfWidth) * (Math.PI / 2));
    const startY = top + (1 - dome) * 70;
    g.lineBetween(x, startY, x, bottom);
    g.lineBetween(x, startY, cx + (x - cx) * 0.15, top - 10);
  }
  g.lineStyle(3, COLORS.cageGlow, 0.6);
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
    frequency: 120,
    alpha: { start: 0.9, end: 0 },
    scale: { start: 1, end: 0.5 },
    tint: [COLORS.phoenix, COLORS.ember],
    blendMode: 'ADD',
  });
}
