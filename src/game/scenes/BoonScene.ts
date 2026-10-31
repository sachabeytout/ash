import Phaser from 'phaser';
import { mainValue, type BoonOffer } from '../../core/boons/boons';
import { getBoon, slotOf } from '../../data/boons';
import { RARITY_COLOR } from '../ui/boonCard';
import { GODS, type GodId } from '../../data/gods';
import { t, type TextKey } from '../../i18n';
import { sfx } from '../audio/sfx';
import { drawGodIcon } from '../icons';
import { COLORS, FONT_FAMILY } from '../theme';
import { viewSize } from '../view';

export interface BoonSceneData {
  god: GodId;
  offers: BoonOffer[];
  onPick: (offer: BoonOffer) => void;
  /** Étincelle du Phénix : on améliore un don déjà obtenu (titre et bas de carte différents). */
  upgrade?: boolean;
}

const SPARK_COLOR = 0xffc46b;

/** Nombre de répliques par dieu (`god.<id>.quote.<n>` dans les textes). */
export const GOD_QUOTES = 4;

/** Évite qu'un appui d'attaque encore en cours choisisse un don par erreur. */
const INPUT_LOCK_MS = 450;

/** Un dieu offre un don : choix 1 parmi 3 (toucher, clic, touches 1-2-3, flèches + Entrée, manette). */
export class BoonScene extends Phaser.Scene {
  private data_!: BoonSceneData;
  private focus = 0;
  private cards: { draw: (focused: boolean) => void }[] = [];
  private openedAt = 0;
  private picked = false;
  private padPrev = new Map<number, boolean>();

  constructor() {
    super('boon');
  }

  init(data: BoonSceneData): void {
    this.data_ = data;
    this.focus = 0;
    this.cards = [];
    this.picked = false;
    this.padPrev = new Map();
  }

  create(): void {
    this.openedAt = this.time.now;
    const { width, height } = viewSize(this);
    const god = GODS[this.data_.god];

    const veil = this.add.rectangle(0, 0, width, height, 0x07060d, 0.82).setOrigin(0);
    const upgrade = this.data_.upgrade === true;
    // Halo à la couleur du dieu derrière le titre : on sait d'un coup d'œil qui offre.
    if (this.textures.exists('glow'))
      this.add
        .image(width / 2, 40, 'glow')
        .setTint(upgrade ? SPARK_COLOR : god.color)
        .setAlpha(0.35)
        .setScale(4, 1.6)
        .setBlendMode('ADD');
    const titleIcon = this.add.graphics();
    if (upgrade) {
      // Flamme du Phénix.
      titleIcon
        .fillStyle(SPARK_COLOR, 1)
        .fillTriangle(width / 2 - 7, 32, width / 2 + 7, 32, width / 2, 14);
      titleIcon.fillCircle(width / 2, 28, 6);
    } else drawGodIcon(titleIcon, god, width / 2, 26, 9);
    const titleText = upgrade
      ? t('spark.title')
      : t('boonChoice.title', { god: t(god.nameKey as TextKey) });
    const title = this.add
      .text(width / 2, 44, titleText, {
        fontFamily: FONT_FAMILY,
        fontSize: '16px',
        fontStyle: 'bold',
        color: upgrade ? '#ffc46b' : god.text,
        stroke: '#07060d',
        strokeThickness: 3,
      })
      .setOrigin(0.5, 0);
    const subtitle = this.add
      .text(width / 2, 64, upgrade ? t('spark.subtitle') : t(god.titleKey as TextKey), {
        fontFamily: FONT_FAMILY,
        fontSize: '10px',
        color: COLORS.textDim,
      })
      .setOrigin(0.5, 0);

    const n = this.data_.offers.length;
    const gap = 12;
    const cardW = Math.min(184, (width - 32 - gap * (n - 1)) / n);
    const cardH = 184;
    const left = width / 2 - (cardW * n + gap * (n - 1)) / 2;
    const top = 86;
    this.data_.offers.forEach((offer, i) =>
      this.makeCard(offer, left + i * (cardW + gap), top, cardW, cardH, i),
    );
    if (!upgrade) {
      // Le dieu parle : une réplique au hasard (personnalité, un peu d'humour).
      const n = 1 + Math.floor(Math.random() * GOD_QUOTES);
      this.add
        .text(
          width / 2,
          top + cardH + 24,
          `${t(god.nameKey as TextKey)} : « ${t(`${god.nameKey}.quote.${n}` as TextKey)} »`,
          {
            fontFamily: FONT_FAMILY,
            fontSize: '10px',
            fontStyle: 'italic',
            color: god.text,
            align: 'center',
            wordWrap: { width: Math.min(560, width - 40) },
          },
        )
        .setOrigin(0.5, 0);
    }
    this.add
      .text(width / 2, height - 14, t('boonChoice.hint'), {
        fontFamily: FONT_FAMILY,
        fontSize: '10px',
        color: COLORS.textDim,
      })
      .setOrigin(0.5, 1);

    this.tweens.add({
      targets: [veil, titleIcon, title, subtitle],
      alpha: { from: 0, to: 1 },
      duration: 250,
    });
    this.redraw();

    this.input.keyboard?.on('keydown', (e: KeyboardEvent) => {
      const digit = ['Digit1', 'Digit2', 'Digit3'].indexOf(e.code);
      if (digit >= 0 && digit < n) this.pick(digit);
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') this.move(-1);
      if (e.code === 'ArrowRight' || e.code === 'KeyD') this.move(1);
      if (e.code === 'Enter' || e.code === 'Space') this.pick(this.focus);
    });
    sfx.boonOffer();
  }

  override update(): void {
    const pad = navigator.getGamepads?.().find((p) => p?.connected);
    if (!pad) return;
    const pressed = (i: number) => {
      const now = pad.buttons[i]?.pressed ?? false;
      const was = this.padPrev.get(i) ?? false;
      this.padPrev.set(i, now);
      return now && !was;
    };
    if (pressed(14)) this.move(-1);
    if (pressed(15)) this.move(1);
    const x = pad.axes[0] ?? 0;
    const stickWas = this.padPrev.get(-1) ?? false;
    const stickNow = Math.abs(x) > 0.6;
    this.padPrev.set(-1, stickNow);
    if (stickNow && !stickWas) this.move(Math.sign(x));
    if (pressed(0)) this.pick(this.focus);
  }

  private move(dir: number): void {
    const n = this.data_.offers.length;
    this.focus = (this.focus + dir + n) % n;
    sfx.tap();
    this.redraw();
  }

  private redraw(): void {
    this.cards.forEach((c, i) => c.draw(i === this.focus));
  }

  private makeCard(offer: BoonOffer, x: number, y: number, w: number, h: number, index: number) {
    const def = getBoon(offer.id);
    if (!def) return;
    const gods = def.gods.map((g) => GODS[g]);
    const color = gods[0]?.color ?? 0xffffff;
    const g = this.add.graphics();
    const draw = (focused: boolean) => {
      g.clear().fillStyle(0x0d0a18, 0.96).fillRoundedRect(x, y, w, h, 8);
      // Bandeau du haut aux couleurs du dieu (les duos partagent le bandeau en deux).
      const band = 38;
      gods.forEach((god, i) => {
        const bw = w / gods.length;
        g.fillStyle(god.color, focused ? 0.3 : 0.18);
        g.fillRoundedRect(x + i * bw, y, bw, band, {
          tl: i === 0 ? 8 : 0,
          tr: i === gods.length - 1 ? 8 : 0,
          bl: 0,
          br: 0,
        });
      });
      g.lineStyle(1, color, 0.5).lineBetween(x + 6, y + band, x + w - 6, y + band);
      g.lineStyle(focused ? 3 : 1.5, color, focused ? 1 : 0.65).strokeRoundedRect(x, y, w, h, 8);
      gods.forEach((god, i) =>
        drawGodIcon(g, god, x + w / 2 + (i - (gods.length - 1) / 2) * 26, y + 22, 9),
      );
    };
    this.cards[index] = { draw };

    const cx = x + w / 2;
    const text = (ty: number, value: string, size: number, col: string, bold = false) =>
      this.add
        .text(cx, ty, value, {
          fontFamily: FONT_FAMILY,
          fontSize: `${size}px`,
          fontStyle: bold ? 'bold' : 'normal',
          color: col,
          align: 'center',
          wordWrap: { width: w - 14 },
          lineSpacing: 2,
        })
        .setOrigin(0.5, 0);

    text(y + 40, t(def.nameKey as TextKey), 13, COLORS.text, true);
    const slot = slotOf(def.effect);
    text(
      y + 60,
      `${t(`rarity.${offer.rarity}` as TextKey)} · ${t(`slot.${slot}` as TextKey)}`,
      10,
      RARITY_COLOR[offer.rarity],
      true,
    );
    text(
      y + 80,
      t(def.descKey as TextKey, { value: mainValue(def.effect, offer.rarity) }),
      11,
      COLORS.text,
    );
    const replaced = offer.replaces ? getBoon(offer.replaces) : undefined;
    text(
      y + h - 22,
      offer.from
        ? t('spark.from', {
            from: t(`rarity.${offer.from}` as TextKey),
            to: t(`rarity.${offer.rarity}` as TextKey),
          })
        : replaced
          ? t('boonChoice.replaces', { name: t(replaced.nameKey as TextKey) })
          : t('boonChoice.new'),
      9,
      COLORS.textDim,
    );
    text(y + h + 4, `${index + 1}`, 10, COLORS.textDim);

    const zone = this.add.zone(x + w / 2, y + h / 2, w, h).setInteractive({ useHandCursor: true });
    zone.on('pointerover', () => {
      this.focus = index;
      this.redraw();
    });
    zone.on('pointerup', () => this.pick(index));
  }

  private pick(index: number): void {
    if (this.picked || this.time.now - this.openedAt < INPUT_LOCK_MS) return;
    const offer = this.data_.offers[index];
    if (!offer) return;
    this.picked = true;
    sfx.boonTaken();
    this.data_.onPick(offer);
    this.scene.stop();
  }
}
