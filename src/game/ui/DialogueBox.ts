import Phaser from 'phaser';
import type { DialogueDef, SpeakerDef } from '../../data/story';
import { SPEAKERS } from '../../data/story';
import { t, type TextKey } from '../../i18n';
import { sfx } from '../audio/sfx';
import { COLORS, FONT_FAMILY } from '../theme';

/** Portrait simple : chaque personnage a sa forme (lisible sans les couleurs). */
function drawPortrait(g: Phaser.GameObjects.Graphics, def: SpeakerDef, x: number, y: number): void {
  g.fillStyle(0x07060d, 1).fillCircle(x, y, 20);
  g.lineStyle(2, def.color, 1).strokeCircle(x, y, 20);
  g.fillStyle(def.color, 1).lineStyle(2, def.color, 1);
  switch (def.shape) {
    case 'flame':
      g.fillTriangle(x - 8, y + 9, x + 8, y + 9, x, y - 12);
      g.fillStyle(0xfff2d0, 1).fillTriangle(x - 3, y + 9, x + 3, y + 9, x, y - 2);
      break;
    case 'ibis': // bec courbe de Thot
      g.fillCircle(x - 3, y - 3, 6);
      g.beginPath();
      g.arc(x + 6, y + 6, 9, Math.PI * 1.1, Math.PI * 1.6, false);
      g.strokePath();
      break;
    case 'raven':
      g.fillTriangle(x - 10, y + 6, x + 10, y - 4, x + 10, y + 8);
      g.fillStyle(0xffffff, 1).fillCircle(x + 5, y + 1, 1.6);
      break;
    case 'anvil':
      g.fillRect(x - 10, y - 6, 20, 6)
        .fillRect(x - 4, y, 8, 6)
        .fillRect(x - 8, y + 6, 16, 3);
      break;
    case 'net':
      for (const o of [-6, 0, 6]) {
        g.lineBetween(x + o, y - 10, x + o, y + 10);
        g.lineBetween(x - 10, y + o, x + 10, y + o);
      }
      break;
  }
}

/** Dialogue en bas de l'écran : toucher (ou Entrée) pour avancer, « Passer » pour tout fermer. */
export class DialogueBox {
  private readonly root: Phaser.GameObjects.Container;
  private index = 0;
  private openedAt: number;
  private readonly onKey = (e: KeyboardEvent) => {
    if (e.code === 'Enter' || e.code === 'Space' || e.code === 'KeyE') this.advance();
    if (e.code === 'Escape') this.close();
  };

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly dialogue: DialogueDef,
    private readonly onDone: () => void,
  ) {
    this.root = scene.add.container(0, 0).setDepth(150);
    this.openedAt = scene.time.now;
    this.draw();
    setTimeout(() => window.addEventListener('keydown', this.onKey), 0);
  }

  private draw(): void {
    this.root.removeAll(true);
    const line = this.dialogue.lines[this.index];
    if (!line) return;
    const scene = this.scene;
    const cam = scene.cameras.main;
    const cx = cam.midPoint.x;
    const w = Math.min(600, cam.displayWidth - 24);
    const h = 92;
    const left = cx - w / 2;
    const top = cam.midPoint.y + cam.displayHeight / 2 - h - 10;
    const speaker = SPEAKERS[line.speaker];

    const veil = scene.add
      .rectangle(cx, cam.midPoint.y, cam.displayWidth + 40, cam.displayHeight + 40, 0x07060d, 0.55)
      .setInteractive();
    veil.on('pointerup', () => this.advance());
    const g = scene.add.graphics();
    g.fillStyle(0x0d0a18, 0.97).fillRoundedRect(left, top, w, h, 10);
    g.lineStyle(2, speaker.color, 0.85).strokeRoundedRect(left, top, w, h, 10);
    drawPortrait(g, speaker, left + 34, top + 34);
    const name = scene.add.text(left + 64, top + 10, t(speaker.nameKey as TextKey), {
      fontFamily: FONT_FAMILY,
      fontSize: '12px',
      fontStyle: 'bold',
      color: `#${speaker.color.toString(16).padStart(6, '0')}`,
    });
    const text = scene.add.text(left + 64, top + 28, t(line.key as TextKey), {
      fontFamily: FONT_FAMILY,
      fontSize: '12px',
      color: COLORS.text,
      wordWrap: { width: w - 80 },
      lineSpacing: 3,
    });
    const hint = scene.add
      .text(left + w - 12, top + h - 8, t('dialogue.continue'), {
        fontFamily: FONT_FAMILY,
        fontSize: '9px',
        color: COLORS.textDim,
      })
      .setOrigin(1, 1);
    const skip = scene.add
      .text(left + w - 12, top + 8, t('dialogue.skip'), {
        fontFamily: FONT_FAMILY,
        fontSize: '10px',
        color: COLORS.textDim,
      })
      .setOrigin(1, 0)
      .setInteractive({ useHandCursor: true });
    skip.on('pointerup', (_p: unknown, _x: number, _y: number, e: { stopPropagation(): void }) => {
      e.stopPropagation();
      this.close();
    });
    this.root.add([veil, g, name, text, hint, skip]);
    this.root.setAlpha(0);
    scene.tweens.add({ targets: this.root, alpha: 1, duration: 160 });
  }

  private advance(): void {
    // Petit délai : un appui fait juste avant l'ouverture ne saute pas la réplique.
    if (this.scene.time.now - this.openedAt < 250) return;
    this.openedAt = this.scene.time.now;
    sfx.tap();
    this.index++;
    if (this.index >= this.dialogue.lines.length) this.close();
    else this.draw();
  }

  close(): void {
    window.removeEventListener('keydown', this.onKey);
    this.root.destroy(true);
    this.onDone();
  }
}
