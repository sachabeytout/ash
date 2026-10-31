import Phaser from 'phaser';
import { drawCartouche } from '../ui/frame';
import type { RunState } from '../../core/run/state';
import { t } from '../../i18n';
import { addBoonMiniCard } from '../ui/boonCard';
import { sfx } from '../audio/sfx';
import { OptionsPanel } from '../ui/OptionsPanel';
import { COLORS, FONT_FAMILY } from '../theme';
import { markScene } from './markScene';
import { viewSize } from '../view';

export interface PauseSceneData {
  run: RunState;
  onResume: () => void;
  onAbandon: () => void;
}

/** Pause : reprendre, options, abandonner (avec confirmation). Rappel des dons obtenus. */
export class PauseScene extends Phaser.Scene {
  private data_!: PauseSceneData;
  private optionsOpen = false;
  private closing = false;
  private padPrev = new Map<number, boolean>();
  private readonly onKey = (e: KeyboardEvent) => {
    if (this.optionsOpen) return;
    if (e.code === 'Escape' || e.code === 'KeyP') this.resume();
  };

  constructor() {
    super('pause');
  }

  init(data: PauseSceneData): void {
    this.data_ = data;
    this.optionsOpen = false;
    this.closing = false;
    this.padPrev = new Map();
  }

  create(): void {
    const { width, height } = viewSize(this);
    const cx = width / 2;
    this.add.rectangle(0, 0, width, height, 0x07060d, 0.8).setOrigin(0).setInteractive();
    const style = {
      fontFamily: FONT_FAMILY,
      color: COLORS.text,
      stroke: '#07060d',
      strokeThickness: 3,
    };
    this.add
      .text(
        this.data_.run.boons.length ? Math.min(cx - 60, 250) / 2 + 4 : cx,
        34,
        t('pause.title'),
        {
          ...style,
          fontSize: '22px',
        },
      )
      .setOrigin(0.5);

    // À gauche les boutons ; à droite les dons obtenus, en petites cartes (effet compris).
    const boons = this.data_.run.boons;
    const listX = Math.min(cx - 60, 250);
    const btnX = boons.length ? listX / 2 + 4 : cx;
    if (boons.length) {
      const areaW = width - listX - 16;
      const top = 62;
      const areaH = height - top - 26;
      const cols = boons.length > 8 ? 3 : 2;
      const rows = Math.ceil(boons.length / cols);
      const gap = 6;
      const cardW = (areaW - gap * (cols - 1)) / cols;
      const cardH = Math.min(70, (areaH - gap * (rows - 1)) / rows);
      this.add
        .text(listX, top - 6, t('pause.boonsTitle'), {
          fontFamily: FONT_FAMILY,
          fontSize: '10px',
          color: COLORS.textDim,
        })
        .setOrigin(0, 1);
      boons.forEach((b, i) =>
        addBoonMiniCard(
          this,
          b,
          listX + (i % cols) * (cardW + gap),
          top + Math.floor(i / cols) * (cardH + gap),
          cardW,
          cardH,
        ),
      );
    } else {
      this.add
        .text(cx, 58, t('pause.noBoons'), {
          fontFamily: FONT_FAMILY,
          fontSize: '10px',
          color: COLORS.textDim,
        })
        .setOrigin(0.5, 0);
    }

    const button = (y: number, label: string, color: number, onTap: () => void) => {
      const cx = btnX;
      const w = boons.length ? Math.min(200, listX - 24) : 220;
      const h = 40;
      const g = this.add.graphics();
      drawCartouche(g, cx, y, w, h, color);
      const txt = this.add
        .text(cx, y, label, {
          fontFamily: FONT_FAMILY,
          fontSize: '14px',
          fontStyle: 'bold',
          color: COLORS.text,
        })
        .setOrigin(0.5);
      this.add
        .zone(cx, y, w, h + 8)
        .setInteractive({ useHandCursor: true })
        .on('pointerup', onTap);
      return txt;
    };
    const mid = height / 2 + 6;
    button(mid - 52, t('pause.resume'), 0xffb02e, () => this.resume());
    button(mid, t('pause.options'), 0x7fffc0, () => this.openOptions());
    let confirming = false;
    const abandon = button(mid + 52, t('hub.abandon'), 0x6b4cff, () => {
      if (!confirming) {
        confirming = true;
        abandon.setText(t('hub.abandonConfirm'));
        return;
      }
      this.leave(this.data_.onAbandon);
    });
    this.add
      .text(cx, height - 12, t('pause.hint'), {
        fontFamily: FONT_FAMILY,
        fontSize: '10px',
        color: COLORS.textDim,
      })
      .setOrigin(0.5, 1);

    setTimeout(() => window.addEventListener('keydown', this.onKey), 0);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () =>
      window.removeEventListener('keydown', this.onKey),
    );
    sfx.tap();
    markScene('pause');
  }

  override update(): void {
    if (this.optionsOpen) return;
    const pad = navigator.getGamepads?.().find((p) => p?.connected);
    if (!pad) return;
    for (const i of [9, 1]) {
      const now = pad.buttons[i]?.pressed ?? false;
      const was = this.padPrev.get(i) ?? true; // ignore l'appui qui a ouvert la pause
      this.padPrev.set(i, now);
      if (now && !was) this.resume();
    }
  }

  private openOptions(): void {
    if (this.optionsOpen) return;
    this.optionsOpen = true;
    new OptionsPanel(this, () => {
      this.optionsOpen = false;
      this.scene.restart(this.data_);
    });
  }

  private resume(): void {
    this.leave(this.data_.onResume);
  }

  private leave(then: () => void): void {
    if (this.closing) return;
    this.closing = true;
    sfx.tap();
    this.scene.stop();
    then();
  }
}
