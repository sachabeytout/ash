import Phaser from 'phaser';
import type { RunState } from '../../core/run/state';
import { canAfford, price } from '../../core/shop';
import { SHOP_ITEMS, type ShopItemDef, type ShopItemId } from '../../data/shop';
import { t, type TextKey } from '../../i18n';
import { sfx } from '../audio/sfx';
import { COLORS, FONT_FAMILY } from '../theme';
import { markScene } from './markScene';

export interface ShopSceneData {
  run: RunState;
  sold: Set<ShopItemId>;
  /** Mesure « Rationnement » : prix multipliés. */
  priceMul: number;
  /** Renvoie vrai si l'achat a eu lieu. */
  onBuy: (item: ShopItemDef) => boolean;
  onLeave: () => void;
}

const ACCENT = 0x7fe7ff;

/** Ratatosk, le Coursier : 4 articles contre des éclats, puis « Continuer ». */
export class ShopScene extends Phaser.Scene {
  private data_!: ShopSceneData;
  private closing = false;
  private openedAt = 0;
  private readonly onKey = (e: KeyboardEvent) => {
    const digit = ['Digit1', 'Digit2', 'Digit3', 'Digit4'].indexOf(e.code);
    const item = SHOP_ITEMS[digit];
    if (item) this.buy(item);
    if (e.code === 'Enter' || e.code === 'Escape') this.leave();
  };

  constructor() {
    super('shop');
  }

  init(data: ShopSceneData): void {
    this.data_ = data;
    this.closing = false;
  }

  create(): void {
    this.openedAt = this.time.now;
    const { width, height } = this.scale;
    const cx = width / 2;
    const run = this.data_.run;
    this.add.rectangle(0, 0, width, height, 0x07060d, 0.84).setOrigin(0).setInteractive();

    drawRatatosk(this.add.graphics(), cx - 150, 34);
    this.add
      .text(cx - 128, 22, t('shop.title'), {
        fontFamily: FONT_FAMILY,
        fontSize: '15px',
        fontStyle: 'bold',
        color: '#7fe7ff',
      })
      .setOrigin(0, 0);
    this.add
      .text(cx - 128, 42, t('shop.greeting'), {
        fontFamily: FONT_FAMILY,
        fontSize: '10px',
        color: COLORS.textDim,
        wordWrap: { width: Math.min(420, width - 200) },
      })
      .setOrigin(0, 0);
    this.add
      .text(width - 16, 14, t('shop.shards', { count: run.shards }), {
        fontFamily: FONT_FAMILY,
        fontSize: '13px',
        fontStyle: 'bold',
        color: '#7fe7ff',
      })
      .setOrigin(1, 0);

    const n = SHOP_ITEMS.length;
    const gap = 10;
    const cardW = Math.min(140, (width - 32 - gap * (n - 1)) / n);
    const cardH = 176;
    const left = cx - (cardW * n + gap * (n - 1)) / 2;
    SHOP_ITEMS.forEach((item, i) => this.card(item, left + i * (cardW + gap), 84, cardW, cardH, i));

    const by = height - 30;
    const g = this.add.graphics();
    g.fillStyle(0x07060d, 1).fillRoundedRect(cx - 90, by - 17, 180, 34, 8);
    g.lineStyle(2, 0xffb02e, 0.9).strokeRoundedRect(cx - 90, by - 17, 180, 34, 8);
    this.add
      .text(cx, by, t('shop.leave'), {
        fontFamily: FONT_FAMILY,
        fontSize: '13px',
        fontStyle: 'bold',
        color: COLORS.text,
      })
      .setOrigin(0.5);
    this.add
      .zone(cx, by, 180, 42)
      .setInteractive({ useHandCursor: true })
      .on('pointerup', () => this.leave());

    setTimeout(() => window.addEventListener('keydown', this.onKey), 0);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () =>
      window.removeEventListener('keydown', this.onKey),
    );
    markScene('shop');
  }

  private card(item: ShopItemDef, x: number, y: number, w: number, h: number, i: number): void {
    const sold = this.data_.sold.has(item.id);
    const cost = price(item, this.data_.priceMul);
    const affordable = !sold && canAfford(this.data_.run, item, this.data_.priceMul);
    const g = this.add.graphics();
    g.fillStyle(0x0d0a18, 0.96).fillRoundedRect(x, y, w, h, 8);
    g.lineStyle(1.5, ACCENT, sold ? 0.25 : affordable ? 0.9 : 0.45).strokeRoundedRect(
      x,
      y,
      w,
      h,
      8,
    );
    drawItemIcon(g, item.id, x + w / 2, y + 24, sold ? 0x3a4a5a : ACCENT);
    const cx = x + w / 2;
    const text = (ty: number, value: string, size: number, color: string, bold = false) =>
      this.add
        .text(cx, ty, value, {
          fontFamily: FONT_FAMILY,
          fontSize: `${size}px`,
          fontStyle: bold ? 'bold' : 'normal',
          color,
          align: 'center',
          wordWrap: { width: w - 12 },
        })
        .setOrigin(0.5, 0);
    text(y + 44, t(item.nameKey as TextKey), 12, sold ? COLORS.textDim : COLORS.text, true);
    text(y + 64, t(item.descKey as TextKey, { value: item.value }), 10, COLORS.textDim);

    const label = sold
      ? t('shop.sold')
      : affordable
        ? t('shop.buy', { cost })
        : t('shop.tooPoor', { cost });
    const by = y + h - 22;
    g.fillStyle(0x07060d, 1).fillRoundedRect(x + 8, by - 13, w - 16, 26, 6);
    g.lineStyle(1.5, affordable ? ACCENT : 0x3a3550, 1).strokeRoundedRect(
      x + 8,
      by - 13,
      w - 16,
      26,
      6,
    );
    text(by - 7, label, 10, affordable ? COLORS.text : COLORS.textDim, affordable);
    text(y + h + 4, `${i + 1}`, 10, COLORS.textDim);
    if (affordable) {
      this.add
        .zone(cx, y + h / 2, w, h)
        .setInteractive({ useHandCursor: true })
        .on('pointerup', () => this.buy(item));
    }
  }

  private buy(item: ShopItemDef): void {
    if (this.closing || this.time.now - this.openedAt < 300) return;
    if (this.data_.sold.has(item.id) || !this.data_.onBuy(item)) return;
    this.data_.sold.add(item.id);
    sfx.boonTaken();
    // Le don ouvre l'écran de choix : la boutique se rouvrira ensuite.
    if (item.id === 'favor') {
      this.closing = true;
      this.scene.stop();
      return;
    }
    this.scene.restart(this.data_);
  }

  private leave(): void {
    if (this.closing) return;
    this.closing = true;
    sfx.tap();
    this.scene.stop();
    this.data_.onLeave();
  }
}

/** Ratatosk : écureuil mécanique (queue en spirale, œil-lentille, sacoche). */
export function drawRatatosk(g: Phaser.GameObjects.Graphics, x: number, y: number): void {
  g.lineStyle(3, 0xc88b4a, 1).beginPath();
  g.arc(x + 8, y - 6, 10, Math.PI * 0.6, Math.PI * 2.1);
  g.strokePath();
  g.fillStyle(0x8a5a2e, 1).fillEllipse(x - 4, y + 4, 18, 20);
  g.fillStyle(0xa86f3a, 1).fillCircle(x - 8, y - 8, 7);
  g.fillTriangle(x - 13, y - 13, x - 10, y - 21, x - 7, y - 13);
  g.fillStyle(0x7fe7ff, 1).fillCircle(x - 10, y - 9, 2);
  g.fillStyle(0x3a2a1c, 1).fillRect(x - 6, y + 4, 8, 6);
}

/** Icône d'article : chaque article a sa forme. */
function drawItemIcon(
  g: Phaser.GameObjects.Graphics,
  id: ShopItemId,
  x: number,
  y: number,
  color: number,
): void {
  g.fillStyle(color, 1).lineStyle(2, color, 1);
  switch (id) {
    case 'heal': // croix
      g.fillRect(x - 3, y - 10, 6, 20).fillRect(x - 10, y - 3, 20, 6);
      break;
    case 'heart': // cœur
      g.fillCircle(x - 5, y - 3, 6).fillCircle(x + 5, y - 3, 6);
      g.fillTriangle(x - 11, y - 1, x + 11, y - 1, x, y + 11);
      break;
    case 'whetstone': // pierre runique
      g.strokeRoundedRect(x - 9, y - 11, 18, 22, 4);
      g.lineBetween(x - 3, y - 6, x + 3, y).lineBetween(x + 3, y, x - 3, y + 6);
      break;
    case 'favor': {
      // étoile
      const pts: Phaser.Math.Vector2[] = [];
      for (let k = 0; k < 10; k++) {
        const a = -Math.PI / 2 + (k * Math.PI) / 5;
        const r = k % 2 === 0 ? 11 : 5;
        pts.push(new Phaser.Math.Vector2(x + Math.cos(a) * r, y + Math.sin(a) * r));
      }
      g.fillPoints(pts, true);
      break;
    }
  }
}
