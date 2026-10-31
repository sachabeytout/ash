import Phaser from 'phaser';
import { drawFrame } from './frame';
import type { RunSummary } from '../../core/run/state';
import { getBiome } from '../../data/biomes';
import { getBoon } from '../../data/boons';
import { GODS } from '../../data/gods';
import { WEAPONS } from '../../data/weapons';
import { t, type TextKey } from '../../i18n';
import { sfx } from '../audio/sfx';
import { drawGodIcon } from '../icons';
import { COLORS, FONT_FAMILY } from '../theme';

const RECAP_COLOR = 0xffb02e;
const VICTORY_COLOR = 0xffe08a;

/** Récapitulatif de fin de run, au retour dans la Cage : où, pourquoi, combien, et les dons obtenus. */
export class RecapPanel {
  private readonly root: Phaser.GameObjects.Container;
  private readonly openedAt: number;
  private readonly onKey = (e: KeyboardEvent) => {
    if (e.code === 'Escape' || e.code === 'Enter' || e.code === 'Space') this.close();
  };

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly summary: RunSummary,
    private readonly onClose: () => void,
  ) {
    this.root = scene.add.container(0, 0).setDepth(100);
    this.openedAt = scene.time.now;
    this.build();
    setTimeout(() => window.addEventListener('keydown', this.onKey), 0);
  }

  private build(): void {
    const scene = this.scene;
    const s = this.summary;
    const cam = scene.cameras.main;
    const cx = cam.midPoint.x;
    const cy = cam.midPoint.y;
    const w = Math.min(560, cam.displayWidth - 24);
    // Hauteur selon le nombre de dons (deux colonnes, six lignes au plus).
    const boonCount = Math.min(12, this.summary.boons?.length ?? 0);
    const perCol = Math.max(1, Math.min(6, Math.ceil(boonCount / 2)));
    const h = 196 + perCol * 18;
    const left = cx - w / 2;
    const top = cy - h / 2;
    const won = s.outcome === 'cleared';
    const color = won ? VICTORY_COLOR : RECAP_COLOR;
    const veil = scene.add
      .rectangle(cx, cy, cam.displayWidth + 40, cam.displayHeight + 40, 0x07060d, 0.85)
      .setInteractive();
    veil.on('pointerup', () => this.close());
    const frame = scene.add.graphics();
    drawFrame(frame, left, top, w, h, color, 0.98);
    this.root.add([veil, frame]);

    const hex = `#${color.toString(16).padStart(6, '0')}`;
    this.text(
      cx,
      top + 12,
      t(won ? 'recap.title.cleared' : 'recap.title.death'),
      17,
      hex,
      true,
    ).setOrigin(0.5, 0);
    const biome = t(getBiome(s.biome).nameKey as TextKey);
    const where = won
      ? t('recap.where.cleared')
      : s.room > getBiome(s.biome).rooms
        ? t('recap.where.boss', { biome, killer: s.killedBy ?? '?' })
        : t('recap.where.death', { biome, room: s.room, killer: s.killedBy ?? '?' });
    this.text(cx, top + 36, where, 11, COLORS.text).setOrigin(0.5, 0);

    // Statistiques : deux colonnes de trois lignes.
    const minutes = Math.floor(s.elapsedMs / 60000);
    const seconds = Math.floor((s.elapsedMs % 60000) / 1000);
    const stats: [string, string][] = [
      [t('recap.weapon'), s.weapon ? t(WEAPONS[s.weapon].nameKey as TextKey) : '—'],
      [t('recap.time'), `${minutes} min ${String(seconds).padStart(2, '0')} s`],
      [t('recap.rooms'), String(s.rooms ?? 0)],
      [t('recap.kills'), String(s.kills ?? 0)],
      [t('recap.damage'), String(s.damageTaken ?? 0)],
      [t('recap.rewards'), t('recap.rewardsValue', { xp: s.xp, parts: s.weaponParts })],
    ];
    const colW = (w - 40) / 2;
    stats.forEach(([label, value], i) => {
      const x = left + 20 + Math.floor(i / 3) * colW;
      const y = top + 62 + (i % 3) * 20;
      this.text(x, y, label, 10, COLORS.textDim);
      this.text(x + colW - 16, y, value, 11, COLORS.text, true).setOrigin(1, 0);
    });

    // Dons de la run : icône du dieu + nom, en deux colonnes.
    const by = top + 132;
    this.text(left + 20, by, t('recap.boons'), 11, hex, true);
    const boons = s.boons ?? [];
    if (boons.length === 0) this.text(left + 20, by + 20, t('recap.noBoons'), 10, COLORS.textDim);
    const icons = scene.add.graphics();
    this.root.add(icons);
    boons.slice(0, perCol * 2).forEach((owned, i) => {
      const def = getBoon(owned.id);
      if (!def) return;
      const x = left + 20 + Math.floor(i / perCol) * colW;
      const y = by + 22 + (i % perCol) * 18;
      const god = GODS[def.gods[0] ?? 'ra'];
      drawGodIcon(icons, god, x + 6, y + 6, 5);
      this.text(x + 18, y, t(def.nameKey as TextKey), 10, god.text);
    });

    const close = this.text(cx, top + h - 18, t('recap.continue'), 12, COLORS.text, true).setOrigin(
      0.5,
    );
    const zone = scene.add.zone(cx, top + h - 18, 180, 30).setInteractive({ useHandCursor: true });
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
    // Évite de fermer par erreur avec le toucher qui a ramené dans la Cage.
    if (this.scene.time.now - this.openedAt < 400) return;
    window.removeEventListener('keydown', this.onKey);
    sfx.tap();
    this.root.destroy(true);
    this.onClose();
  }
}
