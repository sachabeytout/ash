import Phaser from 'phaser';
import { roomKind, type RunState } from '../../core/run/state';
import { BOSSES } from '../../data/bosses';
import { getBiome } from '../../data/biomes';
import { getBoon } from '../../data/boons';
import { GODS } from '../../data/gods';
import { t, type TextKey } from '../../i18n';
import { DANGER } from '../entities/Enemy';
import type { Action, Controls } from '../input/Controls';
import { sfx } from '../audio/sfx';
import { telemetry } from '../telemetry';
import { settings } from '../../core/settings';
import { AMON_COLOR, drawAmonEye, drawGodIcon } from '../icons';
import { TouchControls } from '../input/TouchControls';
import { FONT_FAMILY } from '../theme';
import { viewSize } from '../view';

const INDICATOR_POOL = 24;

export interface Indicator {
  x: number;
  y: number;
  angle: number;
  /** Ennemi sur le point d'apparaître (marqueur au sol). */
  spawn: boolean;
}

/**
 * Calque d'interface au-dessus de la salle (non zoomé) : vie, salle, éclats, commandes tactiles.
 * La salle de combat (RunScene) le lance et lui envoie les infos à afficher.
 */
export class UiScene extends Phaser.Scene {
  private controls!: Controls;
  private hpBar!: Phaser.GameObjects.Graphics;
  private hpText!: Phaser.GameObjects.Text;
  private room!: Phaser.GameObjects.Text;
  private shards!: Phaser.GameObjects.Text;
  private hurtOverlay!: Phaser.GameObjects.Rectangle;
  private boonIcons!: Phaser.GameObjects.Graphics;
  private boonKey = '';
  private touch!: TouchControls;
  private superWasReady = false;
  private indicators: Phaser.GameObjects.Graphics[] = [];
  private pauseButton!: Phaser.GameObjects.Container;
  private bossBar!: Phaser.GameObjects.Graphics;
  private fps!: Phaser.GameObjects.Text;
  private banner!: Phaser.GameObjects.Text;
  private trial!: Phaser.GameObjects.Text;
  private toastText!: Phaser.GameObjects.Text;
  private trialKey = '';
  private amon!: Phaser.GameObjects.Container;
  private amonEye!: Phaser.GameObjects.Graphics;
  private amonText!: Phaser.GameObjects.Text;
  private amonKey = '';
  private bannerSub!: Phaser.GameObjects.Text;
  private hint!: Phaser.GameObjects.Container;
  private hintBox!: Phaser.GameObjects.Graphics;
  private hintText!: Phaser.GameObjects.Text;
  private hintSkip!: Phaser.GameObjects.Text;
  private hintKey = '';

  constructor() {
    super('ui');
  }

  init(data: { controls: Controls }): void {
    this.controls = data.controls;
  }

  create(): void {
    const style = {
      fontFamily: FONT_FAMILY,
      fontSize: '11px',
      color: '#ffe9d6',
      stroke: '#07060d',
      strokeThickness: 3,
    };
    this.hpBar = this.add.graphics();
    this.bossBar = this.add.graphics();
    this.fps = this.add.text(12, 72, '', { ...style, fontSize: '10px' }).setVisible(false);
    this.banner = this.add
      .text(0, 0, '', { ...style, fontSize: '22px', fontStyle: 'bold', strokeThickness: 4 })
      .setOrigin(0.5)
      .setAlpha(0);
    this.bannerSub = this.add
      .text(0, 0, '', { ...style, fontSize: '12px', color: '#c8bde6' })
      .setOrigin(0.5)
      .setAlpha(0);
    this.trial = this.add
      .text(0, 0, '', { ...style, color: '#ffe08a' })
      .setOrigin(0.5, 0)
      .setVisible(false);
    this.trialKey = '';
    // Regard d'Amon : œil doré + défi, sous le titre de la salle.
    this.amonEye = this.add.graphics();
    this.amonText = this.add
      .text(10, 0, '', { ...style, fontSize: '10px', color: '#ffd36b' })
      .setOrigin(0, 0.5);
    this.amon = this.add.container(0, 0, [this.amonEye, this.amonText]).setVisible(false);
    this.amonKey = '';
    this.toastText = this.add
      .text(0, 0, '', { ...style, fontSize: '10px', color: '#c8bde6' })
      .setOrigin(0.5, 0)
      .setAlpha(0);
    this.boonIcons = this.add.graphics();
    this.boonKey = '';
    this.hpText = this.add.text(0, 0, '', style);
    this.room = this.add.text(0, 0, '', style).setOrigin(0.5, 0);
    this.shards = this.add.text(0, 0, '', style).setOrigin(1, 0);
    this.hurtOverlay = this.add
      .rectangle(0, 0, 10, 10, DANGER)
      .setOrigin(0)
      .setAlpha(0)
      .setBlendMode('ADD');
    // Flèches au bord de l'écran vers les ennemis hors champ (pool, rien n'est créé en combat).
    this.indicators = Array.from({ length: INDICATOR_POOL }, () => {
      const g = this.add.graphics().setVisible(false);
      g.fillStyle(0xd8e2ff, 0.9).fillTriangle(9, 0, -6, -8, -6, 8);
      g.lineStyle(1.5, 0x07060d, 0.9).strokeTriangle(9, 0, -6, -8, -6, 8);
      return g;
    });
    this.touch = new TouchControls(this, this.controls);
    // Bouton pause (deux barres), toujours visible en haut à droite.
    const pg = this.add.graphics();
    pg.fillStyle(0x07060d, 0.6).fillCircle(0, 0, 13);
    pg.lineStyle(1.5, 0xffe9d6, 0.7).strokeCircle(0, 0, 13);
    pg.fillStyle(0xffe9d6, 0.9).fillRect(-5, -6, 3, 12).fillRect(2, -6, 3, 12);
    const pz = this.add.zone(0, 0, 40, 40).setInteractive({ useHandCursor: true });
    pz.on('pointerdown', () => this.controls.onPause());
    this.pauseButton = this.add.container(0, 0, [pg, pz]).setDepth(1001);
    this.superWasReady = false;

    // Bulle du premier essai guidé (sous le titre de la salle), avec « Passer l'aide ».
    this.hintBox = this.add.graphics();
    this.hintText = this.add
      .text(0, 0, '', {
        fontFamily: FONT_FAMILY,
        fontSize: '11px',
        color: '#ffe9d6',
        align: 'center',
        lineSpacing: 2,
      })
      .setOrigin(0.5, 0);
    this.hintSkip = this.add
      .text(0, 0, t('tutorial.skip'), {
        fontFamily: FONT_FAMILY,
        fontSize: '9px',
        color: '#c8bde6',
      })
      .setOrigin(1, 0)
      .setInteractive({ useHandCursor: true });
    this.hintSkip.on('pointerup', () => this.events.emit('tutorial-skip'));
    this.hint = this.add
      .container(0, 0, [this.hintBox, this.hintText, this.hintSkip])
      .setDepth(1002)
      .setVisible(false);
    this.hintKey = '';

    this.layout();
    this.scale.on('resize', this.layout, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () =>
      this.scale.off('resize', this.layout, this),
    );
  }

  private layout(): void {
    const { width, height } = viewSize(this);
    this.hpText.setPosition(12, 29);
    this.room.setPosition(width / 2, 8);
    this.trial.setPosition(width / 2, 24);
    this.placeAmon();
    this.toastText.setPosition(width / 2, 42);
    this.banner.setPosition(width / 2, height * 0.32);
    this.bannerSub.setPosition(width / 2, height * 0.32 + 22);
    this.shards.setPosition(width - 44, 8);
    this.pauseButton.setPosition(width - 20, 20);
    this.hurtOverlay.setSize(width, height);
    this.hint.setPosition(width / 2, 50);
  }

  /** Bulle d'aide du premier essai (texte vide : cachée). `focus` : commande tactile à montrer. */
  showHint(text: string, focus: Action | 'move' | null, low = false): void {
    const key = `${text}|${focus ?? ''}|${low}`;
    if (key === this.hintKey) return;
    this.hintKey = key;
    this.touch.highlight(text ? focus : null);
    if (!text) {
      this.hint.setVisible(false);
      return;
    }
    const maxW = Math.min(380, viewSize(this).width - 40);
    this.hintText
      .setWordWrapWidth(maxW - 24)
      .setText(text)
      .setPosition(0, 8);
    const w = Math.max(200, Math.min(maxW, this.hintText.width + 28));
    const h = this.hintText.height + 30;
    this.hintSkip.setPosition(w / 2 - 8, h - 15);
    this.hintBox
      .clear()
      .fillStyle(0x07060d, 0.82)
      .fillRoundedRect(-w / 2, 0, w, h, 8)
      .lineStyle(1.5, 0xffb02e, 0.9)
      .strokeRoundedRect(-w / 2, 0, w, h, 8);
    // En bas (au-dessus des commandes) quand il faut voir le haut de la salle (portes).
    const { height } = viewSize(this);
    this.hint.setY(low ? height * 0.6 : 50);
    this.hint.setVisible(true).setAlpha(0);
    this.tweens.killTweensOf(this.hint);
    this.tweens.add({ targets: this.hint, alpha: 1, duration: 220 });
  }

  /** Le joueur joue-t-il au tactile (commandes à l'écran) ? */
  get touchActive(): boolean {
    return this.touch.visible;
  }

  showRun(run: RunState): void {
    if (!this.hpBar) return;
    const { hp, maxHp } = run;
    const w = 96;
    const g = this.hpBar.clear();
    g.fillStyle(0x07060d, 0.8).fillRect(10, 8, w + 4, 12);
    g.fillStyle(0x3a1d14, 1).fillRect(12, 10, w, 8);
    g.fillStyle(0xff7a2a, 1).fillRect(12, 10, Math.round((w * hp) / maxHp), 8);
    g.lineStyle(1, 0xffe9d6, 0.6).strokeRect(10, 8, w + 4, 12);
    this.hpText.setText(`${hp} / ${maxHp}`);
    // Jauge de Super (étoile du bouton tactile + barre dorée sous la vie).
    const ready = run.superGauge >= 1;
    const pulse = ready ? 0.6 + 0.4 * Math.sin(this.time.now / 120) : 1;
    g.fillStyle(0x07060d, 0.8).fillRect(10, 22, w + 4, 6);
    g.fillStyle(0xffe08a, ready ? pulse : 0.75).fillRect(12, 23, Math.round(w * run.superGauge), 4);
    if (ready && !this.superWasReady) sfx.superReady();
    this.superWasReady = ready;
    this.touch.setSuperGauge(run.superGauge);
    const biome = getBiome(run.biome);
    const kind = roomKind(run, biome);
    this.room.setText(
      kind === 'boss'
        ? t(BOSSES[biome.boss].titleKey as TextKey)
        : kind === 'shop'
          ? t('hud.shop')
          : t('hud.room', {
              biome: t(biome.nameKey as TextKey),
              room: run.room,
              total: biome.rooms,
            }),
    );
    this.shards.setText(t('hud.shards', { count: run.shards }));
    this.showBoons(run);
    this.fps.setVisible(telemetry.showFps);
    if (telemetry.showFps) this.fps.setText(`${Math.round(this.game.loop.actualFps)} FPS`);
  }

  /** Dons obtenus : une petite icône de dieu par don (redessinée seulement quand la liste change). */
  private showBoons(run: RunState): void {
    const key = run.boons.map((b) => b.id).join(',');
    if (key === this.boonKey) return;
    this.boonKey = key;
    const g = this.boonIcons.clear();
    run.boons.forEach((owned, i) => {
      const def = getBoon(owned.id);
      if (!def) return;
      const x = 18 + i * 18;
      const y = 56;
      g.fillStyle(0x07060d, 0.75).fillCircle(x, y, 8);
      const gods = def.gods.map((id) => GODS[id]);
      g.lineStyle(1, gods[0]?.color ?? 0xffffff, 0.8).strokeCircle(x, y, 8);
      const main = gods[0];
      if (main) drawGodIcon(g, main, x, y, 5);
    });
  }

  /** Affiche les `count` premiers indicateurs (coordonnées d'écran). Une apparition à venir est creuse. */
  showIndicators(list: readonly Indicator[], count: number): void {
    const pulse = 0.65 + 0.35 * Math.sin(this.time.now / 140);
    this.indicators.forEach((g, i) => {
      const ind = list[i];
      if (i >= count || !ind) {
        g.setVisible(false);
        return;
      }
      g.setVisible(true)
        .setPosition(ind.x, ind.y)
        .setRotation(ind.angle)
        .setAlpha(ind.spawn ? 0.45 : pulse)
        .setScale(ind.spawn ? 0.8 : 1);
    });
  }

  /** Chrono de l'épreuve de Vesper, sous le nom de la salle (doré : ce n'est pas un danger). */
  showTrial(
    state: 'waiting' | 'running' | 'won' | 'failed' | null,
    leftMs: number,
    label: 'trial.timer' | 'survival.timer' = 'trial.timer',
  ): void {
    if (!this.trial) return;
    const seconds = Math.max(0, Math.ceil(leftMs / 1000));
    const key = `${state}:${seconds}:${label}`;
    if (key === this.trialKey) return;
    this.trialKey = key;
    if (state === null || state === 'failed') {
      this.trial.setVisible(false);
      return;
    }
    const time = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
    this.trial
      .setVisible(true)
      .setText(state === 'won' ? t('trial.won') : t(label, { time }))
      .setScale(state === 'running' && seconds <= 10 ? 1.15 : 1);
  }

  /** Défi d'Amon en cours (null : caché). Un défi raté ferme l'œil puis disparaît. */
  showAmon(state: 'watching' | 'won' | 'failed' | null, text: string): void {
    if (!this.amon) return;
    const key = `${state}:${text}`;
    if (key === this.amonKey) return;
    this.amonKey = key;
    this.tweens.killTweensOf(this.amon);
    if (state === null) {
      this.amon.setVisible(false);
      return;
    }
    this.amonEye.clear();
    drawAmonEye(this.amonEye, 0, 0, 6, AMON_COLOR, state !== 'failed');
    this.amonText.setText(text).setColor(state === 'failed' ? '#9a8fb5' : '#ffd36b');
    this.amon.setVisible(true).setAlpha(1);
    this.placeAmon();
    if (state === 'won') {
      this.amon.setScale(1.15);
      this.tweens.add({ targets: this.amon, scale: 1, duration: 300 });
    }
    if (state === 'failed')
      this.tweens.add({ targets: this.amon, alpha: 0, delay: 2600, duration: 600 });
  }

  /** Centre l'œil et le texte ensemble sous le titre de la salle. */
  private placeAmon(): void {
    if (!this.amon) return;
    const { width } = viewSize(this);
    this.amon.setPosition(width / 2 - (this.amonText.width + 10) / 2 + 6, 30);
  }

  /** Barre de vie du boss, en haut au centre (marques à 50 % = changement de phase). */
  showBoss(ratio: number, phase: number): void {
    const { width } = viewSize(this);
    const w = Math.min(260, width * 0.4);
    const x = width / 2 - w / 2;
    const g = this.bossBar.clear();
    if (ratio <= 0) return;
    g.fillStyle(0x07060d, 0.85).fillRect(x - 2, 24, w + 4, 9);
    g.fillStyle(0x2a2048, 1).fillRect(x, 26, w, 5);
    g.fillStyle(phase === 2 ? 0xe08cff : 0xb8a8ff, 1).fillRect(x, 26, Math.round(w * ratio), 5);
    g.fillStyle(0xffe9d6, 0.9).fillRect(x + w / 2 - 0.5, 24, 1, 9);
  }

  /** Grand titre temporaire (arrivée du boss, phase 2, victoire). */
  showBanner(title: string, sub: string): void {
    this.banner.setText(title);
    this.bannerSub.setText(sub);
    for (const obj of [this.banner, this.bannerSub]) {
      this.tweens.killTweensOf(obj);
      obj.setAlpha(0);
      this.tweens.add({ targets: obj, alpha: 1, duration: 250, hold: 1600, yoyo: true });
    }
  }

  /**
   * Présentation d'un boss : bandes noires (effet cinéma), nom en grand avec un trait de couleur
   * qui s'étire, sous-titre. Dure `ms`, puis tout s'efface.
   */
  bossIntro(name: string, sub: string, color: number, ms: number): void {
    const { width, height } = viewSize(this);
    const barH = Math.round(height * 0.11);
    const top = this.add.rectangle(0, -barH, width, barH, 0x000000, 1).setOrigin(0).setDepth(1003);
    const bottom = this.add
      .rectangle(0, height, width, barH, 0x000000, 1)
      .setOrigin(0)
      .setDepth(1003);
    const y = height * 0.66;
    const title = this.add
      .text(width / 2, y, name, {
        fontFamily: FONT_FAMILY,
        fontSize: '26px',
        fontStyle: 'bold',
        color: '#ffe9d6',
        stroke: '#07060d',
        strokeThickness: 5,
      })
      .setOrigin(0.5, 1)
      .setDepth(1004)
      .setAlpha(0)
      .setScale(1.25);
    const line = this.add
      .rectangle(width / 2, y + 5, Math.min(360, width - 60), 2, color, 1)
      .setDepth(1004)
      .setScale(0, 1);
    const subtitle = this.add
      .text(width / 2, y + 12, sub, {
        fontFamily: FONT_FAMILY,
        fontSize: '12px',
        color: '#c8bde6',
        stroke: '#07060d',
        strokeThickness: 3,
      })
      .setOrigin(0.5, 0)
      .setDepth(1004)
      .setAlpha(0);
    this.tweens.add({ targets: top, y: 0, duration: 260, ease: 'Cubic.Out' });
    this.tweens.add({ targets: bottom, y: height - barH, duration: 260, ease: 'Cubic.Out' });
    this.tweens.add({
      targets: title,
      alpha: 1,
      scale: 1,
      duration: 380,
      delay: 180,
      ease: 'Back.Out',
    });
    this.tweens.add({ targets: line, scaleX: 1, duration: 420, delay: 300, ease: 'Cubic.Out' });
    this.tweens.add({ targets: subtitle, alpha: 1, duration: 300, delay: 520 });
    this.time.delayedCall(ms - 320, () => {
      this.tweens.add({ targets: [title, line, subtitle], alpha: 0, duration: 300 });
      this.tweens.add({ targets: top, y: -barH, duration: 320, ease: 'Cubic.In' });
      this.tweens.add({
        targets: bottom,
        y: height,
        duration: 320,
        ease: 'Cubic.In',
        onComplete: () => [top, bottom, title, line, subtitle].forEach((o) => o.destroy()),
      });
    });
  }

  /** Petit message discret sous le titre de la salle (quelques secondes). */
  toast(text: string): void {
    this.toastText.setText(text);
    this.tweens.killTweensOf(this.toastText);
    this.toastText.setAlpha(0);
    this.tweens.add({ targets: this.toastText, alpha: 1, duration: 250, hold: 2600, yoyo: true });
  }

  flashHurt(): void {
    if (!this.hurtOverlay) return;
    this.hurtOverlay.setAlpha(settings.reduceFlashes ? 0.1 : 0.28);
    this.tweens.add({ targets: this.hurtOverlay, alpha: 0, duration: 260 });
  }
}
