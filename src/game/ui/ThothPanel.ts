import Phaser from 'phaser';
import { drawFrame, drawCartoucheRect } from './frame';
import { buySkill, isSkillUnlocked, nextCost, skillLevel } from '../../core/meta';
import type { MetaState } from '../../core/save/schema';
import { SKILLS, SKILL_BRANCHES, type SkillBranch, type SkillDef } from '../../data/skills';
import { t, type TextKey } from '../../i18n';
import { sfx } from '../audio/sfx';
import { COLORS, FONT_FAMILY } from '../theme';

const THOTH = 0x7fffc0;
/** Couleur de chaque branche (jamais le rouge-magenta des dangers). */
const BRANCH_COLOR: Record<SkillBranch, number> = {
  body: 0xff9a5a,
  blade: 0xffd36b,
  spirit: 0x7fffc0,
};

/** Valeur affichée d'un effet (PV, %, PV par salle…). */
function displayValue(skill: SkillDef, level: number): number {
  const total = skill.perLevel * level;
  const flat: readonly string[] = [
    'maxHp',
    'healPerRoom',
    'startShards',
    'revive',
    'bossHp',
    'startEngraving',
    'rareFirst',
    'extraChoice',
  ];
  return flat.includes(skill.effect) ? Math.round(total) : Math.round(total * 100);
}

/**
 * Fenêtre de l'arbre de Thot (retour F9) : trois onglets (Corps, Lame, Esprit) ; chaque branche est
 * une chaîne de compétences, chacune débloquée par un niveau de la précédente.
 */
export class ThothPanel {
  private readonly root: Phaser.GameObjects.Container;
  private branch: SkillBranch = 'body';
  private readonly onKey = (e: KeyboardEvent) => {
    if (e.code === 'Escape' || e.code === 'KeyT') this.close();
    const i = SKILL_BRANCHES.indexOf(this.branch);
    if (e.code === 'ArrowRight' || e.code === 'KeyD') this.show(SKILL_BRANCHES[(i + 1) % 3]);
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') this.show(SKILL_BRANCHES[(i + 2) % 3]);
  };

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly meta: MetaState,
    private readonly onChange: () => void,
    private readonly onClose: () => void,
  ) {
    this.root = scene.add.container(0, 0).setDepth(100);
    this.build();
    // Ajouté au tour suivant : l'appui qui a ouvert la fenêtre ne la referme pas.
    setTimeout(() => window.addEventListener('keydown', this.onKey), 0);
  }

  private show(branch: SkillBranch | undefined): void {
    if (!branch || branch === this.branch) return;
    this.branch = branch;
    sfx.tap();
    this.build();
  }

  private build(): void {
    this.root.removeAll(true);
    const scene = this.scene;
    const cam = scene.cameras.main;
    const cx = cam.midPoint.x;
    const cy = cam.midPoint.y;
    const w = Math.min(600, cam.displayWidth - 24);
    const h = 340;
    const left = cx - w / 2;
    const top = cy - h / 2;

    const veil = scene.add
      .rectangle(cx, cy, cam.displayWidth + 40, cam.displayHeight + 40, 0x07060d, 0.85)
      .setInteractive(); // bloque les touches sur la Cage derrière
    const frame = scene.add.graphics();
    drawFrame(frame, left, top, w, h, THOTH, 0.98);
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

    // Onglets des trois branches.
    const tabW = (w - 28 - 12) / 3;
    SKILL_BRANCHES.forEach((b, i) => {
      const tx = left + 14 + i * (tabW + 6);
      const ty = top + 46;
      const active = b === this.branch;
      const g = scene.add.graphics();
      g.fillStyle(active ? BRANCH_COLOR[b] : COLORS.panel, active ? 0.22 : 0.9).fillRect(
        tx,
        ty,
        tabW,
        22,
      );
      g.lineStyle(active ? 2 : 1, BRANCH_COLOR[b], active ? 1 : 0.5).strokeRect(tx, ty, tabW, 22);
      this.root.add(g);
      const label = text(
        tx + tabW / 2,
        ty + 11,
        t(`thoth.branch.${b}` as TextKey),
        11,
        COLORS.text,
        active,
      );
      label.setOrigin(0.5);
      const zone = scene.add
        .zone(tx + tabW / 2, ty + 11, tabW, 26)
        .setInteractive({ useHandCursor: true });
      zone.on('pointerup', () => this.show(b));
      this.root.add(zone);
    });

    // La chaîne de la branche : une ligne par compétence, reliées par un trait.
    const skills = SKILLS.filter((s) => s.branch === this.branch);
    const color = BRANCH_COLOR[this.branch];
    const rowTop = top + 76;
    const rowH = Math.min(40, (h - 76 - 30) / skills.length);
    const chain = scene.add.graphics();
    this.root.add(chain);
    skills.forEach((skill, i) => {
      const y = rowTop + i * rowH;
      const x = left + 14;
      const level = skillLevel(this.meta, skill);
      const max = skill.costs.length;
      const cost = nextCost(this.meta, skill);
      const unlocked = isSkillUnlocked(this.meta, skill);
      // Pastille de la chaîne et trait vers la suivante.
      chain.fillStyle(level > 0 ? color : COLORS.panel, 1).fillCircle(x + 5, y + 9, 5);
      chain.lineStyle(1.5, color, unlocked ? 1 : 0.35).strokeCircle(x + 5, y + 9, 5);
      if (i < skills.length - 1)
        chain
          .lineStyle(1.5, color, level > 0 ? 0.9 : 0.3)
          .lineBetween(x + 5, y + 14, x + 5, y + rowH + 4);
      const nameColor = unlocked ? COLORS.text : COLORS.textDim;
      text(x + 16, y + 2, t(skill.nameKey as TextKey), 11, nameColor, unlocked);
      const pips = scene.add.graphics();
      for (let p = 0; p < max; p++) {
        const px = x + 20 + p * 10;
        pips.lineStyle(1.2, color, unlocked ? 1 : 0.4).strokeRect(px - 3.5, y + 18, 7, 7);
        if (p < level) pips.fillStyle(color, 1).fillRect(px - 2, y + 19.5, 4, 4);
      }
      this.root.add(pips);
      const shown = Math.max(1, level);
      const descText = unlocked
        ? t(skill.descKey as TextKey, { value: displayValue(skill, shown) })
        : t('thoth.locked', {
            name: t(`skill.${skill.requires ?? ''}` as TextKey),
          });
      text(
        x + 26 + max * 10,
        y + 15,
        descText,
        9,
        level > 0 ? COLORS.text : COLORS.textDim,
      ).setWordWrapWidth(w - 28 - 26 - max * 10 - 112);

      const bx = left + w - 14 - 50;
      const by = y + 12;
      const affordable = unlocked && cost !== null && this.meta.xp >= cost;
      const btn = scene.add.graphics();
      drawCartoucheRect(btn, bx - 48, by - 11, 96, 22, affordable ? color : 0x3a3550);
      this.root.add(btn);
      text(
        bx,
        by,
        cost === null ? t('thoth.maxed') : t('thoth.buyShort', { cost }),
        10,
        affordable ? COLORS.text : COLORS.textDim,
        affordable,
      ).setOrigin(0.5);
      if (affordable) {
        const zone = scene.add.zone(bx, by, 96, 26).setInteractive({ useHandCursor: true });
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
    window.removeEventListener('keydown', this.onKey);
    sfx.tap();
    this.root.destroy(true);
    this.onClose();
  }
}
