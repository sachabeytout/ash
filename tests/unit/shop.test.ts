import { describe, expect, it } from 'vitest';
import { createRng } from '../../src/core/rng';
import { newRun } from '../../src/core/run/state';
import { buyItem, canAfford } from '../../src/core/shop';
import { SHOP_ITEMS } from '../../src/data/shop';
import { allDictionaries } from '../../src/i18n';

const item = (id: string) => {
  const found = SHOP_ITEMS.find((i) => i.id === id);
  if (!found) throw new Error(id);
  return found;
};

describe('marchand', () => {
  it('refuse un achat sans assez d’éclats, sans rien changer', () => {
    const run = newRun(1, 'katana', 50, 0, 'ra');
    run.shards = 10;
    expect(canAfford(run, item('heal'))).toBe(false);
    expect(buyItem(run, item('heal'), createRng(1))).toBe(false);
    expect(run.shards).toBe(10);
  });

  it('soin plafonné à la vie max ; cœur agrandit la vie', () => {
    const run = newRun(1, 'katana', 50, 0, 'ra');
    run.shards = 200;
    run.hp = 40;
    buyItem(run, item('heal'), createRng(1));
    expect(run.hp).toBe(50);
    buyItem(run, item('heart'), createRng(1));
    expect(run.maxHp).toBe(60);
    expect(run.hp).toBe(60);
    expect(run.shards).toBe(200 - 30 - 45);
  });

  it('le don désigne un dieu ; la pierre augmente les dégâts', () => {
    const run = newRun(1, 'katana', 50, 0, 'ra');
    run.pendingBoon = null;
    run.shards = 200;
    buyItem(run, item('favor'), createRng(3));
    expect(run.pendingBoon).not.toBeNull();
    buyItem(run, item('whetstone'), createRng(3));
    expect(run.damageBonus).toBeCloseTo(0.1);
  });

  it('chaque article a ses textes', () => {
    for (const i of SHOP_ITEMS) {
      for (const dict of Object.values(allDictionaries)) {
        expect(dict[i.nameKey], i.nameKey).toBeDefined();
        expect(dict[i.descKey], i.descKey).toBeDefined();
      }
    }
  });
});
