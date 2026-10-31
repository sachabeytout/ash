import Phaser from 'phaser';
import { normalize, type Vec2 } from '../../core/geometry';
import { InputBuffer } from '../../core/input/buffer';
import { PLAYER } from '../../data/player';

export type Action = 'attack' | 'power' | 'dash' | 'super';
export type Device = 'keyboard' | 'mouse' | 'touch' | 'gamepad';

/** Touches physiques (event.code) : fonctionne en AZERTY comme en QWERTY (Z/W, Q/A même position). */
const MOVE_KEYS: Record<string, Vec2> = {
  KeyW: { x: 0, y: -1 },
  ArrowUp: { x: 0, y: -1 },
  KeyS: { x: 0, y: 1 },
  ArrowDown: { x: 0, y: 1 },
  KeyA: { x: -1, y: 0 },
  ArrowLeft: { x: -1, y: 0 },
  KeyD: { x: 1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
};
const ACTION_KEYS: Record<string, Action> = {
  KeyJ: 'attack',
  KeyK: 'power',
  Space: 'dash',
  ShiftLeft: 'dash',
  ShiftRight: 'dash',
  KeyE: 'super',
  KeyR: 'super',
};
/** Manette (disposition standard) : □/X attaque, △/Y puissante, ✕/A dash, ○/B super. */
const PAD_BUTTONS: Record<number, Action> = {
  2: 'attack',
  3: 'power',
  0: 'dash',
  7: 'dash',
  1: 'super',
  6: 'super',
};
const DEADZONE = 0.22;

/**
 * Regroupe clavier, souris, manette et tactile en une seule interface :
 * un vecteur de déplacement, une visée éventuelle, et des appuis mémorisés (input buffer).
 */
export class Controls {
  readonly buffer = new InputBuffer<Action>(PLAYER.inputBufferMs);
  move: Vec2 = { x: 0, y: 0 };
  /** Direction visée explicitement (stick droit) ou point visé (souris), sinon null. */
  aimDir: Vec2 | null = null;
  mouseWorld: Vec2 | null = null;
  lastDevice: Device = 'keyboard';
  /** Demande de pause (Échap, P, bouton Start, bouton pause tactile). */
  onPause: () => void = () => undefined;
  /** Déplacement fourni par le joystick tactile. */
  touchMove: Vec2 = { x: 0, y: 0 };

  private readonly held = new Set<string>();
  private readonly padPrev = new Map<number, boolean>();
  private readonly onKeyDown = (e: KeyboardEvent) => {
    if (e.code in MOVE_KEYS || e.code in ACTION_KEYS) e.preventDefault();
    if ((e.code === 'Escape' || e.code === 'KeyP') && !e.repeat) {
      this.onPause();
      return;
    }
    this.held.add(e.code);
    this.lastDevice = 'keyboard';
    const action = ACTION_KEYS[e.code];
    if (action && !e.repeat) this.press(action);
  };
  private readonly onKeyUp = (e: KeyboardEvent) => this.held.delete(e.code);
  private readonly onBlur = () => this.held.clear();

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly clock: () => number,
  ) {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onBlur);

    scene.input.mouse?.disableContextMenu();
    scene.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (p.wasTouch) return; // le tactile est géré par TouchControls
      this.lastDevice = 'mouse';
      this.press(p.rightButtonDown() ? 'power' : 'attack');
    });
    scene.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (!p.wasTouch) this.lastDevice = 'mouse';
    });
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.destroy());
  }

  press(action: Action): void {
    this.buffer.press(action, this.clock());
  }

  update(): void {
    // Clavier
    let kx = 0;
    let ky = 0;
    for (const code of this.held) {
      const v = MOVE_KEYS[code];
      if (v) {
        kx += v.x;
        ky += v.y;
      }
    }
    let move = normalize({ x: kx, y: ky });
    this.aimDir = null;

    // Manette
    const pad = navigator.getGamepads?.().find((p) => p?.connected) ?? null;
    if (pad) {
      const lx = pad.axes[0] ?? 0;
      const ly = pad.axes[1] ?? 0;
      if (Math.hypot(lx, ly) > DEADZONE) {
        move = { x: lx, y: ly };
        this.lastDevice = 'gamepad';
      }
      const rx = pad.axes[2] ?? 0;
      const ry = pad.axes[3] ?? 0;
      if (Math.hypot(rx, ry) > 0.45) {
        this.aimDir = normalize({ x: rx, y: ry });
        this.lastDevice = 'gamepad';
      }
      pad.buttons.forEach((b, i) => {
        const was = this.padPrev.get(i) ?? false;
        if (b.pressed && !was) {
          this.lastDevice = 'gamepad';
          if (i === 9) this.onPause();
          const action = PAD_BUTTONS[i];
          if (action) this.press(action);
        }
        this.padPrev.set(i, b.pressed);
      });
    }

    // Tactile
    if (Math.hypot(this.touchMove.x, this.touchMove.y) > 0) move = this.touchMove;

    this.move = move;

    // Souris : point visé dans le monde
    if (this.lastDevice === 'mouse') {
      const p = this.scene.input.activePointer;
      const w = this.scene.cameras.main.getWorldPoint(p.x, p.y);
      this.mouseWorld = { x: w.x, y: w.y };
    } else {
      this.mouseWorld = null;
    }
  }

  /** L'aide à la visée s'applique quand aucune visée précise n'est donnée (pas de souris ni de stick droit). */
  get wantsAimAssist(): boolean {
    return !this.aimDir && !this.mouseWorld;
  }

  destroy(): void {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.onBlur);
  }
}
