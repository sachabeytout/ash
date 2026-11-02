import Phaser from 'phaser';
import { drawFrame, drawCartoucheRect } from './frame';
import {
  forgeLevel,
  isUnlocked,
  nextForgeLevel,
  unlockWeapon,
  upgradeWeapon,
} from '../../core/forge';
import type { MetaState } from '../../core/save/schema';
import { FORGE, UNLOCK_COST, type ForgeEffect } from '../../data/forge';
import { WEAPON_ORDER, WEAPONS } from '../../data/weapons';
import { t, type TextKey } from '../../i18n';
import { sfx } from '../audio/sfx';
import { COLORS, FONT_FAMILY } from '../theme';

const BROKK = 0xffe08a;

function effectText(descKey: string, effect: ForgeEffect): string {
  // Fractions en % (dégâts, jauge) ; nombres entiers tels quels (PV, un tir sur n).
  if (!('value' in effect)) return t(descKey as TextKey);
  const v = effect.value;
  return t(descKey as TextKey, { value: v < 1 ? Math.round(v * 100) : v });
}

/** Forge de Ptah : une ligne par arme, niveau, prochain effet, bouton « Forger ». */
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
    const w = Math.min(600, cam.displayWidth - 24);
    const h = 332;
    const left = cx - w / 2;
    const top = cy - h / 2;
    const veil = scene.add
      .rectangle(cx, cy, cam.displayWidth + 40, cam.displayHeight + 40, 0x07060d, 0.85)
      .setInteractive();
    const frame = scene.add.graphics();
    drawFrame(frame, left, top, w, h, BROKK, 0.98);
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

    WEAPON_ORDER.forEach((id, i) => {
      const y = top + 50 + i * 36;
      const unlocked = isUnlocked(this.meta, id);
      const level = forgeLevel(this.meta, id);
      const max = FORGE[id].length;
      const next = nextForgeLevel(this.meta, id);
      this.text(left + 14, y + 2, t(WEAPONS[id].nameKey as TextKey), 12, COLORS.text, true);
      const pips = scene.add.graphics();
      for (let p = 0; p < max; p++) {
        const px = left + 18 + p * 12;
        pips.lineStyle(1.5, unlocked ? BROKK : 0x3a3550, 1).strokeRect(px - 4, y + 20, 8, 8);
        if (p < level) pips.fillStyle(BROKK, 1).fillRect(px - 2, y + 22, 4, 4);
      }
      this.root.add(pips);
      // Prochain palier (ou état de l'arme).
      const info = !unlocked
        ? t('forge.locked')
        : next
          ? t('forge.next', { effect: effectText(next.descKey, next.effect) })
          : t('forge.maxed');
      this.text(
        left + 150,
        y + 10,
        info,
        10,
        unlocked ? COLORS.text : COLORS.textDim,
      ).setWordWrapWidth(w - 150 - 150);

      const unlockCost = UNLOCK_COST[id];
      const cost = !unlocked ? (unlockCost ?? 0) : (next?.cost ?? 0);
      // La Lame de l'Aube ne s'achète pas : Ptah la nomme à la 5e victoire.
      const possible = unlocked ? next !== undefined : unlockCost !== undefined;
      const affordable = possible && this.meta.weaponParts >= cost;
      const label = !unlocked
        ? unlockCost === undefined
          ? t('hub.lockedDawn')
          : t('forge.unlock', { cost })
        : next
          ? t('forge.short', { cost })
          : t('forge.maxed');
      const bx = left + w - 72;
      const by = y + 15;
      const btn = scene.add.graphics();
      drawCartoucheRect(btn, bx - 60, by - 13, 120, 26, affordable ? BROKK : 0x3a3550);
      this.root.add(btn);
      this.text(bx, by, label, 11, affordable ? COLORS.text : COLORS.textDim, affordable).setOrigin(
        0.5,
      );
      if (affordable) {
        const zone = scene.add.zone(bx, by, 120, 30).setInteractive({ useHandCursor: true });
        zone.on('pointerup', () => {
          const ok = unlocked ? upgradeWeapon(this.meta, id) : unlockWeapon(this.meta, id);
          if (!ok) return;
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
