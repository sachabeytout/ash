import Phaser from 'phaser';
import { QUALITY_PARTICLES, settings } from '../../core/settings';

/**
 * Cheveux en flamme d'Ash : de petites braises s'échappent du haut de sa tête et montent.
 * `offsetY` : hauteur des cheveux par rapport au centre du sprite ; `scale` : taille du sprite.
 */
export function addFlameHair(
  scene: Phaser.Scene,
  target: Phaser.GameObjects.Image,
  offsetY: number,
  scale = 1,
): Phaser.GameObjects.Particles.ParticleEmitter {
  const emitter = scene.add.particles(0, 0, 'spark', {
    x: { min: -3 * scale, max: 3 * scale },
    speedY: { min: -26 * scale, max: -12 * scale },
    speedX: { min: -5 * scale, max: 5 * scale },
    lifespan: 420,
    frequency: 110 / QUALITY_PARTICLES[settings.quality],
    scale: { start: 0.35 * scale, end: 0 },
    alpha: { start: 0.9, end: 0 },
    tint: [0xff6a1a, 0xffa040, 0xffe08a],
    blendMode: 'ADD',
  });
  emitter.startFollow(target, 0, offsetY);
  emitter.setDepth(target.depth + 0.5);
  return emitter;
}
