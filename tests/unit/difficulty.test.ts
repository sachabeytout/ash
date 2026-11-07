import { describe, expect, it } from 'vitest';
import { heatModifiers } from '../../src/core/heat';
import { createRng } from '../../src/core/rng';
import { planWaves } from '../../src/core/run/waves';
import { DIFFICULTY, MAX_ENEMIES } from '../../src/data/difficulty';
import { ENEMIES } from '../../src/data/enemies';
import { HEAT } from '../../src/data/heat';
import { WORLD_ORDER, getWorld } from '../../src/data/worlds';

const threat = (id: keyof typeof ENEMIES) => ENEMIES[id].threat;

/** Nombre total d'ennemis des vagues d'une salle, sur plusieurs tirages. */
function enemiesPlanned(budgetMul: number): number {
  let total = 0;
  for (const id of WORLD_ORDER) {
    for (const sector of getWorld(id).sectors) {
      for (let room = 1; room <= sector.rooms; room++) {
        for (let seed = 1; seed <= 20; seed++) {
          const waves = planWaves(sector, room, threat, createRng(seed * 31 + room), budgetMul);
          total += waves.reduce((n, w) => n + w.length, 0);
        }
      }
    }
  }
  return total;
}

describe('difficulté de base (retour du 06/11 : « trop facile »)', () => {
  it('les ennemis ont nettement plus de vie et les vagues sont nettement plus fournies', () => {
    expect(DIFFICULTY.enemyHp).toBeCloseTo(1.3);
    expect(DIFFICULTY.waveBudget).toBeCloseTo(1.3);
    expect(enemiesPlanned(DIFFICULTY.waveBudget)).toBeGreaterThan(enemiesPlanned(1) * 1.2);
  });

  it('même avec toutes les Mesures d’urgence, une vague tient dans la réserve d’ennemis', () => {
    const maxHeat = Object.fromEntries(HEAT.map((h) => [h.id, h.maxLevel]));
    const mul = DIFFICULTY.waveBudget * heatModifiers(maxHeat).waveBudget;
    for (const id of WORLD_ORDER) {
      for (const sector of getWorld(id).sectors) {
        for (let room = 1; room <= sector.rooms; room++) {
          for (let seed = 1; seed <= 20; seed++) {
            for (const wave of planWaves(sector, room, threat, createRng(seed), mul)) {
              // Marge pour l'élite qui ouvre une vague et les renforts.
              expect(wave.length).toBeLessThanOrEqual(MAX_ENEMIES - 4);
            }
          }
        }
      }
    }
  });
});
