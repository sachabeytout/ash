import Phaser from 'phaser';
import { insideAny, type Rect } from '../../core/arena/obstacles';
import type { AttackStep, ProjectileSpec, ZoneSpec } from '../../core/combat/attack';
import type { StepMod } from '../../core/combat/engraving';
import type { Vec2 } from '../../core/geometry';
import type { Hittable } from './Hittable';

/** `boon` : flèches de don (dégâts de don, sans effets d'arme). */
export type HitKind = 'attack' | 'power' | 'super' | 'boon';

export interface ShotHit {
  damage: number;
  kind: HitKind;
  knockback: number;
  id: number;
  from: Vec2;
  heavy: boolean;
  shake: number;
  /** Gravure de Ptah du coup qui a lancé ce tir (effets ajoutés). */
  mod?: StepMod;
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
  mod: StepMod | undefined;
  /** Gravures : rebonds restants, division déjà faite, fin du vol sur place (disque). */
  bouncesLeft: number;
  splitDone: boolean;
  hoverUntil: number;
  nextHoverTick: number;
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
  mod: StepMod | undefined;
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
  arrow: 'p_arrow',
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
  /** Obstacles de la salle : ils arrêtent les projectiles. */
  obstacles: readonly Rect[] = [];

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
        mod: undefined,
        bouncesLeft: 0,
        splitDone: false,
        hoverUntil: 0,
        nextHoverTick: 0,
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
        mod: undefined,
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
    mod?: StepMod,
  ): void {
    const p = step.projectile;
    if (p) {
      const count = p.count ?? 1;
      const spread = ((p.spreadDeg ?? 0) * Math.PI) / 180;
      const full = (p.spreadDeg ?? 0) >= 360;
      for (let i = 0; i < count; i++) {
        const offset =
          count <= 1 ? 0 : full ? (i / count) * Math.PI * 2 : (i / (count - 1) - 0.5) * spread;
        this.spawn(from, angle + offset, p, kind, id, scale, mod);
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
        this.addZone(now, cx + Math.cos(a) * d, cy + Math.sin(a) * d, z, kind, id, step.shake, mod);
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
    mod?: StepMod,
  ): Projectile | undefined {
    const s = this.shots.find((x) => !x.active);
    if (!s) return undefined;
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
    s.mod = mod;
    s.bouncesLeft = spec.bounces ?? 0;
    s.splitDone = false;
    s.hoverUntil = 0;
    s.nextHoverTick = 0;
    s.sprite
      .setTexture(TEXTURE[spec.look])
      .setPosition(s.x, s.y)
      .setRotation(angle)
      .setScale(spec.look === 'disc' ? spec.radius / 6 : 1)
      .setVisible(true);
    return s;
  }

  private addZone(
    now: number,
    x: number,
    y: number,
    spec: ZoneSpec,
    kind: HitKind,
    id: number,
    shake: number,
    mod?: StepMod,
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
      mod,
    });
  }

  update(now: number, dt: number, targets: readonly Hittable[], player: Vec2): void {
    this.chainLine.clear();
    for (const s of this.shots) if (s.active) this.updateShot(s, now, dt, targets, player);
    for (const z of this.zones) if (z.active) this.updateZone(z, now, targets);
  }

  private updateShot(
    s: Projectile,
    now: number,
    dt: number,
    targets: readonly Hittable[],
    player: Vec2,
  ): void {
    const spec = s.spec;
    // Gravure « Éclipse » : le disque tourne sur place, et peut retoucher régulièrement.
    if (s.hoverUntil > 0) {
      s.sprite.rotation += dt / 25;
      if (now >= s.nextHoverTick) {
        s.hits.clear();
        s.nextHoverTick = now + 300;
      }
      if (now >= s.hoverUntil) {
        s.hoverUntil = 0;
        s.returning = true;
      }
    }
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

    const out = !this.bounds.contains(s.x, s.y) || insideAny(s, this.obstacles);
    if (!s.returning && s.hoverUntil === 0 && (s.travelled >= spec.range || out)) {
      if (spec.returns && spec.hover && !out && s.vx !== 0) {
        s.vx = 0;
        s.vy = 0;
        s.hoverUntil = now + spec.hover;
        s.nextHoverTick = now + 300;
      } else if (spec.returns) {
        s.returning = true;
        s.hits.clear(); // au retour, le disque peut retoucher
      } else {
        // Gravure « Flèche de Neith » : explosion au bout de la course.
        if (spec.explodeEnd) this.explodeAt(now, s);
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
        ...(s.mod ? { mod: s.mod } : {}),
      };
      if (spec.grapple) {
        this.onGrapple(t, hit);
        this.kill(s);
        return;
      }
      this.onHit(t, hit);
      // Gravure « Orbe jumeau » : deux petits projectiles partent en V au premier impact.
      if (spec.split && !s.splitDone) {
        s.splitDone = true;
        const angle = Math.atan2(s.vy, s.vx);
        const child: ProjectileSpec = {
          ...spec,
          damage: spec.damage * 0.5,
          radius: Math.max(3, spec.radius - 1),
        };
        delete child.split;
        for (const da of [-0.5, 0.5]) {
          const c = this.spawn({ x: s.x, y: s.y }, angle + da, child, s.kind, s.id, s.scale, s.mod);
          c?.hits.add(t);
        }
      }
      // Gravures « Vent du sud », « Rebond » : le tir repart vers l'ennemi le plus proche.
      if (s.bouncesLeft > 0 && !s.returning) {
        const next = this.nearestUnhit(s, targets, 150);
        if (next) {
          s.bouncesLeft--;
          const a = Math.atan2(next.y - s.y, next.x - s.x);
          const speed = Math.hypot(s.vx, s.vy) || spec.speed;
          s.vx = Math.cos(a) * speed;
          s.vy = Math.sin(a) * speed;
          s.travelled = 0;
          continue;
        }
      }
      if (!spec.returns && s.hits.size > spec.pierce) {
        if (spec.explodeEnd) this.explodeAt(now, s);
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
        ...(z.mod ? { mod: z.mod } : {}),
      });
    }
  }

  /** Ennemi le plus proche pas encore touché par ce tir. */
  private nearestUnhit(
    s: Projectile,
    targets: readonly Hittable[],
    range: number,
  ): Hittable | undefined {
    let best: Hittable | undefined;
    let bestD = range;
    for (const t of targets) {
      if (!t.alive || s.hits.has(t)) continue;
      const d = Math.hypot(t.x - s.x, t.y - s.y);
      if (d < bestD) {
        bestD = d;
        best = t;
      }
    }
    return best;
  }

  /** Explosion immédiate là où le tir s'arrête (gravure « Flèche de Neith »). */
  private explodeAt(now: number, s: Projectile): void {
    const e = s.spec.explodeEnd;
    if (!e) return;
    this.addZone(
      now,
      s.x,
      s.y,
      { damage: e.damage * s.scale, radius: e.radius, delayMs: 0, distance: 0, knockback: 120 },
      s.kind,
      s.id,
      0.004,
      s.mod,
    );
  }

  private kill(s: Projectile): void {
    s.active = false;
    s.sprite.setVisible(false);
  }
}
