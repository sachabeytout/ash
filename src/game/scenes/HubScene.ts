import Phaser from 'phaser';
import { randomSeed } from '../../core/rng';
import { newRun, type RunSummary } from '../../core/run/state';
import { GOD_IDS } from '../../data/gods';
import { PLAYER } from '../../data/player';
import { WEAPONS, type WeaponId } from '../../data/weapons';
import { t, type TextKey } from '../../i18n';
import { sfx } from '../audio/sfx';
import { addEmbers, drawCage, ensureTextures } from '../backdrop';
import { ensureGameTextures } from '../textures';
import { COLORS, FONT_FAMILY, GAME_HEIGHT, GAME_WIDTH } from '../theme';
import { markScene } from './markScene';

/** Progression conservée entre les runs (en mémoire pour l'instant ; sauvegarde à venir). */
interface Meta {
  xp: number;
  weaponParts: number;
  deaths: number;
  clears: number;
}

/** La Cage (hub) : résumé de la dernière run, choix de l'arme, départ. */
export class HubScene extends Phaser.Scene {
  private summary: RunSummary | undefined;
  private starting = false;

  constructor() {
    super('hub');
  }

  init(data: { summary?: RunSummary }): void {
    this.summary = data.summary;
    this.starting = false;
  }

  create(): void {
    ensureTextures(this);
    ensureGameTextures(this);
    const cx = GAME_WIDTH / 2;
    const meta = this.updateMeta();

    this.cameras.main.centerOn(GAME_WIDTH / 2, GAME_HEIGHT / 2);
    const recenter = () => this.cameras.main.centerOn(GAME_WIDTH / 2, GAME_HEIGHT / 2);
    this.scale.on('resize', recenter);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off('resize', recenter));

    drawCage(this, 0.7);
    addEmbers(this);

    const ash = this.add.image(cx, 168, 'ash').setScale(2);
    const glow = this.add
      .image(cx, 168, 'glow')
      .setTint(COLORS.phoenix)
      .setAlpha(0.6)
      .setScale(2.4)
      .setBlendMode('ADD');
    this.tweens.add({
      targets: glow,
      scale: 2.8,
      alpha: 0.4,
      duration: 1100,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut',
    });
    this.tweens.add({
      targets: ash,
      y: 164,
      duration: 1400,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut',
    });

    const style = {
      fontFamily: FONT_FAMILY,
      color: COLORS.text,
      stroke: '#07060d',
      strokeThickness: 3,
    };
    this.add.text(cx, 54, t('hub.name'), { ...style, fontSize: '26px' }).setOrigin(0.5);

    const lines: string[] = [];
    if (this.summary) {
      const minutes = Math.floor(this.summary.elapsedMs / 60000);
      const seconds = Math.floor((this.summary.elapsedMs % 60000) / 1000);
      lines.push(
        this.summary.outcome === 'death'
          ? t('hub.lastDeath', { room: this.summary.room, killer: this.summary.killedBy ?? '?' })
          : t('hub.lastClear'),
        t('hub.lastStats', {
          minutes,
          seconds,
          xp: this.summary.xp,
          parts: this.summary.weaponParts,
        }),
      );
    } else {
      lines.push(t('hub.placeholder'));
    }
    lines.push(
      t('hub.totals', {
        xp: meta.xp,
        parts: meta.weaponParts,
        rebirths: t('hub.rebirths', { count: meta.deaths }),
      }),
    );
    this.add
      .text(cx, 84, lines.join('\n'), {
        ...style,
        fontSize: '11px',
        color: COLORS.textDim,
        align: 'center',
        lineSpacing: 4,
      })
      .setOrigin(0.5, 0);

    this.add.text(cx, 222, t('hub.chooseWeapon'), { ...style, fontSize: '12px' }).setOrigin(0.5);
    const ids: WeaponId[] = ['katana', 'twinBlades'];
    ids.forEach((id, i) => this.makeButton(cx + (i === 0 ? -95 : 95), 262, id, i + 1));

    this.input.keyboard?.on('keydown', (e: KeyboardEvent) => {
      if (e.code === 'Digit1' || e.code === 'Enter' || e.code === 'Space') this.start('katana');
      if (e.code === 'Digit2') this.start('twinBlades');
    });

    this.cameras.main.fadeIn(500, 7, 6, 13);
    markScene('hub');
  }

  override update(): void {
    const pad = navigator.getGamepads?.().find((p) => p?.connected);
    if (pad?.buttons[0]?.pressed) this.start('katana');
    if (pad?.buttons[2]?.pressed) this.start('twinBlades');
  }

  private updateMeta(): Meta {
    const meta: Meta = this.registry.get('meta') ?? { xp: 0, weaponParts: 0, deaths: 0, clears: 0 };
    if (this.summary) {
      meta.xp += this.summary.xp;
      meta.weaponParts += this.summary.weaponParts;
      if (this.summary.outcome === 'death') meta.deaths += 1;
      else meta.clears += 1;
    }
    this.registry.set('meta', meta);
    return meta;
  }

  private makeButton(x: number, y: number, id: WeaponId, shortcut: number): void {
    const w = 160;
    const h = 46;
    const color = WEAPONS[id].color;
    const g = this.add.graphics();
    const draw = (hover: boolean) => {
      g.clear()
        .fillStyle(0x07060d, 0.9)
        .fillRoundedRect(x - w / 2, y - h / 2, w, h, 8);
      g.lineStyle(2, color, hover ? 1 : 0.7).strokeRoundedRect(x - w / 2, y - h / 2, w, h, 8);
    };
    draw(false);
    this.add
      .text(x, y - 7, t(WEAPONS[id].nameKey as TextKey), {
        fontFamily: FONT_FAMILY,
        fontSize: '14px',
        fontStyle: 'bold',
        color: COLORS.text,
      })
      .setOrigin(0.5);
    this.add
      .text(x, y + 11, t('hub.escape', { key: shortcut }), {
        fontFamily: FONT_FAMILY,
        fontSize: '10px',
        color: COLORS.textDim,
      })
      .setOrigin(0.5);
    const zone = this.add.zone(x, y, w, h).setInteractive({ useHandCursor: true });
    zone.on('pointerover', () => draw(true));
    zone.on('pointerout', () => draw(false));
    zone.on('pointerup', () => this.start(id));
  }

  private start(weapon: WeaponId): void {
    if (this.starting) return;
    this.starting = true;
    sfx.tap();
    const seed = randomSeed();
    const run = newRun(
      seed,
      weapon,
      PLAYER.maxHp,
      Date.now(),
      GOD_IDS[seed % GOD_IDS.length] ?? 'ra',
    );
    this.cameras.main.fadeOut(400, 7, 6, 13);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () =>
      this.scene.start('run', { run }),
    );
  }
}
