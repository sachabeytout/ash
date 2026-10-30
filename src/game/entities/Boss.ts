import Phaser from 'phaser';
import { hitFlash } from '../fx/hitFlash';
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
  isStunned,
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
const MAX_ZONES = 6;

/**
 * Boss : machine à états (intro → attente → télégraphe → attaque → récupération).
 * Chaque attaque a un télégraphe rouge-magenta en forme propre : cône (morsure), bande (charge),
 * cercle qui se resserre puis anneau (onde de choc), cercle pulsant (invocation),
 * cercle d'atterrissage (bond), cercles au sol (pluie de glace).
 */
export class Boss implements Hittable {
  readonly sprite: Phaser.Physics.Arcade.Image;
  private readonly telegraph: Phaser.GameObjects.Graphics;
  private readonly rings: Phaser.GameObjects.Graphics;
  private readonly statusFx: Phaser.GameObjects.Graphics;
  private readonly chains: Phaser.GameObjects.Graphics;
  private readonly mark: Phaser.GameObjects.Text;
  private readonly band = Array.from({ length: 4 }, () => new Phaser.Math.Vector2());
  private readonly ringSlots: Ring[] = [0, 1].map(() => ({
    active: false,
    startAt: 0,
    origin: { x: 0, y: 0 },
    radius: 0,
    hit: false,
  }));
  /** Zones au sol (pluie de glace, atterrissage du bond) : positions fixées au télégraphe. */
  private readonly zones: Vec2[] = Array.from({ length: MAX_ZONES }, () => ({ x: 0, y: 0 }));
  private zoneCount = 0;
  private leapFrom: Vec2 = { x: 0, y: 0 };
  private landingImpact = false;
  /** Balayage : angle de départ, sens, et angle actuel du rayon. */
  private sweepFrom = 0;
  private sweepDir = 1;
  private sweepAngle = 0;
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
  /** Points d'ancrage des chaînes (Fenrir) ; une se brise en phase 2. */
  private readonly anchors: Vec2[];

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
    arena: Phaser.Geom.Rectangle,
    hpMul = 1,
  ) {
    const maxHp = Math.round(def.maxHp * hpMul);
    this.health = { hp: maxHp, maxHp };
    this.chains = scene.add.graphics().setDepth(4);
    this.telegraph = scene.add.graphics().setDepth(5);
    this.rings = scene.add.graphics().setDepth(6);
    this.statusFx = scene.add.graphics().setDepth(9);
    this.sprite = scene.physics.add.image(x, y, def.texture).setDepth(8);
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
    this.anchors = def.chained
      ? [
          { x: arena.left, y: arena.top },
          { x: arena.right, y: arena.top },
        ]
      : [];
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
    [this.telegraph, this.rings, this.statusFx, this.chains].forEach((g) => g.clear());
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
    const frozen = isFrozen(this.status, now) || isStunned(this.status, now);
    let vx = 0;
    let vy = 0;
    this.landingImpact = false;

    if (this.phase === 1 && bossPhase(def, this.health.hp, this.health.maxHp) === 2) {
      this.phase = 2;
      this.anchors.pop(); // une chaîne se brise
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
          if (elapsed >= this.stateMs && canAttack) this.startTelegraph(now, toTarget, target);
          break;
        case 'telegraph': {
          const total = this.telegraphMs();
          const tracking = this.attack === 'bite' || this.attack === 'charge';
          if (tracking && elapsed < total * 0.5) this.facing = toTarget;
          // Le bond vise Ash jusqu'aux 60 % du télégraphe, puis la zone se fige.
          if (this.attack === 'leap' && elapsed < total * 0.6) this.setZone(0, target);
          this.drawTelegraph(Math.min(1, elapsed / total));
          if (elapsed >= total) this.release(now);
          break;
        }
        case 'attack': {
          const active = this.activeMs();
          if (this.attack === 'bite' || this.attack === 'charge') {
            const reach =
              this.attack === 'charge' ? (def.charge?.distance ?? 0) : (def.bite?.lunge ?? 0);
            const speed = reach / (active / 1000);
            vx = Math.cos(this.facing) * speed;
            vy = Math.sin(this.facing) * speed;
          } else if (this.attack === 'sweep' && def.sweep) {
            const arc = (def.sweep.arcDeg * Math.PI) / 180;
            this.sweepAngle = this.sweepFrom + this.sweepDir * arc * Math.min(1, elapsed / active);
          } else if (this.attack === 'leap') {
            const to = this.zones[0] ?? target;
            const t = Math.min(1, elapsed / active);
            // Saut : trajectoire droite, le sprite grossit puis retombe.
            this.sprite.setPosition(
              this.leapFrom.x + (to.x - this.leapFrom.x) * t,
              this.leapFrom.y + (to.y - this.leapFrom.y) * t,
            );
            this.sprite.setScale(1 + Math.sin(t * Math.PI) * 0.35);
          }
          this.drawStrike(elapsed / active);
          if (elapsed >= active) {
            if (this.attack === 'leap') {
              this.landingImpact = true;
              this.onQuake();
            }
            this.telegraph.clear();
            this.sprite.setScale(1);
            this.setState('recover', now, tempo(def, this.phase, this.recoveryMs()));
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

    this.updateRings(dt, now);
    this.drawChains();
    const slow = speedFactor(this.status, now);
    if (!(this.state === 'attack' && this.attack === 'leap')) {
      bodyOf(this.sprite).setVelocity(vx * slow, vy * slow);
    } else {
      bodyOf(this.sprite).setVelocity(0, 0);
    }
    this.sprite.setFlipX(Math.cos(this.facing) < 0);
    if (now < this.flashUntil) hitFlash(this.sprite);
    else this.sprite.clearTint().setTintMode(Phaser.TintModes.MULTIPLY);
    this.mark.setPosition(this.x, this.y - def.radius - 6);
    this.drawStatus(now, frozen);
  }

  /** Dégâts infligés à Ash cette frame (0 si rien ne le touche). À n'appeler que s'il est vulnérable. */
  hazardDamage(player: Vec2, playerRadius: number): number {
    if (!this.alive) return 0;
    const def = this.def;
    if (this.state === 'attack' && !this.attackLanded) {
      let damage = 0;
      if (this.attack === 'bite' && def.bite) {
        if (hitsArc(this, this.facing, def.bite.range, def.bite.arcDeg, player, playerRadius))
          damage = def.bite.damage;
      } else if (this.attack === 'charge' && def.charge) {
        if (Math.hypot(player.x - this.x, player.y - this.y) < def.charge.width / 2 + playerRadius)
          damage = def.charge.damage;
      } else if (this.attack === 'icefall' && def.icefall) {
        if (this.inZone(player, def.icefall.radius + playerRadius)) damage = def.icefall.damage;
      } else if (this.attack === 'sweep' && def.sweep) {
        const ux = Math.cos(this.sweepAngle);
        const uy = Math.sin(this.sweepAngle);
        const along = (player.x - this.x) * ux + (player.y - this.y) * uy;
        const across = Math.abs(-(player.x - this.x) * uy + (player.y - this.y) * ux);
        if (along > 0 && along < def.sweep.range && across < def.sweep.thickness / 2 + playerRadius)
          damage = def.sweep.damage;
      }
      if (damage > 0) {
        this.attackLanded = true;
        return damage;
      }
    }
    // Le bond ne blesse qu'à l'atterrissage, la frame où il retombe.
    if (this.landingImpact && def.leap) {
      this.landingImpact = false;
      if (this.inZone(player, def.leap.radius + playerRadius)) return def.leap.damage;
    }
    const quake = def.quake;
    if (!quake) return 0;
    for (const r of this.ringSlots) {
      if (!r.active || r.hit || r.radius <= 0) continue;
      const d = Math.hypot(player.x - r.origin.x, player.y - r.origin.y);
      if (ringHits(r.radius, quake.thickness, d, playerRadius)) {
        r.hit = true;
        return quake.damage;
      }
    }
    return 0;
  }

  private inZone(p: Vec2, reach: number): boolean {
    for (let i = 0; i < this.zoneCount; i++) {
      const z = this.zones[i];
      if (z && Math.hypot(p.x - z.x, p.y - z.y) < reach) return true;
    }
    return false;
  }

  private setZone(i: number, at: Vec2): void {
    const z = this.zones[i];
    if (!z) return;
    z.x = at.x;
    z.y = at.y;
  }

  private telegraphMs(): number {
    const def = this.def;
    const base = {
      bite: def.bite?.telegraphMs,
      charge: def.charge?.telegraphMs,
      quake: def.quake?.telegraphMs,
      summon: def.summon?.telegraphMs,
      leap: def.leap?.telegraphMs,
      icefall: def.icefall?.telegraphMs,
      sweep: def.sweep?.telegraphMs,
    }[this.attack];
    return tempo(def, this.phase, base ?? 800);
  }

  private activeMs(): number {
    const def = this.def;
    const ms = {
      bite: def.bite?.activeMs,
      charge: def.charge?.activeMs,
      leap: def.leap?.activeMs,
      icefall: def.icefall?.activeMs,
      sweep: def.sweep?.activeMs,
      quake: 0,
      summon: 0,
    }[this.attack];
    return Math.max(1, ms ?? 1);
  }

  private recoveryMs(): number {
    const def = this.def;
    const ms = {
      bite: def.bite?.recoveryMs,
      charge: def.charge?.recoveryMs,
      leap: def.leap?.recoveryMs,
      icefall: def.icefall?.recoveryMs,
      quake: def.quake?.recoveryMs,
      summon: def.summon?.recoveryMs,
      sweep: def.sweep?.recoveryMs,
    }[this.attack];
    return ms ?? 700;
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

  private startTelegraph(now: number, angle: number, target: Vec2): void {
    this.attack = chooseBossAttack(this.def, this.phase, this.history, this.rng);
    this.history.push(this.attack);
    this.facing = angle;
    this.zoneCount = 0;
    const ice = this.def.icefall;
    if (this.attack === 'icefall' && ice) {
      // Un cercle sous Ash, les autres autour : on sort en se déplaçant (ou on traverse en dash).
      const count = Math.min(MAX_ZONES, ice.count + (this.phase === 2 ? 1 : 0));
      for (let i = 0; i < count; i++) {
        const a = this.rng.next() * Math.PI * 2;
        const d = i === 0 ? 0 : ice.spread * (0.5 + this.rng.next() * 0.7);
        this.setZone(i, { x: target.x + Math.cos(a) * d, y: target.y + Math.sin(a) * d });
      }
      this.zoneCount = count;
    }
    if (this.attack === 'leap') {
      this.setZone(0, target);
      this.zoneCount = 1;
    }
    if (this.attack === 'sweep' && this.def.sweep) {
      // L'arc est centré sur Ash ; le sens est annoncé par le trait plein au bord de départ.
      this.sweepDir = this.rng.next() < 0.5 ? -1 : 1;
      this.sweepFrom = angle - (this.sweepDir * (this.def.sweep.arcDeg * Math.PI)) / 360;
    }
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
      case 'sweep':
        this.attackLanded = false;
        this.sweepAngle = this.sweepFrom;
        this.setState('attack', now);
        break;
      case 'bite':
      case 'charge':
      case 'icefall':
        this.attackLanded = false;
        this.setState('attack', now);
        if (this.attack === 'icefall') this.onQuake();
        break;
      case 'leap':
        this.attackLanded = false;
        this.leapFrom = { x: this.x, y: this.y };
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
          tempo(def, this.phase, def.quake?.recoveryMs ?? 700) + (count - 1) * 380,
        );
        break;
      }
      case 'summon':
        if (def.summon) this.onSummon(def.summon.enemy, def.summon.count);
        this.setState('recover', now, tempo(def, this.phase, def.summon?.recoveryMs ?? 700));
        break;
    }
  }

  private updateRings(dt: number, now: number): void {
    const g = this.rings.clear();
    const q = this.def.quake;
    if (!q) return;
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

  /** Chaînes de Fenrir : du mur jusqu'à son cou (forme et ambiance, aucun danger). */
  private drawChains(): void {
    const g = this.chains.clear();
    if (this.anchors.length === 0) return;
    g.lineStyle(2, 0x6d7891, 0.9);
    for (const a of this.anchors) {
      const links = 10;
      for (let i = 0; i < links; i += 2) {
        const t0 = i / links;
        const t1 = (i + 1) / links;
        g.lineBetween(
          a.x + (this.x - a.x) * t0,
          a.y + (this.y - a.y) * t0,
          a.x + (this.x - a.x) * t1,
          a.y + (this.y - a.y) * t1,
        );
      }
    }
  }

  private drawTelegraph(progress: number): void {
    const g = this.telegraph.clear();
    const def = this.def;
    g.lineStyle(2, DANGER, 0.9);
    switch (this.attack) {
      case 'bite': {
        if (!def.bite) break;
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
        if (def.charge)
          this.drawBand(g, def.charge.distance + def.radius, def.charge.width, progress);
        break;
      case 'quake': {
        // Le cercle se resserre sur le boss : l'onde part quand il touche son corps.
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
      case 'sweep': {
        if (!def.sweep) break;
        const arc = (def.sweep.arcDeg * Math.PI) / 180;
        const a0 = Math.min(this.sweepFrom, this.sweepFrom + this.sweepDir * arc);
        const a1 = Math.max(this.sweepFrom, this.sweepFrom + this.sweepDir * arc);
        g.beginPath().slice(this.x, this.y, def.sweep.range, a0, a1).strokePath();
        g.fillStyle(DANGER, 0.08 + 0.2 * progress)
          .beginPath()
          .slice(this.x, this.y, def.sweep.range * progress, a0, a1)
          .fillPath();
        // Bord de départ en trait épais : c'est de là que le rayon part.
        g.lineStyle(4, DANGER, 0.9).lineBetween(
          this.x,
          this.y,
          this.x + Math.cos(this.sweepFrom) * def.sweep.range,
          this.y + Math.sin(this.sweepFrom) * def.sweep.range,
        );
        break;
      }
      case 'leap':
      case 'icefall': {
        const r = this.attack === 'leap' ? (def.leap?.radius ?? 40) : (def.icefall?.radius ?? 20);
        g.fillStyle(DANGER, 0.1 + 0.3 * progress);
        for (let i = 0; i < this.zoneCount; i++) {
          const z = this.zones[i];
          if (!z) continue;
          g.strokeCircle(z.x, z.y, r).fillCircle(z.x, z.y, r * progress);
          if (this.attack === 'icefall' && def.icefall?.glyph === 'net') {
            // Filet : quadrillage dans le cercle (l'Oiseleur).
            for (const o of [-0.4, 0, 0.4]) {
              g.lineBetween(z.x + o * r, z.y - r * 0.6, z.x + o * r, z.y + r * 0.6);
              g.lineBetween(z.x - r * 0.6, z.y + o * r, z.x + r * 0.6, z.y + o * r);
            }
          } else if (this.attack === 'icefall' && def.icefall?.glyph === 'cross') {
            // Croix de débris (Talos).
            g.lineBetween(z.x - r * 0.45, z.y - r * 0.45, z.x + r * 0.45, z.y + r * 0.45);
            g.lineBetween(z.x - r * 0.45, z.y + r * 0.45, z.x + r * 0.45, z.y - r * 0.45);
          } else if (this.attack === 'icefall') {
            // Flocon dans le cercle : on reconnaît la pluie de glace sans la couleur.
            for (let k = 0; k < 3; k++) {
              const a = (k * Math.PI) / 3;
              g.lineBetween(
                z.x - Math.cos(a) * r * 0.45,
                z.y - Math.sin(a) * r * 0.45,
                z.x + Math.cos(a) * r * 0.45,
                z.y + Math.sin(a) * r * 0.45,
              );
            }
          } else {
            g.strokeCircle(z.x, z.y, r * 0.35);
          }
        }
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

  private drawStrike(progress: number): void {
    const g = this.telegraph.clear();
    const def = this.def;
    g.fillStyle(DANGER, 0.6);
    if (this.attack === 'bite' && def.bite) {
      const half = (def.bite.arcDeg * Math.PI) / 360;
      g.beginPath()
        .slice(this.x, this.y, def.bite.range, this.facing - half, this.facing + half)
        .fillPath();
    } else if (this.attack === 'icefall' && def.icefall) {
      for (let i = 0; i < this.zoneCount; i++) {
        const z = this.zones[i];
        if (z) g.fillCircle(z.x, z.y, def.icefall.radius);
      }
    } else if (this.attack === 'sweep' && def.sweep) {
      const ex = this.x + Math.cos(this.sweepAngle) * def.sweep.range;
      const ey = this.y + Math.sin(this.sweepAngle) * def.sweep.range;
      g.lineStyle(def.sweep.thickness, DANGER, 0.75).lineBetween(this.x, this.y, ex, ey);
      g.lineStyle(2, 0xffffff, 0.9).lineBetween(this.x, this.y, ex, ey);
    } else if (this.attack === 'leap' && def.leap) {
      const z = this.zones[0];
      // L'ombre d'atterrissage reste visible pendant tout le saut.
      if (z) g.lineStyle(2, DANGER, 0.9).strokeCircle(z.x, z.y, def.leap.radius);
      if (z && progress > 0.85) g.fillCircle(z.x, z.y, def.leap.radius);
    } else {
      g.fillCircle(this.x, this.y, def.radius + 6);
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
