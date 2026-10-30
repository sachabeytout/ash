import Phaser from 'phaser';
import {
  bossPhase,
  chooseBossAttack,
  ringHits,
  tempo,
  type BossPhase,
} from '../../core/boss/pattern';
import type { Health } from '../../core/combat/health';
import {
  isBurning,
  isFrozen,
  newStatus,
  speedFactor,
  type StatusState,
} from '../../core/combat/status';
import { hitsArc, type Vec2 } from '../../core/geometry';
import type { Rng } from '../../core/rng';
import type { BossAttackId, BossDef } from '../../data/bosses';
import type { EnemyId } from '../../data/enemies';
import { bodyOf } from '../physics';
import { DANGER } from './Enemy';
import type { Hittable } from './Hittable';

type BossState = 'intro' | 'idle' | 'telegraph' | 'attack' | 'recover' | 'dead';

interface Ring {
  active: boolean;
  /** Démarre à cet instant (la seconde onde de la phase 2 part un peu après). */
  startAt: number;
  origin: Vec2;
  radius: number;
  hit: boolean;
}

/** Durée d'un gel sur un boss : un simple sursaut, pas une immobilisation. */
const BOSS_FREEZE_MS = 450;

/**
 * Boss : machine à états (intro → attente → télégraphe → attaque → récupération).
 * Chaque attaque a un télégraphe rouge-magenta en forme propre : cône (morsure), bande (charge),
 * cercle qui se resserre puis anneau (onde de choc), cercle pulsant (invocation).
 */
export class Boss implements Hittable {
  readonly sprite: Phaser.Physics.Arcade.Image;
  private readonly telegraph: Phaser.GameObjects.Graphics;
  private readonly rings: Phaser.GameObjects.Graphics;
  private readonly statusFx: Phaser.GameObjects.Graphics;
  private readonly mark: Phaser.GameObjects.Text;
  private readonly band = Array.from({ length: 4 }, () => new Phaser.Math.Vector2());
  private readonly ringSlots: Ring[] = [0, 1].map(() => ({
    active: false,
    startAt: 0,
    origin: { x: 0, y: 0 },
    radius: 0,
    hit: false,
  }));
  health: Health;
  status: StatusState = newStatus();
  lastSwingId = -1;
  state: BossState = 'intro';
  phase: BossPhase = 1;
  facing = Math.PI / 2;
  private stateAt = 0;
  private stateMs: number;
  private attack: BossAttackId = 'bite';
  private readonly history: BossAttackId[] = [];
  private attackLanded = false;
  private flashUntil = 0;

  onTelegraph: () => void = () => undefined;
  onQuake: () => void = () => undefined;
  onSummon: (enemy: EnemyId, count: number) => void = () => undefined;
  onPhase2: () => void = () => undefined;

  constructor(
    scene: Phaser.Scene,
    readonly def: BossDef,
    x: number,
    y: number,
    private readonly rng: Rng,
    now: number,
    introMs: number,
  ) {
    this.health = { hp: def.maxHp, maxHp: def.maxHp };
    this.telegraph = scene.add.graphics().setDepth(5);
    this.rings = scene.add.graphics().setDepth(6);
    this.statusFx = scene.add.graphics().setDepth(9);
    this.sprite = scene.physics.add.image(x, y, 'ammit').setDepth(8);
    bodyOf(this.sprite).setCircle(
      def.radius,
      this.sprite.width / 2 - def.radius,
      this.sprite.height / 2 - def.radius,
    );
    this.sprite.setCollideWorldBounds(true);
    this.mark = scene.add
      .text(0, 0, '!', {
        fontFamily: 'monospace',
        fontSize: '16px',
        fontStyle: 'bold',
        color: '#ff2a6d',
      })
      .setOrigin(0.5, 1)
      .setDepth(20)
      .setVisible(false);
    this.stateAt = now;
    this.stateMs = introMs;
  }

  get alive(): boolean {
    return this.state !== 'dead';
  }
  get x(): number {
    return this.sprite.x;
  }
  get y(): number {
    return this.sprite.y;
  }
  get radius(): number {
    return this.def.radius;
  }

  hit(now: number): void {
    this.flashUntil = now + 70;
  }

  freeze(now: number): void {
    this.status.frozenUntil = now + BOSS_FREEZE_MS;
  }

  kill(): void {
    this.state = 'dead';
    bodyOf(this.sprite).setVelocity(0, 0);
    bodyOf(this.sprite).enable = false;
    this.telegraph.clear();
    this.rings.clear();
    this.statusFx.clear();
    this.mark.setVisible(false);
    this.ringSlots.forEach((r) => (r.active = false));
  }

  update(now: number, dt: number, target: Vec2, canAttack: boolean): void {
    if (!this.alive) return;
    const def = this.def;
    const dx = target.x - this.x;
    const dy = target.y - this.y;
    const dist = Math.hypot(dx, dy);
    const toTarget = Math.atan2(dy, dx);
    const frozen = isFrozen(this.status, now);
    let vx = 0;
    let vy = 0;

    if (this.phase === 1 && bossPhase(def, this.health.hp, this.health.maxHp) === 2) {
      this.phase = 2;
      this.onPhase2();
    }

    const elapsed = now - this.stateAt;
    if (frozen) {
      this.stateAt += dt; // l'horloge du boss s'arrête pendant le sursaut de gel
    } else {
      switch (this.state) {
        case 'intro':
          if (elapsed >= this.stateMs) this.toIdle(now);
          break;
        case 'idle':
          this.facing = toTarget;
          if (dist > 48) {
            vx = (dx / dist) * def.speed;
            vy = (dy / dist) * def.speed;
          }
          if (elapsed >= this.stateMs && canAttack) this.startTelegraph(now, toTarget);
          break;
        case 'telegraph': {
          const total = this.telegraphMs();
          if ((this.attack === 'bite' || this.attack === 'charge') && elapsed < total * 0.5)
            this.facing = toTarget;
          this.drawTelegraph(Math.min(1, elapsed / total));
          if (elapsed >= total) this.release(now);
          break;
        }
        case 'attack': {
          const cfg = this.attack === 'charge' ? def.charge : def.bite;
          const reach = this.attack === 'charge' ? def.charge.distance : def.bite.lunge;
          const speed = reach / (cfg.activeMs / 1000);
          vx = Math.cos(this.facing) * speed;
          vy = Math.sin(this.facing) * speed;
          this.drawStrike();
          if (elapsed >= cfg.activeMs) {
            this.telegraph.clear();
            this.setState('recover', now, tempo(def, this.phase, cfg.recoveryMs));
          }
          break;
        }
        case 'recover':
          if (elapsed >= this.stateMs) this.toIdle(now);
          break;
        case 'dead':
          break;
      }
    }

    this.updateRings(now, dt);
    const slow = speedFactor(this.status, now);
    bodyOf(this.sprite).setVelocity(vx * slow, vy * slow);
    this.sprite.setFlipX(Math.cos(this.facing) < 0);
    if (now < this.flashUntil) this.sprite.setTint(0xffffff).setTintMode(Phaser.TintModes.FILL);
    else this.sprite.clearTint().setTintMode(Phaser.TintModes.MULTIPLY);
    this.mark.setPosition(this.x, this.y - def.radius - 6);
    this.drawStatus(now, frozen);
  }

  /** Dégâts infligés à Ash cette frame (0 si rien ne le touche). À n'appeler que s'il est vulnérable. */
  hazardDamage(player: Vec2, playerRadius: number): number {
    if (!this.alive) return 0;
    const def = this.def;
    if (this.state === 'attack' && !this.attackLanded) {
      const touched =
        this.attack === 'bite'
          ? hitsArc(this, this.facing, def.bite.range, def.bite.arcDeg, player, playerRadius)
          : Math.hypot(player.x - this.x, player.y - this.y) < def.charge.width / 2 + playerRadius;
      if (touched) {
        this.attackLanded = true;
        return this.attack === 'bite' ? def.bite.damage : def.charge.damage;
      }
    }
    for (const r of this.ringSlots) {
      if (!r.active || r.hit || r.radius <= 0) continue;
      const d = Math.hypot(player.x - r.origin.x, player.y - r.origin.y);
      if (ringHits(r.radius, def.quake.thickness, d, playerRadius)) {
        r.hit = true;
        return def.quake.damage;
      }
    }
    return 0;
  }

  private telegraphMs(): number {
    const def = this.def;
    const base =
      this.attack === 'bite'
        ? def.bite.telegraphMs
        : this.attack === 'charge'
          ? def.charge.telegraphMs
          : this.attack === 'quake'
            ? def.quake.telegraphMs
            : def.summon.telegraphMs;
    return tempo(def, this.phase, base);
  }

  private setState(state: BossState, now: number, ms = 0): void {
    this.state = state;
    this.stateAt = now;
    this.stateMs = ms;
  }

  private toIdle(now: number): void {
    const { min, max } = this.def.idleMs;
    this.setState('idle', now, tempo(this.def, this.phase, min + this.rng.next() * (max - min)));
  }

  private startTelegraph(now: number, angle: number): void {
    this.attack = chooseBossAttack(this.def, this.phase, this.history, this.rng);
    this.history.push(this.attack);
    this.facing = angle;
    this.setState('telegraph', now);
    this.mark.setVisible(true);
    this.onTelegraph();
  }

  /** Fin du télégraphe : l'attaque part. */
  private release(now: number): void {
    const def = this.def;
    this.telegraph.clear();
    this.mark.setVisible(false);
    switch (this.attack) {
      case 'bite':
      case 'charge':
        this.attackLanded = false;
        this.setState('attack', now);
        break;
      case 'quake': {
        const count = this.phase === 2 ? 2 : 1;
        this.ringSlots.forEach((r, i) => {
          if (i >= count) return;
          r.active = true;
          r.hit = false;
          r.radius = 0;
          r.startAt = now + i * 380;
          r.origin = { x: this.x, y: this.y };
        });
        this.onQuake();
        this.setState(
          'recover',
          now,
          tempo(def, this.phase, def.quake.recoveryMs) + (count - 1) * 380,
        );
        break;
      }
      case 'summon':
        this.onSummon(def.summon.enemy, def.summon.count);
        this.setState('recover', now, tempo(def, this.phase, def.summon.recoveryMs));
        break;
    }
  }

  private updateRings(now: number, dt: number): void {
    const g = this.rings.clear();
    const q = this.def.quake;
    for (const r of this.ringSlots) {
      if (!r.active || now < r.startAt) continue;
      r.radius += (q.ringSpeed * dt) / 1000;
      if (r.radius > q.ringMax) {
        r.active = false;
        continue;
      }
      const fade = 1 - r.radius / q.ringMax;
      g.lineStyle(q.thickness, DANGER, 0.25 + 0.45 * fade).strokeCircle(
        r.origin.x,
        r.origin.y,
        r.radius,
      );
      g.lineStyle(1.5, 0xffffff, 0.6 * fade).strokeCircle(r.origin.x, r.origin.y, r.radius);
    }
  }

  private drawTelegraph(progress: number): void {
    const g = this.telegraph.clear();
    const def = this.def;
    g.lineStyle(2, DANGER, 0.9);
    switch (this.attack) {
      case 'bite': {
        const reach = def.bite.range + def.bite.lunge;
        const half = (def.bite.arcDeg * Math.PI) / 360;
        g.beginPath()
          .slice(this.x, this.y, reach, this.facing - half, this.facing + half)
          .strokePath();
        g.fillStyle(DANGER, 0.12 + 0.3 * progress)
          .beginPath()
          .slice(this.x, this.y, reach * progress, this.facing - half, this.facing + half)
          .fillPath();
        break;
      }
      case 'charge':
        this.drawBand(g, def.charge.distance + def.radius, def.charge.width, progress);
        break;
      case 'quake': {
        // Le cercle se resserre sur Ammit : l'onde part quand il touche son corps.
        const r = def.radius + (1 - progress) * 46;
        g.strokeCircle(this.x, this.y, r);
        g.fillStyle(DANGER, 0.1 + 0.25 * progress).fillCircle(this.x, this.y, r);
        break;
      }
      case 'summon': {
        const pulse = def.radius + 6 + Math.sin(progress * Math.PI * 6) * 4;
        g.lineStyle(2, 0x9ab4ff, 0.9).strokeCircle(this.x, this.y, pulse);
        break;
      }
    }
  }

  private drawBand(
    g: Phaser.GameObjects.Graphics,
    length: number,
    width: number,
    fill: number,
  ): void {
    const cos = Math.cos(this.facing);
    const sin = Math.sin(this.facing);
    const half = width / 2;
    const set = (len: number) => {
      const corners: [number, number][] = [
        [0, -half],
        [len, -half],
        [len, half],
        [0, half],
      ];
      corners.forEach(([along, side], i) =>
        this.band[i]?.set(this.x + cos * along - sin * side, this.y + sin * along + cos * side),
      );
      return this.band;
    };
    g.lineStyle(2, DANGER, 0.9).strokePoints(set(length), true);
    g.fillStyle(DANGER, 0.12 + 0.3 * fill).fillPoints(set(length * fill), true);
  }

  private drawStrike(): void {
    const g = this.telegraph.clear();
    g.fillStyle(DANGER, 0.6);
    if (this.attack === 'bite') {
      const half = (this.def.bite.arcDeg * Math.PI) / 360;
      g.beginPath()
        .slice(this.x, this.y, this.def.bite.range, this.facing - half, this.facing + half)
        .fillPath();
    } else {
      g.fillCircle(this.x, this.y, this.def.radius + 6);
    }
  }

  private drawStatus(now: number, frozen: boolean): void {
    const g = this.statusFx.clear();
    const r = this.def.radius;
    if (frozen) g.lineStyle(2, 0xd8fbff, 0.9).strokeCircle(this.x, this.y, r + 4);
    if (now < this.status.chillUntil && this.status.chill > 0) {
      g.fillStyle(0x8ff0ff, 1);
      for (let i = 0; i < this.status.chill; i++)
        g.fillRect(this.x - r + i * 5, this.y + r + 4, 3, 3);
    }
    if (isBurning(this.status, now)) {
      g.fillStyle(0xffa53a, 0.9);
      for (const ox of [-r * 0.6, 0, r * 0.6]) {
        const bx = this.x + ox;
        const by = this.y - r - 1;
        g.fillTriangle(bx - 3, by, bx + 3, by, bx, by - 7);
      }
    }
  }
}
