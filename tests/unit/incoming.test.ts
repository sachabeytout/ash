import { describe, expect, it } from 'vitest';
import { MAX_ARMOR, incomingDamage } from '../../src/core/combat/incoming';
import { PLAYER } from '../../src/data/player';
import { runBonuses } from '../../src/core/meta';
import { SKILLS } from '../../src/data/skills';
import { defaultMeta } from '../../src/core/save/schema';

describe('dégâts reçus (retour F3, 0.62.0)', () => {
  it('les ennemis font 25 % de dégâts en moins, Ash a 70 PV', () => {
    expect(PLAYER.maxHp).toBe(70);
    expect(incomingDamage(12, 1, 0)).toBe(9);
  });

  it('la Balance de Maât et la défense s’appliquent ; jamais moins de 1', () => {
    expect(incomingDamage(12, 1.5, 0)).toBe(Math.round(12 * 0.75 * 1.5));
    expect(incomingDamage(20, 1, 0.15)).toBe(Math.round(20 * 0.75 * 0.85));
    expect(incomingDamage(1, 1, MAX_ARMOR)).toBe(1);
    expect(incomingDamage(100, 1, 5)).toBe(Math.round(100 * 0.75 * (1 - MAX_ARMOR)));
  });

  it('« Peau de cendre » (Thot) donne 5 % de défense par niveau', () => {
    const meta = defaultMeta();
    const skill = SKILLS.find((s) => s.id === 'thoth_ash');
    expect(skill?.costs).toHaveLength(3);
    meta.skills['thoth_ash'] = 3;
    expect(runBonuses(meta).perks.armor).toBeCloseTo(0.15);
  });
});
