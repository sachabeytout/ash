import { describe, expect, it } from 'vitest';
import { gainSuper, superReady } from '../../src/core/combat/superGauge';
import { WEAPONS } from '../../src/data/weapons';
import {
  nextComboIndex,
  phaseAt,
  totalDuration,
  type AttackStep,
} from '../../src/core/combat/attack';
import { applyDamage, heal } from '../../src/core/combat/health';
import { InputBuffer } from '../../src/core/input/buffer';
import { hitsArc, nearestInCone } from '../../src/core/geometry';

const step: AttackStep = {
  damage: 10,
  windupMs: 100,
  activeMs: 50,
  recoveryMs: 150,
  range: 30,
  arcDeg: 90,
  lunge: 0,
  knockback: 0,
  hitstopMs: 0,
  shake: 0,
};

describe('phases d’une attaque', () => {
  it('passe par anticipation, actif, récupération, fin', () => {
    expect(phaseAt(step, 0)).toBe('windup');
    expect(phaseAt(step, 120)).toBe('active');
    expect(phaseAt(step, 200)).toBe('recovery');
    expect(phaseAt(step, totalDuration(step))).toBe('done');
  });
});

describe('combo au rythme', () => {
  const combo = [step, step, step];
  it('enchaîne si on rappuie pendant la récupération ou juste après', () => {
    expect(nextComboIndex(combo, 0, 160, 200)).toBe(1);
    expect(nextComboIndex(combo, 1, 450, 200)).toBe(2);
  });
  it('repart à zéro si on appuie trop tôt (martelage) ou trop tard', () => {
    expect(nextComboIndex(combo, 0, 50, 200)).toBe(0);
    expect(nextComboIndex(combo, 0, 900, 200)).toBe(0);
  });
  it('boucle après le dernier coup', () => {
    expect(nextComboIndex(combo, 2, 200, 200)).toBe(0);
  });
});

describe('santé', () => {
  it('inflige des dégâts sans descendre sous zéro', () => {
    const h = { hp: 10, maxHp: 10 };
    expect(applyDamage(h, 4)).toEqual({ dealt: 4, killed: false });
    expect(applyDamage(h, 99)).toEqual({ dealt: 6, killed: true });
    expect(h.hp).toBe(0);
  });
  it('soigne sans dépasser le maximum', () => {
    const h = { hp: 8, maxHp: 10 };
    expect(heal(h, 5)).toBe(2);
    expect(h.hp).toBe(10);
  });
});

describe('mémoire des appuis', () => {
  it('garde un appui pendant la fenêtre puis le consomme une seule fois', () => {
    const b = new InputBuffer<'attack'>(120);
    b.press('attack', 1000);
    expect(b.peek('attack', 1100)).toBe(true);
    expect(b.consume('attack', 1100)).toBe(true);
    expect(b.consume('attack', 1100)).toBe(false);
  });
  it('oublie un appui trop ancien', () => {
    const b = new InputBuffer<'attack'>(120);
    b.press('attack', 1000);
    expect(b.consume('attack', 1200)).toBe(false);
  });
});

describe('zones de coup', () => {
  const o = { x: 0, y: 0 };
  it('touche une cible devant, pas derrière', () => {
    expect(hitsArc(o, 0, 30, 90, { x: 25, y: 0 }, 5)).toBe(true);
    expect(hitsArc(o, 0, 30, 90, { x: -25, y: 0 }, 5)).toBe(false);
  });
  it('tient compte de la taille de la cible au bord de l’arc', () => {
    expect(hitsArc(o, 0, 40, 90, { x: 20, y: 22 }, 8)).toBe(true);
    expect(hitsArc(o, 0, 40, 90, { x: 20, y: 22 }, 0)).toBe(false);
  });
  it('ne touche pas hors de portée', () => {
    expect(hitsArc(o, 0, 30, 360, { x: 50, y: 0 }, 5)).toBe(false);
  });
  it('aide à la visée : prend le plus proche dans le cône', () => {
    const far = { x: 100, y: 0 };
    const near = { x: 40, y: 5 };
    const behind = { x: -10, y: 0 };
    expect(nearestInCone(o, 0, 150, 60, [far, near, behind])).toBe(near);
    expect(nearestInCone(o, Math.PI / 2, 150, 60, [far, near])).toBeUndefined();
  });
});

describe('jauge de Super', () => {
  it('se remplit en frappant, plus vite en étant touché, sans dépasser 1', () => {
    const afterHit = gainSuper(0, 24);
    const afterHurt = gainSuper(0, 0, 24);
    expect(afterHit).toBeGreaterThan(0);
    expect(afterHurt).toBeGreaterThan(afterHit);
    expect(gainSuper(0.9, 10_000)).toBe(1);
    expect(superReady(1)).toBe(true);
    expect(superReady(0.99)).toBe(false);
  });

  it('chaque arme a un Super', () => {
    for (const w of Object.values(WEAPONS)) expect(w.super.length).toBeGreaterThan(0);
  });
});
