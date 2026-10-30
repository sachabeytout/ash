import Phaser from 'phaser';
import type { AttackStep, ProjectileSpec, ZoneSpec } from '../../core/combat/attack';
import type { Vec2 } from '../../core/geometry';
import type { Hittable } from './Hittable';

/** `boon` : flèches d'Artémis (dégâts de don, sans effets d'arme). */
export type HitKind = 'attack' | 'power' | 'super' | 'boon';

export interface ShotHit {
  damage: number;
  kind: HitKind;
  knockback: number;
  id: number;
  from: Vec2;
  heavy: boolean;
  shake: number;
}

interface Projectile {
  active: boolean;
  sprite: Phaser.GameObjects.Image;
  x: number;
  y: number;
  vx: number;
  vy: number;
  travelled: number;
  spec: ProjectileSpec;
  kind: HitKind;
  id: number;
  scale: number;
  returning: boolean;
  readonly hits: Set<Hittable>;
}

interface Zone {
  active: boolean;
  g: Phaser.GameObjects.Graphics;
  x: number;
  y: number;
  startAt: number;
  explodeAt: number;
  spec: ZoneSpec;
  kind: HitKind;
  id: number;
  shake: number;
}

const PROJECTILES = 32;
const ZONES = 12;
/** Couleur des zones d'Ash : chaude (jamais le rouge-magenta des dangers ennemis). */
const ZONE_COLOR = 0xffb02e;
const TEXTURE: Record<ProjectileSpec['look'], string> = {
  orb: 'p_orb',
  bolt: 'p_bolt',
  disc: 'p_disc',
  chain: 'p_chain',
};

/**
 * Projectiles et zones d'Ash (armes à distance). Pools fixes : rien n'est créé pendant le combat.
 * Les dégâts sont décidés par la scène (rappel `onHit`), comme pour les coups au corps à corps.
 */
export class PlayerShots {
  private readonly shots: Projectile[] = [];
  private readonly zones: Zone[] = [];
  private readonly chainLine: Phaser.GameObjects.Graphics;

  onHit: (target: Hittable, hit: ShotHit) => void = () => undefined;
  onGrapple: (target: Hittable, hit: ShotHit) => void = () => undefined;
  /** Le disque est rattrapé au retour. */
  onCatch: () => void = () => undefined;
  onZone: (at: Vec2, radius: number) => void = () => undefined;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly bounds: Phaser.Geom.Rectangle,
  ) {
    for (let i = 0; i < PROJECTILES; i++) {
      this.shots.push({
        active: false,
        sprite: scene.add.image(0, 0, 'p_orb').setDepth(14).setVisible(false).setBlendMode('ADD'),
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        travelled: 0,
        spec: { damage: 0, speed: 0, radius: 0, range: 0, pierce: 0, knockback: 0, look: 'orb' },
        kind: 'attack',
        id: 0,
        scale: 1,
        returning: false,
        hits: new Set(),
      });
    }
    for (let i = 0; i < ZONES; i++) {
      this.zones.push({
        active: false,
        g: scene.add.graphics().setDepth(4),
        x: 0,
        y: 0,
        startAt: 0,
        explodeAt: 0,
        spec: { damage: 0, radius: 0, delayMs: 0, distance: 0, knockback: 0 },
        kind: 'attack',
        id: 0,
        shake: 0,
      });
    }
    this.chainLine = scene.add.graphics().setDepth(13);
  }

  /** Lance le projectile ou la zone d'un coup. `scale` multiplie les dégâts (disque rattrapé). */
  fire(
    now: number,
    from: Vec2,
    angle: number,
    step: AttackStep,
    kind: HitKind,
    id: number,
    scale = 1,
  ): void {
    const p = step.projectile;
    if (p) {
      const count = p.count ?? 1;
      const spread = ((p.spreadDeg ?? 0) * Math.PI) / 180;
      const full = (p.spreadDeg ?? 0) >= 360;
      for (let i = 0; i < count; i++) {
        const offset =
          count <= 1 ? 0 : full ? (i / count) * Math.PI * 2 : (i / (count - 1) - 0.5) * spread;
        this.spawn(from, angle + offset, p, kind, id, scale);
      }
    }
    const z = step.zone;
    if (z) {
      const cx = from.x + Math.cos(angle) * z.distance;
      const cy = from.y + Math.sin(angle) * z.distance;
      const count = z.count ?? 1;
      for (let i = 0; i < count; i++) {
        const a = angle + (i / count) * Math.PI * 2;
        const d = count > 1 ? (z.spread ?? 0) : 0;
        this.addZone(now, cx + Math.cos(a) * d, cy + Math.sin(a) * d, z, kind, id, step.shake);
      }
    }
  }

  private spawn(
    from: Vec2,
    angle: number,
    spec: ProjectileSpec,
    kind: HitKind,
    id: number,
    scale: number,
  ): void {
    const s = this.shots.find((x) => !x.active);
    if (!s) return;
    s.active = true;
    s.x = from.x;
    s.y = from.y;
    s.vx = Math.cos(angle) * spec.speed;
    s.vy = Math.sin(angle) * spec.speed;
    s.travelled = 0;
    s.spec = spec;
    s.kind = kind;
    s.id = id;
    s.scale = scale;
    s.returning = false;
    s.hits.clear();
    s.sprite
      .setTexture(TEXTURE[spec.look])
      .setPosition(s.x, s.y)
      .setRotation(angle)
      .setScale(spec.look === 'disc' ? spec.radius / 6 : 1)
      .setVisible(true);
  }

  private addZone(
    now: number,
    x: number,
    y: number,
    spec: ZoneSpec,
    kind: HitKind,
    id: number,
    shake: number,
  ): void {
    const z = this.zones.find((v) => !v.active);
    if (!z) return;
    Object.assign(z, {
      active: true,
      x,
      y,
      startAt: now,
      explodeAt: now + spec.delayMs,
      spec,
      kind,
      id,
      shake,
    });
  }

  update(now: number, dt: number, targets: readonly Hittable[], player: Vec2): void {
    this.chainLine.clear();
    for (const s of this.shots) if (s.active) this.updateShot(s, dt, targets, player);
    for (const z of this.zones) if (z.active) this.updateZone(z, now, targets);
  }

  private updateShot(s: Projectile, dt: number, targets: readonly Hittable[], player: Vec2): void {
    const spec = s.spec;
    if (s.returning) {
      // Le disque revient vers Ash, de plus en plus vite.
      const dx = player.x - s.x;
      const dy = player.y - s.y;
      const d = Math.hypot(dx, dy);
      if (d < 14) {
        this.kill(s);
        this.onCatch();
        return;
      }
      const speed = spec.speed * 1.2;
      s.vx = (dx / d) * speed;
      s.vy = (dy / d) * speed;
    }
    const stepX = (s.vx * dt) / 1000;
    const stepY = (s.vy * dt) / 1000;
    s.x += stepX;
    s.y += stepY;
    s.travelled += Math.hypot(stepX, stepY);
    s.sprite.setPosition(s.x, s.y);
    if (spec.look === 'disc') s.sprite.rotation += dt / 40;
    else s.sprite.setRotation(Math.atan2(s.vy, s.vx));
    if (spec.look === 'chain') {
      this.chainLine.lineStyle(2, 0xffb86a, 0.9).lineBetween(player.x, player.y, s.x, s.y);
    }

    const out = !this.bounds.contains(s.x, s.y);
    if (!s.returning && (s.travelled >= spec.range || out)) {
      if (spec.returns) {
        s.returning = true;
        s.hits.clear(); // au retour, le disque peut retoucher
      } else {
        this.kill(s);
        return;
      }
    }

    for (const t of targets) {
      if (!t.alive || s.hits.has(t)) continue;
      if (Math.hypot(t.x - s.x, t.y - s.y) > spec.radius + t.radius) continue;
      s.hits.add(t);
      const hit: ShotHit = {
        damage: spec.damage * s.scale,
        kind: s.kind,
        knockback: spec.knockback,
        id: s.id,
        from: { x: s.x - s.vx * 0.05, y: s.y - s.vy * 0.05 },
        heavy: s.kind !== 'attack',
        shake: 0,
      };
      if (spec.grapple) {
        this.onGrapple(t, hit);
        this.kill(s);
        return;
      }
      this.onHit(t, hit);
      if (!spec.returns && s.hits.size > spec.pierce) {
        this.kill(s);
        return;
      }
    }
  }

  private updateZone(z: Zone, now: number, targets: readonly Hittable[]): void {
    const progress = Math.min(1, (now - z.startAt) / Math.max(1, z.spec.delayMs));
    const g = z.g.clear();
    if (now < z.explodeAt) {
      // Cercle chaud qui se remplit : on voit où la zone va éclater.
      g.lineStyle(1.5, ZONE_COLOR, 0.9).strokeCircle(z.x, z.y, z.spec.radius);
      g.fillStyle(ZONE_COLOR, 0.08 + 0.22 * progress).fillCircle(
        z.x,
        z.y,
        z.spec.radius * progress,
      );
      return;
    }
    z.active = false;
    this.onZone({ x: z.x, y: z.y }, z.spec.radius);
    for (const t of targets) {
      if (!t.alive) continue;
      if (Math.hypot(t.x - z.x, t.y - z.y) > z.spec.radius + t.radius) continue;
      this.onHit(t, {
        damage: z.spec.damage,
        kind: z.kind,
        knockback: z.spec.knockback,
        id: z.id,
        from: { x: z.x, y: z.y },
        heavy: true,
        shake: z.shake,
      });
    }
  }

  private kill(s: Projectile): void {
    s.active = false;
    s.sprite.setVisible(false);
  }
}
