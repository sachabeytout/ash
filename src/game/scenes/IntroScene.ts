import Phaser from 'phaser';
import { markSeen } from '../../core/story';
import { t } from '../../i18n';
import { sfx } from '../audio/sfx';
import { ensureTextures } from '../backdrop';
import { session } from '../session';
import { ensureGameTextures } from '../textures';
import { COLORS, FONT_FAMILY, GAME_HEIGHT, GAME_WIDTH } from '../theme';
import { markScene } from './markScene';

/** Identifiant « déjà vue » de l'introduction (rangé avec les dialogues entendus). */
export const INTRO_ID = 'intro_cinematic';

/**
 * Introduction (premier lancement) : un tas de cendres, des braises, un feu qui prend ; Ash se lève
 * du feu ; la fumée monte et se rassemble pour former le logo. Un toucher (ou Échap) la passe.
 */
export class IntroScene extends Phaser.Scene {
  private done = false;

  constructor() {
    super('intro');
  }

  create(): void {
    this.done = false;
    ensureTextures(this);
    ensureGameTextures(this);
    this.makeSmokeTexture();
    const cx = GAME_WIDTH / 2;
    const groundY = 250;
    this.cameras.main.setBackgroundColor('#050409');
    this.cameras.main.centerOn(GAME_WIDTH / 2, GAME_HEIGHT / 2);

    // 1. Le tas de cendres.
    const pile = this.add.graphics();
    pile.fillStyle(0x2a2630, 1).fillEllipse(cx, groundY, 120, 26);
    pile.fillStyle(0x3a3540, 1).fillEllipse(cx - 18, groundY - 6, 60, 18);
    pile.fillStyle(0x4a4450, 1).fillEllipse(cx + 14, groundY - 8, 44, 14);
    const embers = this.add.particles(cx, groundY - 6, 'ember', {
      x: { min: -40, max: 40 },
      speedY: { min: -25, max: -8 },
      speedX: { min: -6, max: 6 },
      lifespan: 1800,
      scale: { start: 1, end: 0 },
      alpha: { start: 0.9, end: 0 },
      frequency: 260,
    });
    const glow = this.add
      .image(cx, groundY - 8, 'glow')
      .setTint(0xff7a2a)
      .setAlpha(0)
      .setScale(1.2)
      .setBlendMode('ADD');

    // 2. Les braises rougeoient, le feu prend.
    this.tweens.add({ targets: glow, alpha: 0.7, scale: 2.6, duration: 1800, delay: 900 });
    const flames = this.add.graphics().setBlendMode('ADD');
    let fire = 0;
    this.tweens.addCounter({
      from: 0,
      to: 1,
      duration: 1600,
      delay: 1400,
      onStart: () => sfx.burn(),
      onUpdate: (tw) => {
        fire = tw.getValue() ?? 0;
      },
    });
    embers.setFrequency(90);
    this.time.addEvent({
      delay: 60,
      loop: true,
      callback: () => {
        flames.clear();
        if (fire <= 0) return;
        for (let i = 0; i < 7; i++) {
          const fx = cx + (i - 3) * 9 + (Math.random() - 0.5) * 4;
          const h = (18 + Math.random() * 22) * fire * (1 - Math.abs(i - 3) / 5);
          flames.fillStyle(i % 2 ? 0xff7a2a : 0xffb02e, 0.85);
          flames.fillTriangle(fx - 6, groundY - 4, fx + 6, groundY - 4, fx, groundY - 4 - h);
        }
        flames.fillStyle(0xffe08a, 0.9).fillEllipse(cx, groundY - 8, 30 * fire, 10 * fire);
      },
    });

    // 3. Ash se lève du feu.
    const ash = this.add
      .image(cx, groundY - 6, 'ash')
      .setScale(0)
      .setAlpha(0)
      .setDepth(5);
    this.tweens.add({
      targets: ash,
      scale: 3,
      alpha: 1,
      y: groundY - 30,
      duration: 1400,
      delay: 3200,
      ease: 'Back.Out',
      onStart: () => sfx.super(),
    });

    // 4. La fumée monte et forme le logo.
    const points = this.logoPoints(t('title.name'), cx, 92);
    this.time.delayedCall(4700, () => this.smokeToLogo(points, cx, groundY - 40));
    const title = this.add
      .text(cx, 92, t('title.name'), {
        fontFamily: FONT_FAMILY,
        fontSize: '72px',
        fontStyle: 'bold',
        color: COLORS.text,
        padding: { x: 12, y: 8 },
      })
      .setOrigin(0.5)
      .setAlpha(0);
    const subtitle = this.add
      .text(cx, 146, t('title.subtitle'), {
        fontFamily: FONT_FAMILY,
        fontSize: '16px',
        color: COLORS.textDim,
      })
      .setOrigin(0.5)
      .setAlpha(0);
    this.tweens.add({ targets: title, alpha: 1, duration: 900, delay: 7000 });
    this.tweens.add({ targets: subtitle, alpha: 1, duration: 900, delay: 7600 });
    this.time.delayedCall(10200, () => this.finish());

    const skip = this.add
      .text(GAME_WIDTH - 10, GAME_HEIGHT - 8, t('intro.skip'), {
        fontFamily: FONT_FAMILY,
        fontSize: '10px',
        color: COLORS.textDim,
      })
      .setOrigin(1, 1)
      .setScrollFactor(0)
      .setAlpha(0);
    // Toujours dans le coin de l'écran, même s'il est plus large que la scène.
    skip.setPosition(this.scale.width - 8, this.scale.height - 6);
    this.tweens.add({ targets: skip, alpha: 0.8, duration: 400, delay: 800 });
    // Passer : un toucher ou une touche (après un court instant, pour ne pas passer par erreur).
    const openedAt = this.time.now;
    const skipNow = () => {
      if (this.time.now - openedAt > 700) this.finish();
    };
    this.input.on('pointerup', skipNow);
    this.input.keyboard?.on('keydown', skipNow);

    this.cameras.main.fadeIn(800, 5, 4, 9);
    markScene('intro');
  }

  /** Points du logo : on dessine le texte hors écran et on garde les pixels pleins. */
  private logoPoints(text: string, cx: number, cy: number): { x: number; y: number }[] {
    const canvas = document.createElement('canvas');
    canvas.width = 320;
    canvas.height = 100;
    const ctx = canvas.getContext('2d');
    if (!ctx) return [];
    ctx.fillStyle = '#fff';
    ctx.font = `bold 72px ${FONT_FAMILY}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 160, 50);
    const data = ctx.getImageData(0, 0, 320, 100).data;
    const points: { x: number; y: number }[] = [];
    for (let y = 0; y < 100; y += 4) {
      for (let x = 0; x < 320; x += 4) {
        if ((data[(y * 320 + x) * 4 + 3] ?? 0) > 128)
          points.push({ x: cx - 160 + x, y: cy - 50 + y });
      }
    }
    return points;
  }

  /** Des volutes de fumée partent du feu et rejoignent chacune un point du logo. */
  private smokeToLogo(points: { x: number; y: number }[], fromX: number, fromY: number): void {
    points.forEach((p, i) => {
      const puff = this.add
        .image(fromX + (Math.random() - 0.5) * 24, fromY, 'smoke')
        .setAlpha(0)
        .setScale(0.6 + Math.random() * 0.6);
      this.tweens.add({
        targets: puff,
        x: p.x,
        y: p.y,
        alpha: { from: 0.7, to: 0.55 },
        scale: 1,
        duration: 1500 + Math.random() * 600,
        delay: (i / points.length) * 900,
        ease: 'Sine.InOut',
      });
      this.tweens.add({ targets: puff, alpha: 0, duration: 800, delay: 3300 });
    });
  }

  private makeSmokeTexture(): void {
    if (this.textures.exists('smoke')) return;
    const g = this.make.graphics({}, false);
    g.fillStyle(0x9a94a8, 0.5).fillCircle(4, 4, 4);
    g.fillStyle(0xd8d4e0, 0.6).fillCircle(4, 4, 2);
    g.generateTexture('smoke', 8, 8);
    g.destroy();
  }

  private finish(): void {
    if (this.done) return;
    this.done = true;
    markSeen(session.save.meta, INTRO_ID);
    session.commit();
    this.cameras.main.fadeOut(500, 5, 4, 9);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () =>
      this.scene.start('hub'),
    );
  }
}
