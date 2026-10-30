import Phaser from 'phaser';
import {
  buildProfile,
  damageMultiplier,
  rollOffer,
  type BoonOffer,
  type CombatProfile,
  type HitEffects,
} from '../../core/boons/boons';
import { applyDamage } from '../../core/combat/health';
import { gainSuper, superReady } from '../../core/combat/superGauge';
import { applyBurn, applyChill, isBurning, isFrozen, tickBurn } from '../../core/combat/status';
import { edgeIndicator, hitsArc, type Vec2 } from '../../core/geometry';
import { createRng, type Rng } from '../../core/rng';
import { rollDoors, type DoorReward, type RewardKind } from '../../core/run/rewards';
import {
  afterBoss,
  applyReward,
  chooseBoon,
  roomKind,
  type RoomKind,
  onRoomCleared,
  summarize,
  type RunState,
} from '../../core/run/state';
import { planWaves, type Wave } from '../../core/run/waves';
import { BIOMES, getBiome } from '../../data/biomes';
import { BOSSES } from '../../data/bosses';
import { DASH_AURA_RADIUS, DASH_BOLT_RANGE, getBoon } from '../../data/boons';
import { GOD_IDS, GODS } from '../../data/gods';
import { ENEMIES, type EnemyDef } from '../../data/enemies';
import { PLAYER } from '../../data/player';
import { WEAPONS } from '../../data/weapons';
import { t, type TextKey } from '../../i18n';
import { music } from '../audio/music';
import { sfx } from '../audio/sfx';
import { Boss } from '../entities/Boss';
import { DANGER, Enemy } from '../entities/Enemy';
import type { Hittable } from '../entities/Hittable';
import { Player } from '../entities/Player';
import { Juice } from '../fx/Juice';
import { Lightning } from '../fx/Lightning';
import { drawGodIcon } from '../icons';
import type { BoonSceneData } from './BoonScene';
import type { PauseSceneData } from './PauseScene';
import { Controls } from '../input/Controls';
import { UiScene, type Indicator } from './UiScene';
import { finishRun } from '../../core/meta';
import { QUALITY_PARTICLES, settings } from '../../core/settings';
import { cheatsEnabled } from '../debug/cheats';
import { session } from '../session';
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
  reward: DoorReward | SpecialDoor;
  x: number;
  y: number;
  parts: Phaser.GameObjects.GameObject[];
}

/** Couleurs des effets des dons (côté joueur : jamais le rouge-magenta des dangers). */
const FX = {
  burn: 0xffa53a,
  zap: GODS.zeus.color,
  ice: GODS.skadi.color,
  burnText: '#ffb35a',
  zapText: '#e2d2ff',
  heal: '#9dffb0',
} as const;

/** Portes sans récompense : sortie de la run, boss, biome suivant / reprise après le marchand. */
type SpecialDoor = 'exit' | 'boss' | 'next';

const REWARD_STYLE: Record<RewardKind | SpecialDoor, { color: number; label: TextKey }> = {
  boon: { color: 0xffb02e, label: 'reward.boon' },
  shards: { color: 0x7fe7ff, label: 'reward.shards' },
  weaponMod: { color: 0xc0c8d8, label: 'reward.weaponMod' },
  xp: { color: 0xb08cff, label: 'reward.xp' },
  weaponParts: { color: 0xffe08a, label: 'reward.weaponParts' },
  exit: { color: 0xffffff, label: 'reward.exit' },
  boss: { color: 0xb8a8ff, label: 'reward.boss' },
  next: { color: 0x8ff0ff, label: 'reward.next' },
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
  /** Tout ce qu'Ash peut toucher cette frame (ennemis vivants + boss), tableau réutilisé. */
  private readonly targets: Hittable[] = [];
  private boss: Boss | null = null;
  private kind: RoomKind = 'combat';
  private shots: Shot[] = [];
  private pending: PendingSpawn[] = [];
  private waves: Wave[] = [];
  private waveIndex = 0;
  private nextWaveAt = 0;
  private doors: Door[] = [];
  private roomCleared = false;
  private leaving = false;
  /** Un dieu propose un don : le combat attend. */
  private choosing = false;
  private lastChainSwing = -1;
  private readonly indicatorBuf: Indicator[] = Array.from({ length: POOL_SIZE + 8 }, () => ({
    x: 0,
    y: 0,
    angle: 0,
    spawn: false,
  }));
  private profile!: CombatProfile;
  private lightning!: Lightning;

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
    this.choosing = false;
    this.boss = null;
    this.targets.length = 0;
  }

  create(): void {
    ensureGameTextures(this);
    const biome = getBiome(this.run.biome);
    this.rng = createRng((this.run.seed + this.run.room * 7919) >>> 0);

    this.kind = roomKind(this.run, biome);
    this.drawArena();
    this.physics.world.setBounds(ARENA.x, ARENA.y, ARENA.width, ARENA.height);

    this.juice = new Juice(this);
    this.lightning = new Lightning(this);
    this.profile = buildProfile(this.run.boons);
    this.controls = new Controls(this, () => this.sim);
    this.controls.onPause = () => this.openPause();
    this.scene.launch('ui', { controls: this.controls });
    // L'app passe en arrière-plan (appel, verrouillage) : pause automatique.
    const onHidden = () => this.openPause();
    this.game.events.on('app-hidden', onHidden);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () =>
      this.game.events.off('app-hidden', onHidden),
    );
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scene.stop('ui'));

    this.player = new Player(this, ARENA.centerX, ARENA.bottom - 30, WEAPONS[this.run.weapon]);
    this.player.onSwing = (heavy) => sfx.swing(heavy);
    this.player.onDash = () => {
      sfx.dash();
      this.juice.burst(this.player.x, this.player.y, 0xff7a2a, 6);
      this.dashEffects();
    };
    this.player.canSuper = () => superReady(this.run.superGauge) && !this.choosing;
    this.player.onSuper = () => {
      this.run.superGauge = 0;
      sfx.super();
      this.juice.hitstop(60);
      this.juice.shake(0.004, 160);
      this.lightning.ring(this.player, 40, 0xffe08a);
      this.juice.burst(this.player.x, this.player.y, 0xffe08a, 24);
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
    this.waves =
      this.kind === 'combat'
        ? planWaves(biome, this.run.room, (id) => ENEMIES[id].threat, this.rng)
        : [];
    if (this.kind === 'boss') this.startBoss();
    if (this.kind === 'shop') this.startShop();
    this.nextWaveAt = 700;
    // Entrée dans un nouveau biome : on annonce son nom.
    if (this.run.room <= 1 && this.kind !== 'boss') {
      this.time.delayedCall(400, () => this.ui.showBanner(t(biome.nameKey as TextKey), ''));
    }

    this.cameras.main.fadeIn(350, 7, 6, 13);
    music.play(this.kind === 'boss' ? 'boss' : this.kind === 'shop' ? 'hub' : biome.music);
    markScene('run');
    // Sauvegarde à chaque entrée de salle : fermer l'app à tout moment, reprendre ici.
    session.snapshotRun(this.run);
    if (this.run.pendingBoon) {
      this.choosing = true;
      this.time.delayedCall(380, () => this.offerBoon());
    }
    if (cheatsEnabled) this.setupCheats();
  }

  private setupCheats(): void {
    this.input.keyboard?.on('keydown', (e: KeyboardEvent) => {
      if (this.choosing || this.leaving) return;
      if (e.code === 'KeyB') {
        this.run.pendingBoon = GOD_IDS[Math.floor(Math.random() * GOD_IDS.length)] ?? 'ra';
        this.choosing = true;
        this.offerBoon();
      }
      if (e.code === 'KeyG') this.run.superGauge = 1;
      if (e.code === 'KeyL') this.spawnWave(['stalker']);
      if (e.code === 'KeyO') {
        this.run.room = getBiome(this.run.biome).rooms + 1;
        this.leaving = true;
        this.scene.restart({ run: this.run });
      }
      if (e.code === 'KeyN') {
        this.pending.forEach((p) => p.marker.destroy());
        this.pending = [];
        this.waveIndex = this.waves.length;
        this.enemies.filter((en) => en.alive).forEach((en) => this.killEnemy(en));
        if (this.boss?.alive) this.defeatBoss();
      }
    });
  }

  // ---------- Boss ----------

  private get isBossRoom(): boolean {
    return this.kind === 'boss';
  }

  private startBoss(): void {
    const intro = 1900;
    const def = BOSSES[getBiome(this.run.biome).boss];
    const boss = new Boss(
      this,
      def,
      ARENA.centerX,
      ARENA.top + 70,
      createRng((this.run.seed ^ 0xa3317) >>> 0),
      this.sim,
      intro,
    );
    boss.onTelegraph = () => sfx.telegraph();
    boss.onQuake = () => {
      sfx.explode();
      this.juice.shake(0.005, 200);
    };
    boss.onSummon = (enemy, count) => this.spawnWave(Array<typeof enemy>(count).fill(enemy));
    boss.onPhase2 = () => {
      this.ui.showBanner(t('boss.phase2'), '');
      this.juice.burst(boss.x, boss.y, 0xb8a8ff, 30);
      this.juice.shake(0.006, 260);
      sfx.super();
    };
    this.boss = boss;
    this.time.delayedCall(400, () =>
      this.ui.showBanner(t(def.nameKey as TextKey), t(def.titleKey as TextKey)),
    );
  }

  private updateBoss(dt: number): void {
    const boss = this.boss;
    if (!boss) return;
    boss.update(this.sim, dt, this.player, this.isOnScreen(boss));
    if (!this.leaving && !this.player.isInvulnerable(this.sim)) {
      const dmg = boss.hazardDamage(this.player, PLAYER.radius);
      if (dmg > 0) this.hurtPlayer(dmg, boss, boss.def.nameKey);
    }
    this.ui.showBoss(boss.alive ? boss.health.hp / boss.health.maxHp : 0, boss.phase);
  }

  /** Victoire : la Dévoreuse s'effondre, les invocations disparaissent, la sortie s'ouvre. */
  private defeatBoss(): void {
    const boss = this.boss;
    if (!boss?.alive) return;
    boss.kill();
    this.run.xp += boss.def.reward.xp;
    this.run.weaponParts += boss.def.reward.weaponParts;
    this.juice.hitstop(220);
    this.juice.shake(0.01, 400);
    this.juice.burst(boss.x, boss.y, 0xb8a8ff, 40);
    this.juice.burst(boss.x, boss.y, 0xffe08a, 30);
    sfx.explode();
    sfx.kill();
    this.tweens.add({ targets: boss.sprite, alpha: 0, scale: 1.4, duration: 900 });
    this.pending.forEach((p) => p.marker.destroy());
    this.pending = [];
    this.enemies.filter((en) => en.alive).forEach((en) => this.killEnemy(en));
    this.ui.showBanner(t('boss.defeated'), '');
  }

  // ---------- Marchand ----------

  private startShop(): void {
    // Le marchand arrive à l'étape suivante ; pour l'instant la salle s'ouvre directement.
    this.time.delayedCall(600, () => this.clearRoom());
  }

  // ---------- Pause ----------

  openPause(): void {
    if (this.leaving || this.scene.isPaused() || this.scene.isActive('boon')) return;
    this.scene.pause();
    this.scene.pause('ui');
    const data: PauseSceneData = {
      run: this.run,
      onResume: () => {
        this.scene.resume('ui');
        this.scene.resume();
        markScene('run');
      },
      onAbandon: () => {
        this.scene.resume('ui');
        this.scene.resume();
        this.leaving = true;
        this.endRun('death', t('hub.abandoned'));
      },
    };
    this.scene.launch('pause', data);
    this.scene.bringToTop('pause');
  }

  // ---------- Dons ----------

  private offerBoon(): void {
    const god = this.run.pendingBoon;
    if (!god) return;
    // Même graine que la salle : fermer et rouvrir le jeu repropose les mêmes dons.
    const rng = createRng((this.run.seed ^ Math.imul(this.run.room, 2654435761)) >>> 0);
    const offers = rollOffer(rng, this.run.boons, god, 3, this.run.perks.rareBonus);
    if (offers.length === 0) {
      this.run.pendingBoon = null;
      this.choosing = false;
      return;
    }
    const data: BoonSceneData = { god, offers, onPick: (offer) => this.onBoonPicked(offer) };
    this.scene.launch('boon', data);
    this.scene.bringToTop('boon');
  }

  private onBoonPicked(offer: BoonOffer): void {
    chooseBoon(this.run, offer);
    session.snapshotRun(this.run);
    this.profile = buildProfile(this.run.boons);
    this.choosing = false;
    this.nextWaveAt = this.sim + 600;
    this.juice.burst(this.player.x, this.player.y, GODS[getBoonGod(offer)].color, 24);
  }

  /** Effets appliqués à un ennemi touché par une action (attaque, puissante, dash). */
  private applyHitEffects(e: Hittable, fx: HitEffects): void {
    if (!e.alive) return;
    if (fx.burn) {
      applyBurn(e.status, this.sim, fx.burn.dps, fx.burn.durationMs);
      sfx.burn();
    }
    if (fx.chill && applyChill(e.status, this.sim, fx.chill)) {
      e.freeze(this.sim);
      sfx.freeze();
      this.juice.burst(e.x, e.y, FX.ice, 10);
    }
    this.checkThermalShock(e);
  }

  /** Duo Râ + Skadi : un ennemi gelé qui brûle explose (une fois par gel). */
  private checkThermalShock(e: Hittable): void {
    const shock = this.profile.thermalShock;
    if (!shock || !e.alive || e.status.shocked) return;
    if (!isFrozen(e.status, this.sim) || !isBurning(e.status, this.sim)) return;
    e.status.shocked = true;
    const at = { x: e.x, y: e.y };
    this.lightning.ring(at, shock.radius, FX.burn);
    this.juice.burst(at.x, at.y, FX.ice, 18);
    this.juice.burst(at.x, at.y, FX.burn, 18);
    this.juice.shake(0.004);
    sfx.explode();
    for (const other of this.targets) {
      if (!other.alive) continue;
      if (Math.hypot(other.x - at.x, other.y - at.y) > shock.radius + other.radius) continue;
      this.damageEnemy(other, shock.damage, '#ffffff');
    }
  }

  /** Éclair en chaîne : saute d'ennemi en ennemi à partir de la cible touchée. */
  private chainLightning(from: Hittable, chain: NonNullable<HitEffects['chain']>): void {
    const hit = new Set<Hittable>([from]);
    let current = { x: from.x, y: from.y };
    for (let i = 0; i < chain.bounces; i++) {
      let next: Hittable | undefined;
      let best = chain.range;
      for (const e of this.targets) {
        if (!e.alive || hit.has(e)) continue;
        const d = Math.hypot(e.x - current.x, e.y - current.y);
        if (d < best) {
          best = d;
          next = e;
        }
      }
      if (!next) break;
      hit.add(next);
      this.lightning.zap(current, next, FX.zap);
      current = { x: next.x, y: next.y };
      this.damageEnemy(next, chain.damage, FX.zapText);
    }
    if (hit.size > 1) sfx.zap();
  }

  /** La foudre tombe sur un point et touche tout autour. */
  private lightningBolt(at: { x: number; y: number }, damage: number, radius: number): void {
    this.lightning.bolt(at, radius, FX.zap);
    sfx.zap();
    for (const e of this.targets) {
      if (!e.alive) continue;
      if (Math.hypot(e.x - at.x, e.y - at.y) > radius + e.radius) continue;
      this.damageEnemy(e, damage, FX.zapText);
    }
  }

  private dashEffects(): void {
    const fx = this.profile.on.dash;
    const at = { x: this.player.x, y: this.player.y };
    if (fx.burn || fx.chill) {
      this.lightning.ring(at, DASH_AURA_RADIUS, fx.burn ? FX.burn : FX.ice);
      for (const e of this.targets) {
        if (!e.alive) continue;
        if (Math.hypot(e.x - at.x, e.y - at.y) > DASH_AURA_RADIUS + e.radius) continue;
        this.applyHitEffects(e, fx);
      }
    }
    if (fx.bolt) {
      const target = this.nearestEnemy(at, DASH_BOLT_RANGE);
      if (target) this.lightningBolt(target, fx.bolt.damage, fx.bolt.radius);
    }
  }

  private nearestEnemy(at: { x: number; y: number }, range: number): Hittable | undefined {
    let best: Hittable | undefined;
    let bestDist = range;
    for (const e of this.targets) {
      if (!e.alive || !this.isOnScreen(e)) continue;
      const d = Math.hypot(e.x - at.x, e.y - at.y);
      if (d < bestDist) {
        best = e;
        bestDist = d;
      }
    }
    return best;
  }

  /** Dégâts venus d'un don (foudre, explosion) : bonus selon l'état de la cible, mort éventuelle. */
  private damageEnemy(e: Hittable, base: number, color: string): void {
    if (!e.alive) return;
    const mult = damageMultiplier(this.profile, {
      burning: isBurning(e.status, this.sim),
      chilled: isFrozen(e.status, this.sim) || this.sim < e.status.chillUntil,
    });
    const { dealt, killed } = applyDamage(e.health, base * mult);
    e.hit(this.sim, this.player, 0);
    this.juice.damageNumber(e.x, e.y - e.radius, dealt, color);
    if (killed) this.killEnemy(e);
  }

  /** La brûlure fait ses dégâts par paquets. */
  private updateBurns(): void {
    for (const e of this.targets) {
      if (!e.alive) continue;
      const dmg = tickBurn(e.status, this.sim);
      if (dmg <= 0) continue;
      const { dealt, killed } = applyDamage(e.health, dmg);
      this.juice.damageNumber(e.x, e.y - e.radius, dealt, FX.burnText);
      if (killed) this.killEnemy(e);
    }
  }

  override update(_time: number, delta: number): void {
    if (this.juice.frozen) {
      if (!this.physics.world.isPaused) this.physics.world.pause();
      return;
    }
    if (this.physics.world.isPaused) this.physics.world.resume();

    const dt = Math.min(delta, 50);
    if (this.choosing) {
      this.ui.showRun(this.run);
      return;
    }
    this.sim += dt;
    if (!this.leaving) this.run.elapsedMs += dt;

    this.controls.update();
    const alive = this.enemies.filter((e) => e.alive);
    this.targets.length = 0;
    this.targets.push(...alive);
    if (this.boss?.alive) this.targets.push(this.boss);
    if (!this.leaving) this.player.update(this.sim, dt, this.controls, this.targets);

    this.updateSpawns();
    for (const e of alive) e.update(this.sim, dt, this.player, this.isOnScreen(e));
    this.updateBoss(dt);
    this.resolvePlayerAttack(this.targets);
    this.updateBurns();
    this.resolveEnemyAttacks(alive);
    this.updateShots();
    this.updateWaves();
    this.checkDoors();
    this.ui.showRun(this.run);
    this.updateIndicators();
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
    const theme = getBiome(this.run.biome).theme;
    this.add.tileSprite(ARENA.centerX, ARENA.centerY, ARENA.width, ARENA.height, theme.floor);
    const g = this.add.graphics();
    // Murs : double trait néon, l'intérieur plus vif.
    g.lineStyle(6, theme.wall, 1).strokeRectShape(ARENA);
    g.lineStyle(2, theme.wallGlow, 0.9).strokeRect(
      ARENA.x - 1,
      ARENA.y - 1,
      ARENA.width + 2,
      ARENA.height + 2,
    );
    // Néons décoratifs dans les coins (froids, jamais rouges : le rouge = danger).
    const neon = (x: number, y: number, color: number) => {
      this.add.image(x, y, 'glow').setTint(color).setAlpha(0.5).setScale(2.2).setBlendMode('ADD');
    };
    const [n1, n2] = theme.neons;
    neon(ARENA.left, ARENA.top, n1);
    neon(ARENA.right, ARENA.top, n2);
    neon(ARENA.left, ARENA.bottom, n2);
    neon(ARENA.right, ARENA.bottom, n1);
    if (theme.snow) this.addSnow();
  }

  /** Givre-Serveur : flocons qui tombent doucement (moins nombreux en qualité basse). */
  private addSnow(): void {
    this.add
      .particles(0, ARENA.top - 20, 'spark', {
        x: { min: ARENA.left - 40, max: ARENA.right + 40 },
        speedY: { min: 12, max: 30 },
        speedX: { min: -10, max: 6 },
        lifespan: 14000,
        frequency: 90 / QUALITY_PARTICLES[settings.quality],
        scale: { min: 0.3, max: 0.7 },
        alpha: { start: 0.7, end: 0.1 },
        tint: 0xd8f6ff,
      })
      .setDepth(2);
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
  private isOnScreen(e: Vec2): boolean {
    const view = this.cameras.main.worldView;
    const inset = 10;
    return (
      e.x > view.x + inset &&
      e.x < view.right - inset &&
      e.y > view.y + inset &&
      e.y < view.bottom - inset
    );
  }

  /** Flèches au bord de l'écran vers les ennemis (et apparitions) hors champ. */
  private updateIndicators(): void {
    const cam = this.cameras.main;
    const view = cam.worldView;
    const zoom = cam.zoom;
    let n = 0;
    const push = (target: Vec2, spawn: boolean) => {
      const slot = this.indicatorBuf[n];
      if (!slot) return;
      const p = edgeIndicator(view, target, 16 / zoom);
      if (!p) return;
      slot.x = (p.x - view.x) * zoom;
      slot.y = (p.y - view.y) * zoom;
      slot.angle = p.angle;
      slot.spawn = spawn;
      n++;
    };
    for (const e of this.targets) if (e.alive) push(e, false);
    for (const s of this.pending) push(s, true);
    this.ui.showIndicators(this.indicatorBuf, n);
  }

  // ---------- Vagues et apparitions ----------

  private updateWaves(): void {
    if (this.roomCleared || this.leaving) return;
    const anyAlive = this.enemies.some((e) => e.alive) || this.pending.length > 0;
    if (anyAlive) return;
    if (this.kind === 'boss') {
      if (this.boss && !this.boss.alive) this.clearRoom();
      return;
    }
    if (this.kind === 'shop') return;
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

  private resolvePlayerAttack(alive: readonly Hittable[]): void {
    const swing = this.player.activeSwing(this.sim);
    if (!swing) return;
    const { step } = swing;
    const fx: HitEffects = swing.kind === 'super' ? {} : this.profile.on[swing.kind];
    for (const e of alive) {
      if (!e.alive || e.lastSwingId === swing.id) continue;
      if (!hitsArc(this.player, this.player.facing, step.range, step.arcDeg, e, e.radius)) continue;
      // Un seul éclair en chaîne par coup, même si le coup touche plusieurs ennemis.
      const firstHit = this.lastChainSwing !== swing.id;
      this.lastChainSwing = swing.id;
      e.lastSwingId = swing.id;
      const mult = damageMultiplier(this.profile, {
        burning: isBurning(e.status, this.sim),
        chilled: isFrozen(e.status, this.sim) || this.sim < e.status.chillUntil,
      });
      const at = { x: e.x, y: e.y };
      const { dealt, killed } = applyDamage(
        e.health,
        step.damage * (1 + this.run.damageBonus) * mult,
      );
      e.hit(this.sim, this.player, step.knockback);
      this.juice.hitstop(killed ? step.hitstopMs + 30 : step.hitstopMs);
      this.juice.shake(step.shake);
      this.juice.burst(e.x, e.y, 0xffe9d6, swing.heavy ? 10 : 6);
      this.juice.damageNumber(e.x, e.y - e.radius, dealt);
      if (swing.kind !== 'super') this.run.superGauge = gainSuper(this.run.superGauge, dealt);
      sfx.hit(swing.heavy);
      if (killed) this.killEnemy(e);
      else this.applyHitEffects(e, fx);
      if (fx.chain && firstHit) this.chainLightning(e, fx.chain);
      if (fx.bolt) this.lightningBolt(at, fx.bolt.damage, fx.bolt.radius);
    }
  }

  private killEnemy(e: Hittable): void {
    if (e === this.boss) {
      this.defeatBoss();
      return;
    }
    if (!(e instanceof Enemy)) return;
    if (e.def.elite) {
      this.run.xp += e.def.elite.xp;
      this.juice.damageNumber(e.x, e.y - e.radius - 8, e.def.elite.xp, '#b08cff');
      this.juice.shake(0.005, 160);
    }
    this.juice.burst(e.x, e.y, e.def.color, 16);
    sfx.kill();
    e.deactivate();
  }

  private resolveEnemyAttacks(alive: readonly Enemy[]): void {
    for (const e of alive) {
      if (e.state === 'attack' && !e.attackLanded && e.def.attack.kind === 'charge') {
        if (this.player.isInvulnerable(this.sim)) continue;
        const reach = e.def.attack.width / 2 + PLAYER.radius;
        if (Math.hypot(this.player.x - e.x, this.player.y - e.y) < reach) {
          e.attackLanded = true;
          this.hurtPlayer(e.def.damage, e, e.def.nameKey);
        }
        continue;
      }
      if (e.state !== 'attack' || e.attackLanded || e.def.attack.kind !== 'melee') continue;
      if (this.player.isInvulnerable(this.sim)) continue;
      if (
        hitsArc(e, e.facing, e.def.attack.range, e.def.attack.arcDeg, this.player, PLAYER.radius)
      ) {
        e.attackLanded = true;
        this.hurtPlayer(e.def.damage, e, e.def.nameKey);
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
        this.hurtPlayer(s.damage, sp, s.source.nameKey);
        this.removeShot(s);
      }
    }
  }

  private removeShot(s: Shot): void {
    this.juice.burst(s.sprite.x, s.sprite.y, DANGER, 4);
    s.sprite.setActive(false).setVisible(false);
    bodyOf(s.sprite).enable = false;
  }

  private hurtPlayer(amount: number, from: Vec2, sourceNameKey: string): void {
    if (this.leaving) return;
    const health = { hp: this.run.hp, maxHp: this.run.maxHp };
    const { dealt, killed } = applyDamage(health, amount);
    this.run.hp = health.hp;
    this.run.superGauge = gainSuper(this.run.superGauge, 0, dealt);
    this.player.takeHit(this.sim, from);
    this.juice.hitstop(70);
    this.juice.shake(0.006, 140);
    this.juice.buzz(40);
    this.juice.damageNumber(this.player.x, this.player.y - 10, dealt, '#ff6f96');
    sfx.hurt();
    this.ui.flashHurt();
    if (killed) {
      this.die(t(sourceNameKey as TextKey));
      return;
    }
    const riposte = this.profile.retaliate;
    if (riposte) {
      const target = this.nearestEnemy(this.player, riposte.range);
      if (target) this.lightningBolt(target, riposte.damage, 14);
    }
  }

  // ---------- Fin de salle et portes ----------

  private clearRoom(): void {
    this.roomCleared = true;
    sfx.clear();
    const healed = onRoomCleared(this.run);
    if (healed > 0) this.juice.damageNumber(this.player.x, this.player.y - 12, healed, FX.heal);
    const biome = getBiome(this.run.biome);
    if (this.kind !== 'combat') {
      // Après le boss : biome suivant s'il existe ; après le marchand : salle 1.
      const last = this.kind === 'boss' && this.run.biome + 1 >= BIOMES.length;
      this.addDoor(last ? 'exit' : 'next', ARENA.centerX);
      return;
    }
    if (this.run.room >= biome.rooms) {
      this.addDoor('boss', ARENA.centerX);
      return;
    }
    const [a, b] = rollDoors(this.rng, 2);
    if (a) this.addDoor(a, ARENA.centerX - 120);
    if (b) this.addDoor(b, ARENA.centerX + 120);
  }

  private addDoor(reward: DoorReward | SpecialDoor, x: number): void {
    const y = ARENA.top + 16;
    const kind = typeof reward === 'string' ? reward : reward.kind;
    const god = typeof reward !== 'string' && reward.god ? GODS[reward.god] : undefined;
    const color = god?.color ?? REWARD_STYLE[kind].color;
    const nextBiome = BIOMES[this.kind === 'boss' ? this.run.biome + 1 : this.run.biome];
    const label = god
      ? t('reward.boonOf', { god: t(god.nameKey as TextKey) })
      : kind === 'next' && nextBiome
        ? t(nextBiome.nameKey as TextKey)
        : t(REWARD_STYLE[kind].label);
    const frame = this.add.graphics().setDepth(3);
    frame.fillStyle(0x07060d, 1).fillRoundedRect(x - 18, y - 22, 36, 34, 6);
    frame.lineStyle(2, color, 1).strokeRoundedRect(x - 18, y - 22, 36, 34, 6);
    const icon = this.add.graphics().setDepth(4);
    if (god) drawGodIcon(icon, god, x, y - 5, 8);
    else drawRewardIcon(icon, kind, x, y - 5, color);
    const glow = this.add
      .image(x, y - 5, 'glow')
      .setTint(color)
      .setAlpha(0.6)
      .setScale(1.2)
      .setBlendMode('ADD');
    const text = this.add
      .text(x, y + 18, label, {
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
      if (d.reward === 'next' && this.kind === 'boss') afterBoss(this.run, BIOMES.length);
      else if (d.reward === 'next' || d.reward === 'boss') this.run.room += 1;
      else {
        applyReward(this.run, d.reward.kind, d.reward.god);
        this.run.room += 1;
      }
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
    // La progression est créditée tout de suite : rien n'est perdu si l'app se ferme pendant le fondu.
    finishRun(session.save, summary);
    session.commit();
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

function getBoonGod(offer: BoonOffer) {
  return getBoon(offer.id)?.gods[0] ?? 'ra';
}

/** Icône de récompense : chaque type a une forme différente (pas seulement une couleur). */
function drawRewardIcon(
  g: Phaser.GameObjects.Graphics,
  kind: RewardKind | SpecialDoor,
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
    case 'next': // double chevron vers le haut
      g.lineBetween(x - 7, y + 1, x, y - 6).lineBetween(x, y - 6, x + 7, y + 1);
      g.lineBetween(x - 7, y + 8, x, y + 1).lineBetween(x, y + 1, x + 7, y + 8);
      break;
    case 'boss': // œil (forme propre à la porte du boss)
      g.strokeEllipse(x, y, 20, 11).fillCircle(x, y, 3.5);
      break;
  }
}
