import Phaser from 'phaser';
import { settings } from '../../core/settings';
import type { Action, Controls } from './Controls';

interface Button {
  action: Action;
  radius: number;
  /** Position depuis le coin bas-droit de l'écran. */
  fromRight: number;
  fromBottom: number;
  color: number;
  g: Phaser.GameObjects.Graphics;
  x: number;
  y: number;
}

const JOY_RADIUS = 30;
const JOY_DEADZONE = 0.12;
const DEPTH = 1000;

/**
 * Commandes tactiles : joystick (flottant ou fixe) sur la moitié gauche, 4 boutons à droite.
 * Elles n'apparaissent qu'au premier toucher, pour ne pas encombrer l'écran au clavier.
 */
export class TouchControls {
  private readonly buttons: Button[];
  private readonly base: Phaser.GameObjects.Arc;
  private readonly knob: Phaser.GameObjects.Arc;
  private joyPointer: number | null = null;
  private joyCenter = { x: 0, y: 0 };
  private shown = false;
  private superGauge = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly controls: Controls,
  ) {
    const s = settings.touchButtonScale;
    const make = (
      action: Action,
      radius: number,
      fromRight: number,
      fromBottom: number,
      color: number,
    ): Button => ({
      action,
      radius: radius * s,
      fromRight: fromRight * s,
      fromBottom: fromBottom * s,
      color,
      g: scene.add.graphics().setScrollFactor(0).setDepth(DEPTH),
      x: 0,
      y: 0,
    });
    this.buttons = [
      make('attack', 27, 52, 54, 0xffb02e),
      make('dash', 19, 114, 34, 0x9ff6ff),
      make('power', 19, 40, 122, 0xff7a2a),
      make('super', 17, 104, 104, 0xffe08a),
    ];
    this.base = scene.add
      .circle(0, 0, JOY_RADIUS)
      .setStrokeStyle(2, 0xffe9d6, 0.35)
      .setScrollFactor(0)
      .setDepth(DEPTH);
    this.knob = scene.add.circle(0, 0, 12, 0xffe9d6, 0.35).setScrollFactor(0).setDepth(DEPTH);

    scene.input.addPointer(2); // joystick + 2 boutons en même temps
    scene.input.on('pointerdown', this.onDown, this);
    scene.input.on('pointermove', this.onMove, this);
    scene.input.on('pointerup', this.onUp, this);
    scene.input.on('pointerupoutside', this.onUp, this);
    scene.scale.on('resize', this.layout, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () =>
      scene.scale.off('resize', this.layout, this),
    );

    this.setVisible(window.matchMedia?.('(pointer: coarse)').matches ?? false);
    this.layout();
  }

  setSuperGauge(value: number): void {
    if (Math.abs(value - this.superGauge) < 0.01) return;
    this.superGauge = value;
    this.drawButtons();
  }

  private setVisible(v: boolean): void {
    this.shown = v;
    this.buttons.forEach((b) => b.g.setVisible(v));
    const showStick = v && (settings.joystick === 'fixed' || this.joyPointer !== null);
    this.base.setVisible(showStick);
    this.knob.setVisible(showStick);
  }

  private layout(): void {
    const { width, height } = this.scene.scale;
    for (const b of this.buttons) {
      b.x = width - b.fromRight;
      b.y = height - b.fromBottom;
    }
    if (this.joyPointer === null) {
      this.joyCenter = { x: 74, y: height - 74 };
      this.base.setPosition(this.joyCenter.x, this.joyCenter.y);
      this.knob.setPosition(this.joyCenter.x, this.joyCenter.y);
    }
    this.drawButtons();
  }

  private drawButtons(): void {
    for (const b of this.buttons) {
      const g = b.g.clear();
      g.fillStyle(0x07060d, 0.45).fillCircle(b.x, b.y, b.radius);
      g.lineStyle(2, b.color, 0.8).strokeCircle(b.x, b.y, b.radius);
      g.lineStyle(2, b.color, 1).fillStyle(b.color, 1);
      const r = b.radius * 0.45;
      switch (b.action) {
        case 'attack': // entaille
          g.lineBetween(b.x - r, b.y + r, b.x + r, b.y - r);
          g.lineBetween(b.x - r * 0.3, b.y + r, b.x + r, b.y - r * 0.3);
          break;
        case 'power': // estoc
          g.lineBetween(b.x - r, b.y, b.x + r * 0.4, b.y);
          g.fillTriangle(b.x + r * 0.2, b.y - r * 0.6, b.x + r, b.y, b.x + r * 0.2, b.y + r * 0.6);
          break;
        case 'dash': // double chevron
          for (const off of [-0.45, 0.35]) {
            const x = b.x + off * r * 1.6;
            g.lineBetween(x - r * 0.4, b.y - r * 0.7, x + r * 0.3, b.y);
            g.lineBetween(x + r * 0.3, b.y, x - r * 0.4, b.y + r * 0.7);
          }
          break;
        case 'super': {
          // étoile + jauge circulaire
          const pts: Phaser.Math.Vector2[] = [];
          for (let i = 0; i < 10; i++) {
            const a = -Math.PI / 2 + (i * Math.PI) / 5;
            const rr = i % 2 === 0 ? r : r * 0.45;
            pts.push(new Phaser.Math.Vector2(b.x + Math.cos(a) * rr, b.y + Math.sin(a) * rr));
          }
          g.fillStyle(b.color, this.superGauge >= 1 ? 1 : 0.35).fillPoints(pts, true);
          if (this.superGauge > 0) {
            g.lineStyle(3, b.color, 1).beginPath();
            g.arc(
              b.x,
              b.y,
              b.radius + 3,
              -Math.PI / 2,
              -Math.PI / 2 + Math.PI * 2 * this.superGauge,
            );
            g.strokePath();
          }
          break;
        }
      }
    }
  }

  private buttonAt(x: number, y: number): Button | undefined {
    // Zones de toucher plus larges que le dessin (pouces imprécis).
    let best: Button | undefined;
    let bestDist = Infinity;
    for (const b of this.buttons) {
      const d = Math.hypot(x - b.x, y - b.y);
      if (d < b.radius * 1.45 && d < bestDist) {
        best = b;
        bestDist = d;
      }
    }
    return best;
  }

  private onDown(p: Phaser.Input.Pointer): void {
    if (!p.wasTouch) return;
    if (!this.shown) this.setVisible(true);
    this.controls.lastDevice = 'touch';

    const btn = this.buttonAt(p.x, p.y);
    if (btn) {
      this.controls.press(btn.action);
      this.scene.tweens.add({ targets: btn.g, alpha: 0.5, duration: 60, yoyo: true });
      return;
    }
    if (p.x < this.scene.scale.width * 0.5 && this.joyPointer === null) {
      this.joyPointer = p.id;
      if (settings.joystick === 'floating') this.joyCenter = { x: p.x, y: p.y };
      this.base.setPosition(this.joyCenter.x, this.joyCenter.y).setVisible(true);
      this.knob.setVisible(true);
      this.onMove(p);
    }
  }

  private onMove(p: Phaser.Input.Pointer): void {
    if (p.id !== this.joyPointer) return;
    const dx = p.x - this.joyCenter.x;
    const dy = p.y - this.joyCenter.y;
    const dist = Math.hypot(dx, dy);
    const clamped = Math.min(dist, JOY_RADIUS);
    const nx = dist > 0 ? dx / dist : 0;
    const ny = dist > 0 ? dy / dist : 0;
    this.knob.setPosition(this.joyCenter.x + nx * clamped, this.joyCenter.y + ny * clamped);
    const amount = clamped / JOY_RADIUS;
    // Au-delà de la zone morte, on atteint vite la pleine vitesse (le pouce n'a pas besoin d'aller au bord).
    const strength = amount < JOY_DEADZONE ? 0 : Math.min(1, (amount - JOY_DEADZONE) / 0.6);
    this.controls.touchMove = { x: nx * strength, y: ny * strength };
  }

  private onUp(p: Phaser.Input.Pointer): void {
    if (p.id !== this.joyPointer) return;
    this.joyPointer = null;
    this.controls.touchMove = { x: 0, y: 0 };
    this.layout();
    const fixed = settings.joystick === 'fixed';
    this.base.setVisible(fixed && this.shown);
    this.knob.setVisible(fixed && this.shown);
  }
}
