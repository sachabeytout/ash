import Phaser from 'phaser';
import type { RunState } from '../../core/run/state';
import { getBiome } from '../../data/biomes';
import { t } from '../../i18n';
import { DANGER } from '../entities/Enemy';
import type { Controls } from '../input/Controls';
import { TouchControls } from '../input/TouchControls';
import { FONT_FAMILY } from '../theme';

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
    this.hpText = this.add.text(0, 0, '', style);
    this.room = this.add.text(0, 0, '', style).setOrigin(0.5, 0);
    this.shards = this.add.text(0, 0, '', style).setOrigin(1, 0);
    this.hurtOverlay = this.add
      .rectangle(0, 0, 10, 10, DANGER)
      .setOrigin(0)
      .setAlpha(0)
      .setBlendMode('ADD');
    new TouchControls(this, this.controls);

    this.layout();
    this.scale.on('resize', this.layout, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () =>
      this.scale.off('resize', this.layout, this),
    );
  }

  private layout(): void {
    const { width, height } = this.scale;
    this.hpText.setPosition(12, 22);
    this.room.setPosition(width / 2, 8);
    this.shards.setPosition(width - 12, 8);
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
    this.room.setText(t('hud.room', { room: run.room, total: getBiome(run.biome).rooms }));
    this.shards.setText(t('hud.shards', { count: run.shards }));
  }

  flashHurt(): void {
    if (!this.hurtOverlay) return;
    this.hurtOverlay.setAlpha(0.28);
    this.tweens.add({ targets: this.hurtOverlay, alpha: 0, duration: 260 });
  }
}
