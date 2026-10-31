import Phaser from 'phaser';
import {
  buildProfile,
  damageMultiplier,
  rollOffer,
  rollUpgrades,
  slotGod,
  upgradableBoons,
  type BoonOffer,
  type CombatProfile,
  type HitEffects,
} from '../../core/boons/boons';
import { applyDamage, heal } from '../../core/combat/health';
import { gainSuper, superReady } from '../../core/combat/superGauge';
import {
  applyBurn,
  applyChill,
  applyCurse,
  applySoak,
  applyVenom,
  isPoisoned,
  isSoaked,
  lightningFactor,
  tickVenom,
  applyJudge,
  applyStun,
  applyWeaken,
  isBurning,
  isCursed,
  isFrozen,
  isStunned,
  judgedBonus,
  tickBurn,
  weakenFactor,
} from '../../core/combat/status';
import type { AttackStep } from '../../core/combat/attack';
import { edgeIndicator, hitsArc, type Vec2 } from '../../core/geometry';
import { createRng, type Rng } from '../../core/rng';
import { insideAny, planObstacles, type KeepOut, type Rect } from '../../core/arena/obstacles';
import {
  MINE_FUSE_MS,
  MINE_RADIUS,
  MINE_TRIGGER_RADIUS,
  SPIKE_ARM_MS,
  mineDamage,
  planTraps,
  spikeDamage,
  stepSpike,
  trapCounts,
  type SpikeState,
} from '../../core/arena/traps';
import { rollDoors, type DoorReward, type RewardKind } from '../../core/run/rewards';
import {
  afterBoss,
  takeRoomReward,
  drinkFountain,
  chooseBoon,
  roomKind,
  type RoomKind,
  onRoomCleared,
  summarize,
  type RunState,
  recordDamage,
  recordKill,
  upgradeBoon,
} from '../../core/run/state';
import { chestLoot, openChest, trialRoom, trialTimeMs, type ChestLoot } from '../../core/run/trial';
import {
  CHALLENGE_SHARDS,
  CHAMPION_HP,
  SURVIVAL_MAX_ALIVE,
  SURVIVAL_MS,
  SURVIVAL_SPAWN_MS,
  challengeOf,
  specialRooms,
  type ChallengeId,
} from '../../core/run/special';
import { planWaves, type Wave } from '../../core/run/waves';
import {
  ANVIL_DAMAGE,
  PRISONER_MAX_HP,
  SHRINE_XP,
  eventCost,
  eventOf,
  takeEvent,
  type EventId,
} from '../../core/run/events';
import { BIOMES, getBiome, type BiomeDef } from '../../data/biomes';
import { DASH_AURA_RADIUS, DASH_BOLT_RANGE, getBoon } from '../../data/boons';
import { GOD_IDS, GODS } from '../../data/gods';
import { ENEMIES, type EnemyDef } from '../../data/enemies';
import { PLAYER } from '../../data/player';
import { WEAPONS } from '../../data/weapons';
import { t, type TextKey } from '../../i18n';
import { music } from '../audio/music';
import { sfx } from '../audio/sfx';
import { Boss } from '../entities/Boss';
import type { BossDef } from '../../data/bosses';
import { PlayerShots, type ShotHit } from '../entities/PlayerShots';
import { DANGER, Enemy } from '../entities/Enemy';
import type { Hittable } from '../entities/Hittable';
import { Player } from '../entities/Player';
import { Juice } from '../fx/Juice';
import { Lightning } from '../fx/Lightning';
import { AMON_COLOR, drawGodIcon } from '../icons';
import type { BoonSceneData } from './BoonScene';
import type { PauseSceneData } from './PauseScene';
import { drawRatatosk, type ShopSceneData } from './ShopScene';
import { MERCHANT_GREETINGS, MERCHANT_THEME } from '../../data/merchant';
import type { EventSceneData } from './EventScene';
import { drawEventIcon, EVENT_COLOR } from './eventIcons';
import { Controls } from '../input/Controls';
import { UiScene, type Indicator } from './UiScene';
import { finishRun } from '../../core/meta';
import { recordCodex } from '../../core/codex';
import { bossFor } from '../../core/bossVariant';
import { REVIVE_HP } from '../../data/skills';
import { rollAffix, volatileDamage } from '../../core/affixes';
import { AFFIX_BOUNTY, VOLATILE_BLAST } from '../../data/affixes';
import { buyItem } from '../../core/shop';
import { heatModifiers, type HeatModifiers } from '../../core/heat';
import { assistReduction, reducedDamage } from '../../core/assist';
import { NO_WEAPON_BONUS, weaponBonuses, type WeaponBonuses } from '../../core/forge';
import { SHARD_BOUNTY, type ShopItemId } from '../../data/shop';
import { TRUE_ENDING_VICTORIES } from '../../data/story';
import { markSeen } from '../../core/story';
import { recordVariantBeaten } from '../../core/trophies';
import {
  TUTORIAL_ID,
  newTutorial,
  stepTutorial,
  tutorialDone,
  type TutorialEvent,
  type TutorialState,
} from '../../core/tutorial';
import { QUALITY_PARTICLES, settings } from '../../core/settings';
import { newAutoQuality } from '../../core/perf';
import { applyPostFx, autoLowerQuality } from '../fx/postfx';
import { drawBiomeDecor } from '../fx/biomeDecor';
import { cheatsEnabled } from '../debug/cheats';
import { session } from '../session';
import { telemetry } from '../telemetry';
import { bodyOf } from '../physics';
import { ensureGameTextures } from '../textures';
import { FONT_FAMILY } from '../theme';
import { RENDER_SCALE, SCENE_ZOOM } from '../view';
import { markScene } from './markScene';
import type { AmonSceneData } from './AmonScene';
import {
  AMON_CHALLENGES,
  AMON_FRENZY_KILLS,
  AMON_FRENZY_MS,
  AMON_POWER_KILLS,
  amonChallengeFor,
  amonEvent,
  amonGods,
  amonRoomCleared,
  amonStartRoom,
  applyRoyalFavor,
  newAmonWatch,
  type AmonEvent,
  type AmonWatch,
} from '../../core/amon';

/** Arène de combat (coordonnées du monde). La caméra la centre, la largeur d'écran varie selon le téléphone. */
const ARENA = new Phaser.Geom.Rectangle(40, 34, 560, 300);
/** Zones sans obstacle : apparition d'Ash, les trois portes, le centre (fontaine, coffre). */
const KEEP_OUT: readonly KeepOut[] = [
  { x: ARENA.centerX, y: ARENA.bottom - 30, r: 48 },
  { x: ARENA.centerX - 120, y: ARENA.top + 16, r: 44 },
  { x: ARENA.centerX, y: ARENA.top + 16, r: 44 },
  { x: ARENA.centerX + 120, y: ARENA.top + 16, r: 44 },
  { x: ARENA.centerX, y: ARENA.centerY + 10, r: 44 },
];
/** Zoom de la caméra : Ash fait ~1/13 de la hauteur d'écran, lisible au pouce. */
const POOL_SIZE = 16;
const SPAWN_WARNING_MS = 750;
const MIN_SPAWN_DISTANCE = 110;

interface PendingSpawn {
  /** Arène du champion : l'élite, bien plus résistant. */
  champion?: boolean;
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

/** Durée de la présentation d'un boss (caméra + nom à l'écran). */
const BOSS_PRESENT_MS = 2300;

/** Teinte unie du sol de chaque monde (son « ADN » : nuit violette, givre bleu, marbre doré…). */
const FLOOR_COLOR: Record<BiomeDef['theme']['floor'], number> = {
  floor: 0x110e1e,
  floorIce: 0x0d1828,
  floorMarble: 0x140a18,
  floorPyramid: 0x1a140c,
  floorRoots: 0x20160e,
};
/** Portes de sortie d'une salle de combat (toujours 2 : un choix simple). */
const DOOR_COUNT = 2;
/** Distance au-delà de laquelle un ennemi est « loin » (effet `far`, aucun don actuel). */
const FAR_DISTANCE = 70;
/** Flèche de don (projectile sans effets d'arme ; aucun don actuel ne la lance). */
const ARROW = {
  damage: 5,
  speed: 380,
  radius: 3,
  range: 260,
  pierce: 0,
  knockback: 20,
  look: 'arrow',
} as const;
const ARROW_STEP: AttackStep = {
  damage: 0,
  windupMs: 0,
  activeMs: 0,
  recoveryMs: 0,
  range: 0,
  arcDeg: 0,
  lunge: 0,
  knockback: 0,
  hitstopMs: 0,
  shake: 0,
};

/**
 * Premier essai guidé : vit d'une salle à l'autre pendant la toute première run (la scène est
 * relancée à chaque salle). Null : pas de guide.
 */
let tutorial: TutorialState | null = null;

/** Couleurs des effets des dons (côté joueur : jamais le rouge-magenta des dangers). */
const FX = {
  burn: GODS.ra.color,
  zap: GODS.seth.color,
  ice: GODS.khonsou.color,
  thunder: GODS.seth.color,
  water: GODS.sobek.color,
  venom: GODS.serket.color,
  burnText: GODS.ra.text,
  zapText: GODS.seth.text,
  waterText: GODS.sobek.text,
  venomText: GODS.serket.text,
  critText: GODS.bastet.text,
  heal: GODS.isis.text,
  arrowText: GODS.neith.text,
} as const;

/** Portes sans récompense : sortie de la run, boss, biome suivant / reprise après le marchand. */
type SpecialDoor = 'exit' | 'boss' | 'next';

const REWARD_STYLE: Record<RewardKind | SpecialDoor, { color: number; label: TextKey }> = {
  boon: { color: 0xffb02e, label: 'reward.boon' },
  shards: { color: 0x7fe7ff, label: 'reward.shards' },
  weaponMod: { color: 0xc0c8d8, label: 'reward.weaponMod' },
  xp: { color: 0xb08cff, label: 'reward.xp' },
  weaponParts: { color: 0xffe08a, label: 'reward.weaponParts' },
  spark: { color: 0xffc46b, label: 'reward.spark' },
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
  private shotsP!: PlayerShots;
  /** Disque rattrapé : le prochain lancer frappe plus fort. */
  private discCharged = false;
  /** Bouclier de Saïs de Neith (coups bloqués restants dans la salle) et bouclier en PV. */
  private aegisLeft = 0;
  /** Identifiants des ripostes (négatifs : distincts des coups normaux). */
  private parryId = 0;
  private barrier = 0;
  private kind: RoomKind = 'combat';
  /** Télémétrie : temps et PV au début de la salle. */
  private roomStart = { elapsed: 0, hp: 0 };
  /** Mesures d'urgence de la run. */
  private heat: HeatModifiers = heatModifiers({});
  private fountain: {
    x: number;
    y: number;
    used: boolean;
    g: Phaser.GameObjects.Graphics;
    glow: Phaser.GameObjects.Image;
  } | null = null;
  /** Butin de fin de salle à ramasser (la suite : faveur d'Amon ou portes). */
  private loot: {
    x: number;
    y: number;
    parts: Phaser.GameObjects.GameObject[];
    then: () => void;
  } | null = null;
  /** Ce qui vient après le choix d'un don ramassé en fin de salle. */
  private afterChoice: (() => void) | null = null;
  /** Regard d'Amon : le défi de la salle (null : Amon ne regarde pas). */
  private amon: AmonWatch | null = null;
  /** Type du coup en cours de résolution (pour savoir si un ennemi tombe sous l'attaque puissante). */
  private hitKind: 'attack' | 'power' | 'super' | null = null;
  /** Épreuve de Vesper : salle chronométrée (le chrono part à la première vague). */
  private trial: {
    limitMs: number;
    startAt: number;
    state: 'waiting' | 'running' | 'won' | 'failed';
  } | null = null;
  /** Coffre de l'épreuve réussie : s'ouvre quand Ash s'en approche (ou en sortant). */
  private chest: {
    x: number;
    y: number;
    loot: ChestLoot;
    open: boolean;
    g: Phaser.GameObjects.Graphics;
    glow: Phaser.GameObjects.Image;
  } | null = null;
  /** Piliers et murets de la salle (bloquent les déplacements et les tirs). */
  private obstacles: Rect[] = [];
  /** Salle spéciale : survie, sombre ou champion. */
  private challenge: ChallengeId | null = null;
  private survival: { startAt: number; nextAt: number } | null = null;
  private darkness: Phaser.GameObjects.Image | null = null;
  /** Pièges de la salle : trappes à pics et explosifs. */
  private spikeTraps: { rect: Rect; state: SpikeState; g: Phaser.GameObjects.Graphics }[] = [];
  private mines: {
    x: number;
    y: number;
    lit: number;
    done: boolean;
    g: Phaser.GameObjects.Graphics;
    warn: Phaser.GameObjects.Graphics;
  }[] = [];
  /** Explosions d'ennemis Instables : cercle d'alerte, puis dégâts. */
  private blasts: { x: number; y: number; at: number; g: Phaser.GameObjects.Graphics }[] = [];
  /** Salle d'évènement : l'objet au centre (s'ouvre quand Ash s'approche ; se réarme quand il s'éloigne). */
  private eventSpot: {
    id: EventId;
    x: number;
    y: number;
    armed: boolean;
    parts: Phaser.GameObjects.GameObject[];
  } | null = null;
  private autoQuality = newAutoQuality();
  private shopOpen = false;
  /** Comptoir de Ratatosk : position de l'étal, bulle, et réarmement quand Ash s'éloigne. */
  private merchant: {
    x: number;
    y: number;
    armed: boolean;
    bubble: Phaser.GameObjects.Text;
  } | null = null;
  private shopSold = new Set<ShopItemId>();
  private shots: Shot[] = [];
  private pending: PendingSpawn[] = [];
  private waves: Wave[] = [];
  private waveIndex = 0;
  private nextWaveAt = 0;
  private doors: Door[] = [];
  private roomCleared = false;
  private cinematicUntil = 0;
  private tutorialPos: Vec2 = { x: 0, y: 0 };
  private leaving = false;
  /** Un dieu propose un don : le combat attend. */
  private choosing = false;
  private lastChainSwing = -1;
  /** Bonus de la forge de Ptah pour l'arme de la run. */
  private forge: WeaponBonuses = NO_WEAPON_BONUS;
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
    this.challenge =
      this.kind === 'combat' &&
      specialRooms(this.run.seed, this.run.biome, biome).challenge === this.run.room
        ? challengeOf(this.run.seed, this.run.biome)
        : null;
    this.survival = null;
    this.darkness = null;
    this.cinematicUntil = 0;
    this.heat = heatModifiers(this.run.heat);
    this.fountain = null;
    this.trial = null;
    this.chest = null;
    this.loot = null;
    this.afterChoice = null;
    this.eventSpot = null;
    this.blasts = [];
    this.spikeTraps = [];
    this.mines = [];
    this.merchant = null;
    this.autoQuality = newAutoQuality();
    this.roomStart = { elapsed: this.run.elapsedMs, hp: this.run.hp };
    this.drawArena();
    // Décor propre au monde (le Comptoir de Ratatosk a le sien).
    if (this.kind !== 'shop')
      drawBiomeDecor(
        this,
        biome,
        ARENA,
        createRng(
          (this.run.seed ^ Math.imul(this.run.biome * 64 + this.run.room + 9, 0x1b873593)) >>> 0,
        ),
        KEEP_OUT,
      );
    this.placeObstacles();
    this.placeTraps();
    this.physics.world.setBounds(ARENA.x, ARENA.y, ARENA.width, ARENA.height);

    this.juice = new Juice(this);
    this.lightning = new Lightning(this);
    this.profile = buildProfile(this.run.boons);
    this.forge = weaponBonuses(this.run.weapon, this.run.weaponLevel);
    this.barrier = 0;
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
      this.tutorialEvent({ type: 'dash' });
    };
    this.shotsP = new PlayerShots(this, ARENA);
    this.discCharged = false;
    this.shotsP.onHit = (target, hit) => {
      if (hit.kind === 'boon') this.damageEnemy(target, hit.damage, FX.arrowText);
      else this.weaponHit(target, { ...hit, kind: hit.kind, hitstopMs: hit.heavy ? 40 : 18 });
    };
    this.shotsP.onGrapple = (target, hit) => this.grapple(target, hit);
    this.shotsP.onCatch = () => {
      this.discCharged = true;
      sfx.tap();
      this.juice.burst(this.player.x, this.player.y, 0xffe08a, 10);
    };
    this.shotsP.onZone = (at, radius) => {
      this.lightning.ring(at, radius, 0xffb02e);
      this.juice.burst(at.x, at.y, 0xffd27a, 10);
      sfx.explode();
    };
    this.player.onFire = (step, angle, kind, id) => {
      const charged = this.discCharged && step.projectile?.returns === true;
      if (charged) this.discCharged = false;
      this.shotsP.fire(this.sim, this.player, angle, step, kind, id, charged ? 1.5 : 1);
    };
    this.player.onAttackStart = (power) => this.tutorialEvent({ type: power ? 'power' : 'attack' });
    this.player.onDashStrike = (power) => {
      sfx.swing(true);
      this.juice.shake(0.003, 90);
      this.juice.burst(this.player.x, this.player.y, 0xffd27a, 10);
      this.juice.label(
        this.player.x,
        this.player.y - 20,
        t(power ? 'strike.power' : 'strike.attack'),
        '#ffd27a',
      );
    };
    this.applyProfile();
    this.aegisLeft = this.profile.aegis;
    this.player.canSuper = () => superReady(this.run.superGauge) && !this.choosing;
    this.player.onSuper = () => {
      this.run.superGauge = 0;
      sfx.super();
      this.juice.hitstop(60);
      this.juice.shake(0.004, 160);
      this.lightning.ring(this.player, 40, 0xffe08a);
      this.juice.burst(this.player.x, this.player.y, 0xffe08a, 24);
      this.tutorialEvent({ type: 'super' });
    };

    for (let i = 0; i < POOL_SIZE; i++) {
      const e = new Enemy(this);
      e.onShoot = (from, angle, enemy) =>
        this.fireShot(from, angle, enemy.def, weakenFactor(enemy.status, this.sim));
      e.onTelegraph = () => sfx.telegraph();
      e.onSupport = (enemy) => this.supportCast(enemy);
      this.enemies.push(e);
    }
    this.physics.add.collider(
      this.enemies.map((e) => e.sprite),
      this.enemies.map((e) => e.sprite),
    );

    this.addObstacleColliders();
    this.setupCamera();
    this.waves =
      this.kind === 'combat'
        ? planWaves(
            biome,
            this.run.room,
            (id) => ENEMIES[id].threat,
            this.rng,
            this.heat.waveBudget,
          )
        : [];
    if (this.kind === 'combat' && trialRoom(this.run.seed, this.run.biome, biome) === this.run.room)
      this.startTrial(biome);
    if (this.challenge) this.startChallenge(biome);
    this.startAmon(biome);
    if (this.kind === 'boss') this.startBoss();
    if (this.kind === 'fountain') this.startFountain();
    if (this.kind === 'event') this.startEvent();
    if (this.kind === 'shop') this.startShop();
    this.nextWaveAt = 700;
    // Entrée dans un nouveau biome : on annonce son nom.
    if (this.run.room <= 1 && this.kind !== 'boss') {
      this.time.delayedCall(400, () => this.ui.showBanner(t(biome.nameKey as TextKey), ''));
    }

    this.cameras.main.fadeIn(350, 7, 6, 13);
    music.play(
      this.kind === 'boss' ? biome.bossMusic : this.kind === 'shop' ? 'merchant' : biome.music,
    );
    markScene('run');
    // Sauvegarde à chaque entrée de salle : fermer l'app à tout moment, reprendre ici.
    session.snapshotRun(this.run);
    if (this.run.pendingBoon) {
      this.choosing = true;
      this.time.delayedCall(380, () => this.offerBoon());
    } else if (this.run.pendingSpark) {
      this.choosing = true;
      this.time.delayedCall(380, () => this.offerSpark());
    }
    if (cheatsEnabled) this.setupCheats();
    this.startTutorial();
  }

  // ---------- Premier essai guidé ----------

  private startTutorial(): void {
    const meta = session.save.meta;
    if (meta.seenDialogues.includes(TUTORIAL_ID)) tutorial = null;
    else if (!tutorial && this.run.biome === 0 && this.run.room === 1) tutorial = newTutorial();
    this.tutorialPos = { x: this.player.x, y: this.player.y };
    const ui = this.ui;
    const skip = () => this.endTutorial();
    ui.events.on('tutorial-skip', skip);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => ui.events.off('tutorial-skip', skip));
  }

  private tutorialEvent(e: TutorialEvent): void {
    if (!tutorial) return;
    stepTutorial(tutorial, e);
    if (tutorialDone(tutorial)) this.endTutorial();
  }

  /** Le guide est fini (ou passé) : il ne reviendra plus. */
  private endTutorial(): void {
    if (!tutorial) return;
    tutorial = null;
    markSeen(session.save.meta, TUTORIAL_ID);
    session.commit();
    this.ui.showHint('', null);
  }

  private updateTutorial(): void {
    if (!tutorial) return;
    const d = Math.hypot(this.player.x - this.tutorialPos.x, this.player.y - this.tutorialPos.y);
    this.tutorialPos = { x: this.player.x, y: this.player.y };
    if (d > 0) this.tutorialEvent({ type: 'moved', distance: d });
    if (superReady(this.run.superGauge)) this.tutorialEvent({ type: 'superReady' });
    if (!tutorial) return;
    const step = tutorial.step;
    if (!step || this.leaving || this.sim < this.cinematicUntil) {
      this.ui.showHint('', null);
      return;
    }
    const device = this.ui.touchActive
      ? 'touch'
      : this.controls.lastDevice === 'gamepad'
        ? 'pad'
        : 'keys';
    const text =
      step === 'doors' ? t('tutorial.doors') : t(`tutorial.${step}.${device}` as TextKey);
    const focus = step === 'doors' ? null : step === 'move' ? 'move' : step;
    this.ui.showHint(text, focus, step === 'doors');
  }

  private setupCheats(): void {
    // Accès pour les tests automatiques (raccourcis de test seulement).
    (window as unknown as { __run?: RunScene }).__run = this;
    this.input.keyboard?.on('keydown', (e: KeyboardEvent) => {
      if (this.choosing || this.leaving) return;
      if (e.code === 'KeyB') {
        this.run.pendingBoon = GOD_IDS[Math.floor(Math.random() * GOD_IDS.length)] ?? 'ra';
        this.choosing = true;
        this.offerBoon();
      }
      if (e.code === 'KeyH') {
        // Monde suivant (salle 2), pour vérifier les décors.
        this.run.biome = (this.run.biome + 1) % BIOMES.length;
        this.run.room = 2;
        this.leaving = true;
        this.scene.restart({ run: this.run });
        return;
      }
      if (e.code === 'KeyU') {
        // Étincelle du Phénix immédiate.
        this.run.pendingSpark = true;
        this.choosing = true;
        this.offerSpark();
      }
      if (e.code === 'KeyG') this.run.superGauge = 1;
      if (e.code === 'KeyC' && this.kind === 'combat' && !this.roomCleared) {
        // Regard d'Amon sur cette salle (chaque appui change de défi).
        const i = AMON_CHALLENGES.indexOf(this.amon?.challenge ?? 'power');
        this.amon = newAmonWatch(AMON_CHALLENGES[(i + 1) % AMON_CHALLENGES.length] ?? 'untouched');
        this.refreshAmon();
      }
      if (e.code === 'KeyI') {
        this.run.room += 1;
        this.leaving = true;
        this.scene.restart({ run: this.run });
      }
      if (e.code === 'KeyM') this.run.shards += 100;
      if (e.code === 'KeyL') this.spawnWave([getBiome(this.run.biome).elite]);
      if (e.code === 'KeyY') this.spawnWave(getBiome(this.run.biome).roster.map((r) => r.enemy));
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
    // Le boss attend la fin de sa présentation avant d'attaquer.
    const intro = BOSS_PRESENT_MS + 300;
    const def = bossFor(
      session.save.meta,
      getBiome(this.run.biome).boss,
      this.run.seed,
      this.run.biome,
    );
    const boss = new Boss(
      this,
      def,
      ARENA.centerX,
      ARENA.top + 70,
      createRng((this.run.seed ^ 0xa3317 ^ this.run.biome) >>> 0),
      this.sim,
      intro,
      ARENA,
      this.heat.enemyHp,
    );
    boss.onTelegraph = () => sfx.telegraph();
    boss.onQuake = () => {
      sfx.explode();
      this.juice.shake(0.005, 200);
    };
    boss.onSummon = (enemy, count) => this.spawnWave(Array<typeof enemy>(count).fill(enemy));
    // Shezmu : son pressoir, dans un coin de l'arène (décor ; il s'ébranle en phase 2).
    const press = def.id === 'shezmu' ? this.drawPress(ARENA.left + 56, ARENA.top + 30) : null;
    boss.onPhase2 = () => {
      if (press) this.tweens.add({ targets: press, x: 1.5, duration: 60, yoyo: true, repeat: 12 });
      this.ui.showBanner(t(def.phase2Key as TextKey), '');
      this.juice.burst(boss.x, boss.y, 0xb8a8ff, 30);
      this.juice.shake(0.006, 260);
      sfx.super();
    };
    this.boss = boss;
    this.presentBoss(def, boss);
  }

  /** Le pressoir de Shezmu : cuve de pierre, poutre et traverse, vin sombre qui goutte. */
  private drawPress(x: number, y: number): Phaser.GameObjects.Graphics {
    const g = this.add.graphics().setDepth(1.6);
    g.fillStyle(0x07060d, 0.6).fillEllipse(x, y + 18, 54, 10);
    g.fillStyle(0x2a2436, 1).fillRect(x - 22, y - 2, 44, 18);
    g.fillStyle(0x3a3450, 1).fillRect(x - 22, y - 2, 44, 4);
    g.fillStyle(0x3a1e3a, 1).fillRect(x - 18, y - 1, 36, 3);
    g.fillStyle(0x4a3020, 1)
      .fillRect(x - 3, y - 26, 6, 26)
      .fillRect(x - 18, y - 26, 36, 5);
    g.fillStyle(0x6a4a30, 1).fillRect(x - 10, y - 12, 20, 6);
    g.fillStyle(0x3a1e3a, 1)
      .fillRect(x + 22, y + 8, 6, 3)
      .fillCircle(x + 27, y + 15, 2);
    return g;
  }

  /**
   * Présentation du boss : la caméra glisse jusqu'à lui pendant que son nom s'affiche (bandes
   * noires), puis revient sur Ash. Ash ne bouge pas pendant ce temps, le boss n'attaque pas.
   */
  private presentBoss(def: BossDef, boss: Boss): void {
    const ms = BOSS_PRESENT_MS;
    this.cinematicUntil = this.sim + ms;
    const cam = this.cameras.main;
    // La caméra quitte Ash le temps de la présentation, puis le retrouve.
    cam.stopFollow();
    this.time.delayedCall(250, () => {
      cam.pan(boss.x, boss.y + 20, 500, 'Sine.easeInOut');
      sfx.telegraph();
    });
    this.time.delayedCall(ms - 600, () =>
      cam.pan(this.player.x, this.player.y, 450, 'Sine.easeInOut', true, (_c, progress) => {
        if (progress >= 1) this.followPlayer();
      }),
    );
    this.time.delayedCall(200, () =>
      this.ui.bossIntro(
        t(def.nameKey as TextKey),
        def.tint !== undefined ? t('boss.variantSub') : t(def.titleKey as TextKey),
        def.tint ?? getBiome(this.run.biome).theme.wallGlow,
        ms - 200,
      ),
    );
  }

  private updateBoss(dt: number): void {
    const boss = this.boss;
    if (!boss) return;
    boss.update(this.sim, dt, this.player, this.isOnScreen(boss));
    if (!this.leaving && !this.player.isInvulnerable(this.sim)) {
      const dmg = boss.hazardDamage(this.player, PLAYER.radius);
      if (dmg > 0) this.hurtPlayer(dmg, boss, boss.def.nameKey);
      // Chaîne de Shezmu : Ash est tiré jusqu'au boss.
      if (boss.consumeHook() && boss.alive) this.player.yank(this.sim, boss, boss.radius + 22);
    }
    this.ui.showBoss(boss.alive ? boss.health.hp / boss.health.maxHp : 0, boss.phase);
  }

  /** Victoire : la Dévoreuse s'effondre, les invocations disparaissent, la sortie s'ouvre. */
  private defeatBoss(): void {
    const boss = this.boss;
    if (!boss?.alive) return;
    boss.kill();
    recordKill(this.run);
    recordCodex(session.save.meta, `boss.${boss.def.id}`);
    if (boss.def.tint !== undefined) recordVariantBeaten(session.save.meta, boss.def.id);
    this.run.xp += boss.def.reward.xp;
    this.run.weaponParts += boss.def.reward.weaponParts;
    this.run.shards += SHARD_BOUNTY.boss;
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
    this.ui.showBanner(t(boss.def.defeatedKey as TextKey), '');
  }

  // ---------- Fontaine ----------

  /** Salle calme : une fontaine soigne une fois, les portes sont déjà ouvertes. */
  private startFountain(): void {
    this.placeFountain(ARENA.centerX, ARENA.centerY);
    this.time.delayedCall(600, () => this.clearRoom());
  }

  /** Fontaine (salle de fontaine, et Comptoir de Ratatosk entre les mondes) : soigne une fois. */
  private placeFountain(x: number, y: number): void {
    const dry = this.heat.noRest;
    const g = this.add.graphics().setDepth(3);
    g.fillStyle(0x0d1a22, 1).fillCircle(x, y, 22);
    g.lineStyle(3, 0x9dffb0, dry ? 0.25 : 0.9).strokeCircle(x, y, 22);
    g.fillStyle(0x9dffb0, dry ? 0.1 : 0.45).fillCircle(x, y, 14);
    const glow = this.add
      .image(x, y, 'glow')
      .setTint(0x9dffb0)
      .setAlpha(dry ? 0.1 : 0.6)
      .setScale(1.6)
      .setBlendMode('ADD');
    this.fountain = { x, y, used: dry, g, glow };
  }

  private updateFountain(): void {
    const f = this.fountain;
    if (!f || f.used || this.leaving) return;
    if (Math.hypot(this.player.x - f.x, this.player.y - f.y) > 26) return;
    f.used = true;
    const healed = drinkFountain(this.run);
    if (healed > 0) this.juice.damageNumber(this.player.x, this.player.y - 12, healed, FX.heal);
    this.juice.burst(f.x, f.y, 0x9dffb0, 20);
    sfx.boonTaken();
    f.glow.setAlpha(0.15);
    f.g.setAlpha(0.4);
  }

  // ---------- Salles spéciales ----------

  private startChallenge(biome: BiomeDef): void {
    const c = this.challenge;
    if (!c) return;
    if (c === 'survival') {
      this.waves = [];
      this.survival = { startAt: -1, nextAt: 0 };
    } else if (c === 'champion') {
      this.waves = [[biome.elite]];
    } else {
      this.addDarkness();
    }
    this.time.delayedCall(400, () =>
      this.ui.showBanner(t(`challenge.${c}` as TextKey), t(`challenge.${c}.sub` as TextKey)),
    );
  }

  /** Salle sombre : un halo autour d'Ash ; les ennemis et leurs attaques restent visibles. */
  private addDarkness(): void {
    if (!this.textures.exists('darkness')) {
      const tex = this.textures.createCanvas('darkness', 256, 256);
      const ctx = tex?.getContext();
      if (tex && ctx) {
        ctx.fillStyle = 'rgba(4,3,8,0.93)';
        ctx.fillRect(0, 0, 256, 256);
        ctx.globalCompositeOperation = 'destination-out';
        const grad = ctx.createRadialGradient(128, 128, 10, 128, 128, 70);
        grad.addColorStop(0, 'rgba(0,0,0,1)');
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 256, 256);
        tex.refresh();
      }
    }
    this.darkness = this.add
      .image(this.player.x, this.player.y, 'darkness')
      .setScale(3)
      .setDepth(6.5);
  }

  private updateChallenge(): void {
    if (this.darkness) this.darkness.setPosition(this.player.x, this.player.y);
    const sv = this.survival;
    if (!sv || this.roomCleared || this.leaving) return;
    if (sv.startAt < 0) sv.startAt = this.sim;
    const left = SURVIVAL_MS - (this.sim - sv.startAt);
    this.ui.showTrial('running', left, 'survival.timer');
    if (left <= 0) {
      // Tenu ! Les ennemis restants fuient en fumée.
      for (const e of this.enemies) {
        if (!e.alive) continue;
        this.juice.burst(e.x, e.y, e.def.color, 10);
        e.deactivate();
      }
      this.pending.forEach((p) => p.marker.destroy());
      this.pending = [];
      this.survival = null;
      this.ui.showTrial(null, 0);
      this.clearRoom();
      return;
    }
    const alive = this.enemies.filter((e) => e.alive).length + this.pending.length;
    if (this.sim < sv.nextAt || alive >= SURVIVAL_MAX_ALIVE) return;
    sv.nextAt = this.sim + SURVIVAL_SPAWN_MS;
    const biome = getBiome(this.run.biome);
    const pool = biome.roster.filter((r) => this.run.room >= r.fromRoom).map((r) => r.enemy);
    if (pool.length > 0) this.spawnWave([this.rng.pick(pool), this.rng.pick(pool)]);
  }

  // ---------- Ennemis de soutien ----------

  /** Rebouteux : soigne les alliés proches ; Porte-bouclier : leur donne un bouclier. */
  private supportCast(caster: Enemy): void {
    const atk = caster.def.attack;
    if (atk.kind !== 'heal' && atk.kind !== 'ward') return;
    const color = atk.kind === 'heal' ? 0x7fe0a0 : 0xc8e8ff;
    this.lightning.ring(caster, atk.radius, color);
    for (const ally of this.enemies) {
      if (!ally.alive || ally === caster) continue;
      if (Math.hypot(ally.x - caster.x, ally.y - caster.y) > atk.radius + ally.radius) continue;
      if (atk.kind === 'heal') {
        const healed = heal(ally.health, atk.amount);
        if (healed > 0) this.juice.damageNumber(ally.x, ally.y - ally.radius, healed, '#7fe0a0');
      } else {
        ally.health.ward = Math.max(ally.health.ward ?? 0, atk.amount);
      }
    }
  }

  // ---------- Pièges ----------

  /** Pièges : seulement en combat, à partir de la 3e salle, loin de l'entrée, des portes et du centre. */
  private placeTraps(): void {
    // Pas de piège dans le noir : ce serait injuste.
    if (this.kind !== 'combat' || this.challenge === 'dark') return;
    const rng = createRng(
      (this.run.seed ^ Math.imul(this.run.biome * 64 + this.run.room + 5, 0x7feb352d)) >>> 0,
    );
    const layout = planTraps(
      rng,
      { x: ARENA.x, y: ARENA.y, w: ARENA.width, h: ARENA.height },
      KEEP_OUT,
      this.obstacles,
      trapCounts(this.run.room, rng),
    );
    for (const rect of layout.spikes) {
      const g = this.add.graphics().setDepth(1);
      const trap = { rect, state: { phase: 'idle' as const, at: 0 } as SpikeState, g };
      this.spikeTraps.push(trap);
      this.drawSpikes(trap, 0);
    }
    for (const p of layout.mines) {
      const g = this.add.graphics().setDepth(3);
      // Explosif : tonnelet sombre cerclé, mèche courte (forme bien à lui).
      g.fillStyle(0x2a1e14, 1).fillCircle(p.x, p.y, 9);
      g.lineStyle(2, 0x8a6a3a, 1).strokeCircle(p.x, p.y, 9);
      g.lineBetween(p.x - 9, p.y, p.x + 9, p.y);
      g.lineStyle(1.5, 0xc0c8d8, 1).lineBetween(p.x + 4, p.y - 8, p.x + 8, p.y - 13);
      g.fillStyle(0xffa040, 1).fillCircle(p.x + 8, p.y - 13, 1.6);
      const warn = this.add.graphics().setDepth(5);
      this.mines.push({ x: p.x, y: p.y, lit: -1, done: false, g, warn });
    }
  }

  /** Trappe à pics : plaque à trous ; alerte (contour de danger) ; pics sortis. */
  private drawSpikes(
    trap: { rect: Rect; state: SpikeState; g: Phaser.GameObjects.Graphics },
    progress: number,
  ): void {
    const { rect: r, state, g } = trap;
    g.clear();
    g.fillStyle(0x16161e, 1).fillRect(r.x, r.y, r.w, r.h);
    g.lineStyle(1.5, 0x8a8a9c, 1).strokeRect(r.x, r.y, r.w, r.h);
    const step = r.w / 4;
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        const cx = r.x + step * (i + 0.5);
        const cy = r.y + step * (j + 0.5);
        if (state.phase === 'up') {
          g.fillStyle(0xe8ecf4, 1).fillTriangle(cx - 2.5, cy + 2.5, cx + 2.5, cy + 2.5, cx, cy - 4);
        } else {
          g.fillStyle(0x07060d, 1).fillCircle(cx, cy, 1.4);
        }
      }
    }
    if (state.phase === 'arming') {
      g.fillStyle(DANGER, 0.08 + 0.3 * progress).fillRect(r.x, r.y, r.w, r.h);
      g.lineStyle(1.5, DANGER, 0.5 + 0.5 * progress).strokeRect(r.x, r.y, r.w, r.h);
    } else if (state.phase === 'up') {
      g.lineStyle(1.5, DANGER, 0.9).strokeRect(r.x, r.y, r.w, r.h);
    }
  }

  private updateTraps(): void {
    if (this.leaving) return;
    const px = this.player.x;
    const py = this.player.y;
    for (const trap of this.spikeTraps) {
      const r = trap.rect;
      const on = px > r.x - 4 && px < r.x + r.w + 4 && py > r.y - 4 && py < r.y + r.h + 4;
      const before = trap.state.phase;
      const strikes = stepSpike(trap.state, this.sim, on);
      if (trap.state.phase === 'arming') {
        this.drawSpikes(trap, Math.min(1, (this.sim - trap.state.at) / SPIKE_ARM_MS));
        if (before !== 'arming') sfx.telegraph();
      } else if (before !== trap.state.phase) this.drawSpikes(trap, 0);
      if (!strikes) continue;
      sfx.block();
      this.juice.burst(r.x + r.w / 2, r.y + r.h / 2, 0xe8ecf4, 10);
      const dmg = spikeDamage(this.run.biome);
      if (on && !this.player.isInvulnerable(this.sim))
        this.hurtPlayer(dmg, { x: r.x + r.w / 2, y: r.y + r.h / 2 }, 'trap.spikes');
      for (const e of this.enemies) {
        if (e.alive && e.x > r.x && e.x < r.x + r.w && e.y > r.y && e.y < r.y + r.h)
          this.trapHitEnemy(e, dmg);
      }
    }
    for (const m of this.mines) {
      if (m.done) continue;
      if (m.lit < 0) {
        if (Math.hypot(px - m.x, py - m.y) > MINE_TRIGGER_RADIUS) continue;
        m.lit = this.sim;
        sfx.telegraph();
      }
      const progress = (this.sim - m.lit) / MINE_FUSE_MS;
      if (progress < 1) {
        m.warn.clear();
        m.warn.lineStyle(1.5, DANGER, 0.9).strokeCircle(m.x, m.y, MINE_RADIUS);
        m.warn.fillStyle(DANGER, 0.1 + 0.3 * progress).fillCircle(m.x, m.y, MINE_RADIUS * progress);
        continue;
      }
      m.done = true;
      m.warn.destroy();
      m.g.destroy();
      this.juice.burst(m.x, m.y, 0xffa040, 22);
      this.juice.shake(0.005, 140);
      sfx.explode();
      const dmg = mineDamage(this.run.biome);
      if (
        Math.hypot(px - m.x, py - m.y) <= MINE_RADIUS + PLAYER.radius &&
        !this.player.isInvulnerable(this.sim)
      )
        this.hurtPlayer(dmg, m, 'trap.mine');
      for (const e of this.enemies) {
        if (e.alive && Math.hypot(e.x - m.x, e.y - m.y) <= MINE_RADIUS + e.radius)
          this.trapHitEnemy(e, dmg);
      }
    }
  }

  /** Les pièges blessent aussi les ennemis (dégâts bruts, sans les bonus des dons). */
  private trapHitEnemy(e: Enemy, amount: number): void {
    const { dealt, killed } = applyDamage(e.health, amount);
    e.hit(this.sim, e, 0);
    this.juice.damageNumber(e.x, e.y - e.radius, dealt, '#e8ecf4');
    if (killed) this.killEnemy(e);
  }

  // ---------- Marques de l'Oiseleur ----------

  /** Un Instable vaincu : cercle d'alerte (couleur des dangers) qui se remplit, puis explosion. */
  private armBlast(x: number, y: number): void {
    const g = this.add.graphics().setDepth(5);
    this.blasts.push({ x, y, at: this.sim + VOLATILE_BLAST.delayMs, g });
    sfx.telegraph();
  }

  private updateBlasts(): void {
    for (let i = this.blasts.length - 1; i >= 0; i--) {
      const b = this.blasts[i];
      if (!b) continue;
      const left = b.at - this.sim;
      if (left > 0) {
        const progress = 1 - left / VOLATILE_BLAST.delayMs;
        b.g.clear();
        b.g.lineStyle(1.5, DANGER, 0.9).strokeCircle(b.x, b.y, VOLATILE_BLAST.radius);
        b.g
          .fillStyle(DANGER, 0.1 + 0.3 * progress)
          .fillCircle(b.x, b.y, VOLATILE_BLAST.radius * progress);
        continue;
      }
      b.g.destroy();
      this.blasts.splice(i, 1);
      this.juice.burst(b.x, b.y, 0xffa040, 18);
      sfx.explode();
      const d = Math.hypot(this.player.x - b.x, this.player.y - b.y);
      if (d <= VOLATILE_BLAST.radius + PLAYER.radius && !this.player.isInvulnerable(this.sim)) {
        this.hurtPlayer(volatileDamage(this.run.biome), b, 'affix.volatile');
      }
    }
  }

  // ---------- Évènement ----------

  private startEvent(): void {
    const id = eventOf(this.run.seed, this.run.biome);
    const x = ARENA.centerX;
    const y = ARENA.centerY;
    const taken = this.run.eventTaken === this.run.biome;
    const glow = this.add
      .image(x, y, 'glow')
      .setTint(EVENT_COLOR[id])
      .setAlpha(taken ? 0.12 : 0.55)
      .setScale(1.6)
      .setBlendMode('ADD');
    const g = this.add
      .graphics()
      .setDepth(3)
      .setAlpha(taken ? 0.45 : 1);
    drawEventIcon(g, id, x, y);
    const label = this.add
      .text(x, y + 24, t(`event.${id}.title` as TextKey), {
        fontFamily: FONT_FAMILY,
        fontSize: '9px',
        color: '#ffe9d6',
        stroke: '#07060d',
        strokeThickness: 3,
      })
      .setOrigin(0.5, 0)
      .setDepth(3)
      .setAlpha(taken ? 0.45 : 0.9);
    this.eventSpot = { id, x, y, armed: !taken, parts: [glow, g, label] };
    this.time.delayedCall(600, () => this.clearRoom());
  }

  private updateEvent(): void {
    const spot = this.eventSpot;
    if (!spot || this.leaving || this.choosing) return;
    const d = Math.hypot(this.player.x - spot.x, this.player.y - spot.y);
    if (d > 44 && this.run.eventTaken !== this.run.biome) spot.armed = true;
    if (!spot.armed || d > 28) return;
    spot.armed = false;
    this.openEvent(spot.id);
  }

  private openEvent(id: EventId): void {
    const cost = eventCost(this.run, id, this.heat.shopPrice);
    const blocked: EventSceneData['blocked'] =
      this.run.eventTaken === this.run.biome
        ? 'taken'
        : this.run.hp <= cost.hp
          ? 'hp'
          : this.run.shards < cost.shards
            ? 'shards'
            : undefined;
    const data: EventSceneData = {
      id,
      cost,
      blocked,
      extra: { maxHp: PRISONER_MAX_HP, damage: Math.round(ANVIL_DAMAGE * 100), xp: SHRINE_XP },
      onTake: () => this.onEventTaken(id),
      onLeave: () => {
        this.choosing = false;
        markScene('run');
      },
    };
    this.choosing = true;
    this.scene.launch('event', data);
    this.scene.bringToTop('event');
  }

  private onEventTaken(id: EventId): void {
    const biome = getBiome(this.run.biome);
    const hpBefore = this.run.hp;
    this.choosing = false;
    markScene('run');
    if (!takeEvent(this.run, id, this.heat.shopPrice, biome.pantheon)) return;
    session.snapshotRun(this.run);
    const spot = this.eventSpot;
    if (spot) {
      this.juice.burst(spot.x, spot.y, EVENT_COLOR[id], 26);
      spot.parts.forEach((p) =>
        (p as unknown as Phaser.GameObjects.Components.Alpha).setAlpha(0.3),
      );
    }
    if (hpBefore > this.run.hp)
      this.juice.damageNumber(this.player.x, this.player.y - 12, hpBefore - this.run.hp, '#ffa040');
    if (this.run.pendingBoon) {
      this.choosing = true;
      this.time.delayedCall(380, () => this.offerBoon());
      return;
    }
    this.ui.showBanner(
      t(`event.${id}.done` as TextKey),
      t(`event.${id}.doneSub` as TextKey, {
        maxHp: PRISONER_MAX_HP,
        damage: Math.round(ANVIL_DAMAGE * 100),
        xp: SHRINE_XP,
      }),
    );
  }

  // ---------- Épreuve de Vesper ----------

  private startTrial(biome: BiomeDef): void {
    const limitMs = trialTimeMs(this.waves, biome.elite);
    this.trial = { limitMs, startAt: 0, state: 'waiting' };
    this.time.delayedCall(400, () =>
      this.ui.showBanner(t('trial.title'), t('trial.sub', { seconds: Math.round(limitMs / 1000) })),
    );
  }

  private updateTrial(): void {
    const tr = this.trial;
    if (!tr || this.chest?.open) {
      if (!this.survival) this.ui.showTrial(null, 0);
      return;
    }
    if (tr.state === 'running' && !this.roomCleared && this.sim - tr.startAt >= tr.limitMs) {
      // Échec sans pénalité : la salle continue normalement, seul le coffre est perdu.
      tr.state = 'failed';
      sfx.block();
      this.ui.showBanner(t('trial.failed'), t('trial.failedSub'));
    }
    const left = tr.state === 'running' ? tr.limitMs - (this.sim - tr.startAt) : tr.limitMs;
    this.ui.showTrial(tr.state, left);
  }

  private spawnChest(): void {
    const x = ARENA.centerX;
    const y = ARENA.centerY + 20;
    const g = this.add.graphics().setDepth(3);
    // Coffre : caisse dorée, couvercle et serrure (forme reconnaissable sans la couleur).
    g.fillStyle(0x07060d, 1).fillRoundedRect(x - 14, y - 11, 28, 22, 4);
    g.lineStyle(2, 0xffe08a, 1).strokeRoundedRect(x - 14, y - 11, 28, 22, 4);
    g.lineBetween(x - 14, y - 3, x + 14, y - 3);
    g.fillStyle(0xffe08a, 1).fillRect(x - 3, y - 6, 6, 7);
    const glow = this.add
      .image(x, y, 'glow')
      .setTint(0xffe08a)
      .setAlpha(0.55)
      .setScale(1.4)
      .setBlendMode('ADD');
    this.tweens.add({ targets: glow, alpha: 0.25, duration: 600, yoyo: true, repeat: -1 });
    this.chest = { x, y, loot: chestLoot(this.run.biome), open: false, g, glow };
    this.juice.burst(x, y, 0xffe08a, 20);
  }

  private updateChest(): void {
    const c = this.chest;
    if (!c || c.open || this.leaving) return;
    if (Math.hypot(this.player.x - c.x, this.player.y - c.y) > 26) return;
    this.takeChest();
  }

  private takeChest(): void {
    const c = this.chest;
    if (!c || c.open) return;
    c.open = true;
    openChest(this.run, c.loot);
    this.tweens.killTweensOf(c.glow);
    c.glow.setAlpha(0.1);
    c.g.setAlpha(0.4);
    this.juice.burst(c.x, c.y, 0xffe08a, 28);
    sfx.chest();
    this.ui.showBanner(t('trial.chest'), t('trial.loot', { ...c.loot }));
  }

  // ---------- Marchand ----------

  /**
   * Le Comptoir de Ratatosk : un lieu à part entre deux mondes. Ratatosk tient son étal ;
   * Ash s'en approche pour commercer (autant de fois qu'il veut), puis sort par la porte.
   */
  private startShop(): void {
    this.shopSold = new Set();
    this.shopOpen = false;
    // L'étal est au milieu de la pièce : Ash, qui entre en bas au centre, n'a qu'à avancer.
    const x = ARENA.centerX;
    const y = ARENA.centerY + 26;
    this.drawCounter(x, y);
    const rng = createRng((this.run.seed ^ Math.imul(this.run.biome + 11, 0x2545f491)) >>> 0);
    const bubble = this.add
      .text(x + 46, y + 10, t(rng.pick(MERCHANT_GREETINGS)), {
        fontFamily: FONT_FAMILY,
        fontSize: '8px',
        color: '#ffe9d6',
        backgroundColor: '#1a120a',
        padding: { x: 5, y: 3 },
        align: 'center',
        wordWrap: { width: 130 },
      })
      .setOrigin(0, 0.5)
      .setDepth(20)
      .setAlpha(0);
    this.merchant = { x, y: y + 30, armed: true, bubble };
    // Une fontaine entre chaque monde, à gauche de l'étal (la bulle de Ratatosk est à droite).
    this.placeFountain(ARENA.centerX - 150, y + 56);
    this.time.delayedCall(400, () => this.ui.showBanner(t('merchant.title'), t('merchant.sub')));
    // Le lieu est sûr : la porte vers le monde suivant est ouverte tout de suite.
    this.time.delayedCall(600, () => this.clearRoom());
  }

  /** Étal, lanternes et caisses du comptoir ; Ratatosk derrière. */
  private drawCounter(x: number, y: number): void {
    const back = this.add.graphics().setDepth(3);
    // Ratatosk (dessin de la boutique, agrandi).
    back.setPosition(x + 6, y - 6).setScale(1.3);
    drawRatatosk(back, 0, 0);
    const g = this.add.graphics().setDepth(4);
    g.fillStyle(0x3a2412, 1).fillRect(x - 34, y + 4, 68, 16);
    g.fillStyle(0x5a3a1c, 1).fillRect(x - 36, y, 72, 6);
    g.lineStyle(1.5, 0xffc46b, 0.9).strokeRect(x - 36, y, 72, 20);
    // Marchandises sur l'étal : fiole, cœur, pierre, étincelle (formes des articles).
    g.fillStyle(0x7fe7ff, 1).fillRect(x - 26, y - 6, 5, 6);
    g.fillStyle(0xff9f6a, 1)
      .fillCircle(x - 9, y - 3, 3)
      .fillCircle(x - 5, y - 3, 3);
    g.fillStyle(0xc0c8d8, 1).fillTriangle(x + 6, y, x + 11, y - 8, x + 16, y);
    g.fillStyle(0xffe08a, 1).fillCircle(x + 27, y - 3, 3);
    this.add
      .text(x, y + 12, t('merchant.name'), {
        fontFamily: FONT_FAMILY,
        fontSize: '9px',
        fontStyle: 'bold',
        color: '#ffc46b',
      })
      .setOrigin(0.5)
      .setDepth(5);
    // Lanternes et caisses, pour l'ambiance (pas d'obstacle).
    for (const [lx, ly] of [
      [ARENA.left + 40, ARENA.top + 40],
      [ARENA.right - 40, ARENA.top + 40],
      [ARENA.left + 40, ARENA.bottom - 40],
      [ARENA.right - 40, ARENA.bottom - 40],
    ] as const) {
      this.add
        .image(lx, ly, 'glow')
        .setTint(0xffc46b)
        .setAlpha(0.45)
        .setScale(1.4)
        .setBlendMode('ADD');
      g.fillStyle(0x2a1c12, 1).fillRect(lx - 4, ly - 6, 8, 12);
      g.fillStyle(0xffc46b, 1).fillRect(lx - 2, ly - 3, 4, 6);
    }
    for (const [cx, cy] of [
      [x - 62, y + 10],
      [x - 58, y - 12],
      [x + 52, y + 14],
    ] as const) {
      g.fillStyle(0x4a3018, 1).fillRect(cx - 9, cy - 8, 18, 16);
      g.lineStyle(1, 0x8a5e30, 1).strokeRect(cx - 9, cy - 8, 18, 16);
      g.lineBetween(cx - 9, cy - 8, cx + 9, cy + 8);
    }
  }

  /** Ash s'approche de l'étal : bulle de Ratatosk, puis la boutique s'ouvre. */
  private updateMerchant(): void {
    const m = this.merchant;
    if (!m || this.leaving || this.choosing) return;
    const d = Math.hypot(this.player.x - m.x, this.player.y - m.y);
    m.bubble.setAlpha(d < 110 ? 1 : Math.max(0, m.bubble.alpha - 0.05));
    if (d > 70) m.armed = true;
    if (!m.armed || d > 44) return;
    m.armed = false;
    this.shopOpen = true;
    this.openShop();
  }

  private openShop(): void {
    if (!this.shopOpen || this.choosing) return;
    const rng = createRng((this.run.seed ^ Math.imul(this.run.biome + 1, 97531)) >>> 0);
    const data: ShopSceneData = {
      run: this.run,
      sold: this.shopSold,
      priceMul: this.heat.shopPrice,
      onBuy: (item) => {
        if (!buyItem(this.run, item, rng, this.heat.shopPrice)) return false;
        if (this.run.pendingBoon) {
          this.choosing = true;
          this.time.delayedCall(150, () => this.offerBoon());
        }
        return true;
      },
      onLeave: () => {
        this.shopOpen = false;
        this.choosing = false;
        markScene('run');
      },
    };
    this.choosing = true;
    this.scene.launch('shop', data);
    this.scene.bringToTop('shop');
  }

  /** Dégâts d'un coup d'arme : bonus de run (modificateurs, Thot) + forge selon le type de coup. */
  private weaponMultiplier(kind: 'attack' | 'power' | 'super'): number {
    const f = this.forge;
    const extra = kind === 'power' ? f.powerDamage : kind === 'super' ? f.superDamage : 0;
    return 1 + this.run.damageBonus + f.damage + extra;
  }

  // ---------- Pause ----------

  openPause(): void {
    if (
      this.leaving ||
      this.scene.isPaused() ||
      this.scene.isActive('boon') ||
      this.scene.isActive('shop')
    )
      return;
    this.ui.showHint('', null);
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

  /** Étincelle du Phénix : choisir un don possédé qui gagne un cran de rareté. */
  private offerSpark(): void {
    const rng = createRng((this.run.seed ^ Math.imul(this.run.room + 101, 2654435761)) >>> 0);
    const offers = rollUpgrades(rng, this.run.boons);
    const first = offers[0] && getBoon(offers[0].id);
    if (!first) {
      this.run.pendingSpark = false;
      this.choosing = false;
      this.runAfterChoice();
      return;
    }
    const data: BoonSceneData = {
      god: getBoonGod(offers[0] as BoonOffer),
      offers,
      upgrade: true,
      onPick: (offer) => {
        upgradeBoon(this.run, offer);
        session.snapshotRun(this.run);
        this.profile = buildProfile(this.run.boons);
        this.applyProfile();
        this.choosing = false;
        this.nextWaveAt = this.sim + 600;
        this.juice.burst(this.player.x, this.player.y, 0xffc46b, 28);
        sfx.spark();
        markScene('run');
        this.runAfterChoice();
      },
    };
    this.scene.launch('boon', data);
    this.scene.bringToTop('boon');
  }

  private offerBoon(): void {
    const god = this.run.pendingBoon;
    if (!god) return;
    // Même graine que la salle : fermer et rouvrir le jeu repropose les mêmes dons.
    const rng = createRng((this.run.seed ^ Math.imul(this.run.room, 2654435761)) >>> 0);
    const offers = rollOffer(rng, this.run.boons, god, 3, this.run.perks.rareBonus);
    if (offers.length === 0) {
      this.run.pendingBoon = null;
      this.choosing = false;
      this.runAfterChoice();
      return;
    }
    const data: BoonSceneData = { god, offers, onPick: (offer) => this.onBoonPicked(offer) };
    this.scene.launch('boon', data);
    this.scene.bringToTop('boon');
  }

  private onBoonPicked(offer: BoonOffer): void {
    chooseBoon(this.run, offer);
    recordCodex(session.save.meta, `god.${getBoonGod(offer)}`);
    session.snapshotRun(this.run);
    this.profile = buildProfile(this.run.boons);
    this.applyProfile();
    this.aegisLeft = Math.max(this.aegisLeft, this.profile.aegis);
    this.choosing = false;
    this.nextWaveAt = this.sim + 600;
    this.juice.burst(this.player.x, this.player.y, GODS[getBoonGod(offer)].color, 24);
    if (this.shopOpen) this.time.delayedCall(250, () => this.openShop());
    else markScene('run');
    this.runAfterChoice();
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
    if (fx.soak) applySoak(e.status, this.sim, fx.soak.slow, fx.soak.durationMs);
    if (fx.venom) applyVenom(e.status, this.sim, fx.venom.stacks, fx.venom.dps);
    if (fx.judge) applyJudge(e.status, this.sim, fx.judge.bonus, fx.judge.durationMs);
    if (fx.weaken) applyWeaken(e.status, this.sim, fx.weaken.reduction, fx.weaken.durationMs);
    if (fx.curse) applyCurse(e.status, this.sim, fx.curse.damage, fx.curse.radius);
    if (fx.stun && Math.random() < fx.stun.chance) this.stun(e, fx.stun.durationMs);
    this.checkThermalShock(e);
  }

  /** Étourdit (Seth) ; sur un boss, ce n'est qu'un court sursaut. */
  private stun(e: Hittable, durationMs: number): void {
    applyStun(e.status, this.sim, e === this.boss ? Math.min(durationMs, 400) : durationMs);
    this.juice.burst(e.x, e.y - e.radius, FX.thunder, 6);
  }

  /** Les dons du profil qui changent Ash lui-même (Bastet : vitesse, dash). */
  private applyProfile(): void {
    this.player.speedMul = 1 + this.profile.speed;
    this.player.dashCooldownMul = Math.max(
      0.3,
      1 - (this.profile.on.dash.dashCooldown ?? 0) - this.run.perks.dashCooldown,
    );
    // La traînée de l'attaque prend la couleur du dieu qui la bénit.
    const god = slotGod(this.run.boons, 'attack');
    this.player.boonColor = god ? GODS[god].color : null;
  }

  /** État de la cible pour les bonus de dégâts des dons. */
  private targetState(e: Hittable) {
    return {
      burning: isBurning(e.status, this.sim),
      chilled: isFrozen(e.status, this.sim) || this.sim < e.status.chillUntil,
      stunned: isStunned(e.status, this.sim),
      far: Math.hypot(e.x - this.player.x, e.y - this.player.y) > FAR_DISTANCE,
      soaked: isSoaked(e.status, this.sim),
      poisoned: isPoisoned(e.status, this.sim),
      judged: judgedBonus(e.status, this.sim),
    };
  }

  /** Flèches croisées de Neith : vers les ennemis visibles les plus proches. */
  private fireArrows(arrows: NonNullable<HitEffects['arrows']>, id: number): void {
    const visible = this.targets
      .filter((t) => t.alive && this.isOnScreen(t))
      .sort(
        (a, b) =>
          Math.hypot(a.x - this.player.x, a.y - this.player.y) -
          Math.hypot(b.x - this.player.x, b.y - this.player.y),
      );
    if (visible.length === 0) return;
    for (let i = 0; i < arrows.count; i++) {
      const t = visible[i % visible.length];
      if (!t) continue;
      const angle =
        Math.atan2(t.y - this.player.y, t.x - this.player.x) + (i >= visible.length ? 0.15 : 0);
      this.shotsP.fire(
        this.sim,
        this.player,
        angle,
        { ...ARROW_STEP, projectile: { ...ARROW, damage: arrows.damage } },
        'boon',
        id,
      );
    }
  }

  /** Duo Râ + Khonsou : un ennemi gelé qui brûle explose (une fois par gel). */
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
      this.damageEnemy(next, this.lightningDamage(next, chain.damage), FX.zapText);
      if (this.profile.stormStun) this.stun(next, this.profile.stormStun);
    }
    if (hit.size > 1) {
      sfx.zap();
      this.conductLightning(current, hit);
    }
  }

  /** Un ennemi trempé (Sobek) conduit la foudre : il en prend plus. */
  private lightningDamage(e: Hittable, damage: number): number {
    return Math.round(damage * lightningFactor(e.status, this.sim));
  }

  /** Duo Seth + Sobek : l'éclair se propage à tous les ennemis trempés. */
  private conductLightning(from: Vec2, already: ReadonlySet<Hittable>): void {
    const damage = this.profile.conduct;
    if (damage <= 0) return;
    for (const e of this.targets) {
      if (!e.alive || already.has(e) || !isSoaked(e.status, this.sim)) continue;
      this.lightning.zap(from, e, FX.water);
      this.damageEnemy(e, this.lightningDamage(e, damage), FX.zapText);
    }
  }

  /** La foudre tombe sur un point et touche tout autour. */
  private lightningBolt(at: { x: number; y: number }, damage: number, radius: number): void {
    this.lightning.bolt(at, radius, FX.zap);
    sfx.zap();
    const hit = new Set<Hittable>();
    for (const e of this.targets) {
      if (!e.alive) continue;
      if (Math.hypot(e.x - at.x, e.y - at.y) > radius + e.radius) continue;
      hit.add(e);
      this.damageEnemy(e, this.lightningDamage(e, damage), FX.zapText);
      if (this.profile.stormStun) this.stun(e, this.profile.stormStun);
    }
    this.conductLightning(at, hit);
  }

  private dashEffects(): void {
    const fx = this.profile.on.dash;
    const at = { x: this.player.x, y: this.player.y };
    if (fx.deflect) this.deflectShots(at, fx.deflect);
    // Envol du milan (Isis) : le dash protège.
    if (fx.barrier) this.barrier = Math.max(this.barrier, fx.barrier);
    if (fx.arrows) this.fireArrows(fx.arrows, -1);
    if (fx.shockwave) {
      const wave = fx.shockwave;
      this.lightning.ring(at, wave.radius, FX.water);
      this.juice.shake(0.003);
      for (const e of this.targets) {
        if (!e.alive) continue;
        if (Math.hypot(e.x - at.x, e.y - at.y) > wave.radius + e.radius) continue;
        this.damageEnemy(e, wave.damage, FX.waterText);
        if (e.alive) e.hit(this.sim, at, wave.knockback);
      }
    }
    if (
      fx.burn ||
      fx.chill ||
      fx.judge ||
      fx.curse ||
      fx.weaken ||
      fx.stun ||
      fx.soak ||
      fx.venom
    ) {
      const color = fx.burn
        ? FX.burn
        : fx.soak
          ? FX.water
          : fx.venom
            ? FX.venom
            : fx.chill
              ? FX.ice
              : fx.judge
                ? GODS.anubis.color
                : fx.curse
                  ? GODS.serket.color
                  : fx.stun
                    ? FX.thunder
                    : fx.weaken
                      ? GODS.neith.color
                      : 0xffffff;
      this.lightning.ring(at, DASH_AURA_RADIUS, color);
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

  /** Neith : le dash détruit les projectiles ennemis proches. */
  private deflectShots(at: Vec2, radius: number): void {
    for (const s of this.shots) {
      if (!s.sprite.active) continue;
      if (Math.hypot(s.sprite.x - at.x, s.sprite.y - at.y) > radius) continue;
      this.juice.burst(s.sprite.x, s.sprite.y, GODS.neith.color, 6);
      s.sprite.setActive(false).setVisible(false);
      bodyOf(s.sprite).enable = false;
    }
    this.lightning.ring(at, radius, GODS.neith.color);
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
    const mult = damageMultiplier(this.profile, this.targetState(e));
    const { dealt, killed } = applyDamage(e.health, base * mult);
    e.hit(this.sim, this.player, 0);
    this.juice.damageNumber(e.x, e.y - e.radius, dealt, color);
    if (killed) this.killEnemy(e);
  }

  /** La brûlure fait ses dégâts par paquets. */
  private updateBurns(): void {
    for (const e of this.targets) {
      if (!e.alive) continue;
      const burn = tickBurn(e.status, this.sim);
      const venom = tickVenom(e.status, this.sim);
      if (burn <= 0 && venom <= 0) continue;
      const { dealt, killed } = applyDamage(e.health, burn + venom);
      this.juice.damageNumber(
        e.x,
        e.y - e.radius,
        dealt,
        burn >= venom ? FX.burnText : FX.venomText,
      );
      if (killed) this.killEnemy(e);
    }
  }

  override update(_time: number, delta: number): void {
    this.watchPerformance(delta);
    if (this.juice.frozen) {
      if (!this.physics.world.isPaused) this.physics.world.pause();
      return;
    }
    if (this.physics.world.isPaused) this.physics.world.resume();

    const dt = Math.min(delta, 50);
    if (this.choosing) {
      this.ui.showRun(this.run);
      this.ui.showHint('', null);
      return;
    }
    this.sim += dt;
    if (!this.leaving) this.run.elapsedMs += dt;

    this.controls.update();
    const alive = this.enemies.filter((e) => e.alive);
    this.targets.length = 0;
    this.targets.push(...alive);
    if (this.boss?.alive) this.targets.push(this.boss);
    // Pendant la présentation d'un boss, Ash attend (les appuis sont ignorés).
    if (this.sim < this.cinematicUntil) this.controls.buffer.clear();
    else if (!this.leaving) this.player.update(this.sim, dt, this.controls, this.targets);

    this.updateSpawns();
    for (const e of alive) e.update(this.sim, dt, this.player, this.isOnScreen(e));
    this.updateBoss(dt);
    this.resolvePlayerAttack(this.targets);
    this.shotsP.update(this.sim, dt, this.targets, this.player);
    this.updateBurns();
    this.resolveEnemyAttacks(alive);
    this.updateShots();
    this.updateWaves();
    this.checkDoors();
    this.updateFountain();
    this.updateTrial();
    this.updateChallenge();
    this.updateMerchant();
    this.updateBlasts();
    this.updateTraps();
    this.updateEvent();
    this.updateChest();
    this.updateLoot();
    this.updateTutorial();
    this.ui.showRun(this.run);
    this.updateIndicators();
  }

  // ---------- Arène ----------

  /** Obstacles : seulement en combat, jamais dans la 1re salle d'un biome. */
  private placeObstacles(): void {
    this.obstacles =
      this.kind === 'combat' && this.run.room > 1
        ? planObstacles(
            createRng(
              (this.run.seed ^ Math.imul(this.run.biome * 64 + this.run.room + 1, 0x85ebca6b)) >>>
                0,
            ),
            { x: ARENA.x, y: ARENA.y, w: ARENA.width, h: ARENA.height },
            KEEP_OUT,
          )
        : [];
    const theme = getBiome(this.run.biome).theme;
    const g = this.add.graphics().setDepth(2);
    for (const r of this.obstacles) {
      // Bloc sombre au liseré du mur : même langage visuel que les bords de l'arène.
      g.fillStyle(0x07060d, 0.35).fillRect(r.x + 3, r.y + 4, r.w, r.h);
      g.fillStyle(theme.wall, 1).fillRect(r.x, r.y, r.w, r.h);
      g.fillStyle(0x07060d, 0.35).fillRect(r.x + 3, r.y + 3, r.w - 6, r.h - 6);
      g.lineStyle(1.5, theme.wallGlow, 0.9).strokeRect(r.x, r.y, r.w, r.h);
    }
  }

  private addObstacleColliders(): void {
    if (this.obstacles.length === 0) return;
    const blocks = this.obstacles.map((r) => {
      const zone = this.add.zone(r.x + r.w / 2, r.y + r.h / 2, r.w, r.h);
      this.physics.add.existing(zone, true);
      return zone;
    });
    this.physics.add.collider(this.player.sprite, blocks);
    this.physics.add.collider(
      this.enemies.map((e) => e.sprite),
      blocks,
    );
    for (const e of this.enemies) e.obstacles = this.obstacles;
    this.shotsP.obstacles = this.obstacles;
  }

  private drawArena(): void {
    const pad = 400;
    this.add.rectangle(
      ARENA.centerX,
      ARENA.centerY,
      ARENA.width + pad * 2,
      ARENA.height + pad * 2,
      0x07060d,
    );
    const theme = this.kind === 'shop' ? MERCHANT_THEME : getBiome(this.run.biome).theme;
    // Sol uni à la teinte du monde (pas de quadrillage), éclairé doucement au centre.
    this.add.rectangle(
      ARENA.centerX,
      ARENA.centerY,
      ARENA.width,
      ARENA.height,
      FLOOR_COLOR[theme.floor],
    );
    this.add
      .image(ARENA.centerX, ARENA.centerY, 'glow')
      .setTint(theme.wallGlow)
      .setAlpha(0.07)
      .setScale((ARENA.width / 64) * 1.2, (ARENA.height / 64) * 1.2)
      .setBlendMode('ADD');
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
    if (theme.snow) this.addSnow(0xd8f6ff);
    if (theme.mist) this.addMist();
    if (theme.sand) this.addSand();
  }

  /** Pyramide aux cages : grains de sable qui tombent lentement du plafond, quelques-uns dorés. */
  private addSand(): void {
    this.add
      .particles(0, ARENA.top - 10, 'spark', {
        x: { min: ARENA.left, max: ARENA.right },
        speedY: { min: 8, max: 18 },
        speedX: { min: -2, max: 2 },
        lifespan: 16000,
        frequency: 160 / QUALITY_PARTICLES[settings.quality],
        scale: { min: 0.15, max: 0.3 },
        alpha: { start: 0.55, end: 0.05 },
        tint: [0xe0c080, 0xc8a060, 0xffd36b],
      })
      .setDepth(2);
  }

  /** Nil de minuit : brume froide qui dérive lentement au ras de l'eau. */
  private addMist(): void {
    this.add
      .particles(0, 0, 'glow', {
        x: { min: ARENA.left - 60, max: ARENA.left },
        y: { min: ARENA.top + 20, max: ARENA.bottom - 20 },
        speedX: { min: 6, max: 16 },
        speedY: { min: -2, max: 2 },
        lifespan: 26000,
        frequency: 900 / QUALITY_PARTICLES[settings.quality],
        scale: { min: 1.6, max: 3 },
        alpha: { start: 0.14, end: 0 },
        tint: 0x9ab4ff,
        blendMode: 'ADD',
      })
      .setDepth(2);
  }

  /** Flocons qui tombent doucement (moins nombreux en qualité basse). */
  private addSnow(tint: number, texture = 'spark'): void {
    this.add
      .particles(0, ARENA.top - 20, texture, {
        x: { min: ARENA.left - 40, max: ARENA.right + 40 },
        speedY: { min: 12, max: 30 },
        speedX: { min: -10, max: 6 },
        lifespan: 14000,
        frequency: 90 / QUALITY_PARTICLES[settings.quality],
        scale: { min: 0.3, max: 0.7 },
        alpha: { start: 0.7, end: 0.1 },
        tint,
        rotate: { min: 0, max: 360 },
      })
      .setDepth(2);
  }

  /** Caméra rapprochée qui suit Ash (les personnages restent lisibles sur un téléphone). */
  private setupCamera(): void {
    const cam = this.cameras.main;
    const margin = 36;
    cam.setZoom(RENDER_SCALE * (SCENE_ZOOM.run ?? 1));
    cam.setBounds(
      ARENA.x - margin,
      ARENA.y - margin,
      ARENA.width + margin * 2,
      ARENA.height + margin * 2,
    );
    this.followPlayer();
    applyPostFx(cam, settings.quality);
  }

  private followPlayer(): void {
    this.cameras.main.startFollow(this.player.sprite, true, 0.14, 0.14);
  }

  /** Qualité automatique : si le jeu rame, on baisse d'un cran et on le dit discrètement. */
  private watchPerformance(delta: number): void {
    const next = autoLowerQuality(this.autoQuality, delta, this.cameras.main);
    if (next) this.ui.toast(t('options.quality.lowered', { level: t(`options.quality.${next}`) }));
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
    // Zoom de la salle seul (l'interface est en coordonnées logiques).
    const zoom = cam.zoom / RENDER_SCALE;
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
    if (this.kind === 'shop' || this.kind === 'fountain' || this.kind === 'event') return;
    // Survie : la salle se termine à la fin du chrono (updateChallenge).
    if (this.survival) return;
    if (this.waveIndex < this.waves.length) {
      if (this.nextWaveAt === 0) this.nextWaveAt = this.sim + 500;
      if (this.sim >= this.nextWaveAt) {
        if (this.trial?.state === 'waiting') {
          this.trial.state = 'running';
          this.trial.startAt = this.sim;
        }
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
        ...(this.challenge === 'champion' && ENEMIES[id].elite ? { champion: true } : {}),
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
      if (insideAny(p, this.obstacles, 16)) continue;
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
      const affix = s.champion
        ? 'armored'
        : rollAffix(this.rng, this.run.biome, s.def.elite !== undefined);
      const hpMul = this.heat.enemyHp * (s.champion ? CHAMPION_HP : 1);
      slot.activate(s.def, s.x, s.y, this.sim, hpMul, this.heat.enemySpeed, affix);
      this.juice.burst(s.x, s.y, s.def.color, 10);
    }
  }

  // ---------- Combat ----------

  private resolvePlayerAttack(alive: readonly Hittable[]): void {
    const swing = this.player.activeSwing(this.sim);
    if (!swing) return;
    const { step } = swing;
    for (const e of alive) {
      if (!e.alive || e.lastSwingId === swing.id) continue;
      if (!hitsArc(this.player, this.player.facing, step.range, step.arcDeg, e, e.radius)) continue;
      e.lastSwingId = swing.id;
      this.weaponHit(e, {
        damage: step.damage,
        kind: swing.kind,
        knockback: step.knockback,
        hitstopMs: step.hitstopMs,
        shake: step.shake,
        heavy: swing.heavy,
        id: swing.id,
        from: this.player,
      });
    }
  }

  /**
   * Un coup d'arme touche une cible (corps à corps, projectile ou zone) : bouclier, bonus, dégâts,
   * ressenti, jauge de Super, puis effets des dons de l'action (attaque, puissante).
   */
  /** Un coup d'arme (attaque, puissante, Super) touche un ennemi. */
  private weaponHit(
    e: Hittable,
    hit: {
      damage: number;
      kind: 'attack' | 'power' | 'super';
      knockback: number;
      hitstopMs: number;
      shake: number;
      heavy: boolean;
      id: number;
      from: Vec2;
    },
  ): void {
    this.hitKind = hit.kind;
    try {
      this.resolveWeaponHit(e, hit);
    } finally {
      this.hitKind = null;
    }
  }

  private resolveWeaponHit(
    e: Hittable,
    hit: {
      damage: number;
      kind: 'attack' | 'power' | 'super';
      knockback: number;
      hitstopMs: number;
      shake: number;
      heavy: boolean;
      id: number;
      from: Vec2;
    },
  ): void {
    const fx: HitEffects = this.profile.on[hit.kind];
    // Un seul éclair en chaîne par coup, même si le coup touche plusieurs ennemis.
    const firstHit = this.lastChainSwing !== hit.id;
    this.lastChainSwing = hit.id;
    const mult = damageMultiplier(this.profile, this.targetState(e));
    const at = { x: e.x, y: e.y };
    // Critique (Bastet) : dégâts doublés, ou plus avec « Griffes affûtées ».
    const critChance = (fx.crit ?? 0) + (hit.kind === 'super' ? 0 : this.profile.critAll);
    const crit = critChance > 0 && Math.random() < critChance;
    const critMult = crit ? 2 + this.profile.critDamage : 1;
    // Bouclier frontal (Einherjar, Héraut) : le coup est presque entièrement bloqué, sans effet de don.
    const blocked = e instanceof Enemy && e.blocks(hit.from, this.sim);
    const shieldFactor = blocked && e instanceof Enemy ? (e.def.shield?.blocked ?? 1) : 1;
    const { dealt, killed } = applyDamage(
      e.health,
      hit.damage * this.weaponMultiplier(hit.kind) * mult * shieldFactor * critMult,
    );
    if (blocked) {
      e.hit(this.sim, hit.from, hit.knockback * 0.3);
      this.juice.burst(e.x, e.y, 0xe8f2ff, 8);
      this.juice.damageNumber(e.x, e.y - e.radius, dealt, '#9a8fb5');
      sfx.block();
      if (killed) this.killEnemy(e);
      return;
    }
    e.hit(this.sim, hit.from, hit.knockback);
    this.juice.hitstop(killed || crit ? hit.hitstopMs + 30 : hit.hitstopMs);
    this.juice.shake(crit ? Math.max(hit.shake, 0.003) : hit.shake);
    this.juice.burst(e.x, e.y, crit ? GODS.bastet.color : 0xffe9d6, hit.heavy || crit ? 10 : 6);
    this.juice.damageNumber(e.x, e.y - e.radius, dealt, crit ? FX.critText : undefined);
    // Jugement d'Anubis : exécution des ennemis (hors boss) sous le seuil de vie.
    let dead = killed;
    if (!dead && fx.execute && e !== this.boss && e.health.hp / e.health.maxHp <= fx.execute) {
      applyDamage(e.health, e.health.hp);
      dead = true;
      this.juice.burst(e.x, e.y, GODS.anubis.color, 14);
    }
    if (fx.lifeOnHit) this.healPlayer(fx.lifeOnHit);
    if (fx.barrier) this.barrier = Math.max(this.barrier, fx.barrier);
    if (fx.arrows && firstHit) this.fireArrows(fx.arrows, hit.id);
    if (hit.kind !== 'super')
      this.run.superGauge = gainSuper(this.run.superGauge, dealt * (1 + this.forge.superGain));
    sfx.hit(hit.heavy || crit);
    // Duo « Griffes du tonnerre » : un critique étourdit.
    if (crit && !dead && this.profile.critStun) this.stun(e, this.profile.critStun);
    if (dead) this.killEnemy(e);
    else this.applyHitEffects(e, fx);
    if (fx.chain && firstHit) this.chainLightning(e, fx.chain);
    if (fx.bolt) this.lightningBolt(at, fx.bolt.damage, fx.bolt.radius);
  }

  /**
   * Grappin de Gleipnir : un petit ennemi est attiré vers Ash ; un gros ennemi (élite, boss)
   * tire Ash vers lui. Dans les deux cas le coup fait aussi des dégâts.
   */
  private grapple(target: Hittable, hit: ShotHit): void {
    this.weaponHit(target, {
      ...hit,
      kind: hit.kind === 'boon' ? 'power' : hit.kind,
      knockback: 0,
      hitstopMs: 40,
    });
    if (!target.alive) return;
    const small = target instanceof Enemy && !target.def.elite && target.radius <= 9;
    if (small) {
      // Point « derrière » la cible : le recul part de là, donc vers Ash.
      const from = { x: target.x * 2 - this.player.x, y: target.y * 2 - this.player.y };
      target.hit(this.sim, from, 260);
    } else {
      this.player.pullTo(this.sim, target);
    }
    sfx.zap();
  }

  /** Lame de l'Aube : parade réussie, le coup est annulé et Ash riposte autour de lui. */
  private parry(from: Vec2): void {
    const riposte = WEAPONS[this.run.weapon].power.parry;
    this.player.parried(this.sim);
    sfx.block();
    sfx.super();
    this.juice.hitstop(120);
    this.juice.shake(0.008, 200);
    this.lightning.ring(this.player, 30, 0xfff0c0);
    this.juice.burst(this.player.x, this.player.y, 0xfff0c0, 24);
    if (!riposte) return;
    const facing = Math.atan2(from.y - this.player.y, from.x - this.player.x);
    const id = --this.parryId;
    for (const e of this.targets) {
      if (!e.alive) continue;
      if (!hitsArc(this.player, facing, riposte.range, riposte.arcDeg, e, e.radius)) continue;
      this.weaponHit(e, {
        damage: riposte.damage,
        kind: 'power',
        knockback: riposte.knockback,
        hitstopMs: 60,
        shake: 0.006,
        heavy: true,
        id,
        from: this.player,
      });
    }
  }

  private killEnemy(e: Hittable): void {
    if (e === this.boss) {
      this.defeatBoss();
      return;
    }
    if (!(e instanceof Enemy)) return;
    recordKill(this.run);
    this.onAmonEvent({ type: 'kill', at: this.sim, power: this.hitKind === 'power' });
    if (e.affix) {
      this.run.shards += AFFIX_BOUNTY;
      if (e.affix === 'volatile') this.armBlast(e.x, e.y);
    }
    recordCodex(session.save.meta, `enemy.${e.def.id}`);
    if (e.def.elite) {
      this.run.xp += e.def.elite.xp;
      this.run.shards += SHARD_BOUNTY.elite;
      this.juice.damageNumber(e.x, e.y - e.radius - 8, e.def.elite.xp, '#b08cff');
      this.juice.shake(0.005, 160);
    }
    this.juice.burst(e.x, e.y, e.def.color, 16);
    sfx.kill();
    if (this.profile.healOnKill) this.healPlayer(this.profile.healOnKill);
    // Duo « Embaumement » : un ennemi qui brûle soigne en mourant.
    if (this.profile.embalm && isBurning(e.status, this.sim)) this.healPlayer(this.profile.embalm);
    const cursed = isCursed(e.status, this.sim);
    const curse = { damage: e.status.curseDamage, radius: e.status.curseRadius, x: e.x, y: e.y };
    e.deactivate();
    if (cursed) this.curseExplosion(curse);
  }

  /** Dard d'adieu de Serket : l'ennemi maudit explose à sa mort. */
  private curseExplosion(c: { damage: number; radius: number; x: number; y: number }): void {
    this.lightning.ring(c, c.radius, GODS.serket.color);
    this.juice.burst(c.x, c.y, GODS.serket.color, 14);
    sfx.explode();
    for (const other of this.targets) {
      if (!other.alive) continue;
      if (Math.hypot(other.x - c.x, other.y - c.y) > c.radius + other.radius) continue;
      this.damageEnemy(other, c.damage, '#d8d0f0');
      // Duo « Soleil noir » : l'explosion enflamme.
      const sun = this.profile.blackSun;
      if (sun && other.alive) applyBurn(other.status, this.sim, sun.dps, sun.durationMs);
      // Duo « Jugement dernier » : l'explosion exécute les ennemis affaiblis (hors boss).
      const day = this.profile.judgementDay;
      if (
        day &&
        other.alive &&
        other !== this.boss &&
        other.health.hp / other.health.maxHp <= day
      ) {
        applyDamage(other.health, other.health.hp);
        this.killEnemy(other);
      }
    }
  }

  private healPlayer(amount: number): void {
    const healed = Math.min(this.run.maxHp - this.run.hp, Math.round(amount));
    if (healed <= 0) return;
    this.run.hp += healed;
    this.juice.damageNumber(this.player.x, this.player.y - 12, healed, FX.heal);
  }

  private resolveEnemyAttacks(alive: readonly Enemy[]): void {
    for (const e of alive) {
      if (e.justLanded && e.def.attack.kind === 'leap') {
        // Sauteur : dégâts à l'atterrissage, dans le cercle annoncé.
        e.justLanded = false;
        this.juice.burst(e.leapTo.x, e.leapTo.y, e.def.color, 12);
        this.juice.shake(0.003, 100);
        const reach = e.def.attack.radius + PLAYER.radius;
        if (
          !this.player.isInvulnerable(this.sim) &&
          Math.hypot(this.player.x - e.leapTo.x, this.player.y - e.leapTo.y) < reach
        )
          this.hurtPlayer(e.def.damage, e, e.def.nameKey);
        continue;
      }
      if (e.state === 'attack' && !e.attackLanded && e.def.attack.kind === 'beam') {
        if (this.player.isInvulnerable(this.sim)) continue;
        if (e.beamHits(this.player, PLAYER.radius)) {
          e.attackLanded = true;
          this.hurtPlayer(e.def.damage, e, e.def.nameKey);
        }
        continue;
      }
      if (e.state === 'attack' && !e.attackLanded && e.def.attack.kind === 'runes') {
        if (this.player.isInvulnerable(this.sim)) continue;
        if (e.runeHits(this.player, PLAYER.radius)) {
          e.attackLanded = true;
          this.hurtPlayer(e.def.damage, e, e.def.nameKey);
        }
        continue;
      }
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

  private fireShot(from: Vec2, angle: number, def: EnemyDef, factor = 1): void {
    if (def.attack.kind !== 'shot') return;
    let shot = this.shots.find((s) => !s.sprite.active);
    if (!shot) {
      shot = { sprite: this.physics.add.image(0, 0, 'shot').setDepth(15), damage: 0, source: def };
      this.shots.push(shot);
    }
    shot.damage = Math.max(1, Math.round(def.damage * factor));
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
      if (!ARENA.contains(sp.x, sp.y) || insideAny(sp, this.obstacles)) {
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
    if (this.player.isParrying(this.sim)) {
      this.parry(from);
      return;
    }
    // Mesure « Surveillance » : les ennemis frappent plus fort.
    amount = Math.round(amount * this.heat.enemyDamage);
    // Neith : un ennemi affaibli frappe moins fort ; le Bouclier de Saïs bloque ; le bouclier absorbe.
    if (from instanceof Enemy)
      amount = Math.max(1, Math.round(amount * weakenFactor(from.status, this.sim)));
    if (this.aegisLeft > 0) {
      this.aegisLeft--;
      this.player.takeHit(this.sim, from);
      this.lightning.ring(this.player, 22, GODS.neith.color);
      this.juice.burst(this.player.x, this.player.y, GODS.neith.color, 12);
      sfx.block();
      // Duo « Bouclier d'orage » : la foudre part de l'ennemi le plus proche et rebondit.
      const storm = this.profile.aegisStorm;
      const near = storm ? this.nearestEnemy(this.player, 160) : undefined;
      if (near) {
        this.damageEnemy(near, storm, '#c8b8ff');
        this.chainLightning(near, { damage: storm, bounces: 3, range: 90 });
        sfx.zap();
      }
      return;
    }
    if (this.barrier > 0) {
      const absorbed = Math.min(this.barrier, amount);
      this.barrier -= absorbed;
      amount -= absorbed;
      this.juice.burst(this.player.x, this.player.y, GODS.neith.color, 6);
      if (amount <= 0) {
        this.player.takeHit(this.sim, from);
        sfx.block();
        return;
      }
    }
    const health = { hp: this.run.hp, maxHp: this.run.maxHp };
    // Bénédiction du Phénix : dégâts reçus réduits (option, sans jugement).
    const reduction = assistReduction(settings.assist, session.save.meta.assistDeaths);
    const { dealt, killed } = applyDamage(health, reducedDamage(amount, reduction));
    this.run.hp = health.hp;
    recordDamage(this.run, dealt);
    if (dealt > 0) this.onAmonEvent({ type: 'hurt' });
    this.run.superGauge = gainSuper(this.run.superGauge, 0, dealt);
    this.player.takeHit(this.sim, from);
    this.juice.hitstop(70);
    this.juice.shake(0.006, 140);
    this.juice.buzz(40);
    this.juice.damageNumber(this.player.x, this.player.y - 10, dealt, '#ff6f96');
    sfx.hurt();
    this.ui.flashHurt();
    if (killed && this.profile.lastBreath > 0 && !this.run.lastBreathUsed) {
      // Isis : « Seconde vie », une fois par run.
      this.run.lastBreathUsed = true;
      this.run.hp = Math.min(this.run.maxHp, this.profile.lastBreath);
      this.ui.showBanner(t('boon.isis_last'), '');
      this.juice.burst(this.player.x, this.player.y, GODS.isis.color, 30);
      return;
    }
    if (killed && this.run.revivesUsed < this.run.perks.revives) {
      // Thot : « Renaissance », Ash se relève des cendres.
      this.run.revivesUsed += 1;
      this.run.hp = Math.max(1, Math.round(this.run.maxHp * REVIVE_HP));
      this.player.revive(this.sim, 1500);
      for (const s of this.shots) if (s.sprite.active) this.removeShot(s);
      this.ui.showBanner(t('skill.thoth_rebirth'), t('revive.sub'));
      this.juice.burst(this.player.x, this.player.y, 0xff7a2a, 40);
      this.lightning.ring(this.player, 50, 0xffb02e);
      sfx.revive();
      return;
    }
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
    if (this.kind === 'combat' || this.kind === 'boss') {
      telemetry.room({
        biome: this.run.biome,
        room: this.run.room,
        ms: this.run.elapsedMs - this.roomStart.elapsed,
        hpLost: this.roomStart.hp - this.run.hp,
      });
    }
    sfx.clear();
    const healed = onRoomCleared(this.run);
    if (healed > 0) this.juice.damageNumber(this.player.x, this.player.y - 12, healed, FX.heal);
    // Isis : chaque salle terminée rend un peu de vie.
    if (this.profile.roomHeal > 0 && this.kind !== 'shop') this.healPlayer(this.profile.roomHeal);
    const biome = getBiome(this.run.biome);
    if (this.kind === 'boss' || this.kind === 'shop') {
      // Après le boss : biome suivant s'il existe ; après le marchand : salle 1.
      const last = this.kind === 'boss' && this.run.biome + 1 >= BIOMES.length;
      this.afterLoot(() => this.addDoor(last ? 'exit' : 'next', ARENA.centerX));
      return;
    }
    if (this.run.room >= biome.rooms) {
      this.afterLoot(() => this.addDoor('boss', ARENA.centerX));
      return;
    }
    if (this.trial?.state === 'running') {
      this.trial.state = 'won';
      this.spawnChest();
    }
    // Pas d'Étincelle s'il n'y a aucun don à améliorer.
    const exclude: RewardKind[] = upgradableBoons(this.run.boons).length > 0 ? [] : ['spark'];
    // Salles spéciales : la lumière revient ; toutes offrent des éclats en plus (2 portes, comme partout).
    if (this.darkness) {
      this.tweens.add({ targets: this.darkness, alpha: 0, duration: 600 });
    }
    if (this.challenge) {
      this.run.shards += CHALLENGE_SHARDS;
      this.juice.damageNumber(this.player.x, this.player.y - 14, CHALLENGE_SHARDS, '#7fe7ff');
    }
    const doors = rollDoors(this.rng, DOOR_COUNT, biome.pantheon, exclude);
    // Regard d'Amon : le défi se juge maintenant ; la faveur royale vient après le butin.
    const favor = this.amon !== null && amonRoomCleared(this.amon) === 'won';
    this.refreshAmon();
    if (favor) this.run.amonBiome = this.run.biome;
    this.afterLoot(() => (favor ? this.openRoyalFavor(doors) : this.placeDoors(doors)));
  }

  // ---------- Butin de fin de salle ----------

  /**
   * La récompense de la porte choisie tombe à la fin de la salle ; les portes suivantes
   * n'apparaissent qu'une fois ce butin ramassé (et le don choisi, s'il y en a un).
   */
  private afterLoot(then: () => void): void {
    const reward = this.run.roomReward;
    if (!reward) {
      then();
      return;
    }
    const x = ARENA.centerX;
    const y = ARENA.centerY + 44;
    const god = reward.god ? GODS[reward.god] : undefined;
    const color = god?.color ?? REWARD_STYLE[reward.kind].color;
    const glow = this.add
      .image(x, y, 'glow')
      .setTint(color)
      .setAlpha(0.7)
      .setScale(1.3)
      .setBlendMode('ADD')
      .setDepth(3);
    const ring = this.add.graphics().setDepth(4);
    ring.fillStyle(0x07060d, 0.9).fillCircle(x, y, 14);
    ring.lineStyle(2, color, 1).strokeCircle(x, y, 14);
    const icon = this.add.graphics().setDepth(5);
    if (god) drawGodIcon(icon, god, x, y, 8);
    else drawRewardIcon(icon, reward.kind, x, y, color);
    this.tweens.add({ targets: glow, scale: 1.7, duration: 700, yoyo: true, repeat: -1 });
    this.tweens.add({ targets: [ring, icon], y: -3, duration: 700, yoyo: true, repeat: -1 });
    this.juice.burst(x, y, color, 18);
    sfx.chest();
    this.loot = { x, y, parts: [glow, ring, icon], then };
  }

  private updateLoot(): void {
    const l = this.loot;
    if (!l || this.leaving || this.choosing) return;
    if (Math.hypot(this.player.x - l.x, this.player.y - l.y) > 22) return;
    this.loot = null;
    l.parts.forEach((p) => p.destroy());
    this.juice.burst(l.x, l.y, 0xffe9d6, 16);
    const reward = takeRoomReward(this.run);
    if (reward?.kind === 'boon' && this.run.pendingBoon) {
      this.choosing = true;
      this.afterChoice = l.then;
      this.offerBoon();
      return;
    }
    if (reward?.kind === 'spark' && this.run.pendingSpark) {
      this.choosing = true;
      this.afterChoice = l.then;
      this.offerSpark();
      return;
    }
    if (reward) this.showRewardGain(reward.kind);
    l.then();
  }

  /** Ce que rapporte un butin simple (éclats, XP, pièces, affûtage), affiché au-dessus d'Ash. */
  private showRewardGain(kind: RewardKind): void {
    sfx.boonTaken();
    const label = t(REWARD_STYLE[kind].label);
    this.juice.label(this.player.x, this.player.y - 20, label, '#ffe9d6');
  }

  /** Après le choix d'un don (ou d'une Étincelle) ramassé en fin de salle : les portes. */
  private runAfterChoice(): void {
    const next = this.afterChoice;
    this.afterChoice = null;
    next?.();
  }

  private placeDoors(doors: readonly DoorReward[]): void {
    const [a, b, c] = doors;
    if (a) this.addDoor(a, ARENA.centerX - 120);
    if (b) this.addDoor(b, ARENA.centerX + 120);
    if (c) this.addDoor(c, ARENA.centerX);
  }

  // ---------- Regard d'Amon ----------

  /** Amon observe certaines salles de combat (une faveur par monde, sans coût). */
  private startAmon(biome: BiomeDef): void {
    const challenge = this.kind === 'combat' ? amonChallengeFor(this.run, biome) : null;
    this.amon = challenge ? newAmonWatch(challenge) : null;
    if (!this.amon) return;
    // La première fois dans ce monde : la règle en grand ; ensuite, un simple rappel.
    const first = amonStartRoom(this.run.seed, this.run.biome, biome) === this.run.room;
    this.time.delayedCall(900, () => {
      this.refreshAmon();
      if (first) this.ui.showBanner(t('amon.watch'), t('amon.rule'));
      else this.ui.toast(t('amon.watch'));
    });
  }

  private amonText(): string {
    const w = this.amon;
    if (!w) return '';
    if (w.state === 'won') return t('amon.won');
    if (w.state === 'failed') return t('amon.failed');
    return t(`amon.challenge.${w.challenge}` as TextKey, {
      kills: w.challenge === 'power' ? AMON_POWER_KILLS : AMON_FRENZY_KILLS,
      seconds: AMON_FRENZY_MS / 1000,
      n: w.powerKills,
    });
  }

  private refreshAmon(): void {
    this.ui.showAmon(this.amon?.state ?? null, this.amonText());
  }

  private onAmonEvent(e: AmonEvent): void {
    const w = this.amon;
    if (!w || w.state !== 'watching') return;
    if (!amonEvent(w, e)) return;
    this.refreshAmon();
    // amonEvent vient de changer l'état : on le relit.
    if ((w.state as AmonWatch['state']) === 'won') {
      sfx.spark();
      this.juice.burst(this.player.x, this.player.y, AMON_COLOR, 18);
    }
  }

  /** Faveur royale : Ash choisit le dieu qui l'attend derrière la porte de don. */
  private openRoyalFavor(doors: readonly DoorReward[]): void {
    const data: AmonSceneData = {
      gods: amonGods(this.run.seed, this.run.biome, this.run.room),
      onPick: (god) => {
        this.choosing = false;
        markScene('run');
        this.placeDoors(applyRoyalFavor(doors, god));
      },
    };
    this.choosing = true;
    sfx.spark();
    this.time.delayedCall(700, () => {
      this.scene.launch('amon', data);
      this.scene.bringToTop('amon');
    });
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
    if (this.doors.length === 1) this.tutorialEvent({ type: 'roomCleared' });
  }

  private checkDoors(): void {
    if (!this.roomCleared || this.leaving) return;
    for (const d of this.doors) {
      if (Math.hypot(this.player.x - d.x, this.player.y - d.y) > 24) continue;
      // Coffre oublié : on le ramasse en sortant (rien n'est perdu).
      this.takeChest();
      this.leaving = true;
      sfx.door();
      this.tutorialEvent({ type: 'doorTaken' });
      if (d.reward === 'exit') {
        this.endRun('cleared');
        return;
      }
      if (d.reward === 'next' && this.kind === 'boss') afterBoss(this.run, BIOMES.length);
      else if (d.reward === 'next' || d.reward === 'boss') this.run.room += 1;
      else {
        // La récompense tombera à la fin de la prochaine salle.
        this.run.roomReward = d.reward;
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
    // Le guide reprend à la run suivante s'il n'est pas fini.
    this.ui.showHint('', null);
    const summary = summarize(this.run, outcome, killedBy);
    telemetry.runEnd(outcome === 'death' ? killedBy : undefined);
    // La progression est créditée tout de suite : rien n'est perdu si l'app se ferme pendant le fondu.
    finishRun(session.save, summary);
    session.commit();
    this.time.delayedCall(outcome === 'death' ? 700 : 200, () => {
      this.cameras.main.fadeOut(700, 7, 6, 13);
      // 10e victoire : la vraie fin avant de revenir dans la Cage.
      const ending = outcome === 'cleared' && session.save.meta.clears === TRUE_ENDING_VICTORIES;
      this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () =>
        this.scene.start(ending ? 'ending' : 'hub', { summary }),
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
    case 'spark': // flamme du Phénix surmontée d'une flèche vers le haut
      g.fillTriangle(x - 6, y + 8, x + 6, y + 8, x, y - 2).fillCircle(x, y + 5, 5);
      g.lineBetween(x, y - 4, x, y - 10).lineBetween(x - 4, y - 6, x, y - 10);
      g.lineBetween(x + 4, y - 6, x, y - 10);
      break;
    case 'boss': // œil (forme propre à la porte du boss)
      g.strokeEllipse(x, y, 20, 11).fillCircle(x, y, 3.5);
      break;
  }
}
