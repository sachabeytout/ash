import { describe, expect, it } from 'vitest';
import { onTap } from '../../src/game/ui/tap';

/** Objet minimal qui reçoit et émet des évènements de pointeur, comme une zone Phaser. */
function fakeZone() {
  const handlers = new Map<string, ((p: { id: number }) => void)[]>();
  const zone = {
    on(event: string, fn: (p: { id: number }) => void) {
      handlers.set(event, [...(handlers.get(event) ?? []), fn]);
      return zone;
    },
    emit(event: string, id: number) {
      for (const fn of handlers.get(event) ?? []) fn({ id });
    },
  };
  return zone;
}

describe('toucher fiable dans les menus (retours du 02/11, point 4)', () => {
  it('le doigt du joystick, posé avant l’ouverture du menu, ne choisit rien en se levant', () => {
    const zone = fakeZone();
    let taps = 0;
    onTap(zone as never, () => taps++);
    zone.emit('pointerup', 1); // le pouce quitte le joystick, au-dessus de la carte
    expect(taps).toBe(0);
  });

  it('un vrai toucher sur la carte la choisit, même si un autre doigt reste sur le joystick', () => {
    const zone = fakeZone();
    let taps = 0;
    onTap(zone as never, () => taps++);
    zone.emit('pointerdown', 2);
    zone.emit('pointerup', 1); // le pouce gauche se lève : ignoré
    expect(taps).toBe(0);
    zone.emit('pointerup', 2);
    expect(taps).toBe(1);
  });

  it('glisser hors de la carte annule le toucher', () => {
    const zone = fakeZone();
    let taps = 0;
    onTap(zone as never, () => taps++);
    zone.emit('pointerdown', 1);
    zone.emit('pointerout', 1);
    zone.emit('pointerup', 1);
    expect(taps).toBe(0);
  });
});
