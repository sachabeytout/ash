import { describe, expect, it } from 'vitest';
import {
  AUTO_WARMUP_MS,
  AUTO_WINDOW_MS,
  lowerQuality,
  newAutoQuality,
  tickAutoQuality,
} from '../../src/core/perf';

/** Fait tourner `ms` millisecondes à `fps` images par seconde ; renvoie vrai si une baisse est demandée. */
function run(state: ReturnType<typeof newAutoQuality>, fps: number, ms: number): boolean {
  const dt = 1000 / fps;
  let lowered = false;
  for (let t = 0; t < ms; t += dt) lowered = tickAutoQuality(state, dt) || lowered;
  return lowered;
}

describe('qualité automatique', () => {
  it('ne baisse pas à 60 images par seconde', () => {
    expect(run(newAutoQuality(), 60, 20000)).toBe(false);
  });

  it('baisse si le jeu reste sous 48 images par seconde', () => {
    expect(run(newAutoQuality(), 30, AUTO_WARMUP_MS + AUTO_WINDOW_MS + 500)).toBe(true);
  });

  it('ignore le chargement du début', () => {
    expect(run(newAutoQuality(), 20, AUTO_WARMUP_MS - 100)).toBe(false);
  });

  it('une longue pause (app en arrière-plan) ne déclenche rien', () => {
    const s = newAutoQuality();
    run(s, 60, AUTO_WARMUP_MS + 1000);
    expect(tickAutoQuality(s, 5000)).toBe(false);
    expect(run(s, 60, AUTO_WINDOW_MS * 2)).toBe(false);
  });

  it('descend d’un cran à la fois, jamais sous « Basse »', () => {
    expect(lowerQuality('high')).toBe('medium');
    expect(lowerQuality('medium')).toBe('low');
    expect(lowerQuality('low')).toBeNull();
  });
});
