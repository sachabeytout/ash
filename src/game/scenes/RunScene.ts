import Phaser from 'phaser';
import { applyDamage } from '../../core/combat/health';
import { hitsArc, type Vec2 } from '../../core/geometry';
import { createRng, type Rng } from '../../core/rng';
import { rollDoorRewards, type RewardKind } from '../../core/run/rewards';
import { applyReward, summarize, type RunState } from '../../core/run/state';
import { planWaves, type Wave } from '../../core/run/waves';
import { getBiome } from '../../data/biomes';
import { ENEMIES, type EnemyDef } from '../../data/enemies';
import { PLAYER } from '../../data/player';
import { WEAPONS } from '../../data/weapons';
import { t, type TextKey } from '../../i18n';
import { sfx } from '../audio/sfx';
import { DANGER, Enemy } from '../entities/Enemy';
import { Player } from '../entities/Player';
import { Juice } from '../fx/Juice';
import { Controls } from '../input/Controls';
import { UiScene } from './UiScene';
import { bodyOf } from '../physics';
import { ensureGameTextures } from '../textures';
import { FONT_FAMILY } from '../theme';
import { markScene } from './markScene';

/** Arène de combat (coordonnées du monde). La caméra la centre, la largeur d'écran varie selon le téléphone. */
const ARENA = new Phaser.Geom.Rectangle(40, 34, 560, 300);
/** Zoom de la caméra : Ash fait ~1/13 de la hauteur d'écran, lisible au pouce. */
const CAMERA_ZOOM = 2;
const POOL_SIZE = 16;
const SPAWN_WARNING_MS = 750;
const MIN_SPAWN_DISTANCE = 110;

interface PendingSpawn {
  def: EnemyDef;
  x: number;
  y: number;
  at: number;
  marker: Phaser.GameObjects.Arc;
}

interface Shot {
  sprite: Phaser.Physics.Arcade.Image;
  damage: number;
  source: EnemyDef;
}

interface Door {
  reward: RewardKind | 'exit';
  x: number;
  y: number;
  parts: Phaser.GameObjects.GameObject[];
}

const REWARD_STYLE: Record<RewardKind | 'exit', { color: number; label: TextKey }> = {
  boon: { color: 0xffb02e, label: 'reward.boon' },
  shards: { color: 0x7fe7ff, label: 'reward.shards' },
  weaponMod: { color: 0xc0c8d8, label: 'reward.weaponMod' },
  xp: { color: 0xb08cff, label: 'reward.xp' },
  weaponParts: { color: 0xffe08a, label: 'reward.weaponParts' },
  exit: { color: 0xffffff, label: 'reward.exit' },
};

/** Une salle de combat : vagues d'ennemis, puis choix entre deux portes. */
export class RunScene extends Phaser.Scene {
  private run!: RunState;
  private rng!: Rng;
  private sim = 0;
  private player!: Player;
  private controls!: Controls;
  private juice!: Juice;
  private enemies: Enemy[] = [];
  private shots: Shot[] = [];
  private pending: PendingSpawn[] = [];
  private waves: Wave[] = [];
  private waveIndex = 0;
  private nextWaveAt = 0;
  private doors: Door[] = [];
  private roomCleared = false;
  private leaving = false;

  constructor() {
    super('run');
  }

  init(data: { run: RunState }): void {
    this.run = data.run;
    this.sim = 0;
    this.enemies = [];
    this.shots = [];
    this.pending = [];
    this.doors = [];
    this.waveIndex = 0;
    this.roomCleared = false;
    this.leaving = false;
  }

  create(): void {
    ensureGameTextures(this);
    const biome = getBiome(this.run.biome);
    this.rng = createRng((this.run.seed + this.run.room * 7919) >>> 0);

    this.drawArena();
    this.physics.world.setBounds(ARENA.x, ARENA.y, ARENA.width, ARENA.height);

    this.juice = new Juice(this);
    this.controls = new Controls(this, () => this.sim);
    this.scene.launch('ui', { controls: this.controls });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scene.stop('ui'));

    this.player = new Player(this, ARENA.centerX, ARENA.bottom - 30, WEAPONS[this.run.weapon]);
    this.player.onSwing = (heavy) => sfx.swing(heavy);
    this.player.onDash = () => {
      sfx.dash();
      this.juice.burst(this.player.x, this.player.y, 0xff7a2a, 6);
    };

    for (let i = 0; i < POOL_SIZE; i++) {
      const e = new Enemy(this);
      e.onShoot = (from, angle, enemy) => this.fireShot(from, angle, enemy.def);
      e.onTelegraph = () => sfx.telegraph();
      this.enemies.push(e);
    }
    this.physics.add.collider(
      this.enemies.map((e) => e.sprite),
      this.enemies.map((e) => e.sprite),
    );

    this.setupCamera();
    this.waves = planWaves(biome, this.run.room, (id) => ENEMIES[id].threat, this.rng);
    this.nextWaveAt = 700;

    this.cameras.main.fadeIn(350, 7, 6, 13);
    markScene('run');
  }

  override update(_time: number, delta: number): void {
    if (this.juice.frozen) {
      if (!this.physics.world.isPaused) this.physics.world.pause();
      return;
    }
    if (this.physics.world.isPaused) this.physics.world.resume();

    const dt = Math.min(delta, 50);
    this.sim += dt;
    if (!this.leaving) this.run.elapsedMs += dt;

    this.controls.update();
    const alive = this.enemies.filter((e) => e.alive);
    if (!this.leaving) this.player.update(this.sim, dt, this.controls, alive);

    this.updateSpawns();
    for (const e of alive) e.update(this.sim, dt, this.player, this.isOnScreen(e));
    this.resolvePlayerAttack(alive);
    this.resolveEnemyAttacks(alive);
    this.updateShots();
    this.updateWaves();
    this.checkDoors();
    this.ui.showRun(this.run);
  }

  // ---------- Arène ----------

  private drawArena(): void {
    const pad = 400;
    this.add.rectangle(
      ARENA.centerX,
      ARENA.centerY,
      ARENA.width + pad * 2,
      ARENA.height + pad * 2,
      0x07060d,
    );
    this.add.tileSprite(ARENA.centerX, ARENA.centerY, ARENA.width, ARENA.height, 'floor');
    const g = this.add.graphics();
    // Murs : double trait néon, l'intérieur plus vif.
    g.lineStyle(6, 0x2a2048, 1).strokeRectShape(ARENA);
    g.lineStyle(2, 0x6b4cff, 0.9).strokeRect(
      ARENA.x - 1,
      ARENA.y - 1,
      ARENA.width + 2,
      ARENA.height + 2,
    );
    // Néons décoratifs dans les coins (froids, jamais rouges : le rouge = danger).
    const neon = (x: number, y: number, color: number) => {
      this.add.image(x, y, 'glow').setTint(color).setAlpha(0.5).setScale(2.2).setBlendMode('ADD');
    };
    neon(ARENA.left, ARENA.top, 0x6b4cff);
    neon(ARENA.right, ARENA.top, 0x4de1ff);
    neon(ARENA.left, ARENA.bottom, 0x4de1ff);
    neon(ARENA.right, ARENA.bottom, 0x6b4cff);
  }

  /** Caméra rapprochée qui suit Ash (les personnages restent lisibles sur un téléphone). */
  private setupCamera(): void {
    const cam = this.cameras.main;
    const margin = 36;
    cam.setZoom(CAMERA_ZOOM);
    cam.setBounds(
      ARENA.x - margin,
      ARENA.y - margin,
      ARENA.width + margin * 2,
      ARENA.height + margin * 2,
    );
    cam.startFollow(this.player.sprite, true, 0.14, 0.14);
  }

  /** Un ennemi n'attaque que s'il est visible à l'écran : jamais de coup venu de nulle part. */
  private isOnScreen(e: Enemy): boolean {
    const view = this.cameras.main.worldView;
    const inset = 10;
    return (
      e.x > view.x + inset &&
      e.x < view.right - inset &&
      e.y > view.y + inset &&
      e.y < view.bottom - inset
    );
  }

  // ---------- Vagues et apparitions ----------

  private updateWaves(): void {
    if (this.roomCleared || this.leaving) return;
    const anyAlive = this.enemies.some((e) => e.alive) || this.pending.length > 0;
    if (anyAlive) return;
    if (this.waveIndex < this.waves.length) {
      if (this.nextWaveAt === 0) this.nextWaveAt = this.sim + 500;
      if (this.sim >= this.nextWaveAt) {
        this.spawnWave(this.waves[this.waveIndex] ?? []);
        this.waveIndex++;
        this.nextWaveAt = 0;
      }
      return;
    }
    this.clearRoom();
  }

  private spawnWave(wave: Wave): void {
    wave.forEach((id, i) => {
      const point = this.findSpawnPoint();
      // Marqueur au sol avant l'apparition : jamais d'ennemi qui surgit sans prévenir.
      const marker = this.add
        .circle(point.x, point.y, 4)
        .setStrokeStyle(1.5, 0x9ab4ff, 0.9)
        .setDepth(4);
      this.tweens.add({
        targets: marker,
        radius: 12,
        alpha: 0.4,
        duration: SPAWN_WARNING_MS,
        ease: 'Sine.Out',
      });
      this.pending.push({
        def: ENEMIES[id],
        x: point.x,
        y: point.y,
        at: this.sim + SPAWN_WARNING_MS + i * 120,
        marker,
      });
    });
    sfx.spawn();
  }

  private findSpawnPoint(): Vec2 {
    const margin = 24;
    let best: Vec2 = { x: ARENA.centerX, y: ARENA.top + margin };
    let bestDist = -1;
    for (let i = 0; i < 20; i++) {
      const p = {
        x: ARENA.left + margin + this.rng.next() * (ARENA.width - margin * 2),
        y: ARENA.top + margin + this.rng.next() * (ARENA.height - margin * 2),
      };
      const d = Math.hypot(p.x - this.player.x, p.y - this.player.y);
      if (d >= MIN_SPAWN_DISTANCE) return p;
      if (d > bestDist) {
        best = p;
        bestDist = d;
      }
    }
    return best;
  }

  private updateSpawns(): void {
    for (let i = this.pending.length - 1; i >= 0; i--) {
      const s = this.pending[i];
      if (!s) continue;
      if (this.sim < s.at) continue;
      s.marker.destroy();
      this.pending.splice(i, 1);
      const slot = this.enemies.find((e) => !e.alive);
      if (!slot) continue;
      slot.activate(s.def, s.x, s.y, this.sim);
      this.juice.burst(s.x, s.y, s.def.color, 10);
    }
  }

  // ---------- Combat ----------

  private resolvePlayerAttack(alive: readonly Enemy[]): void {
    const swing = this.player.activeSwing(this.sim);
    if (!swing) return;
    const { step } = swing;
    for (const e of alive) {
      if (!e.alive || e.lastSwingId === swing.id) continue;
      if (!hitsArc(this.player, this.player.facing, step.range, step.arcDeg, e, e.radius)) continue;
      e.lastSwingId = swing.id;
      const { dealt, killed } = applyDamage(e.health, step.damage * (1 + this.run.damageBonus));
      e.hit(this.sim, this.player, step.knockback);
      this.juice.hitstop(killed ? step.hitstopMs + 30 : step.hitstopMs);
      this.juice.shake(step.shake);
      this.juice.burst(e.x, e.y, 0xffe9d6, swing.heavy ? 10 : 6);
      this.juice.damageNumber(e.x, e.y - e.radius, dealt);
      sfx.hit(swing.heavy);
      if (killed) this.killEnemy(e);
    }
  }

  private killEnemy(e: Enemy): void {
    this.juice.burst(e.x, e.y, e.def.color, 16);
    sfx.kill();
    e.deactivate();
  }

  private resolveEnemyAttacks(alive: readonly Enemy[]): void {
    for (const e of alive) {
      if (e.state !== 'attack' || e.attackLanded || e.def.attack.kind !== 'melee') continue;
      if (this.player.isInvulnerable(this.sim)) continue;
      if (
        hitsArc(e, e.facing, e.def.attack.range, e.def.attack.arcDeg, this.player, PLAYER.radius)
      ) {
        e.attackLanded = true;
        this.hurtPlayer(e.def.damage, e, e.def);
      }
    }
  }

  private fireShot(from: Vec2, angle: number, def: EnemyDef): void {
    if (def.attack.kind !== 'shot') return;
    let shot = this.shots.find((s) => !s.sprite.active);
    if (!shot) {
      shot = { sprite: this.physics.add.image(0, 0, 'shot').setDepth(15), damage: 0, source: def };
      this.shots.push(shot);
    }
    shot.damage = def.damage;
    shot.source = def;
    const speed = def.attack.projectileSpeed;
    shot.sprite.setPosition(from.x, from.y).setActive(true).setVisible(true).setRotation(angle);
    bodyOf(shot.sprite).enable = true;
    bodyOf(shot.sprite).setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
    sfx.shoot();
  }

  private updateShots(): void {
    for (const s of this.shots) {
      const sp = s.sprite;
      if (!sp.active) continue;
      if (!ARENA.contains(sp.x, sp.y)) {
        this.removeShot(s);
        continue;
      }
      const hitRadius =
        (s.source.attack.kind === 'shot' ? s.source.attack.projectileRadius : 3) + PLAYER.radius;
      if (
        Math.hypot(sp.x - this.player.x, sp.y - this.player.y) < hitRadius &&
        !this.player.isInvulnerable(this.sim)
      ) {
        this.hurtPlayer(s.damage, sp, s.source);
        this.removeShot(s);
      }
    }
  }

  private removeShot(s: Shot): void {
    this.juice.burst(s.sprite.x, s.sprite.y, DANGER, 4);
    s.sprite.setActive(false).setVisible(false);
    bodyOf(s.sprite).enable = false;
  }

  private hurtPlayer(amount: number, from: Vec2, source: EnemyDef): void {
    if (this.leaving) return;
    const health = { hp: this.run.hp, maxHp: this.run.maxHp };
    const { dealt, killed } = applyDamage(health, amount);
    this.run.hp = health.hp;
    this.player.takeHit(this.sim, from);
    this.juice.hitstop(70);
    this.juice.shake(0.006, 140);
    this.juice.buzz(40);
    this.juice.damageNumber(this.player.x, this.player.y - 10, dealt, '#ff6f96');
    sfx.hurt();
    this.ui.flashHurt();
    if (killed) this.die(t(source.nameKey as TextKey));
  }

  // ---------- Fin de salle et portes ----------

  private clearRoom(): void {
    this.roomCleared = true;
    sfx.clear();
    const biome = getBiome(this.run.biome);
    if (this.run.room >= biome.rooms) {
      this.addDoor('exit', ARENA.centerX);
      return;
    }
    const [a, b] = rollDoorRewards(this.rng, 2);
    if (a) this.addDoor(a, ARENA.centerX - 120);
    if (b) this.addDoor(b, ARENA.centerX + 120);
  }

  private addDoor(reward: RewardKind | 'exit', x: number): void {
    const y = ARENA.top + 16;
    const { color, label } = REWARD_STYLE[reward];
    const frame = this.add.graphics().setDepth(3);
    frame.fillStyle(0x07060d, 1).fillRoundedRect(x - 18, y - 22, 36, 34, 6);
    frame.lineStyle(2, color, 1).strokeRoundedRect(x - 18, y - 22, 36, 34, 6);
    const icon = this.add.graphics().setDepth(4);
    drawRewardIcon(icon, reward, x, y - 5, color);
    const glow = this.add
      .image(x, y - 5, 'glow')
      .setTint(color)
      .setAlpha(0.6)
      .setScale(1.2)
      .setBlendMode('ADD');
    const text = this.add
      .text(x, y + 18, t(label), {
        fontFamily: FONT_FAMILY,
        fontSize: '10px',
        color: '#ffe9d6',
        stroke: '#07060d',
        strokeThickness: 3,
      })
      .setOrigin(0.5, 0)
      .setDepth(4);
    this.tweens.add({
      targets: [frame, icon, glow, text],
      alpha: { from: 0, to: 1 },
      duration: 400,
    });
    this.tweens.add({ targets: glow, scale: 1.5, duration: 900, yoyo: true, repeat: -1 });
    this.doors.push({ reward, x, y, parts: [frame, icon, glow, text] });
    sfx.door();
  }

  private checkDoors(): void {
    if (!this.roomCleared || this.leaving) return;
    for (const d of this.doors) {
      if (Math.hypot(this.player.x - d.x, this.player.y - d.y) > 24) continue;
      this.leaving = true;
      sfx.door();
      if (d.reward === 'exit') {
        this.endRun('cleared');
        return;
      }
      applyReward(this.run, d.reward);
      this.run.room += 1;
      this.cameras.main.fadeOut(300, 7, 6, 13);
      this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () =>
        this.scene.restart({ run: this.run }),
      );
      return;
    }
  }

  // ---------- Mort / fin ----------

  private die(killedBy: string): void {
    this.leaving = true;
    bodyOf(this.player.sprite).setVelocity(0, 0);
    // Ash se consume en braises… et renaîtra dans la cage.
    this.juice.burst(this.player.x, this.player.y, 0xff7a2a, 40);
    this.tweens.add({ targets: this.player.sprite, alpha: 0, scale: 1.6, duration: 700 });
    this.endRun('death', killedBy);
  }

  private endRun(outcome: 'death' | 'cleared', killedBy?: string): void {
    const summary = summarize(this.run, outcome, killedBy);
    this.time.delayedCall(outcome === 'death' ? 700 : 200, () => {
      this.cameras.main.fadeOut(700, 7, 6, 13);
      this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () =>
        this.scene.start('hub', { summary }),
      );
    });
  }

  // ---------- Interface ----------

  /** Le calque d'interface (vie, salle, commandes tactiles), lancé par cette scène. */
  private get ui(): UiScene {
    return this.scene.get('ui') as UiScene;
  }
}

/** Icône de récompense : chaque type a une forme différente (pas seulement une couleur). */
function drawRewardIcon(
  g: Phaser.GameObjects.Graphics,
  kind: RewardKind | 'exit',
  x: number,
  y: number,
  color: number,
): void {
  g.fillStyle(color, 1).lineStyle(2, color, 1);
  switch (kind) {
    case 'boon': {
      const pts: Phaser.Math.Vector2[] = [];
      for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + (i * Math.PI) / 5;
        const r = i % 2 === 0 ? 9 : 4;
        pts.push(new Phaser.Math.Vector2(x + Math.cos(a) * r, y + Math.sin(a) * r));
      }
      g.fillPoints(pts, true);
      break;
    }
    case 'shards':
      g.fillTriangle(x, y - 9, x + 7, y, x, y + 9).fillTriangle(x, y - 9, x - 7, y, x, y + 9);
      break;
    case 'weaponMod':
      g.fillRect(x - 8, y - 7, 16, 6).fillRect(x - 2, y - 1, 4, 10);
      break;
    case 'xp':
      g.strokeCircle(x, y, 8).fillCircle(x, y, 3);
      break;
    case 'weaponParts': {
      const pts: Phaser.Math.Vector2[] = [];
      for (let i = 0; i < 6; i++) {
        const a = (i * Math.PI) / 3;
        pts.push(new Phaser.Math.Vector2(x + Math.cos(a) * 8, y + Math.sin(a) * 8));
      }
      g.strokePoints(pts, true).fillCircle(x, y, 3);
      break;
    }
    case 'exit':
      g.fillTriangle(x - 6, y + 6, x, y - 8, x + 6, y + 6);
      break;
  }
}
