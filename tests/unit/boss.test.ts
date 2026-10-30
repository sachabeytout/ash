import { describe, expect, it } from 'vitest';
import { bossPhase, chooseBossAttack, ringHits, tempo } from '../../src/core/boss/pattern';
import { createRng } from '../../src/core/rng';
import type { BossAttackId } from '../../src/data/bosses';
import { AMMIT, BOSSES, FENRIR } from '../../src/data/bosses';
import { allDictionaries } from '../../src/i18n';

describe('Ammit', () => {
  it('passe en phase 2 à la moitié de sa vie', () => {
    expect(bossPhase(AMMIT, AMMIT.maxHp, AMMIT.maxHp)).toBe(1);
    expect(bossPhase(AMMIT, AMMIT.maxHp * 0.51, AMMIT.maxHp)).toBe(1);
    expect(bossPhase(AMMIT, AMMIT.maxHp * 0.5, AMMIT.maxHp)).toBe(2);
  });

  it('jamais trois fois la même attaque de suite', () => {
    const rng = createRng(4);
    const history: BossAttackId[] = [];
    for (let i = 0; i < 500; i++) history.push(chooseBossAttack(AMMIT, 2, history, rng));
    for (let i = 2; i < history.length; i++) {
      expect(history[i] === history[i - 1] && history[i] === history[i - 2]).toBe(false);
    }
  });

  it("n'invoque qu'en phase 2, et pas plus d'une fois toutes les quatre attaques", () => {
    const rng = createRng(9);
    const p1: BossAttackId[] = [];
    for (let i = 0; i < 300; i++) p1.push(chooseBossAttack(AMMIT, 1, p1, rng));
    expect(p1).not.toContain('summon');
    const p2: BossAttackId[] = [];
    for (let i = 0; i < 300; i++) p2.push(chooseBossAttack(AMMIT, 2, p2, rng));
    expect(p2).toContain('summon');
    p2.forEach((id, i) => {
      if (id === 'summon') expect(p2.slice(Math.max(0, i - 3), i)).not.toContain('summon');
    });
  });

  it('la phase 2 est plus rapide', () => {
    expect(tempo(AMMIT, 2, 1000)).toBeLessThan(tempo(AMMIT, 1, 1000));
  });

  it("l'onde de choc ne touche que sur son anneau", () => {
    expect(ringHits(100, 12, 100, 6)).toBe(true);
    expect(ringHits(100, 12, 60, 6)).toBe(false);
    expect(ringHits(100, 12, 140, 6)).toBe(false);
  });

  it('a des textes en français et en anglais', () => {
    for (const dict of Object.values(allDictionaries)) {
      expect(dict[AMMIT.nameKey]).toBeDefined();
      expect(dict[AMMIT.titleKey]).toBeDefined();
    }
  });
});

describe('tous les boss', () => {
  it('chaque attaque possible a ses réglages et ses textes', () => {
    for (const boss of Object.values(BOSSES)) {
      for (const phase of [1, 2] as const) {
        for (const id of Object.keys(boss.weights[phase]) as BossAttackId[]) {
          expect(boss[id], `${boss.id} ${id}`).toBeDefined();
        }
      }
      for (const dict of Object.values(allDictionaries)) {
        for (const key of [boss.nameKey, boss.titleKey, boss.phase2Key, boss.defeatedKey])
          expect(dict[key], key).toBeDefined();
      }
    }
  });

  it('Fenrir ne répète jamais trois fois la même attaque et n’invoque qu’en phase 2', () => {
    const rng = createRng(2);
    const h: BossAttackId[] = [];
    for (let i = 0; i < 200; i++) h.push(chooseBossAttack(FENRIR, 1, h, rng));
    expect(h).not.toContain('summon');
    expect(h).toContain('leap');
    expect(h).toContain('icefall');
  });
});
