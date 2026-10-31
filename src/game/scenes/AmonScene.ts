import Phaser from 'phaser';
import { drawFrame } from '../ui/frame';
import { GODS, type GodId } from '../../data/gods';
import { t, type TextKey } from '../../i18n';
import { sfx } from '../audio/sfx';
import { AMON_COLOR, drawAmonEye, drawGodIcon } from '../icons';
import { COLORS, FONT_FAMILY } from '../theme';
import { viewSize } from '../view';
import { markScene } from './markScene';

export interface AmonSceneData {
  gods: readonly GodId[];
  onPick: (god: GodId) => void;
}

/** Faveur royale d'Amon : Ash choisit le dieu de sa prochaine porte (touches 1, 2, 3 ou toucher). */
export class AmonScene extends Phaser.Scene {
  private data_!: AmonSceneData;
  private closing = false;
  private openedAt = 0;
  private readonly onKey = (e: KeyboardEvent) => {
    const index = ['Digit1', 'Digit2', 'Digit3'].indexOf(e.code);
    const god = this.data_.gods[index];
    if (god) this.pick(god);
  };

  constructor() {
    super('amon');
  }

  init(data: AmonSceneData): void {
    this.data_ = data;
    this.closing = false;
  }

  create(): void {
    this.openedAt = this.time.now;
    const { width, height } = viewSize(this);
    const cx = width / 2;
    const cy = height / 2;
    const gods = this.data_.gods;
    this.add.rectangle(0, 0, width, height, 0x07060d, 0.72).setOrigin(0).setInteractive();
    const w = Math.min(460, width - 32);
    const h = 200;
    const top = cy - h / 2;
    const g = this.add.graphics();
    drawFrame(g, cx - w / 2, top, w, h, AMON_COLOR, 0.97);
    drawAmonEye(this.add.graphics(), cx, top + 22, 11);
    this.add
      .text(cx, top + 42, t('amon.favor.title'), {
        fontFamily: FONT_FAMILY,
        fontSize: '16px',
        fontStyle: 'bold',
        color: '#ffd36b',
      })
      .setOrigin(0.5, 0);
    this.add
      .text(cx, top + 64, t('amon.favor.desc'), {
        fontFamily: FONT_FAMILY,
        fontSize: '11px',
        color: COLORS.text,
        align: 'center',
        lineSpacing: 3,
        wordWrap: { width: w - 40 },
      })
      .setOrigin(0.5, 0);

    // Une carte par dieu : icône (forme), nom, contour à sa couleur.
    const cardW = Math.min(124, (w - 40) / gods.length - 8);
    const cardH = 70;
    const cardY = top + h - cardH / 2 - 16;
    gods.forEach((id, i) => {
      const god = GODS[id];
      const x = cx + (i - (gods.length - 1) / 2) * (cardW + 10);
      const card = this.add.graphics();
      const draw = (hover: boolean) => {
        card.clear().fillStyle(0x07060d, 0.95);
        card.fillRoundedRect(x - cardW / 2, cardY - cardH / 2, cardW, cardH, 8);
        card.lineStyle(2, god.color, hover ? 1 : 0.7);
        card.strokeRoundedRect(x - cardW / 2, cardY - cardH / 2, cardW, cardH, 8);
      };
      draw(false);
      drawGodIcon(this.add.graphics(), god, x, cardY - 12, 15);
      this.add
        .text(x, cardY + 12, t(god.nameKey as TextKey), {
          fontFamily: FONT_FAMILY,
          fontSize: '12px',
          fontStyle: 'bold',
          color: god.text,
        })
        .setOrigin(0.5, 0);
      this.add
        .text(x - cardW / 2 + 6, cardY - cardH / 2 + 4, String(i + 1), {
          fontFamily: FONT_FAMILY,
          fontSize: '9px',
          color: COLORS.textDim,
        })
        .setOrigin(0, 0);
      const zone = this.add.zone(x, cardY, cardW, cardH).setInteractive({ useHandCursor: true });
      zone.on('pointerover', () => draw(true));
      zone.on('pointerout', () => draw(false));
      zone.on('pointerup', () => this.pick(id));
    });

    setTimeout(() => window.addEventListener('keydown', this.onKey), 0);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () =>
      window.removeEventListener('keydown', this.onKey),
    );
    markScene('amon');
  }

  private pick(god: GodId): void {
    // Petit délai : un appui destiné au combat ne choisit pas par erreur.
    if (this.closing || this.time.now - this.openedAt < 350) return;
    this.closing = true;
    sfx.eventTake();
    this.scene.stop();
    this.data_.onPick(god);
  }
}
