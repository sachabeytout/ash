import Phaser from 'phaser';
import { settings } from '../../core/settings';
import { detectLocale, setLocale, t, type TextKey } from '../../i18n';
import { sfx } from '../audio/sfx';
import { session } from '../session';
import { COLORS, FONT_FAMILY } from '../theme';

type Row =
  | { kind: 'step'; key: 'masterVolume' | 'sfxVolume' | 'musicVolume' | 'touchButtonScale' }
  | { kind: 'toggle'; key: 'screenShake' | 'vibration' | 'aimAssist' | 'damageNumbers' }
  | { kind: 'choice'; key: 'joystick' | 'quality' | 'language'; values: readonly string[] };

const ROWS: readonly Row[] = [
  { kind: 'step', key: 'masterVolume' },
  { kind: 'step', key: 'sfxVolume' },
  { kind: 'step', key: 'musicVolume' },
  { kind: 'choice', key: 'quality', values: ['low', 'medium', 'high'] },
  { kind: 'choice', key: 'language', values: ['auto', 'fr', 'en'] },
  { kind: 'toggle', key: 'screenShake' },
  { kind: 'toggle', key: 'vibration' },
  { kind: 'toggle', key: 'aimAssist' },
  { kind: 'toggle', key: 'damageNumbers' },
  { kind: 'choice', key: 'joystick', values: ['floating', 'fixed'] },
  { kind: 'step', key: 'touchButtonScale' },
];

/** Bornes et pas des réglages chiffrés. */
const STEPS: Record<
  Extract<Row, { kind: 'step' }>['key'],
  { min: number; max: number; step: number }
> = {
  masterVolume: { min: 0, max: 1, step: 0.1 },
  sfxVolume: { min: 0, max: 1, step: 0.1 },
  musicVolume: { min: 0, max: 1, step: 0.1 },
  touchButtonScale: { min: 0.8, max: 1.4, step: 0.1 },
};

const ACCENT = 0xffb02e;

/** Fenêtre d'options (Cage et pause) : chaque changement est appliqué et enregistré tout de suite. */
export class OptionsPanel {
  private readonly root: Phaser.GameObjects.Container;
  private readonly onKey = (e: KeyboardEvent) => {
    if (e.code === 'Escape') this.close();
  };

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly onClose: () => void,
  ) {
    this.root = scene.add.container(0, 0).setDepth(200);
    this.build();
    setTimeout(() => window.addEventListener('keydown', this.onKey), 0);
  }

  private build(): void {
    this.root.removeAll(true);
    const scene = this.scene;
    const cam = scene.cameras.main;
    const cx = cam.midPoint.x;
    const cy = cam.midPoint.y;
    const w = Math.min(600, cam.width / cam.zoom - 20);
    const h = 336;
    const left = cx - w / 2;
    const top = cy - h / 2;

    const veil = scene.add
      .rectangle(cx, cy, cam.width + 40, cam.height + 40, 0x07060d, 0.88)
      .setInteractive();
    const frame = scene.add.graphics();
    frame.fillStyle(0x0d0a18, 0.98).fillRoundedRect(left, top, w, h, 10);
    frame.lineStyle(2, ACCENT, 0.8).strokeRoundedRect(left, top, w, h, 10);
    this.root.add([veil, frame]);
    this.text(left + 14, top + 10, t('options.title'), 15, '#ffb02e', true);

    // Deux colonnes de réglages.
    const colW = (w - 28) / 2;
    const rowH = 44;
    const perCol = Math.ceil(ROWS.length / 2);
    ROWS.forEach((row, i) => {
      const col = Math.floor(i / perCol);
      const x = left + 14 + col * (colW + 0);
      const y = top + 40 + (i % perCol) * rowH;
      this.text(x, y + 2, t(`options.${row.key}` as TextKey), 11, COLORS.textDim);
      this.control(row, x, y + 16, colW - 14);
    });

    const close = this.button(cx, top + h - 20, 160, 28, t('options.close'), () => this.close());
    this.root.add(close);
  }

  private control(row: Row, x: number, y: number, width: number): void {
    if (row.kind === 'step') {
      const cfg = STEPS[row.key];
      const value = settings[row.key];
      const change = (dir: number) => {
        const next = Math.round((value + dir * cfg.step) * 10) / 10;
        settings[row.key] = Math.min(cfg.max, Math.max(cfg.min, next));
        this.changed();
      };
      this.root.add(this.button(x + 16, y + 9, 30, 22, '−', () => change(-1)));
      this.text(x + 80, y + 9, `${Math.round(value * 100)} %`, 12, COLORS.text, true).setOrigin(
        0.5,
      );
      this.root.add(this.button(x + 144, y + 9, 30, 22, '+', () => change(1)));
      return;
    }
    if (row.kind === 'toggle') {
      const on = settings[row.key];
      this.root.add(
        this.button(x + width / 2, y + 9, width, 22, t(on ? 'options.on' : 'options.off'), () => {
          settings[row.key] = !on;
          this.changed();
        }),
      );
      return;
    }
    const current = String(settings[row.key]);
    const label = t(`options.${row.key}.${current}` as TextKey);
    this.root.add(
      this.button(x + width / 2, y + 9, width, 22, label, () => {
        const next = row.values[(row.values.indexOf(current) + 1) % row.values.length];
        (settings as unknown as Record<string, string>)[row.key] = next ?? row.values[0] ?? '';
        if (row.key === 'language') {
          const lang = settings.language;
          setLocale(lang === 'auto' ? detectLocale(navigator.languages) : lang);
        }
        this.changed();
      }),
    );
  }

  private changed(): void {
    sfx.tap();
    session.commit();
    this.build();
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

  private button(
    x: number,
    y: number,
    w: number,
    h: number,
    label: string,
    onTap: () => void,
  ): Phaser.GameObjects.Container {
    const c = this.scene.add.container(x, y);
    const g = this.scene.add.graphics();
    g.fillStyle(0x07060d, 1).fillRoundedRect(-w / 2, -h / 2, w, h, 6);
    g.lineStyle(1.5, ACCENT, 0.85).strokeRoundedRect(-w / 2, -h / 2, w, h, 6);
    const txt = this.scene.add
      .text(0, 0, label, { fontFamily: FONT_FAMILY, fontSize: '11px', color: COLORS.text })
      .setOrigin(0.5);
    // Zone de toucher un peu plus grande que le dessin.
    const zone = this.scene.add.zone(0, 0, w + 6, h + 10).setInteractive({ useHandCursor: true });
    zone.on('pointerup', onTap);
    c.add([g, txt, zone]);
    return c;
  }

  close(): void {
    window.removeEventListener('keydown', this.onKey);
    sfx.tap();
    this.root.destroy(true);
    this.onClose();
  }
}
