import { describe, expect, it } from 'vitest';
import { newRun, takeRoomReward } from '../../src/core/run/state';
import { migrate } from '../../src/core/save/migrations';

describe('récompense en fin de salle', () => {
  it('la porte choisie ne rapporte rien tout de suite : le butin tombe à la fin de la salle', () => {
    const run = newRun(1, 'katana', 50, 0, 'ra');
    run.pendingBoon = null;
    run.roomReward = { kind: 'xp' };
    expect(run.xp).toBe(0);
    expect(takeRoomReward(run)).toEqual({ kind: 'xp' });
    expect(run.xp).toBeGreaterThan(0);
    expect(run.roomReward).toBeNull();
    // Rien en double si on ramasse deux fois.
    const xp = run.xp;
    expect(takeRoomReward(run)).toBeNull();
    expect(run.xp).toBe(xp);
  });

  it('un butin de don ou d’Étincelle reste à choisir', () => {
    const run = newRun(1, 'katana', 50, 0, 'ra');
    run.pendingBoon = null;
    run.roomReward = { kind: 'boon', god: 'isis' };
    takeRoomReward(run);
    expect(run.pendingBoon).toBe('isis');
    run.roomReward = { kind: 'spark' };
    takeRoomReward(run);
    expect(run.pendingSpark).toBe(true);
  });

  it('une partie d’avant (v16) n’a aucun butin en attente, et un butin abîmé est ignoré', () => {
    const run: Record<string, unknown> = { ...newRun(7, 'katana', 50, 0, 'ra') };
    delete run.roomReward;
    expect(migrate({ version: 16, meta: {}, settings: {}, run }).run?.roomReward).toBeNull();
    const broken = { ...newRun(7, 'katana', 50, 0, 'ra'), roomReward: { kind: 'gold' } };
    expect(
      migrate({ version: 17, meta: {}, settings: {}, run: broken }).run?.roomReward,
    ).toBeNull();
    const ok = { ...newRun(7, 'katana', 50, 0, 'ra'), roomReward: { kind: 'boon', god: 'neith' } };
    expect(migrate({ version: 17, meta: {}, settings: {}, run: ok }).run?.roomReward).toEqual({
      kind: 'boon',
      god: 'neith',
    });
  });
});
