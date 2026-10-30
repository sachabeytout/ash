import Phaser from 'phaser';
import { heatModifiers, heatTotal, setHeat, type HeatLevels } from '../../core/heat';
import { HEAT, type HeatDef } from '../../data/heat';
import { t, type TextKey } from '../../i18n';
import { sfx } from '../audio/sfx';
import { COLORS, FONT_FAMILY } from '../theme';

/** Couleur des Mesures d'urgence : ambre (le rouge-magenta reste réservé aux dangers). */
const HEAT_COLOR = 0xffa040;

/** Mesures d'urgence : chaque mesure se règle avec − / + ; la chaleur totale augmente les récompenses. */
export class HeatPanel {
  private readonly root: Phaser.GameObjects.Container;
  private readonly onKey = (e: KeyboardEvent) => {
    if (e.code === 'Escape' || e.code === 'KeyM') this.close();
  };

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly levels: HeatLevels,
    private readonly onChange: () => void,
    private readonly onClose: () => void,
  ) {
    this.root = scene.add.container(0, 0).setDepth(100);
    this.build();
    setTimeout(() => window.addEventListener('keydown', this.onKey), 0);
  }

  private value(def: HeatDef, level: number): number {
    return def.id === 'noRest' ? 0 : Math.round(def.perLevel * Math.max(1, level) * 100);
  }

  private build(): void {
    this.root.removeAll(true);
    const scene = this.scene;
    const cam = scene.cameras.main;
    const cx = cam.midPoint.x;
    const cy = cam.midPoint.y;
    const w = Math.min(600, cam.displayWidth - 24);
    const h = 320;
    const left = cx - w / 2;
    const top = cy - h / 2;
    const veil = scene.add
      .rectangle(cx, cy, cam.displayWidth + 40, cam.displayHeight + 40, 0x07060d, 0.85)
      .setInteractive();
    const frame = scene.add.graphics();
    frame.fillStyle(0x0d0a18, 0.98).fillRoundedRect(left, top, w, h, 10);
    frame.lineStyle(2, HEAT_COLOR, 0.85).strokeRoundedRect(left, top, w, h, 10);
    this.root.add([veil, frame]);

    const total = heatTotal(this.levels);
    this.text(left + 14, top + 10, t('heat.title'), 15, '#ffa040', true);
    this.text(left + 14, top + 30, t('heat.intro'), 10, COLORS.textDim).setWordWrapWidth(w - 28);
    this.text(
      left + w - 14,
      top + 12,
      t('heat.total', {
        heat: total,
        bonus: Math.round((heatModifiers(this.levels).reward - 1) * 100),
      }),
      12,
      COLORS.text,
      true,
    ).setOrigin(1, 0);

    HEAT.forEach((def, i) => {
      const y = top + 64 + i * 37;
      const level = this.levels[def.id] ?? 0;
      this.text(
        left + 14,
        y,
        t(def.nameKey as TextKey),
        11,
        level > 0 ? '#ffd8a8' : COLORS.text,
        true,
      );
      const pips = scene.add.graphics();
      for (let p = 0; p < def.maxLevel; p++) {
        const px = left + 18 + p * 12;
        pips.lineStyle(1.5, HEAT_COLOR, 1).strokeRect(px - 4, y + 18, 8, 8);
        if (p < level) pips.fillStyle(HEAT_COLOR, 1).fillRect(px - 2, y + 20, 4, 4);
      }
      this.root.add(pips);
      this.text(
        left + 200,
        y + 6,
        t(def.descKey as TextKey, { value: this.value(def, level) }),
        10,
        level > 0 ? COLORS.text : COLORS.textDim,
      ).setWordWrapWidth(w - 200 - 110);
      this.button(left + w - 84, y + 13, '−', level > 0, () => this.change(def, level - 1));
      this.button(left + w - 40, y + 13, '+', level < def.maxLevel, () =>
        this.change(def, level + 1),
      );
    });

    const close = this.text(cx, top + h - 16, t('heat.close'), 12, COLORS.text, true).setOrigin(
      0.5,
    );
    const zone = scene.add.zone(cx, top + h - 16, 160, 28).setInteractive({ useHandCursor: true });
    zone.on('pointerup', () => this.close());
    this.root.add([close, zone]);
  }

  private change(def: HeatDef, level: number): void {
    setHeat(this.levels, def.id, level);
    sfx.tap();
    this.onChange();
    this.build();
  }

  private button(x: number, y: number, label: string, enabled: boolean, onTap: () => void): void {
    const g = this.scene.add.graphics();
    g.fillStyle(0x07060d, 1).fillRoundedRect(x - 16, y - 12, 32, 24, 6);
    g.lineStyle(1.5, enabled ? HEAT_COLOR : 0x3a3550, 1).strokeRoundedRect(
      x - 16,
      y - 12,
      32,
      24,
      6,
    );
    const txt = this.scene.add
      .text(x, y, label, {
        fontFamily: FONT_FAMILY,
        fontSize: '13px',
        fontStyle: 'bold',
        color: enabled ? COLORS.text : COLORS.textDim,
      })
      .setOrigin(0.5);
    this.root.add([g, txt]);
    if (!enabled) return;
    const zone = this.scene.add.zone(x, y, 38, 30).setInteractive({ useHandCursor: true });
    zone.on('pointerup', onTap);
    this.root.add(zone);
  }

  private text(x: number, y: number, value: string, size: number, color: string, bold = false) {
    const obj = this.scene.add.text(x, y, value, {
      fontFamily: FONT_FAMILY,
      fontSize: `${size}px`,
      fontStyle: bold ? 'bold' : 'normal',
      color,
    });
    this.root.add(obj);
    return obj;
  }

  close(): void {
    window.removeEventListener('keydown', this.onKey);
    sfx.tap();
    this.root.destroy(true);
    this.onClose();
  }
}
