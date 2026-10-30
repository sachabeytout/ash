import Phaser from 'phaser';
import type { RunSummary } from '../../core/run/state';
import { t, type TextKey } from '../../i18n';
import { music } from '../audio/music';
import { sfx } from '../audio/sfx';
import { COLORS, FONT_FAMILY, GAME_HEIGHT, GAME_WIDTH } from '../theme';
import { markScene } from './markScene';
import { viewSize } from '../view';

/** Vraie fin (10e victoire) : le ciel s'éclaire, quelques lignes, puis retour dans la Cage. */
export class EndingScene extends Phaser.Scene {
  private summary: RunSummary | undefined;
  private canLeave = false;

  constructor() {
    super('ending');
  }

  init(data: { summary?: RunSummary }): void {
    this.summary = data.summary;
    this.canLeave = false;
  }

  create(): void {
    const cam = this.cameras.main;
    cam.centerOn(GAME_WIDTH / 2, GAME_HEIGHT / 2);
    const cx = GAME_WIDTH / 2;
    const w = viewSize(this).width + 200;
    // Le ciel passe de la nuit à l'aube.
    const sky = this.add.rectangle(cx, GAME_HEIGHT / 2, w, GAME_HEIGHT + 200, 0x07060d);
    // Dégradé d'aube : bandes de plus en plus chaudes vers le bas (pas de bord net).
    const dawn = Array.from({ length: 8 }, (_, i) =>
      this.add
        .rectangle(cx, GAME_HEIGHT / 2 + i * 26, w, GAME_HEIGHT, 0xff9a3a)
        .setOrigin(0.5, 0)
        .setAlpha(0)
        .setBlendMode('ADD'),
    );
    const sun = this.add
      .image(cx, GAME_HEIGHT + 40, 'glow')
      .setTint(0xffd27a)
      .setScale(6)
      .setAlpha(0.9)
      .setBlendMode('ADD');
    this.tweens.add({ targets: dawn, alpha: 0.07, duration: 6000 });
    this.tweens.add({ targets: sun, y: GAME_HEIGHT - 40, duration: 7000, ease: 'Sine.Out' });
    this.tweens.add({ targets: sky, fillColor: 0x2a1830, duration: 6000 });

    const title = this.add
      .text(cx, 70, t('ending.title'), {
        fontFamily: FONT_FAMILY,
        fontSize: '28px',
        fontStyle: 'bold',
        color: '#fff0c0',
        stroke: '#07060d',
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setAlpha(0);
    this.tweens.add({ targets: title, alpha: 1, duration: 1500 });

    const keys: TextKey[] = ['ending.1', 'ending.2', 'ending.3', 'ending.4'];
    let y = 116;
    keys.forEach((key, i) => {
      const line = this.add
        .text(cx, y, t(key), {
          fontFamily: FONT_FAMILY,
          fontSize: '12px',
          color: COLORS.text,
          align: 'center',
          wordWrap: { width: Math.min(560, viewSize(this).width - 40) },
          stroke: '#07060d',
          strokeThickness: 3,
        })
        .setOrigin(0.5, 0)
        .setAlpha(0);
      y += line.height + 12; // les lignes longues passent à la ligne sans se chevaucher
      this.tweens.add({ targets: line, alpha: 1, delay: 1800 + i * 1800, duration: 1200 });
    });
    const hint = this.add
      .text(cx, GAME_HEIGHT - 24, t('ending.continue'), {
        fontFamily: FONT_FAMILY,
        fontSize: '10px',
        color: COLORS.textDim,
      })
      .setOrigin(0.5)
      .setAlpha(0);
    this.time.delayedCall(9500, () => {
      this.canLeave = true;
      this.tweens.add({ targets: hint, alpha: 1, duration: 600 });
    });

    const leave = () => {
      if (!this.canLeave) return;
      this.canLeave = false;
      sfx.tap();
      cam.fadeOut(800, 7, 6, 13);
      cam.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () =>
        this.scene.start('hub', { summary: this.summary }),
      );
    };
    this.input.on('pointerup', leave);
    this.input.keyboard?.on('keydown', leave);
    music.play('hub');
    sfx.boonOffer();
    cam.fadeIn(1200, 7, 6, 13);
    markScene('ending');
  }
}
