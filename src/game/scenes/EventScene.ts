import Phaser from 'phaser';
import { drawFrame } from '../ui/frame';
import type { EventCost, EventId } from '../../core/run/events';
import { t, type TextKey } from '../../i18n';
import { sfx } from '../audio/sfx';
import { makeButton } from '../ui/button';
import { COLORS, FONT_FAMILY } from '../theme';
import { markScene } from './markScene';
import { drawEventIcon, EVENT_COLOR } from './eventIcons';
import { viewSize } from '../view';

export interface EventSceneData {
  id: EventId;
  cost: EventCost;
  /** Raison du refus (déjà fait, pas assez de PV ou d'éclats) ; absent si on peut accepter. */
  blocked?: 'taken' | 'hp' | 'shards' | undefined;
  extra: Record<string, number>;
  onTake: () => void;
  onLeave: () => void;
}

/** Salle d'évènement : un court texte, « Accepter » ou « Partir » (toujours possible). */
export class EventScene extends Phaser.Scene {
  private data_!: EventSceneData;
  private closing = false;
  private openedAt = 0;
  private readonly onKey = (e: KeyboardEvent) => {
    if (e.code === 'Enter' || e.code === 'Digit1') this.take();
    if (e.code === 'Escape' || e.code === 'Digit2') this.leave();
  };

  constructor() {
    super('event');
  }

  init(data: EventSceneData): void {
    this.data_ = data;
    this.closing = false;
  }

  create(): void {
    this.openedAt = this.time.now;
    const { width, height } = viewSize(this);
    const cx = width / 2;
    const cy = height / 2;
    const d = this.data_;
    const color = EVENT_COLOR[d.id];
    this.add.rectangle(0, 0, width, height, 0x07060d, 0.72).setOrigin(0).setInteractive();
    const w = Math.min(440, width - 32);
    const h = 176;
    const g = this.add.graphics();
    drawFrame(g, cx - w / 2, cy - h / 2, w, h, color, 0.97);
    drawEventIcon(this.add.graphics(), d.id, cx - w / 2 + 40, cy - h / 2 + 44, 1.4);

    const left = cx - w / 2 + 80;
    this.add.text(left, cy - h / 2 + 22, t(`event.${d.id}.title` as TextKey), {
      fontFamily: FONT_FAMILY,
      fontSize: '16px',
      fontStyle: 'bold',
      color: `#${color.toString(16).padStart(6, '0')}`,
    });
    this.add.text(left, cy - h / 2 + 48, t(`event.${d.id}.desc` as TextKey), {
      fontFamily: FONT_FAMILY,
      fontSize: '11px',
      color: COLORS.text,
      lineSpacing: 3,
      wordWrap: { width: w - 100 },
    });

    const vars = { hp: d.cost.hp, shards: d.cost.shards, ...d.extra };
    const by = cy + h / 2 - 32;
    const accept = d.blocked
      ? t(`event.blocked.${d.blocked}` as TextKey, vars)
      : t(`event.${d.id}.accept` as TextKey, vars);
    makeButton(this, {
      x: cx - w / 4 + 6,
      y: by,
      w: w / 2 - 24,
      h: 38,
      label: accept,
      color: d.blocked ? 0x3a3550 : color,
      fontSize: 11,
      onTap: () => this.take(),
    });
    makeButton(this, {
      x: cx + w / 4 - 6,
      y: by,
      w: w / 2 - 24,
      h: 38,
      label: t('event.leave'),
      color: 0x9a8fb5,
      fontSize: 12,
      onTap: () => this.leave(),
    });

    setTimeout(() => window.addEventListener('keydown', this.onKey), 0);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () =>
      window.removeEventListener('keydown', this.onKey),
    );
    markScene('event');
  }

  private take(): void {
    if (this.closing || this.data_.blocked || this.time.now - this.openedAt < 300) return;
    this.closing = true;
    sfx.eventTake();
    this.scene.stop();
    this.data_.onTake();
  }

  private leave(): void {
    if (this.closing) return;
    this.closing = true;
    sfx.tap();
    this.scene.stop();
    this.data_.onLeave();
  }
}
