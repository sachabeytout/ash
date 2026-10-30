import Phaser from 'phaser';
import type { Health } from '../../core/combat/health';
import {
  isBurning,
  isFrozen,
  newStatus,
  speedFactor,
  type StatusState,
} from '../../core/combat/status';
import type { Vec2 } from '../../core/geometry';
import type { EnemyDef } from '../../data/enemies';
import { bodyOf } from '../physics';

export type EnemyState = 'chase' | 'telegraph' | 'attack' | 'recover' | 'dead';

/** Couleur réservée aux dangers ennemis (toujours doublée d'une forme). */
export const DANGER = 0xff2a6d;

let enemyCounter = 0;

/**
 * Ennemi réutilisable (pool). Cycle : poursuite → télégraphe → attaque → récupération.
 * Les dégâts sont résolus par la scène ; ici on gère le mouvement, les télégraphes et l'affichage.
 */
export class Enemy {
  readonly sprite: Phaser.Physics.Arcade.Image;
  private readonly telegraph: Phaser.GameObjects.Graphics;
  private readonly mark: Phaser.GameObjects.Text;
  private readonly statusFx: Phaser.GameObjects.Graphics;
  private readonly hex = Array.from({ length: 6 }, () => new Phaser.Math.Vector2());
  private readonly band = Array.from({ length: 4 }, () => new Phaser.Math.Vector2());
  private readonly runeSpots: Vec2[] = [0, 1, 2].map(() => ({ x: 0, y: 0 }));
  def!: EnemyDef;
  status: StatusState = newStatus();
  uid = 0;
  health: Health = { hp: 1, maxHp: 1 };
  state: EnemyState = 'dead';
  stateAt = 0;
  facing = 0;
  /** Le coup de corps à corps a déjà touché pendant cette attaque. */
  attackLanded = false;
  /** Dernier coup du joueur reçu (évite les doubles touches). */
  lastSwingId = -1;
  private cooldownUntil = 0;
  private knock = { x: 0, y: 0 };
  private flashUntil = 0;
  private strafe = 1;

  /** Rappels vers la scène. */
  onShoot: (from: Vec2, angle: number, enemy: Enemy) => void = () => undefined;
  onTelegraph: () => void = () => undefined;

  constructor(private readonly scene: Phaser.Scene) {
    this.sprite = scene.physics.add.image(0, 0, 'prowler').setDepth(8);
    this.telegraph = scene.add.graphics().setDepth(5);
    this.mark = scene.add
      .text(0, 0, '!', {
        fontFamily: 'monospace',
        fontSize: '12px',
        fontStyle: 'bold',
        color: '#ff2a6d',
      })
      .setOrigin(0.5, 1)
      .setDepth(20);
    this.statusFx = scene.add.graphics().setDepth(9);
    this.deactivate();
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

  activate(def: EnemyDef, x: number, y: number, now: number): void {
    this.def = def;
    this.uid = ++enemyCounter;
    this.health = { hp: def.maxHp, maxHp: def.maxHp };
    this.status = newStatus();
    this.state = 'chase';
    this.stateAt = now;
    this.cooldownUntil = now + 500 + Math.random() * 500; // pas d'attaque dès l'apparition
    this.knock = { x: 0, y: 0 };
    this.lastSwingId = -1;
    this.strafe = Math.random() < 0.5 ? -1 : 1;
    this.sprite
      .setTexture(def.id)
      .setPosition(x, y)
      .setActive(true)
      .setVisible(true)
      .setAlpha(1)
      .setScale(1);
    bodyOf(this.sprite).enable = true;
    bodyOf(this.sprite).setCircle(
      def.radius,
      this.sprite.width / 2 - def.radius,
      this.sprite.height / 2 - def.radius,
    );
    this.sprite.setCollideWorldBounds(true);
  }

  deactivate(): void {
    this.state = 'dead';
    this.sprite.setActive(false).setVisible(false);
    bodyOf(this.sprite).enable = false;
    this.telegraph.clear();
    this.statusFx.clear();
    this.mark.setVisible(false);
  }

  /** Gelé sur place : l'attaque en préparation est annulée. */
  freeze(now: number): void {
    this.telegraph.clear();
    this.mark.setVisible(false);
    this.setState('recover', now);
  }

  /** Coup reçu : flash blanc, recul, et interruption si le coup est assez lourd. */
  hit(now: number, from: Vec2, knockback: number): void {
    this.flashUntil = now + 70;
    const a = Math.atan2(this.y - from.y, this.x - from.x);
    const k = knockback * (1 - this.def.poise);
    this.knock = { x: Math.cos(a) * k, y: Math.sin(a) * k };
    if (k >= 100 && this.state === 'telegraph') this.setState('recover', now);
  }

  update(now: number, dt: number, target: Vec2, canAttack: boolean): void {
    if (!this.alive) return;
    const def = this.def;
    const dx = target.x - this.x;
    const dy = target.y - this.y;
    const dist = Math.hypot(dx, dy);
    const toTarget = Math.atan2(dy, dx);
    let vx = 0;
    let vy = 0;
    const elapsed = now - this.stateAt;
    const frozen = isFrozen(this.status, now);
    const slow = speedFactor(this.status, now);

    // Gelé : l'ennemi ne bouge plus et son horloge s'arrête (il reprend où il en était).
    if (frozen) this.stateAt += dt;
    else
      switch (this.state) {
        case 'chase': {
          if (def.attack.kind === 'runes') {
            // Le gardien avance lentement et pose ses runes de loin.
            if (dist > 90) {
              vx = (dx / dist) * def.speed;
              vy = (dy / dist) * def.speed;
            }
            if (canAttack && dist <= def.attack.triggerRange && now >= this.cooldownUntil) {
              this.placeRunes(target, def.attack);
              this.startTelegraph(now, toTarget);
            }
          } else if (def.attack.kind === 'melee' || def.attack.kind === 'charge') {
            vx = (dx / (dist || 1)) * def.speed;
            vy = (dy / (dist || 1)) * def.speed;
            if (canAttack && dist <= def.attack.triggerRange && now >= this.cooldownUntil)
              this.startTelegraph(now, toTarget);
          } else {
            // Le tireur garde ses distances et tourne autour du joueur.
            const pref = def.attack.preferredDistance;
            const radial = dist > pref + 20 ? 1 : dist < pref - 30 ? -1 : 0;
            vx =
              (Math.cos(toTarget) * radial + Math.cos(toTarget + Math.PI / 2) * this.strafe * 0.6) *
              def.speed;
            vy =
              (Math.sin(toTarget) * radial + Math.sin(toTarget + Math.PI / 2) * this.strafe * 0.6) *
              def.speed;
            if (canAttack && now >= this.cooldownUntil && dist < pref + 90)
              this.startTelegraph(now, toTarget);
          }
          this.facing = toTarget;
          break;
        }
        case 'telegraph': {
          // Le tireur suit encore sa cible pendant la première moitié, puis la visée se fige : on peut esquiver.
          if (
            (def.attack.kind === 'shot' || def.attack.kind === 'charge') &&
            elapsed < def.telegraphMs * 0.5
          )
            this.facing = toTarget;
          this.drawTelegraph(Math.min(1, elapsed / def.telegraphMs));
          if (elapsed >= def.telegraphMs) {
            this.telegraph.clear();
            this.mark.setVisible(false);
            if (def.attack.kind === 'shot') {
              const count = def.attack.count ?? 1;
              const spread = ((def.attack.spreadDeg ?? 0) * Math.PI) / 180;
              for (let i = 0; i < count; i++) {
                const offset = count > 1 ? (i / (count - 1) - 0.5) * spread : 0;
                this.onShoot({ x: this.x, y: this.y }, this.facing + offset, this);
              }
              this.setState('recover', now);
            } else {
              this.attackLanded = false;
              this.setState('attack', now);
            }
          }
          break;
        }
        case 'attack': {
          if (def.attack.kind === 'melee') {
            const speed = def.attack.lunge / (Math.max(1, def.activeMs) / 1000);
            vx = Math.cos(this.facing) * speed;
            vy = Math.sin(this.facing) * speed;
            this.drawStrike();
          } else if (def.attack.kind === 'runes') {
            this.drawStrike();
          } else if (def.attack.kind === 'charge') {
            const speed = def.attack.distance / (Math.max(1, def.activeMs) / 1000);
            vx = Math.cos(this.facing) * speed;
            vy = Math.sin(this.facing) * speed;
            this.drawStrike();
          }
          if (elapsed >= def.activeMs) {
            this.telegraph.clear();
            this.setState('recover', now);
          }
          break;
        }
        case 'recover': {
          if (elapsed >= def.recoveryMs) {
            this.cooldownUntil = now + def.cooldownMs;
            this.setState('chase', now);
          }
          break;
        }
        case 'dead':
          break;
      }

    // Le recul s'ajoute au mouvement et s'amortit vite.
    const decay = Math.exp(-dt / 90);
    this.knock.x *= decay;
    this.knock.y *= decay;
    bodyOf(this.sprite).setVelocity(vx * slow + this.knock.x, vy * slow + this.knock.y);
    this.sprite.setFlipX(Math.cos(this.facing) < 0);

    const flashing = now < this.flashUntil;
    if (flashing) this.sprite.setTint(0xffffff).setTintMode(Phaser.TintModes.FILL);
    else this.sprite.clearTint().setTintMode(Phaser.TintModes.MULTIPLY);
    this.mark.setPosition(this.x, this.y - def.radius - 4);
    this.drawStatus(now, frozen);
  }

  /** États visibles par la forme : bloc de glace (gel), flocons (givre), flammèches (brûlure). */
  private drawStatus(now: number, frozen: boolean): void {
    const g = this.statusFx.clear();
    const s = this.status;
    const r = this.def.radius;
    if (this.def.shield) {
      // Bouclier : arc épais devant l'ennemi (on voit de quel côté il protège).
      const half = (this.def.shield.arcDeg * Math.PI) / 360;
      g.lineStyle(3, 0xe8f2ff, frozen ? 0.3 : 0.9).beginPath();
      g.arc(this.x, this.y, r + 6, this.facing - half, this.facing + half);
      g.strokePath();
    }
    if (this.def.elite) {
      // Élite : anneau pâle et couronne (forme, pas seulement couleur).
      g.lineStyle(1, 0xf0e8ff, 0.7).strokeCircle(this.x, this.y, r + 3);
      g.fillStyle(0xf0e8ff, 0.95);
      const cy = this.y - r - 5;
      g.fillTriangle(this.x - 6, cy, this.x - 4, cy - 5, this.x - 2, cy);
      g.fillTriangle(this.x - 2, cy, this.x, cy - 6, this.x + 2, cy);
      g.fillTriangle(this.x + 2, cy, this.x + 4, cy - 5, this.x + 6, cy);
    }
    if (frozen) {
      g.fillStyle(0x8ff0ff, 0.28).lineStyle(1.5, 0xd8fbff, 0.95);
      this.hex.forEach((p, i) => {
        const a = Math.PI / 6 + (i * Math.PI) / 3;
        p.set(this.x + Math.cos(a) * (r + 4), this.y + Math.sin(a) * (r + 4));
      });
      g.fillPoints(this.hex, true).strokePoints(this.hex, true);
    } else if (now < s.chillUntil && s.chill > 0) {
      g.fillStyle(0x8ff0ff, 1);
      for (let i = 0; i < s.chill; i++) g.fillRect(this.x - r + i * 4, this.y + r + 3, 2, 2);
    }
    if (isBurning(s, now)) {
      g.fillStyle(0xffa53a, 0.9);
      const flick = Math.sin(now / 60) * 1.5;
      for (const ox of [-r * 0.6, 0, r * 0.6]) {
        const bx = this.x + ox;
        const by = this.y - r - 1;
        g.fillTriangle(bx - 2, by, bx + 2, by, bx, by - 5 - flick * (ox === 0 ? 1 : -1));
      }
    }
  }

  private setState(state: EnemyState, now: number): void {
    this.state = state;
    this.stateAt = now;
  }

  private startTelegraph(now: number, angle: number): void {
    this.facing = angle;
    this.setState('telegraph', now);
    this.mark.setVisible(true);
    this.onTelegraph();
  }

  /** Télégraphe : la zone dangereuse se dessine en contour puis se remplit jusqu'au coup. */
  private drawTelegraph(progress: number): void {
    const g = this.telegraph.clear();
    const def = this.def;
    if (def.attack.kind === 'melee') {
      const reach = def.attack.range + def.attack.lunge;
      g.lineStyle(1.5, DANGER, 0.9).fillStyle(DANGER, 0.12 + 0.3 * progress);
      if (def.attack.arcDeg >= 360) {
        g.strokeCircle(this.x, this.y, reach).fillCircle(this.x, this.y, reach * progress);
      } else {
        const half = (def.attack.arcDeg * Math.PI) / 360;
        g.beginPath()
          .slice(this.x, this.y, reach, this.facing - half, this.facing + half)
          .strokePath();
        g.beginPath()
          .slice(this.x, this.y, reach * progress, this.facing - half, this.facing + half)
          .fillPath();
      }
    } else if (def.attack.kind === 'charge') {
      // Bande au sol : contour de toute la trajectoire, qui se remplit jusqu'au départ.
      this.drawBand(
        g,
        def.attack.distance + def.radius,
        def.attack.width,
        0.12 + 0.3 * progress,
        progress,
      );
    } else if (def.attack.kind === 'runes') {
      // Cercles runiques : contour, puis remplissage jusqu'à l'explosion.
      const r = def.attack.radius;
      g.lineStyle(1.5, DANGER, 0.9).fillStyle(DANGER, 0.12 + 0.3 * progress);
      for (const spot of this.runeSpots) {
        g.strokeCircle(spot.x, spot.y, r).fillCircle(spot.x, spot.y, r * progress);
        g.lineBetween(spot.x - r * 0.4, spot.y, spot.x + r * 0.4, spot.y);
        g.lineBetween(spot.x, spot.y - r * 0.4, spot.x, spot.y + r * 0.4);
      }
    } else {
      const count = def.attack.count ?? 1;
      // Éventail : lignes plus courtes, pour ne pas couvrir tout l'écran.
      const len = count > 1 ? 220 : 400;
      const spread = ((def.attack.spreadDeg ?? 0) * Math.PI) / 180;
      g.lineStyle(1 + progress * 2, DANGER, 0.35 + 0.5 * progress);
      for (let i = 0; i < count; i++) {
        const a = this.facing + (count > 1 ? (i / (count - 1) - 0.5) * spread : 0);
        g.lineBetween(this.x, this.y, this.x + Math.cos(a) * len, this.y + Math.sin(a) * len);
      }
    }
  }

  /** Positions des runes : sous Ash et autour (fixées au début du télégraphe : on peut en sortir). */
  private placeRunes(target: Vec2, attack: { count: number; spread: number }): void {
    this.runeSpots.forEach((spot, i) => {
      if (i >= attack.count) return;
      const a = (i / attack.count) * Math.PI * 2 + Math.random() * 0.6;
      const d = i === 0 ? 0 : attack.spread;
      spot.x = target.x + Math.cos(a) * d;
      spot.y = target.y + Math.sin(a) * d;
    });
  }

  /** Ash est-il dans une rune qui explose ? */
  runeHits(target: Vec2, targetRadius: number): boolean {
    if (this.def.attack.kind !== 'runes') return false;
    const r = this.def.attack.radius + targetRadius;
    return this.runeSpots.some((s) => Math.hypot(target.x - s.x, target.y - s.y) < r);
  }

  /** Le bouclier frontal arrête-t-il un coup venu de `from` ? */
  blocks(from: Vec2, now: number): boolean {
    const shield = this.def.shield;
    if (!shield || isFrozen(this.status, now)) return false;
    const toAttacker = Math.atan2(from.y - this.y, from.x - this.x);
    let diff = Math.abs(toAttacker - this.facing) % (Math.PI * 2);
    if (diff > Math.PI) diff = Math.PI * 2 - diff;
    return diff <= (shield.arcDeg * Math.PI) / 360;
  }

  /** Bande rectangulaire devant l'ennemi (charge), remplie sur `fill` de sa longueur. */
  private drawBand(
    g: Phaser.GameObjects.Graphics,
    length: number,
    width: number,
    alpha: number,
    fill: number,
  ): void {
    const cos = Math.cos(this.facing);
    const sin = Math.sin(this.facing);
    const half = width / 2;
    const set = (len: number) => {
      const pts: [number, number][] = [
        [0, -half],
        [len, -half],
        [len, half],
        [0, half],
      ];
      pts.forEach(([along, side], i) =>
        this.band[i]?.set(this.x + cos * along - sin * side, this.y + sin * along + cos * side),
      );
      return this.band;
    };
    g.lineStyle(1.5, DANGER, 0.9).strokePoints(set(length), true);
    g.fillStyle(DANGER, alpha).fillPoints(set(length * fill), true);
  }

  private drawStrike(): void {
    if (this.def.attack.kind === 'runes') {
      const g = this.telegraph.clear();
      g.fillStyle(DANGER, 0.7);
      for (const spot of this.runeSpots) g.fillCircle(spot.x, spot.y, this.def.attack.radius);
      return;
    }
    if (this.def.attack.kind === 'charge') {
      const g = this.telegraph.clear();
      g.fillStyle(DANGER, 0.55).fillCircle(this.x, this.y, this.def.radius + 4);
      return;
    }
    if (this.def.attack.kind !== 'melee') return;
    const g = this.telegraph.clear();
    const range = this.def.attack.range;
    g.fillStyle(DANGER, 0.7);
    if (this.def.attack.arcDeg >= 360) {
      g.fillCircle(this.x, this.y, range);
    } else {
      const half = (this.def.attack.arcDeg * Math.PI) / 360;
      g.beginPath()
        .slice(this.x, this.y, range, this.facing - half, this.facing + half)
        .fillPath();
    }
  }
}
