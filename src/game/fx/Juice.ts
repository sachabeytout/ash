import Phaser from 'phaser';
import { settings } from '../../core/settings';
import { vibrate } from '../../platform/device';

/** Effets de « ressenti » : arrêt sur image, tremblement, étincelles, chiffres de dégâts. */
export class Juice {
  private freezeUntil = 0;
  private readonly sparks: Phaser.GameObjects.Particles.ParticleEmitter;
  private readonly numbers: Phaser.GameObjects.Text[] = [];

  constructor(private readonly scene: Phaser.Scene) {
    this.sparks = scene.add
      .particles(0, 0, 'spark', {
        speed: { min: 60, max: 220 },
        lifespan: { min: 150, max: 380 },
        scale: { start: 1, end: 0 },
        alpha: { start: 1, end: 0 },
        blendMode: 'ADD',
        emitting: false,
      })
      .setDepth(30);
    for (let i = 0; i < 20; i++) {
      this.numbers.push(
        scene.add
          .text(0, 0, '', {
            fontFamily: 'monospace',
            fontSize: '11px',
            fontStyle: 'bold',
            color: '#ffe9d6',
            stroke: '#07060d',
            strokeThickness: 3,
          })
          .setOrigin(0.5)
          .setDepth(40)
          .setVisible(false),
      );
    }
  }

  /** Vrai tant que le jeu est figé par un arrêt sur image. */
  get frozen(): boolean {
    return performance.now() < this.freezeUntil;
  }

  hitstop(ms: number): void {
    this.freezeUntil = Math.max(this.freezeUntil, performance.now() + ms);
  }

  shake(intensity: number, durationMs = 120): void {
    if (!settings.screenShake || intensity <= 0) return;
    this.scene.cameras.main.shake(durationMs, intensity);
  }

  buzz(ms: number): void {
    if (settings.vibration) vibrate(ms);
  }

  burst(x: number, y: number, color: number, count = 8): void {
    this.sparks.setParticleTint(color);
    this.sparks.explode(count, x, y);
  }

  damageNumber(x: number, y: number, amount: number, color = '#ffe9d6'): void {
    if (!settings.damageNumbers) return;
    const t = this.numbers.find((n) => !n.visible);
    if (!t) return;
    t.setText(String(amount))
      .setColor(color)
      .setPosition(x + (Math.random() * 8 - 4), y - 8)
      .setAlpha(1)
      .setVisible(true);
    this.scene.tweens.add({
      targets: t,
      y: t.y - 16,
      alpha: 0,
      duration: 600,
      ease: 'Cubic.Out',
      onComplete: () => t.setVisible(false),
    });
  }
}
