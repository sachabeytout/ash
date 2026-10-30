import Phaser from 'phaser';
import type { RunState } from '../../core/run/state';
import { getBiome } from '../../data/biomes';
import { getBoon } from '../../data/boons';
import { GODS } from '../../data/gods';
import { t } from '../../i18n';
import { DANGER } from '../entities/Enemy';
import type { Controls } from '../input/Controls';
import { sfx } from '../audio/sfx';
import { drawGodIcon } from '../icons';
import { TouchControls } from '../input/TouchControls';
import { FONT_FAMILY } from '../theme';

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
  private banner!: Phaser.GameObjects.Text;
  private bannerSub!: Phaser.GameObjects.Text;

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
    this.banner = this.add
      .text(0, 0, '', { ...style, fontSize: '22px', fontStyle: 'bold', strokeThickness: 4 })
      .setOrigin(0.5)
      .setAlpha(0);
    this.bannerSub = this.add
      .text(0, 0, '', { ...style, fontSize: '12px', color: '#c8bde6' })
      .setOrigin(0.5)
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

    this.layout();
    this.scale.on('resize', this.layout, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () =>
      this.scale.off('resize', this.layout, this),
    );
  }

  private layout(): void {
    const { width, height } = this.scale;
    this.hpText.setPosition(12, 29);
    this.room.setPosition(width / 2, 8);
    this.banner.setPosition(width / 2, height * 0.32);
    this.bannerSub.setPosition(width / 2, height * 0.32 + 22);
    this.shards.setPosition(width - 44, 8);
    this.pauseButton.setPosition(width - 20, 20);
    this.hurtOverlay.setSize(width, height);
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
    const rooms = getBiome(run.biome).rooms;
    this.room.setText(
      run.room > rooms ? t('hud.boss') : t('hud.room', { room: run.room, total: rooms }),
    );
    this.shards.setText(t('hud.shards', { count: run.shards }));
    this.showBoons(run);
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

  /** Barre de vie du boss, en haut au centre (marques à 50 % = changement de phase). */
  showBoss(ratio: number, phase: number): void {
    const { width } = this.scale;
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

  flashHurt(): void {
    if (!this.hurtOverlay) return;
    this.hurtOverlay.setAlpha(0.28);
    this.tweens.add({ targets: this.hurtOverlay, alpha: 0, duration: 260 });
  }
}
