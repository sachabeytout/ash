import Phaser from 'phaser';
import {
  CODEX,
  CODEX_SECTIONS,
  codexProgress,
  isDiscovered,
  type CodexEntry,
  type CodexSection,
} from '../../core/codex';
import type { MetaState } from '../../core/save/schema';
import { BOSSES, type BossId } from '../../data/bosses';
import { ENEMIES, type EnemyId } from '../../data/enemies';
import { GODS, type GodId } from '../../data/gods';
import { t, type TextKey } from '../../i18n';
import { sfx } from '../audio/sfx';
import { drawGodIcon } from '../icons';
import { COLORS, FONT_FAMILY } from '../theme';
import { DIALOGUES, SPEAKERS, type DialogueDef } from '../../data/story';
import { DialogueBox } from './DialogueBox';

/** Couleur des Archives : le vert de Thot. */
const CODEX_COLOR = 0x7fffc0;

/** Onglets : les trois sections de fiches, puis les souvenirs (dialogues déjà entendus). */
type Tab = CodexSection | 'memory';
const TABS: readonly Tab[] = [...CODEX_SECTIONS, 'memory'];

/** Archives de Thot : onglets Ennemis / Boss / Dieux, liste à gauche, fiche à droite. */
export class CodexPanel {
  private readonly root: Phaser.GameObjects.Container;
  private section: Tab = 'enemy';
  /** Un souvenir est en train d'être réécouté : la fenêtre est masquée. */
  private replaying = false;
  private selected: string | null = null;
  private readonly onKey = (e: KeyboardEvent) => {
    if (this.replaying) return;
    if (e.code === 'Escape' || e.code === 'KeyA') this.close();
    const tab = ['Digit1', 'Digit2', 'Digit3', 'Digit4'].indexOf(e.code);
    const section = TABS[tab];
    if (section) this.show(section);
  };

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly meta: MetaState,
    private readonly onClose: () => void,
  ) {
    this.root = scene.add.container(0, 0).setDepth(100);
    this.show('enemy');
    setTimeout(() => window.addEventListener('keydown', this.onKey), 0);
  }

  private show(section: Tab): void {
    this.section = section;
    if (section === 'memory') {
      this.selected = this.memories()[0]?.id ?? null;
      this.build();
      return;
    }
    const first = CODEX.find((e) => e.section === section && isDiscovered(this.meta, e.key));
    this.selected = first?.key ?? null;
    this.build();
  }

  private build(): void {
    this.root.removeAll(true);
    const scene = this.scene;
    const cam = scene.cameras.main;
    const cx = cam.midPoint.x;
    const cy = cam.midPoint.y;
    const w = Math.min(600, cam.width - 24);
    const h = 320;
    const left = cx - w / 2;
    const top = cy - h / 2;
    const veil = scene.add
      .rectangle(cx, cy, cam.width + 40, cam.height + 40, 0x07060d, 0.85)
      .setInteractive();
    const frame = scene.add.graphics();
    frame.fillStyle(0x0d0a18, 0.98).fillRoundedRect(left, top, w, h, 10);
    frame.lineStyle(2, CODEX_COLOR, 0.85).strokeRoundedRect(left, top, w, h, 10);
    this.root.add([veil, frame]);

    this.text(left + 14, top + 10, t('codex.title'), 15, '#7fffc0', true);
    this.text(left + 14, top + 30, t('codex.intro'), 10, COLORS.textDim);
    const { found, total } = codexProgress(this.meta);
    this.text(
      left + w - 14,
      top + 12,
      t('codex.progress', { found, total }),
      11,
      COLORS.text,
      true,
    ).setOrigin(1, 0);

    // Onglets.
    TABS.forEach((section, i) => {
      const tx = left + 14 + i * 104;
      const active = section === this.section;
      const g = scene.add.graphics();
      this.root.add(g);
      g.fillStyle(active ? 0x15302a : 0x07060d, 1).fillRoundedRect(tx, top + 48, 96, 24, 6);
      g.lineStyle(1.5, CODEX_COLOR, active ? 1 : 0.35).strokeRoundedRect(tx, top + 48, 96, 24, 6);
      this.text(
        tx + 48,
        top + 60,
        t(`codex.tab.${section}` as TextKey),
        11,
        active ? COLORS.text : COLORS.textDim,
        active,
      ).setOrigin(0.5);
      const zone = scene.add
        .zone(tx + 48, top + 60, 96, 28)
        .setInteractive({ useHandCursor: true });
      zone.on('pointerup', () => {
        sfx.tap();
        this.show(section);
      });
      this.root.add(zone);
    });

    const listW = Math.round(w * 0.5);
    if (this.section === 'memory') {
      this.buildMemories(left, top, listW, w - listW - 24);
      this.closeButton(cx, top + h - 16);
      return;
    }
    // Liste (deux colonnes) à gauche.
    const entries = CODEX.filter((e) => e.section === this.section);
    const colW = (listW - 14) / 2;
    const perCol = Math.ceil(entries.length / 2);
    const rowH = Math.min(24, 196 / perCol);
    entries.forEach((entry, i) => {
      const col = Math.floor(i / perCol);
      const x = left + 14 + col * colW;
      const y = top + 84 + (i % perCol) * rowH;
      this.row(entry, x, y, colW - 6, rowH - 3);
    });

    // Fiche à droite.
    const dx = left + listW + 10;
    const dw = w - listW - 24;
    const panel = scene.add.graphics();
    panel.fillStyle(0x07060d, 0.9).fillRoundedRect(dx, top + 84, dw, 200, 8);
    panel.lineStyle(1, CODEX_COLOR, 0.35).strokeRoundedRect(dx, top + 84, dw, 200, 8);
    this.root.add(panel);
    const entry = CODEX.find((e) => e.key === this.selected);
    if (entry && isDiscovered(this.meta, entry.key)) {
      const icon = scene.add.graphics();
      this.drawIcon(icon, entry, dx + 22, top + 106, 9);
      this.root.add(icon);
      this.text(dx + 40, top + 98, this.name(entry), 13, COLORS.text, true);
      this.text(
        dx + 12,
        top + 124,
        t(`codex.count.${entry.section}` as TextKey, { count: this.meta.codex[entry.key] ?? 0 }),
        10,
        '#7fffc0',
      );
      this.text(dx + 12, top + 144, t(`codex.${entry.key}` as TextKey), 10, COLORS.text)
        .setWordWrapWidth(dw - 24)
        .setLineSpacing(3);
    } else {
      this.text(dx + 12, top + 98, t('codex.unknown'), 13, COLORS.textDim, true);
      this.text(dx + 12, top + 124, t('codex.unknownDesc'), 10, COLORS.textDim).setWordWrapWidth(
        dw - 24,
      );
    }

    this.closeButton(cx, top + h - 16);
  }

  private closeButton(x: number, y: number): void {
    this.text(x, y, t('heat.close'), 12, COLORS.text, true).setOrigin(0.5);
    const zone = this.scene.add.zone(x, y, 160, 28).setInteractive({ useHandCursor: true });
    zone.on('pointerup', () => this.close());
    this.root.add(zone);
  }

  /** Dialogues déjà entendus, dans l'ordre où ils l'ont été. */
  private memories(): DialogueDef[] {
    return this.meta.seenDialogues
      .map((id) => DIALOGUES.find((d) => d.id === id))
      .filter((d): d is DialogueDef => d !== undefined);
  }

  private buildMemories(left: number, top: number, listW: number, dw: number): void {
    const list = this.memories();
    const dx = left + listW + 10;
    const panel = this.scene.add.graphics();
    panel.fillStyle(0x07060d, 0.9).fillRoundedRect(dx, top + 84, dw, 200, 8);
    panel.lineStyle(1, CODEX_COLOR, 0.35).strokeRoundedRect(dx, top + 84, dw, 200, 8);
    this.root.add(panel);
    if (list.length === 0) {
      this.text(dx + 12, top + 98, t('codex.memory.none'), 10, COLORS.textDim).setWordWrapWidth(
        dw - 24,
      );
      return;
    }
    // Liste : un souvenir par ligne (qui parle + début de la réplique), deux colonnes.
    const colW = (listW - 14) / 2;
    const perCol = Math.max(8, Math.ceil(list.length / 2));
    const rowH = Math.min(24, 196 / perCol);
    list.forEach((d, i) => {
      const x = left + 14 + Math.floor(i / perCol) * colW;
      const y = top + 84 + (i % perCol) * rowH;
      const first = d.lines[0];
      if (!first) return;
      const selected = d.id === this.selected;
      const g = this.scene.add.graphics();
      this.root.add(g);
      if (selected) g.fillStyle(0x15302a, 1).fillRoundedRect(x, y, colW - 6, rowH - 3, 4);
      g.fillStyle(SPEAKERS[first.speaker].color, 1).fillCircle(x + 9, y + (rowH - 3) / 2, 3.5);
      const excerpt = t(first.key as TextKey);
      const label = excerpt.length > 20 ? `${excerpt.slice(0, 19)}…` : excerpt;
      this.text(x + 18, y + (rowH - 3) / 2, label, 9, COLORS.text, selected).setOrigin(0, 0.5);
      const zone = this.scene.add
        .zone(x + (colW - 6) / 2, y + (rowH - 3) / 2, colW - 6, rowH)
        .setInteractive({ useHandCursor: true });
      zone.on('pointerup', () => {
        sfx.tap();
        this.selected = d.id;
        this.build();
      });
      this.root.add(zone);
    });
    // Le souvenir choisi : toutes ses répliques, et un bouton pour le réécouter.
    const chosen = list.find((d) => d.id === this.selected);
    if (!chosen) return;
    const text = chosen.lines
      .map((l) => `${t(SPEAKERS[l.speaker].nameKey as TextKey)} : ${t(l.key as TextKey)}`)
      .join('\n\n');
    this.text(dx + 12, top + 94, text, 9, COLORS.text)
      .setWordWrapWidth(dw - 24)
      .setLineSpacing(2);
    const by = top + 84 + 200 - 18;
    const g = this.scene.add.graphics();
    g.fillStyle(0x07060d, 1).fillRoundedRect(dx + dw / 2 - 60, by - 11, 120, 22, 6);
    g.lineStyle(1.5, CODEX_COLOR, 0.9).strokeRoundedRect(dx + dw / 2 - 60, by - 11, 120, 22, 6);
    this.root.add(g);
    this.text(dx + dw / 2, by, t('codex.memory.replay'), 10, COLORS.text, true).setOrigin(0.5);
    const zone = this.scene.add
      .zone(dx + dw / 2, by, 120, 26)
      .setInteractive({ useHandCursor: true });
    zone.on('pointerup', () => this.replay(chosen));
    this.root.add(zone);
  }

  /** Réécoute un souvenir dans la boîte de dialogue habituelle, puis revient aux Archives. */
  private replay(dialogue: DialogueDef): void {
    if (this.replaying) return;
    this.replaying = true;
    sfx.tap();
    this.root.setVisible(false);
    new DialogueBox(this.scene, dialogue, () => {
      this.replaying = false;
      this.root.setVisible(true);
    });
  }

  private row(entry: CodexEntry, x: number, y: number, w: number, h: number): void {
    const known = isDiscovered(this.meta, entry.key);
    const selected = entry.key === this.selected;
    const g = this.scene.add.graphics();
    this.root.add(g);
    if (selected) g.fillStyle(0x15302a, 1).fillRoundedRect(x, y, w, h, 4);
    if (known) this.drawIcon(g, entry, x + 9, y + h / 2, 5);
    else g.lineStyle(1, 0x3a3550, 1).strokeCircle(x + 9, y + h / 2, 4);
    this.text(
      x + 20,
      y + h / 2,
      known ? this.name(entry) : t('codex.unknown'),
      10,
      known ? COLORS.text : COLORS.textDim,
      selected,
    ).setOrigin(0, 0.5);
    const zone = this.scene.add
      .zone(x + w / 2, y + h / 2, w, h + 2)
      .setInteractive({ useHandCursor: true });
    zone.on('pointerup', () => {
      sfx.tap();
      this.selected = entry.key;
      this.build();
    });
    this.root.add(zone);
  }

  private name(entry: CodexEntry): string {
    if (entry.section === 'enemy') return t(ENEMIES[entry.id as EnemyId].nameKey as TextKey);
    if (entry.section === 'boss') return t(BOSSES[entry.id as BossId].nameKey as TextKey);
    return t(GODS[entry.id as GodId].nameKey as TextKey);
  }

  /** Petite icône : symbole du dieu, losange pour un boss, rond de la couleur de l'ennemi. */
  private drawIcon(
    g: Phaser.GameObjects.Graphics,
    entry: CodexEntry,
    x: number,
    y: number,
    size: number,
  ): void {
    if (entry.section === 'god') {
      drawGodIcon(g, GODS[entry.id as GodId], x, y, size);
      return;
    }
    if (entry.section === 'boss') {
      g.fillStyle(0xb8a8ff, 1).fillTriangle(x, y - size, x + size, y, x, y + size);
      g.fillTriangle(x, y - size, x - size, y, x, y + size);
      return;
    }
    g.fillStyle(ENEMIES[entry.id as EnemyId].color, 1).fillCircle(x, y, size * 0.8);
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
