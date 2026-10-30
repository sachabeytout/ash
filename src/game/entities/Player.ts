import Phaser from 'phaser';
import {
  nextComboIndex,
  phaseAt,
  type AttackPhase,
  type AttackStep,
} from '../../core/combat/attack';
import { nearestInCone, type Vec2 } from '../../core/geometry';
import { settings } from '../../core/settings';
import { PLAYER } from '../../data/player';
import type { WeaponDef } from '../../data/weapons';
import type { Controls } from '../input/Controls';
import { bodyOf } from '../physics';

export interface ActiveSwing {
  step: AttackStep;
  /** Identifiant unique : un ennemi n'est touché qu'une fois par coup. */
  id: number;
  heavy: boolean;
  /** Type d'action : décide quels dons s'appliquent. */
  kind: 'attack' | 'power' | 'super';
}

type State =
  | { kind: 'free' }
  | {
      kind: 'attack';
      step: AttackStep;
      index: number;
      power: boolean;
      /** Étape du Super en cours (null pour une attaque normale). */
      superIndex: number | null;
      startedAt: number;
      id: number;
    }
  | { kind: 'dash'; startedAt: number; dir: Vec2; distance?: number };

let swingCounter = 0;

/** Ash : déplacement avec inertie, combo au rythme, attaque puissante, dash qui annule la récupération. */
export class Player {
  readonly sprite: Phaser.Physics.Arcade.Image;
  private readonly glow: Phaser.GameObjects.Image;
  private readonly pip: Phaser.GameObjects.Image;
  private readonly slash: Phaser.GameObjects.Graphics;
  state: State = { kind: 'free' };
  facing = -Math.PI / 2;
  private velocity = { x: 0, y: 0 };
  private lastDashEnd = -Infinity;
  private invulnerableUntil = 0;
  private lastAttack: { index: number; startedAt: number } | null = null;
  private drawnPhase: AttackPhase | null = null;

  /** Rappels vers la scène (sons, effets). */
  onSwing: (heavy: boolean) => void = () => undefined;
  /** Armes à distance : le coup actif lance un projectile ou une zone (géré par la scène). */
  onFire: (step: AttackStep, angle: number, kind: ActiveSwing['kind'], id: number) => void = () =>
    undefined;
  onDash: () => void = () => undefined;
  /** Bonus des dons (Bastet) : vitesse de course, recharge du dash. */
  speedMul = 1;
  dashCooldownMul = 1;
  /** Le Super est-il prêt ? (la scène gère la jauge) */
  canSuper: () => boolean = () => false;
  onSuper: () => void = () => undefined;

  constructor(
    private readonly scene: Phaser.Scene,
    x: number,
    y: number,
    private readonly weapon: WeaponDef,
  ) {
    this.glow = scene.add
      .image(x, y, 'glow')
      .setTint(0xff7a2a)
      .setAlpha(0.55)
      .setScale(1.6)
      .setBlendMode('ADD');
    this.sprite = scene.physics.add.image(x, y, 'ash').setDepth(10);
    bodyOf(this.sprite).setCircle(PLAYER.radius, 6 - PLAYER.radius, 14 - PLAYER.radius * 2);
    this.sprite.setCollideWorldBounds(true);
    this.pip = scene.add.image(x, y, 'pip').setDepth(11).setAlpha(0.85);
    this.slash = scene.add.graphics().setDepth(12).setBlendMode('ADD');
  }

  get x(): number {
    return this.sprite.x;
  }
  get y(): number {
    return this.sprite.y;
  }

  isInvulnerable(now: number): boolean {
    if (now < this.invulnerableUntil) return true;
    if (this.state.kind === 'attack' && this.state.superIndex !== null) return true;
    return this.state.kind === 'dash' && now - this.state.startedAt < PLAYER.dash.iframesMs;
  }

  /** Garde levée (Lame de l'Aube) : un coup reçu maintenant est paré. */
  isParrying(now: number): boolean {
    if (this.state.kind !== 'attack' || !this.state.step.parry) return false;
    return phaseAt(this.state.step, now - this.state.startedAt) === 'active';
  }

  /** Parade réussie : Ash est brièvement invincible, la garde se termine. */
  parried(now: number): void {
    this.invulnerableUntil = now + 450;
    this.state = { kind: 'free' };
    this.scene.tweens.add({
      targets: this.sprite,
      scaleX: 1.25,
      scaleY: 1.25,
      duration: 90,
      yoyo: true,
    });
  }

  /** Le coup actuellement « actif » (qui peut toucher), s'il y en a un. */
  activeSwing(now: number): ActiveSwing | null {
    if (this.state.kind !== 'attack') return null;
    if (this.state.step.range <= 0) return null; // coup à distance : pas de zone de frappe
    if (phaseAt(this.state.step, now - this.state.startedAt) !== 'active') return null;
    return {
      step: this.state.step,
      id: this.state.id,
      heavy: this.state.power || this.state.step.shake > 0,
      kind: this.state.superIndex !== null ? 'super' : this.state.power ? 'power' : 'attack',
    };
  }

  takeHit(now: number, from: Vec2): void {
    this.invulnerableUntil = now + PLAYER.hurtIframesMs;
    const a = Math.atan2(this.y - from.y, this.x - from.x);
    this.velocity = {
      x: Math.cos(a) * PLAYER.hurtKnockback,
      y: Math.sin(a) * PLAYER.hurtKnockback,
    };
    if (this.state.kind === 'attack' && this.state.superIndex === null)
      this.state = { kind: 'free' };
  }

  update(now: number, dt: number, controls: Controls, enemies: readonly Vec2[]): void {
    const buffer = controls.buffer;
    const dashReady = now - this.lastDashEnd >= PLAYER.dash.cooldownMs * this.dashCooldownMul;

    if (this.state.kind === 'dash') {
      const t = now - this.state.startedAt;
      if (t >= PLAYER.dash.durationMs) {
        this.state = { kind: 'free' };
        this.lastDashEnd = now;
      } else {
        const speed =
          (this.state.distance ?? PLAYER.dash.distance) / (PLAYER.dash.durationMs / 1000);
        this.velocity = { x: this.state.dir.x * speed, y: this.state.dir.y * speed };
      }
    }

    if (this.state.kind === 'attack' && this.state.superIndex !== null) {
      // Le Super se joue d'un trait : rien ne l'interrompt.
      const st = this.state;
      const superIndex = st.superIndex ?? 0;
      if (phaseAt(st.step, now - st.startedAt) === 'done') {
        const next = this.weapon.super[superIndex + 1];
        if (next) this.startSuperStep(now, superIndex + 1, next);
        else this.state = { kind: 'free' };
      }
      if (this.state.kind === 'attack') this.updateAttackMotion(now);
    } else if (this.state.kind === 'attack') {
      const st = this.state;
      const elapsed = now - st.startedAt;
      const phase = phaseAt(st.step, elapsed);
      if (phase === 'recovery' || phase === 'done') {
        // Le dash annule la récupération ; un appui d'attaque bien placé enchaîne le combo.
        if (this.canSuper() && buffer.consume('super', now)) {
          this.startSuper(now, controls, enemies);
        } else if (dashReady && buffer.consume('dash', now)) {
          this.startDash(now, controls);
        } else if (buffer.consume('attack', now)) {
          const next = st.power
            ? 0
            : nextComboIndex(this.weapon.combo, st.index, elapsed, this.weapon.comboWindowMs);
          this.startAttack(now, next, false, controls, enemies);
        } else if (buffer.consume('power', now)) {
          this.startAttack(now, 0, true, controls, enemies);
        } else if (phase === 'done') {
          this.lastAttack = st.power ? null : { index: st.index, startedAt: st.startedAt };
          this.state = { kind: 'free' };
        }
      }
      if (this.state.kind === 'attack') this.updateAttackMotion(now);
    }

    if (this.state.kind === 'free') {
      if (this.canSuper() && buffer.consume('super', now)) {
        this.startSuper(now, controls, enemies);
      } else if (dashReady && buffer.consume('dash', now)) {
        this.startDash(now, controls);
      } else if (buffer.consume('attack', now)) {
        const last = this.lastAttack;
        const index = last
          ? nextComboIndex(
              this.weapon.combo,
              last.index,
              now - last.startedAt,
              this.weapon.comboWindowMs,
            )
          : 0;
        this.startAttack(now, index, false, controls, enemies);
      } else if (buffer.consume('power', now)) {
        this.startAttack(now, 0, true, controls, enemies);
      } else {
        this.updateFreeMotion(dt, controls);
      }
    }

    const body = bodyOf(this.sprite);
    body.setVelocity(this.velocity.x, this.velocity.y);
    this.updateVisuals(now);
  }

  private aimAngle(controls: Controls, enemies: readonly Vec2[]): number {
    if (controls.mouseWorld)
      return Math.atan2(controls.mouseWorld.y - this.y, controls.mouseWorld.x - this.x);
    if (controls.aimDir) return Math.atan2(controls.aimDir.y, controls.aimDir.x);
    const m = controls.move;
    let angle = Math.hypot(m.x, m.y) > 0.2 ? Math.atan2(m.y, m.x) : this.facing;
    if (settings.aimAssist && controls.wantsAimAssist) {
      const target = nearestInCone(
        this,
        angle,
        PLAYER.aimAssist.range,
        PLAYER.aimAssist.coneDeg,
        enemies,
      );
      if (target) angle = Math.atan2(target.y - this.y, target.x - this.x);
    }
    return angle;
  }

  private startAttack(
    now: number,
    index: number,
    power: boolean,
    controls: Controls,
    enemies: readonly Vec2[],
  ): void {
    const step = power ? this.weapon.power : this.weapon.combo[index];
    if (!step) return;
    this.facing = this.aimAngle(controls, enemies);
    this.state = {
      kind: 'attack',
      step,
      index,
      power,
      superIndex: null,
      startedAt: now,
      id: ++swingCounter,
    };
    this.drawnPhase = null;
    // Anticipation : léger recul et écrasement.
    this.scene.tweens.add({
      targets: this.sprite,
      scaleX: 1.15,
      scaleY: 0.88,
      duration: step.windupMs,
      yoyo: true,
    });
  }

  private startSuper(now: number, controls: Controls, enemies: readonly Vec2[]): void {
    const first = this.weapon.super[0];
    if (!first) return;
    this.facing = this.aimAngle(controls, enemies);
    this.lastAttack = null;
    this.onSuper();
    this.startSuperStep(now, 0, first);
  }

  private startSuperStep(now: number, superIndex: number, step: AttackStep): void {
    this.state = {
      kind: 'attack',
      step,
      index: 0,
      power: true,
      superIndex,
      startedAt: now,
      id: ++swingCounter,
    };
    this.drawnPhase = null;
  }

  /** Grappin : Ash est tiré vers un point (comme un dash, invincible pendant le trajet). */
  pullTo(now: number, target: Vec2): void {
    const dx = target.x - this.x;
    const dy = target.y - this.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 4) return;
    this.state = {
      kind: 'dash',
      startedAt: now,
      dir: { x: dx / dist, y: dy / dist },
      distance: Math.max(0, dist - 14),
    };
    this.onDash();
  }

  private startDash(now: number, controls: Controls): void {
    const m = controls.move;
    const angle = Math.hypot(m.x, m.y) > 0.2 ? Math.atan2(m.y, m.x) : this.facing;
    this.facing = angle;
    this.state = { kind: 'dash', startedAt: now, dir: { x: Math.cos(angle), y: Math.sin(angle) } };
    this.lastAttack = null;
    this.scene.tweens.add({
      targets: this.sprite,
      scaleX: 1.3,
      scaleY: 0.75,
      duration: 70,
      yoyo: true,
    });
    this.onDash();
  }

  private updateAttackMotion(now: number): void {
    if (this.state.kind !== 'attack') return;
    const { step, startedAt } = this.state;
    const phase = phaseAt(step, now - startedAt);
    if (phase === 'active') {
      const speed = step.lunge / (step.activeMs / 1000);
      this.velocity = { x: Math.cos(this.facing) * speed, y: Math.sin(this.facing) * speed };
    } else {
      this.velocity = { x: this.velocity.x * 0.7, y: this.velocity.y * 0.7 };
    }
    if (phase !== this.drawnPhase) {
      this.drawnPhase = phase;
      if (phase === 'active') {
        const st = this.state;
        const kind = st.superIndex !== null ? 'super' : st.power ? 'power' : 'attack';
        if (step.projectile || step.zone) {
          this.onSwing(st.power);
          this.onFire(step, this.facing, kind, st.id);
        } else if (step.parry) {
          this.drawGuard();
        } else {
          this.drawSlash(step, st.power, st.superIndex !== null ? 0xffe08a : null);
        }
      }
    }
  }

  private updateFreeMotion(dt: number, controls: Controls): void {
    const m = controls.move;
    const speed = PLAYER.speed * this.speedMul;
    const target = { x: m.x * speed, y: m.y * speed };
    const moving = Math.hypot(m.x, m.y) > 0.01;
    const rate = (moving ? PLAYER.acceleration : PLAYER.deceleration) * (dt / 1000);
    this.velocity.x = approach(this.velocity.x, target.x, rate);
    this.velocity.y = approach(this.velocity.y, target.y, rate);
    if (controls.mouseWorld) {
      this.facing = Math.atan2(controls.mouseWorld.y - this.y, controls.mouseWorld.x - this.x);
    } else if (controls.aimDir) {
      this.facing = Math.atan2(controls.aimDir.y, controls.aimDir.x);
    } else if (moving) {
      this.facing = Math.atan2(m.y, m.x);
    }
  }

  /** Garde : arc doré devant Ash pendant toute la fenêtre de parade. */
  private drawGuard(): void {
    const g = this.slash.clear().setAlpha(1).setPosition(this.x, this.y);
    g.lineStyle(3, 0xfff0c0, 0.95).beginPath();
    g.arc(0, 0, 14, this.facing - 1.1, this.facing + 1.1, false);
    g.strokePath();
    g.lineStyle(1.5, 0xffffff, 0.9).strokeCircle(0, 0, 10);
    this.scene.tweens.add({ targets: g, alpha: 0, duration: 380 });
  }

  private drawSlash(step: AttackStep, power: boolean, colorOverride: number | null): void {
    this.onSwing(power || step.shake > 0);
    const g = this.slash.clear().setAlpha(1).setPosition(this.x, this.y);
    const color = colorOverride ?? this.weapon.color;
    if (step.arcDeg >= 360) {
      g.fillStyle(color, 0.18).fillCircle(0, 0, step.range);
      g.lineStyle(4, color, 0.9).strokeCircle(0, 0, step.range * 0.85);
      g.lineStyle(1.5, 0xffffff, 0.9).strokeCircle(0, 0, step.range);
    } else {
      // Croissant de lumière : traînée épaisse, fil blanc au bord, voile très léger à l'intérieur.
      const half = (step.arcDeg * Math.PI) / 360;
      const from = this.facing - half;
      const to = this.facing + half;
      g.fillStyle(color, 0.12).slice(0, 0, step.range, from, to, false).fillPath();
      const strokeArc = (width: number, c: number, alpha: number, radius: number) => {
        g.lineStyle(width, c, alpha).beginPath();
        g.arc(0, 0, radius, from, to, false);
        g.strokePath();
      };
      strokeArc(6, color, 0.35, step.range * 0.78);
      strokeArc(3.5, color, 0.85, step.range * 0.88);
      strokeArc(1.5, 0xffffff, 1, step.range);
    }
    this.scene.tweens.add({ targets: g, alpha: 0, duration: step.activeMs + 90 });
  }

  private updateVisuals(now: number): void {
    const { x, y } = this.sprite;
    this.sprite.setFlipX(Math.cos(this.facing) < -0.1);
    this.glow.setPosition(x, y);
    this.pip
      .setPosition(x + Math.cos(this.facing) * 13, y + Math.sin(this.facing) * 13)
      .setRotation(this.facing);
    if (this.state.kind === 'attack') this.slash.setPosition(x, y);
    // Clignote pendant l'invincibilité après un coup reçu.
    const hurtBlink = now < this.invulnerableUntil && Math.floor(now / 70) % 2 === 0;
    this.sprite.setAlpha(this.state.kind === 'dash' ? 0.6 : hurtBlink ? 0.3 : 1);
  }
}

function approach(value: number, target: number, step: number): number {
  return value < target ? Math.min(target, value + step) : Math.max(target, value - step);
}
