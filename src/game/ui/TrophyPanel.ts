import Phaser from 'phaser';
import { drawFrame } from './frame';
import type { MetaState } from '../../core/save/schema';
import { trophyEarned, trophyProgress } from '../../core/trophies';
import { TROPHIES, type TrophyDef } from '../../data/trophies';
import { t, type TextKey } from '../../i18n';
import { sfx } from '../audio/sfx';
import { COLORS, FONT_FAMILY } from '../theme';

/** Or des trophées (jamais le rouge-magenta des dangers). */
export const TROPHY_COLOR = 0xffd36b;

/** Coupe de trophée (pleine si obtenu, en creux sinon : la forme suffit à lire l'état). */
export function drawTrophyCup(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  s: number,
  earned: boolean,
): void {
  const color = earned ? TROPHY_COLOR : 0x5a5070;
  g.lineStyle(Math.max(1.2, s * 0.14), color, 1);
  const cup = [
    new Phaser.Math.Vector2(x - s * 0.6, y - s * 0.7),
    new Phaser.Math.Vector2(x + s * 0.6, y - s * 0.7),
    new Phaser.Math.Vector2(x + s * 0.35, y + s * 0.05),
    new Phaser.Math.Vector2(x - s * 0.35, y + s * 0.05),
  ];
  if (earned) g.fillStyle(color, 1).fillPoints(cup, true);
  else g.strokePoints(cup, true);
  g.lineBetween(x - s * 0.6, y - s * 0.55, x - s * 0.85, y - s * 0.3);
  g.lineBetween(x + s * 0.6, y - s * 0.55, x + s * 0.85, y - s * 0.3);
  g.lineBetween(x, y + s * 0.05, x, y + s * 0.5);
  g.lineBetween(x - s * 0.4, y + s * 0.6, x + s * 0.4, y + s * 0.6);
}

/** Texte de la récompense : « +150 XP · 2 pièces d'arme ». */
export function rewardText(def: TrophyDef): string {
  const parts: string[] = [];
  if (def.reward.xp > 0) parts.push(t('trophy.rewardXp', { xp: def.reward.xp }));
  if (def.reward.weaponParts > 0)
    parts.push(t('trophy.rewardParts', { parts: def.reward.weaponParts }));
  return parts.join(' · ');
}

/** Vitrine des trophées : chaque grand objectif, où on en est, et ce qu'il rapporte. */
export class TrophyPanel {
  private readonly root: Phaser.GameObjects.Container;
  private readonly onKey = (e: KeyboardEvent) => {
    if (e.code === 'Escape') this.close();
  };

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly meta: MetaState,
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
    const w = Math.min(620, cam.displayWidth - 20);
    const h = Math.min(344, cam.displayHeight - 12);
    const left = cx - w / 2;
    const top = cy - h / 2;
    const veil = scene.add
      .rectangle(cx, cy, cam.displayWidth + 40, cam.displayHeight + 40, 0x07060d, 0.85)
      .setInteractive();
    const frame = scene.add.graphics();
    drawFrame(frame, left, top, w, h, TROPHY_COLOR, 0.98);
    this.root.add([veil, frame]);

    const earned = TROPHIES.filter((d) => this.meta.trophies.includes(d.id)).length;
    this.text(left + 14, top + 9, t('trophy.title'), 15, '#ffd36b', true);
    this.text(
      left + w - 14,
      top + 12,
      t('trophy.count', { earned, total: TROPHIES.length }),
      11,
      COLORS.text,
      true,
    ).setOrigin(1, 0);

    const cols = 2;
    const rows = Math.ceil(TROPHIES.length / cols);
    const gridTop = top + 34;
    const rowH = (h - 34 - 30) / rows;
    const colW = (w - 28) / cols;
    const g = scene.add.graphics();
    this.root.add(g);
    TROPHIES.forEach((def, i) => {
      const x = left + 14 + Math.floor(i / rows) * colW;
      const y = gridTop + (i % rows) * rowH;
      const done = this.meta.trophies.includes(def.id) || trophyEarned(this.meta, def);
      drawTrophyCup(g, x + 9, y + 9, 9, done);
      this.text(
        x + 24,
        y,
        t(`trophy.${def.id}` as TextKey),
        10,
        done ? '#ffd36b' : COLORS.text,
        true,
      );
      this.text(
        x + 24,
        y + 12,
        t(`trophy.${def.id}.desc` as TextKey, { goal: def.goal }),
        8,
        COLORS.textDim,
      );
      this.text(x + 24, y + 22, rewardText(def), 8, done ? COLORS.textDim : '#ffe9d6');
      // Progression : barre et compte, à droite du nom.
      const right = x + colW - 10;
      const value = trophyProgress(this.meta, def.id);
      const ratio =
        def.id === 'swift' ? (done ? 1 : 0) : Math.min(1, value / Math.max(1, def.goal));
      const barW = 50;
      g.fillStyle(0x2a2440, 1).fillRect(right - barW, y + 4, barW, 4);
      g.fillStyle(done ? TROPHY_COLOR : 0x9ab4ff, 1).fillRect(right - barW, y + 4, barW * ratio, 4);
      this.text(
        right - barW - 4,
        y,
        done ? '✓' : def.id === 'swift' ? '—' : `${Math.min(value, def.goal)}/${def.goal}`,
        8,
        done ? '#ffd36b' : COLORS.textDim,
      ).setOrigin(1, 0);
    });

    const close = this.text(cx, top + h - 18, t('trophy.close'), 12, COLORS.text, true).setOrigin(
      0.5,
    );
    const zone = scene.add.zone(cx, top + h - 18, 160, 28).setInteractive({ useHandCursor: true });
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
