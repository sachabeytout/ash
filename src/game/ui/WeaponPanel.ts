import Phaser from 'phaser';
import { chosenWeapon, forgeLevel, isUnlocked } from '../../core/forge';
import type { MetaState } from '../../core/save/schema';
import { UNLOCK_COST } from '../../data/forge';
import { DAWNBLADE_VICTORIES } from '../../data/story';
import { WEAPON_ORDER, WEAPONS, type WeaponId } from '../../data/weapons';
import { t, type TextKey } from '../../i18n';
import { sfx } from '../audio/sfx';
import { COLORS, FONT_FAMILY } from '../theme';

const RACK_COLOR = 0xffb02e;

/**
 * Râtelier de la Cage : les 7 armes. Toucher une arme disponible l'équipe ;
 * une arme verrouillée renvoie vers la forge de Brokk.
 */
export class WeaponPanel {
  private readonly root: Phaser.GameObjects.Container;
  private readonly onKey = (e: KeyboardEvent) => {
    if (e.code === 'Escape') this.close();
    const digit = Number(/^Digit([1-7])$/.exec(e.code)?.[1] ?? 0);
    const id = WEAPON_ORDER[digit - 1];
    if (id) this.pick(id);
  };

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly meta: MetaState,
    private readonly onPick: (weapon: WeaponId) => void,
    private readonly onForge: () => void,
    private readonly onClose: () => void,
  ) {
    this.root = scene.add.container(0, 0).setDepth(100);
    this.build();
    setTimeout(() => window.addEventListener('keydown', this.onKey), 0);
  }

  private build(): void {
    const scene = this.scene;
    const cam = scene.cameras.main;
    const cx = cam.midPoint.x;
    const cy = cam.midPoint.y;
    const w = Math.min(600, cam.displayWidth - 24);
    const h = 300;
    const left = cx - w / 2;
    const top = cy - h / 2;
    const veil = scene.add
      .rectangle(cx, cy, cam.displayWidth + 40, cam.displayHeight + 40, 0x07060d, 0.85)
      .setInteractive();
    const frame = scene.add.graphics();
    frame.fillStyle(0x0d0a18, 0.98).fillRoundedRect(left, top, w, h, 10);
    frame.lineStyle(2, RACK_COLOR, 0.85).strokeRoundedRect(left, top, w, h, 10);
    this.root.add([veil, frame]);
    this.text(left + 14, top + 10, t('rack.title'), 15, '#ffb02e', true);
    this.text(left + 14, top + 30, t('rack.intro'), 10, COLORS.textDim);

    const equipped = chosenWeapon(this.meta);
    const cardW = (w - 28 - 3 * 8) / 4;
    const cardH = 96;
    WEAPON_ORDER.forEach((id, i) => {
      const row = i < 4 ? 0 : 1;
      const col = row === 0 ? i : i - 4 + 0.5;
      const x = left + 14 + col * (cardW + 8);
      const y = top + 54 + row * (cardH + 10);
      this.card(id, i, x, y, cardW, cardH, id === equipped);
    });

    this.text(cx, top + h - 16, t('heat.close'), 12, COLORS.text, true).setOrigin(0.5);
    const zone = scene.add.zone(cx, top + h - 16, 160, 28).setInteractive({ useHandCursor: true });
    zone.on('pointerup', () => this.close());
    this.root.add(zone);
  }

  private card(
    id: WeaponId,
    index: number,
    x: number,
    y: number,
    w: number,
    h: number,
    equipped: boolean,
  ): void {
    const def = WEAPONS[id];
    const unlocked = isUnlocked(this.meta, id);
    const g = this.scene.add.graphics();
    this.root.add(g);
    g.fillStyle(equipped ? 0x241a0a : 0x07060d, 1).fillRoundedRect(x, y, w, h, 8);
    g.lineStyle(equipped ? 3 : 1.5, unlocked ? def.color : 0x3a3550, unlocked ? 1 : 0.8);
    g.strokeRoundedRect(x, y, w, h, 8);
    const cx = x + w / 2;
    const zone = this.scene.add.zone(cx, y + h / 2, w, h).setInteractive({ useHandCursor: true });
    zone.on('pointerup', () => this.pick(id));
    // Arme secrète (Lame de l'Aube) : rien n'est dévoilé, pas même son nom.
    if (!unlocked && UNLOCK_COST[id] === undefined) {
      this.text(cx, y + h / 2, '?', 26, COLORS.textDim, true).setOrigin(0.5);
      this.root.add(zone);
      return;
    }
    this.text(
      cx,
      y + 10,
      t(def.nameKey as TextKey),
      11,
      unlocked ? COLORS.text : COLORS.textDim,
      true,
    ).setOrigin(0.5, 0);
    const level = forgeLevel(this.meta, id);
    const cost = UNLOCK_COST[id];
    const status = !unlocked
      ? cost !== undefined
        ? t('rack.locked', { cost })
        : t('rack.lockedDawn', { count: DAWNBLADE_VICTORIES })
      : equipped
        ? t('rack.equipped')
        : t('rack.choose', { key: index + 1 });
    this.text(
      cx,
      y + 30,
      level > 0 ? t('rack.forgeLevel', { level }) : ' ',
      9,
      '#ffe08a',
    ).setOrigin(0.5, 0);
    this.text(cx, y + h - 26, status, 10, equipped ? '#ffb02e' : COLORS.textDim, equipped)
      .setOrigin(0.5, 0)
      .setWordWrapWidth(w - 10)
      .setAlign('center');
    this.root.add(zone);
  }

  private pick(id: WeaponId): void {
    if (!isUnlocked(this.meta, id)) {
      // Arme verrouillée : direction la forge de Brokk.
      if (UNLOCK_COST[id] === undefined) return;
      this.destroy();
      this.onForge();
      return;
    }
    sfx.boonTaken();
    this.destroy();
    this.onPick(id);
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

  private destroy(): void {
    window.removeEventListener('keydown', this.onKey);
    this.root.destroy(true);
  }

  close(): void {
    sfx.tap();
    this.destroy();
    this.onClose();
  }
}
