import Phaser from 'phaser';
import { t } from '../../i18n';
import { addEmbers, drawCage, ensureTextures } from '../backdrop';
import { COLORS, FONT_FAMILY, GAME_WIDTH } from '../theme';
import { markScene } from './markScene';

/** La Cage (hub). M0 : simple écran d'attente ; le vrai hub arrive en M1. */
export class HubScene extends Phaser.Scene {
  constructor() {
    super('hub');
  }

  create(): void {
    ensureTextures(this);
    const cx = GAME_WIDTH / 2;

    drawCage(this);
    addEmbers(this);

    // Ash, provisoire : une flamme qui pulse au centre de la cage.
    const ash = this.add.circle(cx, 220, 10, COLORS.phoenix);
    ash.enableFilters();
    ash.filters?.internal.addGlow(COLORS.ember, 6, 0, 1);
    this.tweens.add({
      targets: ash,
      scale: 1.25,
      duration: 700,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut',
    });

    const style = { fontFamily: FONT_FAMILY, color: COLORS.text };
    this.add.text(cx, 70, t('hub.name'), { ...style, fontSize: '32px' }).setOrigin(0.5);
    this.add
      .text(cx, 110, t('hub.placeholder'), { ...style, fontSize: '14px', color: COLORS.textDim })
      .setOrigin(0.5);
    this.add.text(cx, 290, t('hub.comingSoon'), { ...style, fontSize: '14px' }).setOrigin(0.5);

    this.cameras.main.fadeIn(600, 7, 6, 13);
    markScene('hub');
  }
}
