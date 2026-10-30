import Phaser from 'phaser';
import { forgeLevel, nextForgeLevel, upgradeWeapon } from '../../core/forge';
import type { MetaState } from '../../core/save/schema';
import { FORGE, type ForgeEffect } from '../../data/forge';
import { WEAPONS, type WeaponId } from '../../data/weapons';
import { t, type TextKey } from '../../i18n';
import { sfx } from '../audio/sfx';
import { COLORS, FONT_FAMILY } from '../theme';

const BROKK = 0xffe08a;

function effectText(descKey: string, effect: ForgeEffect): string {
  return t(descKey as TextKey, { value: Math.round(effect.value * 100) });
}

/** Forge de Brokk : une ligne par arme, niveau, prochain effet, bouton « Forger ». */
export class ForgePanel {
  private readonly root: Phaser.GameObjects.Container;
  private readonly onKey = (e: KeyboardEvent) => {
    if (e.code === 'Escape' || e.code === 'KeyF') this.close();
  };

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly meta: MetaState,
    private readonly onChange: () => void,
    private readonly onClose: () => void,
  ) {
    this.root = scene.add.container(0, 0).setDepth(100);
    this.build();
    setTimeout(() => window.addEventListener('keydown', this.onKey), 0);
  }

  private build(): void {
    this.root.removeAll(true);
    const scene = this.scene;
    const cam = scene.cameras.main;
    const cx = cam.midPoint.x;
    const cy = cam.midPoint.y;
    const w = Math.min(600, cam.width - 24);
    const h = 300;
    const left = cx - w / 2;
    const top = cy - h / 2;
    const veil = scene.add
      .rectangle(cx, cy, cam.width + 40, cam.height + 40, 0x07060d, 0.85)
      .setInteractive();
    const frame = scene.add.graphics();
    frame.fillStyle(0x0d0a18, 0.98).fillRoundedRect(left, top, w, h, 10);
    frame.lineStyle(2, BROKK, 0.8).strokeRoundedRect(left, top, w, h, 10);
    this.root.add([veil, frame]);

    this.text(left + 14, top + 10, t('forge.title'), 15, '#ffe08a', true);
    this.text(left + 14, top + 30, t('forge.intro'), 10, COLORS.textDim);
    this.text(
      left + w - 14,
      top + 12,
      t('forge.parts', { count: this.meta.weaponParts }),
      13,
      COLORS.text,
      true,
    ).setOrigin(1, 0);

    (Object.keys(WEAPONS) as WeaponId[]).forEach((id, i) => {
      const y = top + 58 + i * 74;
      const level = forgeLevel(this.meta, id);
      const max = FORGE[id].length;
      const next = nextForgeLevel(this.meta, id);
      this.text(left + 14, y, t(WEAPONS[id].nameKey as TextKey), 13, COLORS.text, true);
      const pips = scene.add.graphics();
      for (let p = 0; p < max; p++) {
        const px = left + 18 + p * 14;
        pips.lineStyle(1.5, BROKK, 1).strokeRect(px - 5, y + 22, 10, 10);
        if (p < level) pips.fillStyle(BROKK, 1).fillRect(px - 3, y + 24, 6, 6);
      }
      this.root.add(pips);
      // Ce qui est déjà acquis, puis le prochain palier.
      const owned = FORGE[id]
        .slice(0, level)
        .map((l) => effectText(l.descKey, l.effect))
        .join(' · ');
      this.text(
        left + 150,
        y + 2,
        owned || t('forge.level', { level, max }),
        10,
        COLORS.textDim,
      ).setWordWrapWidth(w - 150 - 150);
      this.text(
        left + 150,
        y + 30,
        next
          ? t('forge.next', { effect: effectText(next.descKey, next.effect) })
          : t('forge.maxed'),
        10,
        COLORS.text,
      ).setWordWrapWidth(w - 150 - 150);

      const bx = left + w - 76;
      const by = y + 20;
      const affordable = next !== undefined && this.meta.weaponParts >= next.cost;
      const btn = scene.add.graphics();
      btn.fillStyle(0x07060d, 1).fillRoundedRect(bx - 64, by - 15, 128, 30, 6);
      btn
        .lineStyle(2, affordable ? BROKK : 0x3a3550, 1)
        .strokeRoundedRect(bx - 64, by - 15, 128, 30, 6);
      this.root.add(btn);
      this.text(
        bx,
        by,
        next ? t('forge.buy', { cost: next.cost }) : t('forge.maxed'),
        11,
        affordable ? COLORS.text : COLORS.textDim,
        affordable,
      ).setOrigin(0.5);
      if (affordable) {
        const zone = scene.add.zone(bx, by, 128, 30).setInteractive({ useHandCursor: true });
        zone.on('pointerup', () => {
          if (!upgradeWeapon(this.meta, id)) return;
          sfx.hit(true);
          this.onChange();
          this.build();
        });
        this.root.add(zone);
      }
    });

    const close = this.text(cx, top + h - 16, t('forge.close'), 12, COLORS.text, true).setOrigin(
      0.5,
    );
    const zone = scene.add.zone(cx, top + h - 16, 160, 28).setInteractive({ useHandCursor: true });
    zone.on('pointerup', () => this.close());
    this.root.add([close, zone]);
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
