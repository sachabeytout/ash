import { describe, expect, it } from 'vitest';
import {
  TUTORIAL_MOVE_DISTANCE,
  newTutorial,
  stepTutorial,
  tutorialDone,
} from '../../src/core/tutorial';

describe('premier essai guidé', () => {
  it('montre les gestes de base dans l’ordre, chacun disparaît une fois fait', () => {
    const s = newTutorial();
    expect(s.step).toBe('move');
    stepTutorial(s, { type: 'attack' }); // geste pas encore demandé : ignoré
    expect(s.step).toBe('move');
    stepTutorial(s, { type: 'moved', distance: TUTORIAL_MOVE_DISTANCE / 2 });
    expect(s.step).toBe('move');
    expect(stepTutorial(s, { type: 'moved', distance: TUTORIAL_MOVE_DISTANCE })).toBe(true);
    expect(s.step).toBe('attack');
    stepTutorial(s, { type: 'attack' });
    expect(s.step).toBe('dash');
    stepTutorial(s, { type: 'dash' });
    expect(s.step).toBe('power');
    stepTutorial(s, { type: 'power' });
    expect(s.step).toBeNull();
  });

  it('les portes et le Super passent avant, puis on reprend où on en était', () => {
    const s = newTutorial();
    stepTutorial(s, { type: 'moved', distance: 100 });
    stepTutorial(s, { type: 'superReady' });
    expect(s.step).toBe('super');
    stepTutorial(s, { type: 'roomCleared' });
    expect(s.step).toBe('doors');
    // La jauge pleine ne cache pas les portes.
    expect(stepTutorial(s, { type: 'superReady' })).toBe(false);
    stepTutorial(s, { type: 'doorTaken' });
    expect(s.step).toBe('attack');
    stepTutorial(s, { type: 'superReady' });
    stepTutorial(s, { type: 'super' });
    expect(s.step).toBe('attack');
  });

  it('se termine quand tout a été montré', () => {
    const s = newTutorial();
    for (const e of [
      { type: 'moved', distance: 100 },
      { type: 'attack' },
      { type: 'dash' },
      { type: 'power' },
      { type: 'roomCleared' },
      { type: 'doorTaken' },
    ] as const)
      stepTutorial(s, e);
    expect(tutorialDone(s)).toBe(false);
    stepTutorial(s, { type: 'superReady' });
    stepTutorial(s, { type: 'super' });
    expect(tutorialDone(s)).toBe(true);
  });
});
