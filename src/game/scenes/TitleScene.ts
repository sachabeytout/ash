import Phaser from 'phaser';
import { t } from '../../i18n';
import { tryLandscapeFullscreen } from '../../platform/device';
import { unlockAudio } from '../audio/sfx';
import { addEmbers, drawCage, drawPyramid, drawWingedSun, ensureTextures } from '../backdrop';
import { ensureGameTextures } from '../textures';
import { COLORS, FONT_FAMILY, GAME_HEIGHT, GAME_WIDTH } from '../theme';
import { markScene } from './markScene';
import { INTRO_ID } from './IntroScene';
import { session } from '../session';
import { viewSize } from '../view';

/** Écran titre « Toucher pour commencer » : le premier toucher débloque l'audio (exigence iOS). */
export class TitleScene extends Phaser.Scene {
  constructor() {
    super('title');
  }

  create(): void {
    ensureTextures(this);
    ensureGameTextures(this);
    const cx = GAME_WIDTH / 2;

    drawPyramid(this, 0.9);
    drawCage(this, 0.55);
    addEmbers(this);
    drawWingedSun(this.add.graphics(), cx, 62, 1);

    const title = this.add
      .text(cx, 120, t('title.name'), {
        fontFamily: FONT_FAMILY,
        fontSize: '72px',
        fontStyle: 'bold',
        color: COLORS.text,
        padding: { x: 12, y: 8 }, // laisse la place au halo de feu
      })
      .setOrigin(0.5);
    title.enableFilters();
    title.filters?.internal.addGlow(COLORS.phoenix, 4, 0, 1);

    this.add
      .text(cx, 172, t('title.subtitle'), {
        fontFamily: FONT_FAMILY,
        fontSize: '16px',
        color: COLORS.textDim,
      })
      .setOrigin(0.5);

    const prompt = this.add
      .text(cx, 270, t('title.tapToStart'), {
        fontFamily: FONT_FAMILY,
        fontSize: '18px',
        color: COLORS.text,
      })
      .setOrigin(0.5);
    this.tweens.add({
      targets: prompt,
      alpha: 0.25,
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut',
    });

    const version = this.add
      .text(0, 0, t('title.version', { version: __APP_VERSION__ }), {
        fontFamily: FONT_FAMILY,
        fontSize: '10px',
        color: COLORS.textDim,
      })
      .setOrigin(1, 1);

    // L'écran peut être plus large que 640 px (mode EXPAND) : on garde la scène centrée.
    const layout = () => {
      this.cameras.main.centerOn(GAME_WIDTH / 2, GAME_HEIGHT / 2);
      const view = viewSize(this);
      version.setPosition((GAME_WIDTH + view.width) / 2 - 6, (GAME_HEIGHT + view.height) / 2 - 4);
    };
    layout();
    this.scale.on('resize', layout);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off('resize', layout));

    this.cameras.main.fadeIn(600, 7, 6, 13);

    const start = () => {
      unlockAudio();
      void tryLandscapeFullscreen();
      this.cameras.main.fadeOut(400, 7, 6, 13);
      // Premier lancement : l'introduction (Ash naît des cendres), puis la Cage.
      const firstTime = !session.save.meta.seenDialogues.includes(INTRO_ID);
      this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () =>
        this.scene.start(firstTime ? 'intro' : 'hub'),
      );
    };
    this.input.once('pointerdown', start);
    this.input.keyboard?.once('keydown', start);

    markScene('title');
  }
}
