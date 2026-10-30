import Phaser from 'phaser';
import type { Vec2 } from '../../core/geometry';

const POOL = 10;

/** Éclairs et ondes des dons (pool de tracés réutilisés, aucun objet créé pendant le combat). */
export class Lightning {
  private readonly pool: Phaser.GameObjects.Graphics[] = [];

  constructor(private readonly scene: Phaser.Scene) {
    for (let i = 0; i < POOL; i++) {
      this.pool.push(scene.add.graphics().setDepth(25).setBlendMode('ADD').setVisible(false));
    }
  }

  private take(): Phaser.GameObjects.Graphics | undefined {
    const g = this.pool.find((p) => !p.visible) ?? this.pool[0];
    if (!g) return undefined;
    this.scene.tweens.killTweensOf(g);
    return g.clear().setAlpha(1).setVisible(true);
  }

  private fade(g: Phaser.GameObjects.Graphics, ms: number): void {
    this.scene.tweens.add({
      targets: g,
      alpha: 0,
      duration: ms,
      onComplete: () => g.setVisible(false),
    });
  }

  /** Arc électrique en zigzag entre deux points. */
  zap(from: Vec2, to: Vec2, color: number): void {
    const g = this.take();
    if (!g) return;
    const pts = jagged(from, to, 6, 7);
    g.lineStyle(3, color, 0.5).strokePoints(pts);
    g.lineStyle(1.2, 0xffffff, 1).strokePoints(pts);
    this.fade(g, 180);
  }

  /** La foudre tombe du ciel sur un point, avec un cercle d'impact. */
  bolt(at: Vec2, radius: number, color: number): void {
    const g = this.take();
    if (!g) return;
    const pts = jagged({ x: at.x + 8, y: at.y - 70 }, at, 7, 6);
    g.lineStyle(4, color, 0.5).strokePoints(pts);
    g.lineStyle(1.5, 0xffffff, 1).strokePoints(pts);
    g.lineStyle(2, color, 0.9).strokeCircle(at.x, at.y, radius);
    g.fillStyle(color, 0.2).fillCircle(at.x, at.y, radius);
    this.fade(g, 260);
  }

  /** Onde circulaire (dons de dash, explosion du choc thermique). */
  ring(at: Vec2, radius: number, color: number): void {
    const g = this.take();
    if (!g) return;
    g.setPosition(at.x, at.y).setScale(0.4);
    g.lineStyle(2.5, color, 0.95).strokeCircle(0, 0, radius);
    g.fillStyle(color, 0.15).fillCircle(0, 0, radius);
    this.scene.tweens.add({ targets: g, scale: 1, duration: 140, ease: 'Cubic.Out' });
    this.scene.tweens.add({
      targets: g,
      alpha: 0,
      duration: 320,
      onComplete: () => g.setVisible(false).setPosition(0, 0).setScale(1),
    });
  }
}

function jagged(from: Vec2, to: Vec2, segments: number, spread: number): Phaser.Math.Vector2[] {
  const pts: Phaser.Math.Vector2[] = [];
  const nx = -(to.y - from.y);
  const ny = to.x - from.x;
  const len = Math.hypot(nx, ny) || 1;
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const off = i === 0 || i === segments ? 0 : (Math.random() * 2 - 1) * spread;
    pts.push(
      new Phaser.Math.Vector2(
        from.x + (to.x - from.x) * t + (nx / len) * off,
        from.y + (to.y - from.y) * t + (ny / len) * off,
      ),
    );
  }
  return pts;
}
