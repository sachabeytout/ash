import Phaser from 'phaser';
import { drawFrame, drawCartoucheRect } from './frame';
import { summarizeLog } from '../../core/telemetry';
import { getBiome } from '../../data/biomes';
import { t, type TextKey } from '../../i18n';
import { sfx } from '../audio/sfx';
import { telemetry } from '../telemetry';
import { COLORS, FONT_FAMILY } from '../theme';

/** Menu de debug caché (5 touches sur le titre « Options ») : journal de jeu local, FPS. */
export class DebugPanel {
  private readonly root: Phaser.GameObjects.Container;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly onClose: () => void,
  ) {
    this.root = scene.add.container(0, 0).setDepth(300);
    this.build();
  }

  private build(): void {
    this.root.removeAll(true);
    const scene = this.scene;
    const cam = scene.cameras.main;
    const cx = cam.midPoint.x;
    const cy = cam.midPoint.y;
    const w = Math.min(560, cam.displayWidth - 24);
    const h = 300;
    const left = cx - w / 2;
    const top = cy - h / 2;
    const veil = scene.add
      .rectangle(cx, cy, cam.displayWidth + 40, cam.displayHeight + 40, 0x07060d, 0.92)
      .setInteractive();
    const frame = scene.add.graphics();
    drawFrame(frame, left, top, w, h, 0x9a8fb5, 1);
    this.root.add([veil, frame]);

    const log = telemetry.data;
    const summary = summarizeLog(log);
    const lines = [
      t('debug.runs', { runs: log.runs, rooms: log.rooms.length }),
      ...summary.biomes.map((b) =>
        t('debug.biome', {
          biome: t(getBiome(b.biome).nameKey as TextKey),
          count: b.count,
          seconds: Math.round(b.avgMs / 1000),
          hp: b.avgHpLost,
        }),
      ),
      summary.topDeaths.length
        ? t('debug.deaths', { list: summary.topDeaths.map(([c, n]) => `${c} ×${n}`).join(' · ') })
        : t('debug.noDeaths'),
    ];
    this.text(left + 14, top + 10, t('debug.title'), 14, '#c8bde6', true);
    this.text(left + 14, top + 36, lines.join('\n'), 11, COLORS.text).setLineSpacing(4);

    this.button(
      left + 110,
      top + h - 52,
      t(telemetry.showFps ? 'debug.fpsOn' : 'debug.fpsOff'),
      () => {
        telemetry.showFps = !telemetry.showFps;
        this.build();
      },
    );
    this.button(left + w - 110, top + h - 52, t('debug.clear'), () => {
      telemetry.clear();
      this.build();
    });
    this.button(cx, top + h - 18, t('options.close'), () => this.close());
  }

  private button(x: number, y: number, label: string, onTap: () => void): void {
    const g = this.scene.add.graphics();
    drawCartoucheRect(g, x - 90, y - 13, 180, 26, 0x9a8fb5);
    const txt = this.scene.add
      .text(x, y, label, { fontFamily: FONT_FAMILY, fontSize: '11px', color: COLORS.text })
      .setOrigin(0.5);
    const zone = this.scene.add.zone(x, y, 180, 30).setInteractive({ useHandCursor: true });
    zone.on('pointerup', () => {
      sfx.tap();
      onTap();
    });
    this.root.add([g, txt, zone]);
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
    this.root.destroy(true);
    this.onClose();
  }
}
