import Phaser from 'phaser';
import type { EngravingDef } from '../../core/combat/engraving';
import { settings } from '../../core/settings';
import { scaledFontSize } from '../../core/textScale';
import { t, type TextKey } from '../../i18n';
import { sfx } from '../audio/sfx';
import { frieze } from '../ui/frame';
import { COLORS, FONT_FAMILY } from '../theme';
import { viewSize } from '../view';
import { markScene } from './markScene';
import { onTap } from '../ui/tap';

export interface EngravingSceneData {
  /** Nom de l'arme (déjà traduit). */
  weaponName: string;
  offers: readonly EngravingDef[];
  onPick: (def: EngravingDef) => void;
}

/** Couleur de Ptah (or et turquoise : l'artisan). */
const PTAH = 0x40d0c0;
/** Évite qu'un appui encore en cours choisisse une gravure par erreur. */
const INPUT_LOCK_MS = 450;

/** Ptah grave l'arme : choix 1 parmi 3 (toucher, clic, touches 1-2-3, flèches + Entrée, manette). */
export class EngravingScene extends Phaser.Scene {
  private data_!: EngravingSceneData;
  private focus = 0;
  private draws: ((focused: boolean) => void)[] = [];
  private openedAt = 0;
  private picked = false;
  private padPrev = new Map<number, boolean>();

  constructor() {
    super('engraving');
  }

  init(data: EngravingSceneData): void {
    this.data_ = data;
    this.focus = 0;
    this.draws = [];
    this.picked = false;
    this.padPrev = new Map();
  }

  create(): void {
    this.openedAt = this.time.now;
    const { width, height } = viewSize(this);
    this.add.rectangle(0, 0, width, height, 0x07060d, 0.82).setOrigin(0);
    if (this.textures.exists('glow'))
      this.add
        .image(width / 2, 40, 'glow')
        .setTint(PTAH)
        .setAlpha(0.3)
        .setScale(4, 1.6)
        .setBlendMode('ADD');
    // Le ciseau de Ptah.
    const icon = this.add.graphics();
    icon.fillStyle(COLORS.gold, 1).fillRect(width / 2 - 2, 14, 4, 12);
    icon.fillStyle(PTAH, 1).fillTriangle(width / 2 - 4, 26, width / 2 + 4, 26, width / 2, 33);
    this.add
      .text(width / 2, 40, t('engraving.title'), {
        fontFamily: FONT_FAMILY,
        fontSize: '16px',
        fontStyle: 'bold',
        color: '#7fe7d8',
        stroke: '#07060d',
        strokeThickness: 3,
      })
      .setOrigin(0.5, 0);
    this.add
      .text(width / 2, 60, `${this.data_.weaponName} · ${t('engraving.subtitle')}`, {
        fontFamily: FONT_FAMILY,
        fontSize: '10px',
        color: COLORS.textDim,
      })
      .setOrigin(0.5, 0);

    const n = this.data_.offers.length;
    const gap = 12;
    const cardW = Math.min(204, (width - 32 - gap * (n - 1)) / n);
    const cardH = 200;
    const left = width / 2 - (cardW * n + gap * (n - 1)) / 2;
    const top = 82;
    this.data_.offers.forEach((def, i) =>
      this.makeCard(def, left + i * (cardW + gap), top, cardW, cardH, i),
    );
    this.add
      .text(width / 2, height - 14, t('engraving.hint'), {
        fontFamily: FONT_FAMILY,
        fontSize: '10px',
        color: COLORS.textDim,
      })
      .setOrigin(0.5, 1);
    this.redraw();
    this.input.keyboard?.on('keydown', (e: KeyboardEvent) => {
      const digit = ['Digit1', 'Digit2', 'Digit3'].indexOf(e.code);
      if (digit >= 0 && digit < n) this.pick(digit);
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') this.move(-1);
      if (e.code === 'ArrowRight' || e.code === 'KeyD') this.move(1);
      if (e.code === 'Enter' || e.code === 'Space') this.pick(this.focus);
    });
    sfx.boonOffer();
    markScene('engraving');
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
    if (pressed(0)) this.pick(this.focus);
  }

  private makeCard(def: EngravingDef, x: number, y: number, w: number, h: number, i: number): void {
    const g = this.add.graphics();
    const band = 30;
    this.draws[i] = (focused) => {
      g.clear().fillStyle(COLORS.panel, 0.96).fillRect(x, y, w, h);
      g.fillStyle(PTAH, focused ? 0.28 : 0.16).fillRect(x, y, w, band);
      frieze(g, x + 6, y + band - 1, w - 12);
      g.lineStyle(focused ? 2.5 : 1.5, focused ? COLORS.gold : COLORS.goldDim, 1).strokeRect(
        x,
        y,
        w,
        h,
      );
      g.lineStyle(focused ? 2 : 1, PTAH, focused ? 1 : 0.6).strokeRect(x + 3, y + 3, w - 6, h - 6);
    };
    const cx = x + w / 2;
    const text = (ty: number, value: string, size: number, color: string, bold = false) =>
      this.add
        .text(cx, ty, value, {
          fontFamily: FONT_FAMILY,
          fontSize: `${size}px`,
          fontStyle: bold ? 'bold' : 'normal',
          color,
          align: 'center',
          wordWrap: { width: w - 24 },
          lineSpacing: 4,
        })
        .setOrigin(0.5, 0);
    text(y + 9, t(`engraving.slot.${def.slot}` as TextKey), 11, '#7fe7d8', true);
    text(y + band + 12, t(def.nameKey as TextKey), 13, COLORS.text, true);
    const desc = text(y + band + 44, t(def.descKey as TextKey), 11, COLORS.text);
    for (let size = 10; desc.y + desc.height > y + h - 10 && size >= 8; size--)
      desc.setFontSize(scaledFontSize(size, settings.textSize) ?? size);
    text(y + h + 4, `${i + 1}`, 10, COLORS.textDim);
    const zone = this.add
      .zone(cx, y + h / 2, w, h)
      .setInteractive({ useHandCursor: true })
      .on('pointerover', () => {
        this.focus = i;
        this.redraw();
      });
    onTap(zone, () => this.pick(i));
  }

  private redraw(): void {
    this.draws.forEach((d, i) => d(i === this.focus));
  }

  private move(dir: number): void {
    const n = this.data_.offers.length;
    this.focus = (this.focus + dir + n) % n;
    sfx.tap();
    this.redraw();
  }

  private pick(index: number): void {
    if (this.picked || this.time.now - this.openedAt < INPUT_LOCK_MS) return;
    const def = this.data_.offers[index];
    if (!def) return;
    this.picked = true;
    sfx.boonTaken();
    this.data_.onPick(def);
    this.scene.stop();
  }
}
