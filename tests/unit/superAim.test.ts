import { describe, expect, it } from 'vitest';
import { superTarget } from '../../src/core/combat/superAim';

describe('visée du Super (retour F6)', () => {
  it('vise l’ennemi le plus proche, même derrière Ash', () => {
    const enemies = [
      { x: 200, y: 0 },
      { x: -60, y: 10 },
      { x: 0, y: 150 },
    ];
    expect(superTarget({ x: 0, y: 0 }, enemies, 260)).toEqual({ x: -60, y: 10 });
  });

  it('personne à portée : pas de cible (le Super part dans la direction choisie)', () => {
    expect(superTarget({ x: 0, y: 0 }, [{ x: 400, y: 0 }], 260)).toBeNull();
    expect(superTarget({ x: 0, y: 0 }, [], 260)).toBeNull();
  });
});
