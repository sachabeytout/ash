import Phaser from 'phaser';
import { hitFlash } from '../fx/hitFlash';
import { AFFIXES, type AffixId } from '../../data/affixes';
import { GODS } from '../../data/gods';
import { steerAround, type Rect } from '../../core/arena/obstacles';
import type { Health } from '../../core/combat/health';
import {
  isBurning,
  isCursed,
  isFrozen,
  isPoisoned,
  isSoaked,
  isStunned,
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
  /** Charges restantes dans l'enchaînement (Minotaure) et durée du télégraphe suivant. */
  private chainLeft = 1;
  private telegraphOverride: number | null = null;
  def!: EnemyDef;
  status: StatusState = newStatus();
  /** Mesure « Surcadençage » : ennemis plus rapides. */
  private speedMul = 1;
  /** Obstacles de la salle : en poursuite, l'ennemi les contourne. */
  obstacles: readonly Rect[] = [];
  /** Marque de l'Oiseleur (Blindé, Rapide, Instable) ou aucune. */
  affix: AffixId | null = null;
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

  /** Bond : départ, point d'atterrissage, et « vient d'atterrir » (lu une fois par la scène). */
  private leapFrom: Vec2 = { x: 0, y: 0 };
  leapTo: Vec2 = { x: 0, y: 0 };
  justLanded = false;

  /** Rappels vers la scène. */
  onSupport: (enemy: Enemy) => void = () => undefined;
  onShoot: (from: Vec2, angle: number, enemy: Enemy) => void = () => undefined;
  onTelegraph: () => void = () => undefined;

  constructor(private readonly scene: Phaser.Scene) {
    this.sprite = scene.physics.add.image(0, 0, 'prowler').setDepth(8);
    // Au-dessus de l'obscurité des salles sombres : une attaque se voit toujours.
    this.telegraph = scene.add.graphics().setDepth(7);
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

  activate(
    def: EnemyDef,
    x: number,
    y: number,
    now: number,
    hpMul = 1,
    speedMul = 1,
    affix: AffixId | null = null,
  ): void {
    this.def = def;
    this.uid = ++enemyCounter;
    this.affix = affix;
    this.justLanded = false;
    const mark = affix ? AFFIXES[affix] : undefined;
    const maxHp = Math.round(def.maxHp * hpMul * (mark?.hpMul ?? 1));
    this.health = { hp: maxHp, maxHp };
    this.speedMul = speedMul * (mark?.speedMul ?? 1);
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
    const stunned = isStunned(this.status, now);
    const slow = stunned ? 0 : speedFactor(this.status, now) * this.speedMul;

    // Gelé : l'ennemi ne bouge plus et son horloge s'arrête (il reprend où il en était).
    if (frozen || stunned) this.stateAt += dt;
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
          } else if (
            def.attack.kind === 'melee' ||
            def.attack.kind === 'charge' ||
            def.attack.kind === 'leap'
          ) {
            vx = (dx / (dist || 1)) * def.speed;
            vy = (dy / (dist || 1)) * def.speed;
            if (canAttack && dist <= def.attack.triggerRange && now >= this.cooldownUntil) {
              // Bond : le point d'atterrissage est fixé maintenant (là où est Ash).
              this.leapFrom = { x: this.x, y: this.y };
              this.leapTo = { x: target.x, y: target.y };
              this.startTelegraph(now, toTarget);
            }
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
          // Les tireurs et chargeurs suivent leur cible la première moitié, puis la visée se fige : on peut esquiver.
          const tele = this.telegraphOverride ?? def.telegraphMs;
          const aims =
            def.attack.kind === 'shot' ||
            def.attack.kind === 'charge' ||
            def.attack.kind === 'beam';
          if (aims && elapsed < tele * 0.5) this.facing = toTarget;
          this.drawTelegraph(Math.min(1, elapsed / tele));
          if (elapsed >= tele) {
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
            } else if (def.attack.kind === 'heal' || def.attack.kind === 'ward') {
              // Soutien : l'effet tombe sur les alliés proches (géré par la scène).
              this.onSupport(this);
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
          } else if (def.attack.kind === 'beam') {
            this.drawStrike();
          } else if (def.attack.kind === 'leap') {
            // En l'air : glisse jusqu'au cercle, qui reste affiché plein.
            const p = Math.min(1, elapsed / Math.max(1, def.activeMs));
            const lx = this.leapFrom.x + (this.leapTo.x - this.leapFrom.x) * p;
            const ly = this.leapFrom.y + (this.leapTo.y - this.leapFrom.y) * p;
            bodyOf(this.sprite).reset(lx, ly);
            this.sprite.setScale(1 + Math.sin(p * Math.PI) * 0.35);
            this.drawTelegraph(1);
            if (p >= 1) {
              this.sprite.setScale(1);
              this.justLanded = true;
            }
          }
          if (elapsed >= def.activeMs) {
            this.telegraph.clear();
            this.chainLeft--;
            if (def.attack.kind === 'charge' && this.chainLeft > 0) {
              // Charge suivante : réannoncée par un télégraphe plus court (jamais moins de 0,5 s).
              this.telegraphOverride = Math.max(
                500,
                def.attack.repeatTelegraphMs ?? def.telegraphMs,
              );
              this.setState('telegraph', now);
              this.mark.setVisible(true);
              this.onTelegraph();
            } else {
              this.setState('recover', now);
            }
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

    if (this.state === 'chase' && this.obstacles.length > 0) {
      const steered = steerAround(this, def.radius, vx, vy, this.obstacles);
      vx = steered.x;
      vy = steered.y;
    }
    // Le recul s'ajoute au mouvement et s'amortit vite.
    const decay = Math.exp(-dt / 90);
    this.knock.x *= decay;
    this.knock.y *= decay;
    bodyOf(this.sprite).setVelocity(vx * slow + this.knock.x, vy * slow + this.knock.y);
    this.sprite.setFlipX(Math.cos(this.facing) < 0);

    const flashing = now < this.flashUntil;
    if (flashing) hitFlash(this.sprite);
    else this.sprite.clearTint().setTintMode(Phaser.TintModes.MULTIPLY);
    this.mark.setPosition(this.x, this.y - def.radius - 4);
    this.drawStatus(now, frozen, stunned);
  }

  /** Marques : coins de blindage (Blindé), chevrons derrière (Rapide), couronne de pointes (Instable). */
  private drawAffix(g: Phaser.GameObjects.Graphics, now: number, r: number): void {
    const x = this.x;
    const y = this.y;
    const d = r + 5;
    if (this.affix === 'armored') {
      g.lineStyle(2, 0xd8e2ff, 0.9);
      for (const [sx, sy] of [
        [-1, -1],
        [1, -1],
        [1, 1],
        [-1, 1],
      ] as const) {
        g.lineBetween(x + sx * d, y + sy * d, x + sx * (d - 5), y + sy * d);
        g.lineBetween(x + sx * d, y + sy * d, x + sx * d, y + sy * (d - 5));
      }
    } else if (this.affix === 'swift') {
      const back = this.facing + Math.PI;
      g.lineStyle(2, 0x9dffe0, 0.85);
      for (const k of [0, 1]) {
        const cx = x + Math.cos(back) * (d + k * 5);
        const cy = y + Math.sin(back) * (d + k * 5);
        const a1 = this.facing + 2.4;
        const a2 = this.facing - 2.4;
        g.lineBetween(cx, cy, cx + Math.cos(a1) * 4, cy + Math.sin(a1) * 4);
        g.lineBetween(cx, cy, cx + Math.cos(a2) * 4, cy + Math.sin(a2) * 4);
      }
    } else if (this.affix === 'volatile') {
      const spin = now / 600;
      g.fillStyle(0xffa040, 0.9);
      for (let i = 0; i < 6; i++) {
        const a = spin + (i * Math.PI) / 3;
        const tip = { x: x + Math.cos(a) * (d + 4), y: y + Math.sin(a) * (d + 4) };
        const l = { x: x + Math.cos(a - 0.25) * d, y: y + Math.sin(a - 0.25) * d };
        const rr = { x: x + Math.cos(a + 0.25) * d, y: y + Math.sin(a + 0.25) * d };
        g.fillTriangle(tip.x, tip.y, l.x, l.y, rr.x, rr.y);
      }
    }
  }

  /** États visibles par la forme : bloc de glace (gel), flocons (givre), flammèches (brûlure). */
  private drawStatus(now: number, frozen: boolean, stunned: boolean): void {
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
    if (this.affix) this.drawAffix(g, now, r);
    if ((this.health.ward ?? 0) > 0) {
      // Bouclier du Porte-bouclier : cercle bleu clair (il absorbe les prochains dégâts).
      g.lineStyle(2, 0xc8e8ff, 0.85).strokeCircle(this.x, this.y, r + 7);
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
      g.fillStyle(GODS.khonsou.color, 0.28).lineStyle(1.5, 0xd8fbff, 0.95);
      this.hex.forEach((p, i) => {
        const a = Math.PI / 6 + (i * Math.PI) / 3;
        p.set(this.x + Math.cos(a) * (r + 4), this.y + Math.sin(a) * (r + 4));
      });
      g.fillPoints(this.hex, true).strokePoints(this.hex, true);
    } else if (now < s.chillUntil && s.chill > 0) {
      g.fillStyle(GODS.khonsou.color, 1);
      for (let i = 0; i < s.chill; i++) g.fillRect(this.x - r + i * 4, this.y + r + 3, 2, 2);
    }
    if (stunned) {
      // Étoiles qui tournent au-dessus de la tête (Seth).
      g.fillStyle(GODS.seth.color, 1);
      for (let i = 0; i < 3; i++) {
        const a = now / 200 + (i * Math.PI * 2) / 3;
        const sx = this.x + Math.cos(a) * (r + 2);
        const sy = this.y - r - 6 + Math.sin(a) * 2;
        g.fillTriangle(sx, sy - 2, sx + 2, sy, sx, sy + 2).fillTriangle(
          sx,
          sy - 2,
          sx - 2,
          sy,
          sx,
          sy + 2,
        );
      }
    }
    if (isCursed(s, now)) {
      // Malédiction : petit voile sombre sous l'ennemi.
      g.lineStyle(1.5, GODS.serket.color, 0.9).strokeEllipse(this.x, this.y + r + 2, r * 2 + 4, 5);
    }
    if (now < s.judgedUntil) {
      // Jugé : plume de Maât (trait vertical) au-dessus.
      g.lineStyle(2, GODS.anubis.color, 0.95).lineBetween(
        this.x + r + 3,
        this.y - r - 6,
        this.x + r + 3,
        this.y - r + 2,
      );
    }
    if (now < s.weakenUntil) {
      // Affaibli (Neith) : petit bouclier fendu à gauche de la tête.
      const wx = this.x - r - 4;
      const wy = this.y - r - 2;
      g.lineStyle(1.5, GODS.neith.color, 0.95);
      g.strokeTriangle(wx - 3, wy - 3, wx + 3, wy - 3, wx, wy + 3);
      g.lineBetween(wx, wy - 3, wx, wy + 1);
    }
    if (isSoaked(s, now)) {
      // Trempé (Sobek) : gouttes qui tombent de chaque côté.
      g.fillStyle(GODS.sobek.color, 0.95);
      const drip = (now / 12) % 6;
      for (const ox of [-r - 3, r + 3]) {
        const dx = this.x + ox;
        const dy = this.y - 2 + drip;
        g.fillTriangle(dx - 2, dy, dx + 2, dy, dx, dy - 4).fillCircle(dx, dy, 2);
      }
    }
    if (isPoisoned(s, now)) {
      // Venin (Serket) : une petite goutte par dose, en arc sous l'ennemi.
      g.fillStyle(GODS.serket.color, 0.95);
      const n = s.venomStacks;
      for (let i = 0; i < n; i++) {
        const a = Math.PI * (0.15 + (0.7 * (i + 0.5)) / n);
        g.fillCircle(this.x + Math.cos(a) * (r + 5), this.y + Math.sin(a) * (r + 5), 1.6);
      }
    }
    if (isBurning(s, now)) {
      g.fillStyle(GODS.ra.color, 0.9);
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
    this.telegraphOverride = null;
    this.chainLeft = this.def.attack.kind === 'charge' ? (this.def.attack.repeat ?? 1) : 1;
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
    } else if (def.attack.kind === 'beam') {
      // Ligne de visée fine qui s'épaissit : le rayon partira exactement là.
      const len = def.attack.length;
      g.lineStyle(1 + progress * 2, DANGER, 0.35 + 0.5 * progress);
      g.lineBetween(
        this.x,
        this.y,
        this.x + Math.cos(this.facing) * len,
        this.y + Math.sin(this.facing) * len,
      );
      g.strokeCircle(this.x, this.y, def.radius + 4 - progress * 3);
    } else if (def.attack.kind === 'leap') {
      // Cercle d'atterrissage (fixé) : contour, croix, puis remplissage jusqu'au saut.
      const r = def.attack.radius;
      const t = this.leapTo;
      g.lineStyle(1.5, DANGER, 0.9).fillStyle(DANGER, 0.12 + 0.3 * progress);
      g.strokeCircle(t.x, t.y, r).fillCircle(t.x, t.y, r * progress);
      g.lineBetween(t.x - r * 0.35, t.y - r * 0.35, t.x + r * 0.35, t.y + r * 0.35);
      g.lineBetween(t.x - r * 0.35, t.y + r * 0.35, t.x + r * 0.35, t.y - r * 0.35);
    } else if (def.attack.kind === 'heal' || def.attack.kind === 'ward') {
      // Soutien (pas un danger) : anneau qui grandit autour de lui, vert (soin) ou bleu clair (bouclier).
      const color = def.attack.kind === 'heal' ? 0x7fe0a0 : 0xc8e8ff;
      g.lineStyle(1.5, color, 0.35 + 0.5 * progress).strokeCircle(
        this.x,
        this.y,
        def.radius + 4 + (def.attack.radius - def.radius) * progress,
      );
      if (def.attack.kind === 'heal') {
        g.fillStyle(color, 0.9).fillRect(this.x - 1.5, this.y - def.radius - 11, 3, 8);
        g.fillRect(this.x - 4, this.y - def.radius - 8.5, 8, 3);
      } else {
        g.lineStyle(2, color, 0.9).strokeCircle(this.x, this.y - def.radius - 7, 4);
      }
    } else if (def.attack.kind === 'runes') {
      // Cercles runiques : contour, puis remplissage jusqu'à l'explosion.
      const r = def.attack.radius;
      g.lineStyle(1.5, DANGER, 0.9).fillStyle(DANGER, 0.12 + 0.3 * progress);
      for (const spot of this.runeSpots) {
        g.strokeCircle(spot.x, spot.y, r).fillCircle(spot.x, spot.y, r * progress);
        g.lineBetween(spot.x - r * 0.4, spot.y, spot.x + r * 0.4, spot.y);
        g.lineBetween(spot.x, spot.y - r * 0.4, spot.x, spot.y + r * 0.4);
      }
    } else if (def.attack.kind === 'shot') {
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

  /** Ash est-il sur le rayon ? (distance au segment) */
  beamHits(target: Vec2, targetRadius: number): boolean {
    if (this.def.attack.kind !== 'beam') return false;
    const len = this.def.attack.length;
    const ux = Math.cos(this.facing);
    const uy = Math.sin(this.facing);
    const along = Math.max(0, Math.min(len, (target.x - this.x) * ux + (target.y - this.y) * uy));
    const px = this.x + ux * along;
    const py = this.y + uy * along;
    return Math.hypot(target.x - px, target.y - py) < this.def.attack.width / 2 + targetRadius;
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
    if (this.def.attack.kind === 'beam') {
      const g = this.telegraph.clear();
      const len = this.def.attack.length;
      const ex = this.x + Math.cos(this.facing) * len;
      const ey = this.y + Math.sin(this.facing) * len;
      g.lineStyle(this.def.attack.width, DANGER, 0.75).lineBetween(this.x, this.y, ex, ey);
      g.lineStyle(2, 0xffffff, 0.9).lineBetween(this.x, this.y, ex, ey);
      return;
    }
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
