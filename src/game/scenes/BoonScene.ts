import Phaser from 'phaser';
import { frieze } from '../ui/frame';
import { settings } from '../../core/settings';
import { scaledFontSize } from '../../core/textScale';
import { OFFERING_HP, mainValue, type BoonOffer } from '../../core/boons/boons';
import { getBoon, slotOf } from '../../data/boons';
import { RARITY_COLOR } from '../ui/boonCard';
import { GODS, type GodId } from '../../data/gods';
import { t, type TextKey } from '../../i18n';
import { sfx } from '../audio/sfx';
import { drawEmberIcon, drawGodIcon } from '../icons';
import { COLORS, FONT_FAMILY } from '../theme';
import { viewSize } from '../view';
import { onTap } from '../ui/tap';

export interface BoonSceneData {
  god: GodId;
  offers: BoonOffer[];
  onPick: (offer: BoonOffer) => void;
  /** Braise du Bennu (ex-Étincelle) : on améliore un don déjà obtenu (titre et bas de carte différents). */
  upgrade?: boolean;
}

const SPARK_COLOR = 0xffc46b;

/** Nombre de répliques par dieu (`god.<id>.quote.<n>` dans les textes). */
export const GOD_QUOTES = 4;

/** Évite qu'un appui d'attaque encore en cours choisisse un don par erreur. */
const INPUT_LOCK_MS = 450;

/**
 * Révélation des cartes (retour F7, option B) : elles arrivent face cachée (dos doré, œil oudjat)
 * puis se retournent une par une, de gauche à droite. Une carte rare, épique ou duo lance un
 * éclat de sa couleur en se révélant.
 */
const REVEAL_FIRST_MS = 160;
const REVEAL_STEP_MS = 150;
const FLIP_HALF_MS = 110;

/** Un dieu offre un don : choix 1 parmi 3 (toucher, clic, touches 1-2-3, flèches + Entrée, manette). */
export class BoonScene extends Phaser.Scene {
  private data_!: BoonSceneData;
  private focus = 0;
  private cards: { draw: (focused: boolean) => void }[] = [];
  private openedAt = 0;
  /** Les cartes ne se choisissent qu'une fois toutes retournées. */
  private inputLockMs = INPUT_LOCK_MS;
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
    // Braise du Bennu (charbon ardent) ou icône du dieu qui offre.
    if (upgrade) drawEmberIcon(titleIcon, width / 2, 26, 0.9);
    else drawGodIcon(titleIcon, god, width / 2, 26, 9);
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
    const cardW = Math.min(204, (width - 32 - gap * (n - 1)) / n);
    const cardH = 214;
    const left = width / 2 - (cardW * n + gap * (n - 1)) / 2;
    const top = 80;
    this.data_.offers.forEach((offer, i) =>
      this.makeCard(offer, left + i * (cardW + gap), top, cardW, cardH, i),
    );
    this.inputLockMs = Math.max(
      INPUT_LOCK_MS,
      REVEAL_FIRST_MS + (n - 1) * REVEAL_STEP_MS + FLIP_HALF_MS * 2,
    );
    if (!upgrade) {
      // Le dieu parle : une réplique au hasard (personnalité, un peu d'humour).
      const n = 1 + Math.floor(Math.random() * GOD_QUOTES);
      this.add
        .text(
          width / 2,
          top + cardH + 20,
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
      const digit = ['Digit1', 'Digit2', 'Digit3', 'Digit4'].indexOf(e.code);
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
    const firstChild = this.children.list.length;
    this.buildCardFace(offer, x, y, w, h, index);
    // Tout ce qui vient d'être créé (sauf la zone de toucher) forme la face de la carte.
    const parts = this.children.list
      .slice(firstChild)
      .filter(
        (o): o is Phaser.GameObjects.Graphics | Phaser.GameObjects.Text =>
          o instanceof Phaser.GameObjects.Graphics || o instanceof Phaser.GameObjects.Text,
      );
    this.revealCard(parts, offer, x, y, w, h, index);
  }

  /** Dos de carte, puis retournement (voir REVEAL_*). */
  private revealCard(
    parts: (Phaser.GameObjects.Graphics | Phaser.GameObjects.Text)[],
    offer: BoonOffer,
    x: number,
    y: number,
    w: number,
    h: number,
    index: number,
  ): void {
    const cx = x + w / 2;
    const cy = y + h / 2;
    const front = this.add.container(cx, cy);
    for (const p of parts) {
      p.setPosition(p.x - cx, p.y - cy);
      front.add(p);
    }
    front.setScale(0, 1);
    // Dos doré : cadre, frise et œil oudjat.
    const back = this.add.container(cx, cy);
    const g = this.add.graphics();
    g.fillStyle(COLORS.panel, 0.98).fillRect(-w / 2, -h / 2, w, h);
    g.lineStyle(2, COLORS.goldDim, 1).strokeRect(-w / 2, -h / 2, w, h);
    g.lineStyle(1, COLORS.gold, 0.6).strokeRect(-w / 2 + 4, -h / 2 + 4, w - 8, h - 8);
    frieze(g, -w / 2 + 8, -h / 2 + 8, w - 16);
    frieze(g, -w / 2 + 8, h / 2 - 11, w - 16);
    g.lineStyle(2, COLORS.gold, 0.9).strokeEllipse(0, 0, 44, 20);
    g.fillStyle(COLORS.gold, 0.9).fillCircle(0, 0, 6);
    g.lineStyle(2, COLORS.gold, 0.9).lineBetween(-6, 9, -12, 22).lineBetween(4, 9, 14, 16);
    back.add(g);
    back.setAlpha(0).setY(cy + 12);
    this.tweens.add({ targets: back, alpha: 1, y: cy, duration: 150, ease: 'Sine.Out' });
    const delay = REVEAL_FIRST_MS + index * REVEAL_STEP_MS;
    this.tweens.add({
      targets: back,
      scaleX: 0,
      delay,
      duration: FLIP_HALF_MS,
      ease: 'Sine.In',
      onComplete: () => {
        back.destroy();
        this.tweens.add({
          targets: front,
          scaleX: 1,
          duration: FLIP_HALF_MS + 30,
          ease: 'Back.Out',
        });
        sfx.tap();
        // Bonus : une carte rare, épique ou duo lance un éclat de sa couleur.
        if (offer.rarity !== 'common' && this.textures.exists('glow')) {
          const color = Phaser.Display.Color.HexStringToColor(RARITY_COLOR[offer.rarity]).color;
          const flash = this.add
            .image(cx, cy, 'glow')
            .setTint(color)
            .setBlendMode('ADD')
            .setAlpha(0.8)
            .setScale(2);
          this.tweens.add({
            targets: flash,
            alpha: 0,
            scale: 4.5,
            duration: 420,
            onComplete: () => flash.destroy(),
          });
        }
      },
    });
  }

  private buildCardFace(
    offer: BoonOffer,
    x: number,
    y: number,
    w: number,
    h: number,
    index: number,
  ): void {
    const def = getBoon(offer.id);
    const offering = offer.special === 'offering';
    if (!def && !offering) return;
    const gods = def ? def.gods.map((g) => GODS[g]) : [GODS[this.data_.god]];
    const color = gods[0]?.color ?? 0xffffff;
    const g = this.add.graphics();
    const draw = (focused: boolean) => {
      g.clear().fillStyle(COLORS.panel, 0.96).fillRect(x, y, w, h);
      // Bandeau du haut aux couleurs du dieu (les duos partagent le bandeau en deux).
      const band = 38;
      gods.forEach((god, i) => {
        const bw = w / gods.length;
        g.fillStyle(god.color, focused ? 0.3 : 0.18).fillRect(x + i * bw, y, bw, band);
      });
      // Frise égyptienne sous le bandeau.
      frieze(g, x + 6, y + band - 1, w - 12);
      // Fin trait entre le titre et l'effet (les cartes se lisent toutes de la même façon).
      g.lineStyle(1, color, 0.25).lineBetween(x + 24, y + 94, x + w - 24, y + 94);
      // Double filet : or à l'extérieur, couleur du dieu à l'intérieur.
      g.lineStyle(focused ? 2.5 : 1.5, focused ? COLORS.gold : COLORS.goldDim, focused ? 1 : 0.8);
      g.strokeRect(x, y, w, h);
      g.lineStyle(focused ? 2 : 1, color, focused ? 1 : 0.6).strokeRect(x + 3, y + 3, w - 6, h - 6);
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
          wordWrap: { width: w - 24 },
          lineSpacing: 4,
        })
        .setOrigin(0.5, 0);

    text(y + 50, def ? t(def.nameKey as TextKey) : t('boonChoice.offering'), 13, COLORS.text, true);
    text(
      y + 72,
      def
        ? `${t(`rarity.${offer.rarity}` as TextKey)} · ${t(`slot.${slotOf(def.effect)}` as TextKey)}`
        : t('boonChoice.offeringKind'),
      10,
      def ? RARITY_COLOR[offer.rarity] : COLORS.textDim,
      true,
    );
    // L'effet, centré dans l'espace entre le trait et le pied de carte (police réduite s'il est long).
    const desc = text(
      y + (100 + h - 30) / 2,
      def
        ? t(def.descKey as TextKey, { value: mainValue(def.effect, offer.rarity) })
        : t('boonChoice.offering.desc', { value: OFFERING_HP }),
      11,
      COLORS.text,
    ).setOrigin(0.5, 0.5);
    for (let size = 10; desc.height > h - 136 && size >= 9; size--)
      desc.setFontSize(scaledFontSize(size, settings.textSize) ?? size);
    const replaced = offer.replaces ? getBoon(offer.replaces) : undefined;
    text(
      y + h - 22,
      offer.special === 'favor' && offer.from
        ? t('boonChoice.favor', {
            from: t(`rarity.${offer.from}` as TextKey),
            to: t(`rarity.${offer.rarity}` as TextKey),
          })
        : offering
          ? t('boonChoice.offeringFoot')
          : offer.from
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
    onTap(zone, () => this.pick(index));
  }

  private pick(index: number): void {
    if (this.picked || this.time.now - this.openedAt < this.inputLockMs) return;
    const offer = this.data_.offers[index];
    if (!offer) return;
    this.picked = true;
    sfx.boonTaken();
    this.data_.onPick(offer);
    this.scene.stop();
  }
}
