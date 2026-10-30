import Phaser from 'phaser';
import { buySkill, nextCost, skillLevel } from '../../core/meta';
import type { MetaState } from '../../core/save/schema';
import { SKILLS, type SkillDef } from '../../data/skills';
import { t, type TextKey } from '../../i18n';
import { sfx } from '../audio/sfx';
import { COLORS, FONT_FAMILY } from '../theme';

const THOTH = 0x7fffc0;

/** Valeur affichée d'un effet (PV, %, PV par salle…). */
function displayValue(skill: SkillDef, level: number): number {
  const total = skill.perLevel * level;
  return skill.effect === 'maxHp' || skill.effect === 'healPerRoom'
    ? Math.round(total)
    : Math.round(total * 100);
}

/** Fenêtre de l'arbre de Thot : une ligne par compétence, niveau, effet, bouton d'achat. */
export class ThothPanel {
  private readonly root: Phaser.GameObjects.Container;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly meta: MetaState,
    private readonly onChange: () => void,
    private readonly onClose: () => void,
  ) {
    this.root = scene.add.container(0, 0).setDepth(100);
    this.build();
  }

  private build(): void {
    this.root.removeAll(true);
    const scene = this.scene;
    const cam = scene.cameras.main;
    const cx = cam.midPoint.x;
    const cy = cam.midPoint.y;
    const w = Math.min(600, cam.width - 24);
    const h = 340;
    const left = cx - w / 2;
    const top = cy - h / 2;

    const veil = scene.add
      .rectangle(cx, cy, cam.width + 40, cam.height + 40, 0x07060d, 0.85)
      .setInteractive(); // bloque les touches sur la Cage derrière
    const frame = scene.add.graphics();
    frame.fillStyle(0x0d0a18, 0.98).fillRoundedRect(left, top, w, h, 10);
    frame.lineStyle(2, THOTH, 0.8).strokeRoundedRect(left, top, w, h, 10);
    this.root.add([veil, frame]);

    const text = (
      x: number,
      y: number,
      value: string,
      size: number,
      color: string,
      bold = false,
    ) => {
      const obj = scene.add.text(x, y, value, {
        fontFamily: FONT_FAMILY,
        fontSize: `${size}px`,
        fontStyle: bold ? 'bold' : 'normal',
        color,
      });
      this.root.add(obj);
      return obj;
    };

    text(left + 14, top + 10, t('thoth.title'), 15, '#7fffc0', true);
    text(left + 14, top + 30, t('thoth.intro'), 10, COLORS.textDim);
    text(
      left + w - 14,
      top + 12,
      t('thoth.xp', { xp: this.meta.xp }),
      13,
      COLORS.text,
      true,
    ).setOrigin(1, 0);

    const rowTop = top + 52;
    const rowH = 50;
    SKILLS.forEach((skill, i) => {
      const y = rowTop + i * rowH;
      const level = skillLevel(this.meta, skill);
      const max = skill.costs.length;
      const cost = nextCost(this.meta, skill);
      text(left + 14, y + 4, t(skill.nameKey as TextKey), 12, COLORS.text, true);
      const pips = scene.add.graphics();
      for (let p = 0; p < max; p++) {
        const px = left + 18 + p * 12;
        pips.lineStyle(1.5, THOTH, 1).strokeRect(px - 4, y + 23, 8, 8);
        if (p < level) pips.fillStyle(THOTH, 1).fillRect(px - 2.5, y + 24.5, 5, 5);
      }
      this.root.add(pips);
      const shown = Math.max(1, level);
      text(
        left + 150,
        y + 4,
        `${t(skill.descKey as TextKey, { value: displayValue(skill, shown) })}${
          level === 0 ? '' : ` (${t('thoth.level', { level, max })})`
        }`,
        10,
        level > 0 ? COLORS.text : COLORS.textDim,
      ).setWordWrapWidth(w - 150 - 140);

      const bx = left + w - 72;
      const by = y + 17;
      const affordable = cost !== null && this.meta.xp >= cost;
      const btn = scene.add.graphics();
      btn.fillStyle(0x07060d, 1).fillRoundedRect(bx - 60, by - 15, 120, 30, 6);
      btn
        .lineStyle(2, affordable ? THOTH : 0x3a3550, 1)
        .strokeRoundedRect(bx - 60, by - 15, 120, 30, 6);
      this.root.add(btn);
      text(
        bx,
        by,
        cost === null ? t('thoth.maxed') : t('thoth.buy', { cost }),
        11,
        affordable ? COLORS.text : COLORS.textDim,
        affordable,
      ).setOrigin(0.5);
      if (affordable) {
        const zone = scene.add.zone(bx, by, 120, 30).setInteractive({ useHandCursor: true });
        zone.on('pointerup', () => {
          if (!buySkill(this.meta, skill)) return;
          sfx.boonTaken();
          this.onChange();
          this.build();
        });
        this.root.add(zone);
      }
    });

    const close = text(cx, top + h - 16, t('thoth.close'), 12, COLORS.text, true).setOrigin(0.5);
    const closeZone = scene.add
      .zone(cx, top + h - 16, 160, 28)
      .setInteractive({ useHandCursor: true });
    closeZone.on('pointerup', () => this.close());
    this.root.add([close, closeZone]);
  }

  close(): void {
    sfx.tap();
    this.root.destroy(true);
    this.onClose();
  }
}
